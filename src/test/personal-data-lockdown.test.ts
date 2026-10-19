// @vitest-environment node
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, expect, it } from "vitest";

const db = new PGlite();
const sql = (name: string) =>
  readFileSync(new URL(`../../drizzle/migrations/${name}`, import.meta.url), "utf8");
const migration0007 = sql("0007_lock_down_personal_data.sql");

beforeAll(async () => {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE PUBLICATION supabase_realtime;
    CREATE SCHEMA auth; CREATE SCHEMA extensions;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT NULL::uuid $$;
    CREATE TABLE auth.users (
      instance_id uuid, id uuid PRIMARY KEY, aud text, role text, email text,
      encrypted_password text, email_confirmed_at timestamptz,
      raw_app_meta_data jsonb, raw_user_meta_data jsonb, created_at timestamptz,
      updated_at timestamptz, confirmation_token text, recovery_token text,
      email_change_token_new text, email_change text, banned_until timestamptz
    );
    CREATE TABLE auth.identities (
      id uuid PRIMARY KEY, user_id uuid REFERENCES auth.users, provider_id text,
      identity_data jsonb, provider text, created_at timestamptz, updated_at timestamptz
    );
    -- PGlite lacks pgcrypto; production uses real bcrypt via pgcrypto.
    CREATE FUNCTION extensions.gen_salt(text, integer) RETURNS text LANGUAGE sql AS $$ SELECT 'test'::text $$;
    CREATE FUNCTION extensions.crypt(text, text) RETURNS text LANGUAGE sql AS $$ SELECT 'hash:' || $1 $$;
  `);
  await db.exec(sql("0000_wedding_rsvp_and_live_wishes.sql"));
  await db.exec(sql("0001_shared_guest_gallery.sql"));
  await db.exec(sql("0002_personal_invitation_cards.sql"));
  await db.exec(sql("0003_wedding_photos_owner_and_2mb.sql"));
  await db.exec(
    sql("0005_username_password_auth.sql").replace(
      "CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;",
      "",
    ),
  );
  await db.exec(migration0007);
}, 30_000);
afterAll(() => db.close());

it("keeps both migration paths identical", () => {
  const supabaseCopy = readFileSync(
    new URL(
      "../../supabase/migrations/20261019000000_lock_down_personal_data.sql",
      import.meta.url,
    ),
    "utf8",
  );
  expect(supabaseCopy).toBe(migration0007);
});

it("is safe to reapply without errors", async () => {
  await db.exec(migration0007); // throws → test fails
});

it("lets no anonymous visitor read profiles, emails or RSVPs", async () => {
  await db.exec("SET ROLE anon;");
  try {
    await expect(db.query("SELECT * FROM public.profiles")).rejects.toThrow("permission denied");
    await expect(db.query("SELECT * FROM public.wedding_rsvps")).rejects.toThrow(
      "permission denied",
    );
  } finally {
    await db.exec("RESET ROLE;");
  }
});

it("lets signed-in users read only their own profile, never others' emails", async () => {
  const { rows } = await db.query<{ id: string }>(
    "INSERT INTO public.profiles (id, username, email) VALUES (gen_random_uuid(), 'alice', 'alice@example.invalid'), (gen_random_uuid(), 'bob', 'bob@example.invalid') RETURNING id, username",
  );
  const [alice, bob] = rows;
  await db.exec(
    `CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT '${alice?.id}'::uuid $$;`,
  );
  await db.exec("SET ROLE authenticated;");
  try {
    const visible = await db.query<{ username: string; email: string }>(
      "SELECT username, email FROM public.profiles",
    );
    expect(visible.rows).toHaveLength(1);
    expect(visible.rows[0]?.username).toBe("alice");
    expect(JSON.stringify(visible.rows)).not.toContain("bob@example.invalid");
    await expect(
      db.query("SELECT * FROM public.profiles WHERE username = 'bob'"),
    ).resolves.toMatchObject({ rows: [] });
  } finally {
    await db.exec("RESET ROLE;");
    await db.exec(
      "CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT NULL::uuid $$;",
    );
  }
});

it("keeps the wishes wall and published gallery publicly readable", async () => {
  await db.exec("SET ROLE anon;");
  try {
    const wishes = await db.query("SELECT name, message FROM public.wedding_wishes");
    expect(wishes.rows).toEqual([]);
    const photos = await db.query("SELECT slot, caption FROM public.wedding_photos");
    expect(photos.rows).toEqual([]);
  } finally {
    await db.exec("RESET ROLE;");
  }
});

it("blocks direct client writes to the photo gallery (RPC-only)", async () => {
  await db.exec("SET ROLE authenticated;");
  try {
    await expect(db.exec("UPDATE public.wedding_photos SET caption = 'hacked'")).rejects.toThrow(
      "permission denied",
    );
    await expect(db.exec("DELETE FROM public.wedding_photos")).rejects.toThrow("permission denied");
    await expect(
      db.exec("INSERT INTO public.wedding_photos (slot, image_data, caption) VALUES (1, 'x', 'x')"),
    ).rejects.toThrow("permission denied");
  } finally {
    await db.exec("RESET ROLE;");
  }
});
