// @vitest-environment node
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, afterAll, it, expect } from "vitest";
const db = new PGlite();
const migration = readFileSync(new URL("../../drizzle/migrations/0005_username_password_auth.sql", import.meta.url), "utf8");
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
    -- PGlite lacks pgcrypto. Deterministic doubles test control flow only;
    -- production migration uses pgcrypto bcrypt, never these test functions.
    CREATE FUNCTION extensions.gen_salt(text, integer) RETURNS text LANGUAGE sql AS $$ SELECT 'test'::text $$;
    CREATE FUNCTION extensions.crypt(text, text) RETURNS text LANGUAGE sql AS $$ SELECT 'hash:' || $1 $$;
  `);
  await db.exec(readFileSync(new URL("../../drizzle/migrations/0002_personal_invitation_cards.sql", import.meta.url), "utf8"));
  await db.exec(migration.replace("CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;", ""));
}, 30000);
afterAll(() => db.close());
it("registers a confirmed account, identity and private profile atomically", async () => {
  await db.query("SELECT public.register_username($1,$2)", ["Bride_Groom", "secret123"]);
  const { rows } = await db.query<{ email: string; email_confirmed_at: string; username: string }>("SELECT u.email, u.email_confirmed_at, p.username FROM auth.users u JOIN public.profiles p ON p.id=u.id JOIN auth.identities i ON i.user_id=u.id");
  expect(rows).toHaveLength(1);
  expect(rows[0]?.email).toMatch(/@accounts\.invalid$/);
  expect(rows[0]?.email_confirmed_at).toBeTruthy();
  expect(rows[0]?.username).toBe("Bride_Groom");
  expect(migration).toContain("gen_salt('bf', 10)");
});
it("rejects duplicate handles case insensitively without leaving an orphan", async () => {
  await expect(db.query("SELECT public.register_username($1,$2)", ["bride_groom", "other123"])).rejects.toThrow();
  const { rows } = await db.query<{ count: number }>("SELECT count(*)::int AS count FROM auth.users");
  expect(rows[0]?.count).toBe(1);
});
it("checks passwords and normalizes exact usernames, including underscores", async () => {
  const good = await db.query<{ email: string | null }>("SELECT public.username_login_address($1,$2) AS email", [" BRIDE_GROOM ", "secret123"]);
  expect(good.rows[0]?.email).toMatch(/@accounts\.invalid$/);
  for (const [name, password] of [["Bride_Groom", "wrong"], ["BrideXGroom", "secret123"], ["missing", "secret123"]]) {
    const bad = await db.query<{ email: string | null }>("SELECT public.username_login_address($1,$2) AS email", [name, password]);
    expect(bad.rows[0]?.email).toBeNull();
  }
});
it("limits repeated password guesses", async () => {
  for (let i = 0; i < 20; i++) await db.query("SELECT public.username_login_address($1,$2)", ["Bride_Groom", "wrong"]);
  const { rows } = await db.query<{ email: string | null }>("SELECT public.username_login_address($1,$2) AS email", ["Bride_Groom", "secret123"]);
  expect(rows[0]?.email).toBeNull();
});
it("validates credentials server-side", async () => {
  for (const [name, password] of [["ab", "secret123"], ["bad@name", "secret123"], ["valid", "short"], ["valid", "a".repeat(73)]]) {
    await expect(db.query("SELECT public.register_username($1,$2)", [name, password])).rejects.toThrow();
  }
});
it("denies anonymous profile reads and writes", async () => {
  await db.exec("SET ROLE anon");
  await expect(db.query("SELECT * FROM public.profiles")).rejects.toThrow();
  await expect(db.query("INSERT INTO public.profiles (id,username,email) VALUES (gen_random_uuid(),'bypass','bad@example.com')")).rejects.toThrow();
  await db.exec("RESET ROLE");
});
it("keeps both migration paths identical and is safe to reapply", async () => {
  expect(readFileSync(new URL("../../supabase/migrations/20261018000000_username_password_auth.sql", import.meta.url), "utf8")).toBe(migration);
  await db.exec(migration.replace("CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;", ""));
});

it("rescues pending legacy signups without changing their account IDs", async () => {
  const id = "99999999-9999-4999-8999-999999999999";
  await db.query(`INSERT INTO auth.users (id, email, encrypted_password, raw_user_meta_data, created_at)
    VALUES ($1, 'legacy@example.com', extensions.crypt('oldpassword', 'test'), '{"username":"Legacy_User"}', now())`, [id]);
  await db.exec(migration.replace("CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;", ""));
  const { rows } = await db.query<{ email: string | null }>("SELECT public.username_login_address('legacy_user', 'oldpassword') AS email");
  expect(rows[0]?.email).toBe("legacy@example.com");
  const user = await db.query<{ id: string; email_confirmed_at: string }>("SELECT id, email_confirmed_at FROM auth.users WHERE id=$1", [id]);
  expect(user.rows[0]?.id).toBe(id);
  expect(user.rows[0]?.email_confirmed_at).toBeTruthy();
});
