// @vitest-environment node
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const db = new PGlite();
const sql = (name: string) =>
  readFileSync(new URL(`../../drizzle/migrations/${name}`, import.meta.url), "utf8");
const migration = sql("0014_card_gallery_and_wishes.sql");
const alice = "a0000000-0000-4000-8000-000000000001";
const bob = "b0000000-0000-4000-8000-000000000002";
const published = "c0000000-0000-4000-8000-000000000001";
const draft = "c0000000-0000-4000-8000-000000000002";
const galleryOff = "c0000000-0000-4000-8000-000000000003";
const wishesOff = "c0000000-0000-4000-8000-000000000004";
const expired = "c0000000-0000-4000-8000-000000000005";
const guestPhoto = `data:image/jpeg;base64,${Buffer.from([0xff, 0xd8, 0xff, 0x01, 0xff, 0xd9]).toString("base64")}`;

const basics = {
  groomName: "Ayaan",
  brideName: "Zara",
  date: "15 December 2030",
  time: "4:00 PM IST",
  venue: "Garden Pavilion",
  address: "Patna, Bihar",
};

async function card(
  id: string,
  owner: string,
  status: "draft" | "published",
  elements: Record<string, boolean> = {},
  expiry = "2031-01-01",
) {
  await db.query(
    "INSERT INTO public.invitation_cards(id,owner_id,title,slug,status,content,expires_at) VALUES ($1,$2,'Our Day',$3,$4,$5,$6)",
    [
      id,
      owner,
      `our-day-${id.slice(-12)}`,
      status,
      JSON.stringify({ ...basics, elements }),
      expiry,
    ],
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
  await db.exec(sql("0009_private_card_rsvps_and_portraits.sql"));
  // More fixtures than one account may own in production.
  await db.exec("DROP TRIGGER invitation_cards_limit_trigger ON public.invitation_cards;");
  for (const [id, owner, status] of [
    [published, alice, "published"],
    [draft, alice, "draft"],
    [galleryOff, alice, "published"],
    [wishesOff, alice, "published"],
    [expired, bob, "published"],
  ] as const) {
    await card(id, owner, status);
  }
  await db.exec(migration);
  await db.query(
    "UPDATE public.invitation_cards SET content = jsonb_set(content,'{elements}','{\"gallery\": false}'::jsonb) WHERE id=$1",
    [galleryOff],
  );
  await db.query(
    "UPDATE public.invitation_cards SET content = jsonb_set(content,'{elements}','{\"wishes\": false}'::jsonb) WHERE id=$1",
    [wishesOff],
  );
  await db.query("UPDATE public.invitation_cards SET expires_at='2020-01-01' WHERE id=$1", [
    expired,
  ]);
}, 30_000);

afterAll(() => db.close());

describe("card gallery and wishes migration", () => {
  it("ships exactly the same SQL to both migration folders and can be re-run", async () => {
    expect(
      readFileSync(
        new URL(
          "../../supabase/migrations/20261021000000_card_gallery_and_wishes.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    ).toBe(migration);
    await db.exec(migration);
    expect(
      (await db.query("SELECT 1 FROM pg_policies WHERE tablename='invitation_wishes'")).rows,
    ).toHaveLength(2);
  });

  it("lets a guest add at most five photos to one published gallery", async () => {
    await db.exec("SET ROLE anon;");
    try {
      for (let index = 0; index < 5; index += 1) {
        await db.query("SELECT public.add_invitation_photo($1,$2,'Guest frame')", [
          published,
          guestPhoto,
        ]);
      }
      await expect(
        db.query("SELECT public.add_invitation_photo($1,$2,'Sixth')", [published, guestPhoto]),
      ).rejects.toThrow(/five guest photos/);
      await expect(
        db.query(
          "SELECT public.add_invitation_photo($1,'data:image/svg+xml;base64,PHN2Zz4=','x')",
          [published],
        ),
      ).rejects.toThrow(/Invalid photo/);
      const rows = await db.query<{ source: string; caption: string }>(
        "SELECT source,caption FROM public.invitation_photos WHERE card_id=$1",
        [published],
      );
      expect(rows.rows).toHaveLength(5);
      expect(rows.rows.every((row) => row.source === "guest")).toBe(true);
    } finally {
      await db.exec("RESET ROLE;");
    }
  });

  it("hides a draft or opted-out gallery from guests while the host still sees it", async () => {
    await db
      .query("SELECT public.add_invitation_photo($1,$2,'Host frame')", [draft, guestPhoto])
      .catch(() => undefined);
    await db.exec("SET ROLE anon;");
    try {
      expect(
        (await db.query("SELECT slot FROM public.invitation_photos WHERE card_id=$1", [draft]))
          .rows,
      ).toHaveLength(0);
      expect(
        (await db.query("SELECT slot FROM public.invitation_photos WHERE card_id=$1", [galleryOff]))
          .rows,
      ).toHaveLength(0);
      await expect(
        db.query("SELECT public.add_invitation_photo($1,$2,'Blocked')", [galleryOff, guestPhoto]),
      ).rejects.toThrow(/turned off the gallery/);
      await expect(
        db.query("SELECT public.add_invitation_photo($1,$2,'Blocked')", [draft, guestPhoto]),
      ).rejects.toThrow(/not accepting photos/);
      await expect(
        db.query("SELECT public.add_invitation_photo($1,$2,'Expired')", [expired, guestPhoto]),
      ).rejects.toThrow(/not accepting photos/);
      expect(
        (await db.query("SELECT slot FROM public.invitation_photos WHERE card_id=$1", [published]))
          .rows,
      ).toHaveLength(5);
    } finally {
      await db.exec("RESET ROLE;");
    }
  });

  it("lets the host manage their own gallery and blocks everyone else", async () => {
    await db.exec(`SET request.jwt.claim.sub = '${alice}'; SET ROLE authenticated;`);
    try {
      await db.query("SELECT public.add_invitation_photo($1,$2,'Host frame')", [draft, guestPhoto]);
      expect(
        (await db.query("SELECT slot FROM public.invitation_photos WHERE card_id=$1", [draft]))
          .rows,
      ).toHaveLength(1);
      await db.query("SELECT public.delete_invitation_photo($1,1::smallint)", [draft]);
      expect(
        (await db.query("SELECT slot FROM public.invitation_photos WHERE card_id=$1", [draft]))
          .rows,
      ).toHaveLength(0);
    } finally {
      await db.exec("RESET ROLE;");
    }
    await db.exec(`SET request.jwt.claim.sub = '${bob}'; SET ROLE authenticated;`);
    try {
      await expect(
        db.query("SELECT public.delete_invitation_photo($1,1::smallint)", [published]),
      ).rejects.toThrow(/Not authorized/);
    } finally {
      await db.exec("RESET ROLE;");
    }
    await db.exec(`SET ROLE anon;`);
    try {
      await expect(
        db.query("SELECT public.delete_invitation_photo($1,1::smallint)", [published]),
      ).rejects.toThrow(/permission denied|Sign in/);
      await expect(db.query("DELETE FROM public.invitation_photos")).rejects.toThrow(
        /permission denied/,
      );
    } finally {
      await db.exec("RESET ROLE;");
    }
  });

  it("accepts wishes only on published, opted-in cards and keeps drafts private", async () => {
    await db.exec("SET ROLE anon;");
    try {
      await db.query(
        "INSERT INTO public.invitation_wishes(card_id,name,message) VALUES ($1,'Guest','Congratulations!')",
        [published],
      );
      for (const id of [draft, expired, wishesOff]) {
        await expect(
          db.query(
            "INSERT INTO public.invitation_wishes(card_id,name,message) VALUES ($1,'Guest','Hidden')",
            [id],
          ),
        ).rejects.toThrow(/row-level security/);
        expect(
          (await db.query("SELECT id FROM public.invitation_wishes WHERE card_id=$1", [id])).rows,
        ).toHaveLength(0);
      }
      expect(
        (
          await db.query<{ name: string }>(
            "SELECT name FROM public.invitation_wishes WHERE card_id=$1",
            [published],
          )
        ).rows,
      ).toEqual([{ name: "Guest" }]);
      await expect(
        db.query("DELETE FROM public.invitation_wishes WHERE card_id=$1", [published]),
      ).rejects.toThrow(/permission denied/);
      await expect(
        db.query("INSERT INTO public.invitation_wishes(card_id,name,message) VALUES ($1,' ','x')", [
          published,
        ]),
      ).rejects.toThrow(/check constraint/);
    } finally {
      await db.exec("RESET ROLE;");
    }
  });
});
