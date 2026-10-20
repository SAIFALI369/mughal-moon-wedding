// @vitest-environment node
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";

const db = new PGlite();
const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const migration = read("../../drizzle/migrations/0012_link_existing_email_accounts.sql");

beforeAll(async () => {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
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
    -- Deterministic password doubles only; production uses pgcrypto bcrypt.
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
}, 30_000);

afterAll(() => db.close());

beforeEach(async () => {
  await db.exec(
    "RESET ROLE; TRUNCATE public.profiles, public.username_login_attempts, auth.users, auth.identities CASCADE;",
  );
});

async function addEmailUser(
  email: string,
  { password = "old-password", confirmed = true } = {},
): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO auth.users
       (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at)
     VALUES (gen_random_uuid(), $1, extensions.crypt($2, 'test'), $3, '{}'::jsonb, now())
     RETURNING id`,
    [email, password, confirmed ? new Date().toISOString() : null],
  );
  return rows[0].id;
}

const applyMigration = () => db.exec(migration);

it("gives each confirmed email account a profile and derived username", async () => {
  const id = await addEmailUser("Resham@Gmail.com");
  await applyMigration();

  const { rows } = await db.query<{ id: string; username: string; email: string }>(
    "SELECT id, username, email FROM public.profiles",
  );
  expect(rows).toEqual([{ id, username: "resham", email: "resham@gmail.com" }]);

  await applyMigration();
  const again = await db.query<{ count: number }>(
    "SELECT count(*)::int AS count FROM public.profiles",
  );
  expect(again.rows[0]?.count).toBe(1);
});

it("signs in with either the derived username or the original email", async () => {
  await addEmailUser("saiffali@gmail.com", { password: "private-password" });
  await applyMigration();

  for (const identifier of ["saiffali", " SAIFFALI@GMAIL.COM "]) {
    const { rows } = await db.query<{ email: string | null }>(
      "SELECT public.username_login_address($1,$2) AS email",
      [identifier, "private-password"],
    );
    expect(rows[0]?.email).toBe("saiffali@gmail.com");
  }

  const wrong = await db.query<{ email: string | null }>(
    "SELECT public.username_login_address('saiffali@gmail.com','wrong-password') AS email",
  );
  expect(wrong.rows[0]?.email).toBeNull();
});

it("keeps derived usernames unique when email local parts collide", async () => {
  await addEmailUser("resham@gmail.com");
  await addEmailUser("resham@yahoo.com");
  await applyMigration();

  const { rows } = await db.query<{ username: string; email: string }>(
    "SELECT username, email FROM public.profiles ORDER BY username",
  );
  expect(rows).toEqual([
    { username: "resham", email: "resham@gmail.com" },
    { username: "resham-2", email: "resham@yahoo.com" },
  ]);
});

it("never invents a profile for unconfirmed or internal accounts", async () => {
  await addEmailUser("pending@example.com", { confirmed: false });
  await addEmailUser("00000000-0000-4000-8000-000000000000@accounts.invalid");
  await applyMigration();

  const { rows } = await db.query<{ count: number }>(
    "SELECT count(*)::int AS count FROM public.profiles",
  );
  expect(rows[0]?.count).toBe(0);
});

it("does not duplicate an email already owned by another profile", async () => {
  await db.query(
    "INSERT INTO public.profiles (id, username, email) VALUES (gen_random_uuid(), 'existing_owner', 'resham@gmail.com')",
  );
  await addEmailUser("resham@gmail.com");
  await applyMigration();

  const { rows } = await db.query<{ username: string; email: string }>(
    "SELECT username, email FROM public.profiles",
  );
  expect(rows).toEqual([{ username: "existing_owner", email: "resham@gmail.com" }]);
});

it("keeps the Supabase and app migration files identical", () => {
  expect(read("../../supabase/migrations/20261020000000_link_existing_email_accounts.sql")).toBe(
    migration,
  );
});
