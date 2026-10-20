// @vitest-environment node
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";

const db = new PGlite();
const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const migration = read("../../drizzle/migrations/0013_automatic_account_access.sql");

beforeAll(async () => {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth; CREATE SCHEMA extensions;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid', true), '')::uuid $$;
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
    -- Control-flow doubles only; production uses pgcrypto bcrypt.
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
  await db.exec(read("../../drizzle/migrations/0010_exclusive_print_partners.sql"));
  await db.exec(read("../../drizzle/migrations/0011_partner_topup_safety.sql"));
  await db.exec(migration);
}, 30_000);

afterAll(() => db.close());

beforeEach(async () => {
  await db.exec(
    "RESET ROLE; TRUNCATE public.profiles, public.print_partners, public.partner_cash_packages, public.invitation_cards, public.username_login_attempts, auth.users, auth.identities CASCADE;",
  );
});

async function addAuthUser(
  email: string | null,
  meta: Record<string, unknown> = {},
  confirmed = true,
): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO auth.users
       (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at)
     VALUES (gen_random_uuid(), $1, extensions.crypt('password123', 'test'), $2, $3::jsonb, now())
     RETURNING id`,
    [email, confirmed ? new Date().toISOString() : null, JSON.stringify(meta)],
  );
  return rows[0].id;
}

const partner = (ownerId: string) =>
  db.query<{
    owner_id: string;
    shop_name: string;
    active: boolean;
    cards_purchased: number;
    cards_created: number;
  }>(
    "SELECT owner_id, shop_name, active, cards_purchased, cards_created FROM public.print_partners WHERE owner_id=$1",
    [ownerId],
  );

async function insertCard(ownerId: string, slug: string) {
  await db.query(
    "INSERT INTO public.invitation_cards (owner_id,title,slug) VALUES ($1,'Customer celebration',$2)",
    [ownerId, slug],
  );
}

it("gives an operator-created account a profile and ten credits", async () => {
  const id = await addAuthUser("Resham@Gmail.com");

  const profiles = await db.query("SELECT id, username, email FROM public.profiles");
  expect(profiles.rows).toEqual([{ id, username: "resham", email: "resham@gmail.com" }]);
  expect((await partner(id)).rows).toEqual([
    {
      owner_id: id,
      shop_name: "Resham",
      active: true,
      cards_purchased: 10,
      cards_created: 0,
    },
  ]);
});

it("prefers the username and shop name supplied in auth metadata", async () => {
  const id = await addAuthUser("bride@example.com", {
    username: "Bride_Groom",
    shop_name: "Patna Print House",
  });

  const profiles = await db.query("SELECT username FROM public.profiles WHERE id=$1", [id]);
  expect(profiles.rows).toEqual([{ username: "bride_groom" }]);
  expect((await partner(id)).rows[0]?.shop_name).toBe("Patna Print House");
});

it("keeps derived handles unique when email local parts collide", async () => {
  await addAuthUser("resham@gmail.com");
  await addAuthUser("resham@yahoo.com");

  const { rows } = await db.query<{ username: string; email: string }>(
    "SELECT username, email FROM public.profiles ORDER BY username",
  );
  expect(rows).toEqual([
    { username: "resham", email: "resham@gmail.com" },
    { username: "resham-2", email: "resham@yahoo.com" },
  ]);
  expect(
    (await db.query<{ count: number }>("SELECT count(*)::int AS count FROM public.print_partners"))
      .rows[0]?.count,
  ).toBe(2);
});

it("still provisions access when the email is already owned by another profile", async () => {
  await db.query(
    "INSERT INTO public.profiles (id, username, email) VALUES (gen_random_uuid(), 'existing_owner', 'resham@gmail.com')",
  );
  const id = await addAuthUser("resham@gmail.com");

  const profile = await db.query<{ username: string; email: string }>(
    "SELECT username, email FROM public.profiles WHERE id=$1",
    [id],
  );
  expect(profile.rows[0]?.username).toBe("resham");
  expect(profile.rows[0]?.email).toMatch(/@accounts\.invalid$/);
  expect((await partner(id)).rows[0]?.cards_purchased).toBe(10);
});

it("backfills access for an account that existed before the trigger", async () => {
  await db.exec("ALTER TABLE auth.users DISABLE TRIGGER ensure_account_access_on_auth_user");
  const id = await addAuthUser("late-arrival@example.com");
  await db.exec("ALTER TABLE auth.users ENABLE TRIGGER ensure_account_access_on_auth_user");

  expect((await partner(id)).rows).toHaveLength(0);
  await db.query("SELECT public.ensure_account_access($1)", [id]);
  expect((await partner(id)).rows[0]?.cards_purchased).toBe(10);
});

it("adds a paid top-up on top without double-granting at provisioning", async () => {
  const { rows } = await db.query<{ id: string }>(
    "SELECT public.provision_print_partner('print_shop','private-password','Patna Print House') AS id",
  );
  const id = rows[0].id;

  expect((await partner(id)).rows).toEqual([
    {
      owner_id: id,
      shop_name: "Patna Print House",
      active: true,
      cards_purchased: 10,
      cards_created: 0,
    },
  ]);
  expect((await db.query("SELECT * FROM public.partner_cash_packages")).rows).toHaveLength(0);

  await db.query("SELECT public.record_partner_cash_package('print_shop','Patna Print House')");
  expect((await partner(id)).rows[0]).toMatchObject({ cards_purchased: 20, cards_created: 0 });
  expect((await db.query("SELECT * FROM public.partner_cash_packages")).rows).toHaveLength(1);
});

it("enforces the ten-card lifetime limit for automatically granted access", async () => {
  const id = await addAuthUser("limit@example.com");
  for (let index = 0; index < 10; index += 1) await insertCard(id, `limit-card-${index}`);

  await expect(insertCard(id, "limit-card-ten")).rejects.toThrow(/credits/);
  expect((await partner(id)).rows[0]).toMatchObject({ cards_purchased: 10, cards_created: 10 });
});

it("does not let clients call the provisioning helper", async () => {
  const id = await addAuthUser("private@example.com");
  for (const role of ["anon", "authenticated"]) {
    await db.exec(`SET ROLE ${role}`);
    try {
      await expect(db.query("SELECT public.ensure_account_access($1)", [id])).rejects.toThrow(
        /permission denied/,
      );
    } finally {
      await db.exec("RESET ROLE");
    }
  }
});

it("keeps the Supabase and app migration files identical", () => {
  expect(read("../../supabase/migrations/20261020120000_automatic_account_access.sql")).toBe(
    migration,
  );
});
