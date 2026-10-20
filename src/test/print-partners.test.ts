// @vitest-environment node
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
const db = new PGlite();
const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const migration = read("../../drizzle/migrations/0010_exclusive_print_partners.sql");
let owner: string;
beforeAll(async () => {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth; CREATE SCHEMA extensions;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid', true), '')::uuid $$;
    CREATE TABLE auth.users (instance_id uuid, id uuid PRIMARY KEY, aud text, role text, email text, encrypted_password text, email_confirmed_at timestamptz, raw_app_meta_data jsonb, raw_user_meta_data jsonb, created_at timestamptz, updated_at timestamptz, confirmation_token text, recovery_token text, email_change_token_new text, email_change text, banned_until timestamptz);
    CREATE TABLE auth.identities (id uuid PRIMARY KEY, user_id uuid REFERENCES auth.users, provider_id text, identity_data jsonb, provider text, created_at timestamptz, updated_at timestamptz);
    -- Control-flow doubles only. Production uses bcrypt from pgcrypto.
    CREATE FUNCTION extensions.gen_salt(text, integer) RETURNS text LANGUAGE sql AS $$ SELECT 'test'::text $$;
    CREATE FUNCTION extensions.crypt(text, text) RETURNS text LANGUAGE sql AS $$ SELECT 'hash:' || $1 $$;
  `);
  await db.exec(read("../../drizzle/migrations/0002_personal_invitation_cards.sql"));
  await db.exec(
    read("../../drizzle/migrations/0005_username_password_auth.sql").replace(
      "CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;",
      "",
    ),
  );
  await db.exec(migration);
  await db.exec(read("../../drizzle/migrations/0011_partner_topup_safety.sql"));
}, 30000);
afterAll(() => db.close());
beforeEach(async () => {
  await db.exec(
    "RESET ROLE; TRUNCATE public.profiles, auth.users, auth.identities, public.print_partners, public.partner_cash_packages, public.invitation_cards CASCADE;",
  );
  const result = await db.query<{ id: string }>(
    "SELECT public.provision_print_partner('print_shop', 'private-password', 'Patna Print House') AS id",
  );
  owner = result.rows[0].id;
});
const insertCard = (slug: string) =>
  db.query(
    "INSERT INTO public.invitation_cards (owner_id,title,slug) VALUES ($1,'Customer celebration',$2)",
    [owner, slug],
  );
async function balance() {
  return (
    await db.query<{ cards_purchased: number; cards_created: number }>(
      "SELECT cards_purchased,cards_created FROM public.print_partners WHERE owner_id=$1",
      [owner],
    )
  ).rows[0];
}

describe("Cash-funded partner access", () => {
  it("provisions one account and records exactly INR 1000 / 10 credits", async () => {
    expect(await balance()).toEqual({ cards_purchased: 10, cards_created: 0 });
    const { rows } = await db.query(
      "SELECT amount_inr,card_credits,payment_method FROM public.partner_cash_packages",
    );
    expect(rows).toEqual([{ amount_inr: 1000, card_credits: 10, payment_method: "cash" }]);
  });
  it("blocks public registration, operator provisioning and free credit writes", async () => {
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`SET ROLE ${role}`);
      try {
        await expect(
          db.query("SELECT public.register_username('bypass','password123')"),
        ).rejects.toThrow(/permission denied/);
        await expect(
          db.query("SELECT public.provision_print_partner('bypass','password123','Bypass Shop')"),
        ).rejects.toThrow(/permission denied/);
        await expect(
          db.query("SELECT public.record_partner_cash_package('print_shop','Bypass Shop')"),
        ).rejects.toThrow(/permission denied/);
        await expect(
          db.query("UPDATE public.print_partners SET cards_purchased=999"),
        ).rejects.toThrow(/permission denied/);
        await expect(
          db.query("INSERT INTO public.partner_cash_packages(owner_id) VALUES ($1)", [owner]),
        ).rejects.toThrow(/permission denied/);
      } finally {
        await db.exec("RESET ROLE");
      }
    }
  });
  it("enforces ten total creations even with simultaneous requests", async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 11 }, (_, i) => insertCard(`parallel-card-${i}`)),
    );
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(10);
    expect(await balance()).toEqual({ cards_purchased: 10, cards_created: 10 });
  });
  it("does not refund deletion or charge for updates/publishing", async () => {
    await insertCard("credit-usage-card");
    await db.exec(
      "UPDATE public.invitation_cards SET title='Edited', status='published'; DELETE FROM public.invitation_cards;",
    );
    expect((await balance()).cards_created).toBe(1);
  });
  it("does not charge for failed or skipped inserts", async () => {
    await insertCard("unique-card-slug");
    await expect(insertCard("unique-card-slug")).rejects.toThrow();
    await db.query(
      "INSERT INTO public.invitation_cards(owner_id,title,slug) VALUES ($1,'Skip','unique-card-slug') ON CONFLICT DO NOTHING",
      [owner],
    );
    expect((await balance()).cards_created).toBe(1);
  });
  it("rolls back every debit if an over-budget bulk insert fails", async () => {
    await expect(
      db.query(
        "INSERT INTO public.invitation_cards(owner_id,title,slug) SELECT $1,'Bulk card','bulk-card-' || n FROM generate_series(1,11) n",
        [owner],
      ),
    ).rejects.toThrow(/credits/);
    expect((await balance()).cards_created).toBe(0);
  });
  it("adds ten on a second cash payment without resetting used credits", async () => {
    await insertCard("first-credit-card");
    await db.query("SELECT public.record_partner_cash_package('print_shop','Patna Print House')");
    expect(await balance()).toEqual({ cards_purchased: 20, cards_created: 1 });
    expect((await db.query("SELECT * FROM public.partner_cash_packages")).rows).toHaveLength(2);
  });
  it("can record a third package after more than ten active cards exist", async () => {
    await db.query("SELECT public.record_partner_cash_package('print_shop','Patna Print House')");
    for (let i = 0; i < 11; i++) await insertCard(`many-live-cards-${i}`);
    await db.query("SELECT public.record_partner_cash_package('print_shop','Patna Print House')");
    expect(await balance()).toEqual({ cards_purchased: 30, cards_created: 11 });
  });
  it("blocks unprovisioned and inactive accounts", async () => {
    await db.query("SELECT public.register_username('legacy_shop','password123')");
    const result = await db.query<{ id: string }>(
      "SELECT id FROM public.profiles WHERE username='legacy_shop'",
    );
    await expect(
      db.query(
        "INSERT INTO public.invitation_cards(owner_id,title,slug) VALUES ($1,'Free card','unpaid-free-card')",
        [result.rows[0].id],
      ),
    ).rejects.toThrow(/Partner access/);
    await db.exec("UPDATE public.print_partners SET active=false");
    await expect(insertCard("inactive-partner-card")).rejects.toThrow(/Partner access/);
  });
  it("keeps balances and package history private to the shop", async () => {
    const other = await db.query<{ id: string }>(
      "SELECT public.provision_print_partner('other_shop','password123','Other Shop') AS id",
    );
    await db.query("SELECT set_config('test.uid', $1, false)", [other.rows[0].id]);
    await db.exec("SET ROLE authenticated");
    try {
      expect((await db.query("SELECT owner_id FROM public.print_partners")).rows).toEqual([
        { owner_id: other.rows[0].id },
      ]);
      expect((await db.query("SELECT owner_id FROM public.partner_cash_packages")).rows).toEqual([
        { owner_id: other.rows[0].id },
      ]);
    } finally {
      await db.exec("RESET ROLE");
    }
  });
  it("rolls back auth creation when partner provisioning fails", async () => {
    await expect(
      db.query("SELECT public.provision_print_partner('bad_shop','password123','')"),
    ).rejects.toThrow();
    expect(
      (await db.query("SELECT * FROM public.profiles WHERE username='bad_shop'")).rows,
    ).toHaveLength(0);
  });
  it("maintains identical migrations in both deployment paths", () => {
    expect(read("../../drizzle/migrations/0011_partner_topup_safety.sql")).toBe(read("../../supabase/migrations/20261019121000_partner_topup_safety.sql"));
    expect(read("../../supabase/migrations/20261019120000_exclusive_print_partners.sql")).toBe(
      migration,
    );
  });
});
