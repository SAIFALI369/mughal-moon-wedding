// @vitest-environment node
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

const db = new PGlite();
const ownerId = "11111111-1111-4111-8111-111111111111";

beforeAll(async () => {
  await db.exec(
    "CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE PUBLICATION supabase_realtime;",
  );
  await db.exec(
    "CREATE SCHEMA IF NOT EXISTS auth; CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT NULL::uuid $$;",
  );
  await db.exec(read("../../drizzle/migrations/0002_personal_invitation_cards.sql"));
  await db.exec(read("../../drizzle/migrations/0004_invitation_expiry_and_memory.sql"));
  await db.exec(read("../../drizzle/migrations/0018_lock_published_couple_identity.sql"));
}, 30_000);

afterAll(() => db.close());

describe("published card couple-identity lock & ordinal date expiry", () => {
  it("keeps couple names editable on drafts, then locks title, slug, groomName and brideName permanently after first publish", async () => {
    await db.exec("TRUNCATE public.invitation_cards CASCADE;");

    const cardId = "44444444-4444-4444-8444-444444444444";
    await db.query(
      `INSERT INTO public.invitation_cards (id, owner_id, title, slug, status, content)
       VALUES ($1, $2, $3, $4, 'draft', $5)`,
      [
        cardId,
        ownerId,
        "Initial Draft",
        "initial-draft-1234",
        JSON.stringify({
          groomName: "Draft Groom",
          brideName: "Draft Bride",
          date: "26th November 2029",
          theme: "eid",
          songs: [],
        }),
      ],
    );

    // Before first publish: couple names and title can be updated freely
    await db.query(
      `UPDATE public.invitation_cards
       SET title = $1, content = $2
       WHERE id = $3`,
      [
        "Ayaan & Zara",
        JSON.stringify({
          groomName: "Ayaan",
          brideName: "Zara",
          date: "26th November 2029",
          theme: "eid",
          songs: [],
        }),
        cardId,
      ],
    );

    // Publish the card
    await db.query(`UPDATE public.invitation_cards SET status = 'published' WHERE id = $1`, [
      cardId,
    ]);
    const publishedRes = await db.query<{ status: string; published_at: string }>(
      `SELECT status, published_at FROM public.invitation_cards WHERE id = $1`,
      [cardId],
    );
    expect(publishedRes.rows[0]?.status).toBe("published");
    expect(publishedRes.rows[0]?.published_at).toBeTruthy();

    // Design, soundtrack, venue and logistics CAN still be updated after publish
    await db.query(
      `UPDATE public.invitation_cards
       SET content = $1
       WHERE id = $2`,
      [
        JSON.stringify({
          groomName: "Ayaan",
          brideName: "Zara",
          date: "26th November 2029",
          theme: "royal-rajmahal",
          framework: "royal-folio",
          songs: [{ title: "Kesariya", url: "https://youtu.be/dQw4w9WgXcQ" }],
        }),
        cardId,
      ],
    );

    // Changing groomName, brideName, title or slug after publish MUST fail
    await expect(
      db.query(`UPDATE public.invitation_cards SET content = $1 WHERE id = $2`, [
        JSON.stringify({ groomName: "Rahul", brideName: "Zara" }),
        cardId,
      ]),
    ).rejects.toThrow("Couple names and card title are locked after publishing");

    await expect(
      db.query(`UPDATE public.invitation_cards SET content = $1 WHERE id = $2`, [
        JSON.stringify({ groomName: "Ayaan", brideName: "Priya" }),
        cardId,
      ]),
    ).rejects.toThrow("Couple names and card title are locked after publishing");

    await expect(
      db.query(`UPDATE public.invitation_cards SET title = 'Rahul & Priya' WHERE id = $1`, [
        cardId,
      ]),
    ).rejects.toThrow("Couple names and card title are locked after publishing");

    await expect(
      db.query(`UPDATE public.invitation_cards SET slug = 'rahul-priya-9999' WHERE id = $1`, [
        cardId,
      ]),
    ).rejects.toThrow("Couple names and card title are locked after publishing");

    // Moving back to draft preserves published_at and STILL prevents renaming to another couple
    await db.query(`UPDATE public.invitation_cards SET status = 'draft' WHERE id = $1`, [cardId]);
    const pausedRes = await db.query<{ status: string; published_at: string }>(
      `SELECT status, published_at FROM public.invitation_cards WHERE id = $1`,
      [cardId],
    );
    expect(pausedRes.rows[0]?.status).toBe("draft");
    expect(pausedRes.rows[0]?.published_at).toBeTruthy();

    await expect(
      db.query(`UPDATE public.invitation_cards SET content = $1 WHERE id = $2`, [
        JSON.stringify({ groomName: "Another Groom", brideName: "Another Bride" }),
        cardId,
      ]),
    ).rejects.toThrow("Couple names and card title are locked after publishing");
  });

  it("parses ordinal written dates such as '26th November 2029' when computing automatic card expiry", async () => {
    const { rows } = await db.query<{ expires_at: string }>(
      `INSERT INTO public.invitation_cards (owner_id, title, slug, content)
       VALUES ($1, 'Ordinal Date Test', 'ordinal-date-2029', $2)
       RETURNING expires_at`,
      [
        ownerId,
        JSON.stringify({
          groomName: "Ayaan",
          brideName: "Zara",
          date: "26th November 2029",
        }),
      ],
    );
    expect(new Date(rows[0]!.expires_at).getUTCFullYear()).toBe(2029);
    expect(new Date(rows[0]!.expires_at).getUTCMonth()).toBe(10); // November (0-indexed)
  });

  it("keeps drizzle and supabase migration copies byte-for-byte identical", () => {
    expect(read("../../drizzle/migrations/0018_lock_published_couple_identity.sql")).toBe(
      read("../../supabase/migrations/20261024000000_lock_published_couple_identity.sql"),
    );
  });
});
