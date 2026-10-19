// @vitest-environment node
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const db = new PGlite();
const sql = (name: string) =>
  readFileSync(new URL(`../../drizzle/migrations/${name}`, import.meta.url), "utf8");
const migration = sql("0010_invitation_songs.sql");

const owner = "d0000000-0000-4000-8000-000000000001"; // host with songs
const other = "d0000000-0000-4000-8000-000000000002"; // a different host
const publishedCard = "e0000000-0000-4000-8000-000000000001";
const draftCard = "e0000000-0000-4000-8000-000000000002";
const expiredCard = "e0000000-0000-4000-8000-000000000003";
const basics = {
  groomName: "Ayaan",
  brideName: "Zara",
  date: "15 December 2030",
  time: "4:00 PM IST",
  venue: "Garden Pavilion",
  address: "Patna, Bihar",
};
const liveSong = `${owner}/11111111-1111-4111-8111-111111111111.mp3`;
const draftSong = `${owner}/22222222-2222-4222-8222-222222222222.m4a`;
const expiredSong = `${other}/33333333-3333-4333-8333-333333333333.wav`;
const orphanSong = `${owner}/44444444-4444-4444-8444-444444444444.ogg`;

/** Runs `query` as a Supabase API role, with auth.uid() set like a PostgREST request. */
async function asRole(role: "anon" | "authenticated", uid: string | null, query: string) {
  await db.exec("RESET ROLE");
  await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [uid ?? ""]);
  await db.exec(`SET ROLE ${role}`);
  try {
    return await db.query<Record<string, unknown>>(query);
  } finally {
    await db.exec("RESET ROLE");
  }
}

async function songCard(id: string, status: "draft" | "published", path: string, expiry: string) {
  await db.query(
    "INSERT INTO public.invitation_cards(id,owner_id,title,slug,status,content,expires_at) VALUES ($1,$2,'Song Day',$3,$4,$5,$6)",
    [
      id,
      status === "published" && id === expiredCard ? other : owner,
      `song-day-${id.slice(-12)}`,
      status,
      JSON.stringify({ ...basics, songs: [{ id: "s1", title: "Song", path }] }),
      expiry,
    ],
  );
}

beforeAll(async () => {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE PUBLICATION supabase_realtime;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
      SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    -- Minimal stand-in for Supabase Storage: buckets, objects, and foldername() with the same meaning.
    CREATE SCHEMA storage;
    CREATE TABLE storage.buckets (
      id text PRIMARY KEY, name text NOT NULL, public boolean DEFAULT false,
      file_size_limit bigint, allowed_mime_types text[]
    );
    CREATE TABLE storage.objects (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      bucket_id text REFERENCES storage.buckets(id),
      name text NOT NULL,
      owner uuid,
      UNIQUE (bucket_id, name)
    );
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    CREATE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$
      SELECT (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
    GRANT USAGE ON SCHEMA storage TO anon, authenticated;
    GRANT SELECT, INSERT, DELETE ON storage.objects TO anon, authenticated;
    GRANT SELECT ON storage.buckets TO anon, authenticated;
  `);
  await db.exec(sql("0002_personal_invitation_cards.sql"));
  await db.exec(sql("0004_invitation_expiry_and_memory.sql"));
  await db.exec(sql("0009_private_card_rsvps_and_portraits.sql"));
  await db.exec(migration);
  await songCard(publishedCard, "published", liveSong, "2031-01-01T00:00:00Z");
  await songCard(draftCard, "draft", draftSong, "2031-01-01T00:00:00Z");
  await songCard(expiredCard, "published", expiredSong, "2020-01-01T00:00:00Z");
  for (const name of [liveSong, draftSong, expiredSong, orphanSong]) {
    const bucket = "invitation-songs";
    await db.query("INSERT INTO storage.objects (bucket_id, name, owner) VALUES ($1, $2, NULL)", [
      bucket,
      name,
    ]);
  }
}, 30_000);
afterAll(() => db.close());

describe("invitation song bucket", () => {
  it("is private, size limited, and accepts only audio types", async () => {
    const { rows } = await db.query<{
      public: boolean;
      file_size_limit: string;
      allowed_mime_types: string[];
    }>(
      "SELECT public, file_size_limit, allowed_mime_types FROM storage.buckets WHERE id = 'invitation-songs'",
    );
    expect(rows[0]?.public).toBe(false);
    expect(Number(rows[0]?.file_size_limit)).toBe(10 * 1024 * 1024);
    expect(rows[0]?.allowed_mime_types.every((type) => type.startsWith("audio/"))).toBe(true);
    expect(rows[0]?.allowed_mime_types).toContain("audio/mpeg");
  });

  it("is safe to apply again", async () => {
    await db.exec(migration); // throws → test fails
    const { rows } = await db.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM storage.buckets WHERE id = 'invitation-songs'",
    );
    expect(rows[0]?.count).toBe("1");
  });
});

describe("invitation song access", () => {
  it("lets a host upload only into their own folder", async () => {
    await asRole(
      "authenticated",
      owner,
      `INSERT INTO storage.objects (bucket_id, name, owner) VALUES ('invitation-songs', '${owner}/55555555-5555-4555-8555-555555555555.mp3', '${owner}') RETURNING name`,
    );
    await expect(
      asRole(
        "authenticated",
        owner,
        `INSERT INTO storage.objects (bucket_id, name, owner) VALUES ('invitation-songs', '${other}/66666666-6666-4666-8666-666666666666.mp3', '${owner}')`,
      ),
    ).rejects.toThrow();
  });

  it("lets a host read and delete only their own songs", async () => {
    const own = await asRole(
      "authenticated",
      owner,
      "SELECT name FROM storage.objects WHERE bucket_id = 'invitation-songs' AND name = '" +
        draftSong +
        "'",
    );
    expect(own.rows).toHaveLength(1);

    const foreign = await asRole(
      "authenticated",
      other,
      "SELECT name FROM storage.objects WHERE bucket_id = 'invitation-songs' AND name = '" +
        draftSong +
        "'",
    );
    expect(foreign.rows).toHaveLength(0);

    const denied = await asRole(
      "authenticated",
      other,
      "DELETE FROM storage.objects WHERE bucket_id = 'invitation-songs' AND name = '" +
        draftSong +
        "' RETURNING name",
    );
    expect(denied.rows).toHaveLength(0);
  });

  it("lets a guest hear a song only while a published, unexpired card lists it", async () => {
    const live = await asRole(
      "anon",
      null,
      "SELECT name FROM storage.objects WHERE bucket_id = 'invitation-songs' AND name = '" +
        liveSong +
        "'",
    );
    expect(live.rows).toHaveLength(1);
  });

  it("keeps draft, expired and unreferenced songs private from guests", async () => {
    for (const name of [draftSong, expiredSong, orphanSong]) {
      const hidden = await asRole(
        "anon",
        null,
        "SELECT name FROM storage.objects WHERE bucket_id = 'invitation-songs' AND name = '" +
          name +
          "'",
      );
      expect(hidden.rows, name).toHaveLength(0);
    }
  });

  it("never lets guests upload, replace or delete songs", async () => {
    await expect(
      asRole(
        "anon",
        null,
        `INSERT INTO storage.objects (bucket_id, name, owner) VALUES ('invitation-songs', '${owner}/77777777-7777-4777-8777-777777777777.mp3', NULL)`,
      ),
    ).rejects.toThrow();
    const removed = await asRole(
      "anon",
      null,
      "DELETE FROM storage.objects WHERE bucket_id = 'invitation-songs' AND name = '" +
        liveSong +
        "' RETURNING name",
    );
    expect(removed.rows).toHaveLength(0);
  });
});

describe("migration packaging", () => {
  it("ships identical SQL for Lovable and the scheduled runner, and journals it", () => {
    const supabaseCopy = readFileSync(
      new URL("../../supabase/migrations/20261019120000_invitation_songs.sql", import.meta.url),
      "utf8",
    );
    expect(supabaseCopy).toBe(migration);
    const journal = readFileSync(
      new URL("../../drizzle/migrations/meta/_journal.json", import.meta.url),
      "utf8",
    );
    expect(journal).toContain("0010_invitation_songs");
  });
});
