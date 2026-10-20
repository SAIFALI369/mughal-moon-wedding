// @vitest-environment node
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();

const ownerA = "11111111-1111-4111-8111-111111111111";
const ownerB = "22222222-2222-4222-8222-222222222222";

const card = (owner_id: string, slugSuffix: string, title = "Test Invite") => ({
  owner_id,
  title,
  slug: `test-invite-${slugSuffix}`,
  status: "draft",
  content: JSON.stringify({ groomName: "Mohsin", brideName: "Simran" }),
});

beforeAll(async () => {
  await db.exec(
    "CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE PUBLICATION supabase_realtime;",
  );
  // Mock auth.uid() for RLS if needed – PGlite doesn't have auth schema, create stub
  await db.exec("CREATE SCHEMA IF NOT EXISTS auth; CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT NULL::uuid $$;");
  await db.exec(
    readFileSync(new URL("../../drizzle/migrations/0002_personal_invitation_cards.sql", import.meta.url), "utf8"),
  );
}, 30_000);
afterAll(() => db.close());

describe("personal invitation cards — database enforcement", () => {
  it("creates profiles with case-insensitive username/email uniqueness", async () => {
    await db.exec("TRUNCATE public.profiles CASCADE;");
    await db.exec("INSERT INTO public.profiles (id, username, email) VALUES ('00000000-0000-0000-0000-000000000001', 'MohsinSimran', 'a@example.com')");
    await expect(
      db.exec("INSERT INTO public.profiles (id, username, email) VALUES ('00000000-0000-0000-0000-000000000002', 'mohsinsimran', 'b@example.com')"),
    ).rejects.toThrow();
    await expect(
      db.exec("INSERT INTO public.profiles (id, username, email) VALUES ('00000000-0000-0000-0000-000000000003', 'OtherUser', 'A@EXAMPLE.COM')"),
    ).rejects.toThrow();
  });

  it("stores cards as private drafts by default and enforces slug/status checks", async () => {
    await db.exec("TRUNCATE public.invitation_cards CASCADE;");
    const { rows } = await db.query<any>("INSERT INTO public.invitation_cards (owner_id, title, slug, content) VALUES ($1,$2,$3,$4) RETURNING status, slug", [
      ownerA,
      "My Draft",
      "my-draft-123456",
      JSON.stringify({ groomName: "A" }),
    ]);
    expect(rows[0].status).toBe("draft");
    expect(rows[0].slug).toBe("my-draft-123456");
    // Invalid slug should fail
    await expect(
      db.query<any>("INSERT INTO public.invitation_cards (owner_id, title, slug) VALUES ($1,$2,$3)", [ownerA, "Bad", "BAD_SLUG"]),
    ).rejects.toThrow();
    // Invalid status
    await expect(
      db.query<any>("INSERT INTO public.invitation_cards (owner_id, title, slug, status) VALUES ($1,$2,$3,$4)", [ownerA, "Bad", "bad-slug1", "archived"]),
    ).rejects.toThrow();
  });

  it("enforces max 3 active cards per owner in database, not just UI (with advisory lock)", async () => {
    await db.exec("TRUNCATE public.invitation_cards CASCADE;");
    // Insert 3 for owner A should succeed
    for (let i = 1; i <= 3; i++) {
      const c = card(ownerA, `a${i}`);
      await db.query<any>("INSERT INTO public.invitation_cards (owner_id, title, slug, content) VALUES ($1,$2,$3,$4)", [
        c.owner_id,
        c.title,
        c.slug,
        c.content,
      ]);
    }
    // 4th should fail with limit message
    await expect(
      db.query<any>("INSERT INTO public.invitation_cards (owner_id, title, slug, content) VALUES ($1,$2,$3,$4)", [
        ownerA,
        "Fourth",
        "test-invite-a4",
        "{}",
      ]),
    ).rejects.toThrow("at most 3");

    // Different owner B still has capacity
    await db.query<any>("INSERT INTO public.invitation_cards (owner_id, title, slug, content) VALUES ($1,$2,$3,$4)", [
      ownerB,
      "B First",
      "test-invite-b1",
      "{}",
    ]);
    const { rows } = await db.query<any>("SELECT count(*) as c FROM public.invitation_cards WHERE owner_id = $1", [ownerA]);
    expect(Number(rows[0].c)).toBe(3);

    // Deleting frees slot
    await db.exec(`DELETE FROM public.invitation_cards WHERE owner_id = '${ownerA}' AND slug = 'test-invite-a1'`);
    await db.query<any>("INSERT INTO public.invitation_cards (owner_id, title, slug, content) VALUES ($1,$2,$3,$4)", [
      ownerA,
      "After Delete",
      "test-invite-a5",
      "{}",
    ]);
    const { rows: after } = await db.query<any>("SELECT count(*) as c FROM public.invitation_cards WHERE owner_id = $1", [ownerA]);
    expect(Number(after[0].c)).toBe(3);
  });

  it("prevents owner_id tampering on update and manages published_at", async () => {
    await db.exec("TRUNCATE public.invitation_cards CASCADE;");
    await db.query<any>("INSERT INTO public.invitation_cards (id, owner_id, title, slug) VALUES ($1,$2,$3,$4)", [
      "33333333-3333-4333-8333-333333333333",
      ownerA,
      "Owner Test",
      "owner-test-123",
    ]);
    // Try to change owner_id should fail
    await expect(
      db.query<any>("UPDATE public.invitation_cards SET owner_id = $1 WHERE id = $2", [ownerB, "33333333-3333-4333-8333-333333333333"]),
    ).rejects.toThrow("owner_id cannot be changed");

    // Publishing sets published_at, drafting clears it
    await db.query<any>("UPDATE public.invitation_cards SET status='published' WHERE id='33333333-3333-4333-8333-333333333333'");
    let res = await db.query<any>("SELECT status, published_at FROM public.invitation_cards WHERE id='33333333-3333-4333-8333-333333333333'");
    expect(res.rows[0].status).toBe("published");
    expect(res.rows[0].published_at).toBeTruthy();

    await db.query<any>("UPDATE public.invitation_cards SET status='draft' WHERE id='33333333-3333-4333-8333-333333333333'");
    res = await db.query<any>("SELECT status, published_at FROM public.invitation_cards WHERE id='33333333-3333-4333-8333-333333333333'");
    expect(res.rows[0].status).toBe("draft");
    expect(res.rows[0].published_at).toBeNull();
  });

  it("lets anonymous guests see only published invitations, never private drafts", async () => {
    await db.exec("TRUNCATE public.invitation_cards CASCADE;");
    await db.query("INSERT INTO public.invitation_cards (owner_id, title, slug, status) VALUES ($1, 'Private party', 'private-party-123', 'draft'), ($1, 'Public party', 'public-party-123', 'published')", [ownerA]);
    await db.exec("SET ROLE anon;");
    try {
      const { rows } = await db.query<{ title: string }>("SELECT title FROM public.invitation_cards ORDER BY title");
      expect(rows.map((row) => row.title)).toEqual(["Public party"]);
    } finally {
      await db.exec("RESET ROLE;");
    }
  });

  it("exposes RLS policies: owners manage own, anyone can read published", async () => {
    const sql = readFileSync(new URL("../../drizzle/migrations/0002_personal_invitation_cards.sql", import.meta.url), "utf8");
    expect(sql).toContain("ENABLE ROW LEVEL SECURITY");
    expect(sql).toContain("Anyone can view published invitations");
    expect(sql).toContain("Owners can view own cards");
    expect(sql).toContain("Owners can update own cards");
    expect(sql).toContain("Owners can delete own cards");
    expect(sql).toContain("enforce_invitation_card_limit");
    expect(sql).toContain("pg_advisory_xact_lock");
    expect(sql).toContain("You may have at most 3 active cards");
  });
});

describe("username-only authentication UI", () => {
  it("uses username RPC registration/login without email or recovery forms", () => {
    const signUp = readFileSync(new URL("../routes/sign-up.tsx", import.meta.url), "utf8");
    const signIn = readFileSync(new URL("../routes/sign-in.tsx", import.meta.url), "utf8");
    expect(signUp).toContain('redirect({ to: "/sign-in"');
    expect(signUp).not.toContain('rpc("register_username"');
    expect(signUp).not.toContain('type="email"');
    expect(signUp).not.toContain('auth.signUp');
    expect(signIn).toContain('rpc("username_login_address"');
    expect(signIn).toContain("signInWithPassword");
    expect(signIn).not.toContain('to="/recover"');
    expect(signIn).toContain("Contact the InvitingYou representative");
    expect(signIn).not.toContain('to="/sign-up"');
  });
});
