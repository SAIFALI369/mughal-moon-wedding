// @vitest-environment node
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const db = new PGlite();
const sql = (name: string) =>
  readFileSync(new URL(`../../drizzle/migrations/${name}`, import.meta.url), "utf8");
const migration = sql("0009_private_card_rsvps_and_portraits.sql");
const alice = "a0000000-0000-4000-8000-000000000001";
const bob = "b0000000-0000-4000-8000-000000000002";
const published = "c0000000-0000-4000-8000-000000000001";
const draft = "c0000000-0000-4000-8000-000000000002";
const disabled = "c0000000-0000-4000-8000-000000000003";
const expired = "c0000000-0000-4000-8000-000000000004";
const legacy = "c0000000-0000-4000-8000-000000000005";
const basics = JSON.stringify({
  groomName: "Ayaan",
  brideName: "Zara",
  date: "15 December 2030",
  time: "4:00 PM IST",
  venue: "Garden Pavilion",
  address: "Patna, Bihar",
});

async function card(
  id: string,
  owner: string,
  status: "draft" | "published",
  content: string,
  expiry = "2031-01-01",
) {
  await db.query(
    "INSERT INTO public.invitation_cards(id,owner_id,title,slug,status,content,expires_at) VALUES ($1,$2,'Our Day',$3,$4,$5,$6)",
    [id, owner, `our-day-${id.slice(-12)}`, status, content, expiry],
  );
}

beforeAll(async () => {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
      SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  `);
  await db.exec(sql("0002_personal_invitation_cards.sql"));
  await db.exec(sql("0004_invitation_expiry_and_memory.sql"));
  // Legacy published cards may be missing today's required fields.
  await card(legacy, bob, "published", "{}");
  await db.exec(migration);
  await card(published, alice, "published", basics);
  await card(draft, alice, "draft", basics);
  await card(
    disabled,
    alice,
    "published",
    JSON.stringify({ ...JSON.parse(basics), elements: { rsvp: false } }),
  );
  await card(expired, bob, "published", basics, "2020-01-01");
}, 30_000);
afterAll(() => db.close());

it("ships exactly the same SQL to Lovable and the scheduled migration runner", () => {
  expect(
    readFileSync(
      new URL(
        "../../supabase/migrations/20261019090000_private_card_rsvps_and_portraits.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  ).toBe(migration);
});

it("can re-run migration after Lovable already installed it", async () => {
  await db.exec(migration);
  const result = await db.query("SELECT 1 FROM pg_policies WHERE tablename='invitation_rsvps'");
  expect(result.rows).toHaveLength(2);
});

it("lets anonymous guests submit replies only to published, unexpired, RSVP-enabled cards, but never read them", async () => {
  await db.exec("SET ROLE anon;");
  try {
    const publicCards = await db.query<{ id: string }>("SELECT id FROM public.invitation_cards");
    expect(publicCards.rows.map((row) => row.id).sort()).toEqual(
      [disabled, published, legacy].sort(),
    );
    await db.query(
      "INSERT INTO public.invitation_rsvps(card_id,name,attending,guests,contact,dietary,message) VALUES ($1,'Guest One',true,2,'guest@example.invalid','None','See you!')",
      [published],
    );
    await expect(db.query("SELECT name FROM public.invitation_rsvps")).rejects.toThrow(
      "permission denied",
    );
    await expect(db.query("UPDATE public.invitation_rsvps SET name='Stolen'")).rejects.toThrow(
      "permission denied",
    );
    await expect(db.query("DELETE FROM public.invitation_rsvps")).rejects.toThrow(
      "permission denied",
    );
    for (const id of [draft, disabled, expired]) {
      await expect(
        db.query(
          "INSERT INTO public.invitation_rsvps(card_id,name,attending,guests) VALUES ($1,'Not allowed',true,1)",
          [id],
        ),
      ).rejects.toThrow(/row-level security/);
    }
    await expect(
      db.query(
        "INSERT INTO public.invitation_rsvps(card_id,name,attending,guests) VALUES ($1,'Too many',true,11)",
        [published],
      ),
    ).rejects.toThrow(/check constraint/);
  } finally {
    await db.exec("RESET ROLE;");
  }
});

it("lets only the owner read replies for their cards, including replies before unpublishing", async () => {
  await db.exec(`SET request.jwt.claim.sub = '${alice}'; SET ROLE authenticated;`);
  try {
    const { rows } = await db.query<{ name: string; contact: string }>(
      "SELECT name,contact FROM public.invitation_rsvps",
    );
    expect(rows).toEqual([{ name: "Guest One", contact: "guest@example.invalid" }]);
  } finally {
    await db.exec("RESET ROLE;");
  }
  await db.query("UPDATE public.invitation_cards SET status='draft' WHERE id=$1", [published]);
  await db.exec(`SET request.jwt.claim.sub = '${alice}'; SET ROLE authenticated;`);
  try {
    expect((await db.query("SELECT name FROM public.invitation_rsvps")).rows).toHaveLength(1);
  } finally {
    await db.exec("RESET ROLE;");
  }
  await db.exec(`SET request.jwt.claim.sub = '${bob}'; SET ROLE authenticated;`);
  try {
    expect((await db.query("SELECT name FROM public.invitation_rsvps")).rows).toEqual([]);
  } finally {
    await db.exec("RESET ROLE;");
  }
});

it("validates photo formats and size in SQL and requires essentials on newly published cards", async () => {
  const validJpeg = `data:image/jpeg;base64,${Buffer.from([0xff, 0xd8, 0xff, 0xd9]).toString("base64")}`;
  await expect(
    card(
      "c0000000-0000-4000-8000-000000000006",
      bob,
      "draft",
      JSON.stringify({ groomPhoto: "data:image/svg+xml;base64,xxx" }),
    ),
  ).rejects.toThrow(/invitation_portraits_safe/);
  await card(
    "c0000000-0000-4000-8000-000000000007",
    bob,
    "draft",
    JSON.stringify({ groomPhoto: validJpeg }),
  );
  await expect(
    db.query("UPDATE public.invitation_cards SET status='published' WHERE id=$1", [
      "c0000000-0000-4000-8000-000000000007",
    ]),
  ).rejects.toThrow(/invitation_published_basics/);
  // Existing published links survive until their owner changes them.
  expect(
    (await db.query("SELECT status FROM public.invitation_cards WHERE id=$1", [legacy])).rows,
  ).toEqual([{ status: "published" }]);
});
