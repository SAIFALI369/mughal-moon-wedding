// @vitest-environment node
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const db = new PGlite();
const sql = (name: string) =>
  readFileSync(new URL(`../../drizzle/migrations/${name}`, import.meta.url), "utf8");
const galleryMigration = sql("0014_card_gallery_and_wishes.sql");
const lockDownMigration = sql("0015_host_only_gallery_and_real_rsvp_names.sql");
const alice = "a0000000-0000-4000-8000-000000000001";
const bob = "b0000000-0000-4000-8000-000000000002";
const published = "c0000000-0000-4000-8000-000000000001";
const draft = "c0000000-0000-4000-8000-000000000002";
const galleryOff = "c0000000-0000-4000-8000-000000000003";
const wishesOff = "c0000000-0000-4000-8000-000000000004";
const expired = "c0000000-0000-4000-8000-000000000005";
const hostPhoto = `data:image/jpeg;base64,${Buffer.from([0xff, 0xd8, 0xff, 0x01, 0xff, 0xd9]).toString("base64")}`;

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

// A session-level claim survives RESET ROLE, so each block clears both.
async function asGuest(callback: () => Promise<unknown>) {
  await db.exec("RESET ROLE; SET request.jwt.claim.sub = ''; SET ROLE anon;");
  try {
    return await callback();
  } finally {
    await db.exec("RESET ROLE; RESET request.jwt.claim.sub;");
  }
}

async function asUser(userId: string, callback: () => Promise<unknown>) {
  await db.exec(`RESET ROLE; SET request.jwt.claim.sub = '${userId}'; SET ROLE authenticated;`);
  try {
    return await callback();
  } finally {
    await db.exec("RESET ROLE; RESET request.jwt.claim.sub;");
  }
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
  await db.exec(galleryMigration);
  await db.exec(lockDownMigration);
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
    for (const [local, hosted] of [
      ["../../supabase/migrations/20261021000000_card_gallery_and_wishes.sql", galleryMigration],
      [
        "../../supabase/migrations/20261021090000_host_only_gallery_and_real_rsvp_names.sql",
        lockDownMigration,
      ],
    ] as const) {
      expect(readFileSync(new URL(local, import.meta.url), "utf8")).toBe(hosted);
    }
    await db.exec(galleryMigration);
    await db.exec(lockDownMigration);
    expect(
      (await db.query("SELECT 1 FROM pg_policies WHERE tablename='invitation_wishes'")).rows,
    ).toHaveLength(2);
    expect(
      (await db.query("SELECT 1 FROM pg_constraint WHERE conname='invitation_photos_host_only'"))
        .rows,
    ).toHaveLength(1);
  });

  it("refuses every anonymous gallery upload, even a valid JPEG", async () => {
    await asGuest(async () => {
      await expect(
        db.query("SELECT public.add_invitation_photo($1,$2,'Guest frame')", [published, hostPhoto]),
      ).rejects.toThrow(/permission denied/);
      expect(
        (await db.query("SELECT slot FROM public.invitation_photos WHERE card_id=$1", [published]))
          .rows,
      ).toHaveLength(0);
    });
  });

  it("accepts uploads only from the card's own host", async () => {
    // A signed-in visitor who does not own the card is still refused.
    await asUser(bob, async () => {
      await expect(
        db.query("SELECT public.add_invitation_photo($1,$2,'Not mine')", [published, hostPhoto]),
      ).rejects.toThrow(/Only the host/);
    });

    await asUser(alice, async () => {
      await db.query("SELECT public.add_invitation_photo($1,$2,'Our portrait')", [
        draft,
        hostPhoto,
      ]);
      await db.query("SELECT public.add_invitation_photo($1,$2,'Haldi')", [galleryOff, hostPhoto]);
      await db.query("SELECT public.add_invitation_photo($1,$2,'Host frame')", [
        published,
        hostPhoto,
      ]);
    });
    const rows = await db.query<{ source: string }>(
      "SELECT source FROM public.invitation_photos WHERE card_id=$1",
      [published],
    );
    expect(rows.rows).toEqual([{ source: "host" }]);
  });

  it("keeps drafts, hidden galleries and expired cards invisible to guests", async () => {
    await asGuest(async () => {
      for (const id of [draft, galleryOff, expired]) {
        expect(
          (await db.query("SELECT slot FROM public.invitation_photos WHERE card_id=$1", [id])).rows,
        ).toHaveLength(0);
      }
      expect(
        (await db.query("SELECT slot FROM public.invitation_photos WHERE card_id=$1", [published]))
          .rows,
      ).toHaveLength(1);
    });
  });

  it("lets the host remove their own photo and blocks everyone else", async () => {
    await asUser(bob, async () => {
      await expect(
        db.query("SELECT public.delete_invitation_photo($1,1::smallint)", [published]),
      ).rejects.toThrow(/Only the host/);
    });
    await asGuest(async () => {
      await expect(
        db.query("SELECT public.delete_invitation_photo($1,1::smallint)", [published]),
      ).rejects.toThrow(/permission denied/);
      await expect(db.query("DELETE FROM public.invitation_photos")).rejects.toThrow(
        /permission denied/,
      );
    });
    await asUser(alice, async () => {
      await db.query("SELECT public.delete_invitation_photo($1,1::smallint)", [published]);
    });
    expect(
      (await db.query("SELECT slot FROM public.invitation_photos WHERE card_id=$1", [published]))
        .rows,
    ).toHaveLength(0);
  });

  it("accepts wishes only on published, opted-in cards and keeps drafts private", async () => {
    await asGuest(async () => {
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
    });
  });

  it("accepts real RSVP names and rejects blank, numeric or placeholder ones", async () => {
    const insert = (name: string) =>
      db.query(
        "INSERT INTO public.invitation_rsvps(card_id,name,attending,guests) VALUES ($1,$2,true,1)",
        [published, name],
      );
    await asGuest(async () => {
      for (const good of ["Ayesha Khan", "Mohammad Obaidullah", "A. R. Rahman", "रेशम बेगम"]) {
        await insert(good);
      }
      for (const bad of [
        " ",
        "A",
        "1234",
        "Ahmed 2",
        "test",
        "guest",
        "aaaaaaaa",
        "A B",
        "someone@example.com",
        "https://example.com",
        "Ahmed 😀",
      ]) {
        await expect(insert(bad)).rejects.toThrow(/invitation_rsvps_valid_name|check constraint/);
      }
    });
    const names = await db.query<{ name: string }>(
      "SELECT name FROM public.invitation_rsvps ORDER BY created_at",
    );
    expect(names.rows).toHaveLength(4);
  });
});
