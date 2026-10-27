// @vitest-environment node
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Two partners must be able to publish two cards that use the *same theme*.
 * The only uniqueness the database enforces is the share slug, so this pins the
 * whole insert → publish path (credit trigger, published_at trigger, featured
 * theme inside `content`) against regressions.
 */
const db = new PGlite();
const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

beforeAll(async () => {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth; CREATE SCHEMA extensions;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid', true), '')::uuid $$;
    CREATE TABLE auth.users (instance_id uuid, id uuid PRIMARY KEY, aud text, role text, email text, encrypted_password text, email_confirmed_at timestamptz, raw_app_meta_data jsonb, raw_user_meta_data jsonb, created_at timestamptz, updated_at timestamptz, confirmation_token text, recovery_token text, email_change_token_new text, email_change text, banned_until timestamptz);
    CREATE TABLE auth.identities (id uuid PRIMARY KEY, user_id uuid REFERENCES auth.users, provider_id text, identity_data jsonb, provider text, created_at timestamptz, updated_at timestamptz);
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
  await db.exec(read("../../drizzle/migrations/0004_invitation_expiry_and_memory.sql"));
  await db.exec(read("../../drizzle/migrations/0018_lock_published_couple_identity.sql"));
  await db.exec(read("../../drizzle/migrations/0019_dd_mm_yyyy_dates.sql"));
}, 60_000);

afterAll(() => db.close());

const content = (theme: string) => ({
  groomName: "Ayaan",
  brideName: "Zara",
  date: "26/11/2029",
  time: "4:00 PM",
  venue: "Patna Club",
  address: "Patna, Bihar",
  theme,
  framework: "royal-folio",
});

async function provision(username: string) {
  const { rows } = await db.query<{ id: string }>(
    "SELECT public.provision_print_partner($1, 'password123', 'Patna Print House') AS id",
    [username],
  );
  return rows[0].id;
}

describe("publishing cards", () => {
  it("creates and publishes two cards that share a theme", async () => {
    await db.exec(
      "TRUNCATE public.profiles, auth.users, auth.identities, public.print_partners, public.partner_cash_packages, public.invitation_cards CASCADE;",
    );
    const owner = await provision("same_theme_shop");

    const published: string[] = [];
    for (const [index, slug] of ["ayaan-zara-one", "ayaan-zara-two"].entries()) {
      const { rows } = await db.query<{ id: string }>(
        `INSERT INTO public.invitation_cards (owner_id, title, slug, status, content)
         VALUES ($1, 'Ayaan & Zara', $2, 'draft', $3::jsonb) RETURNING id`,
        [owner, slug, JSON.stringify(content("royal-rajmahal"))],
      );
      const id = rows[0].id;
      // The publishing step the app performs, verified like the app now does.
      const update = await db.query<{ status: string; published_at: string | null }>(
        "UPDATE public.invitation_cards SET status = 'published' WHERE id = $1 AND owner_id = $2 RETURNING status, published_at",
        [id, owner],
      );
      expect(update.rows[0]?.status).toBe("published");
      expect(update.rows[0]?.published_at).not.toBeNull();
      published.push(id);
      expect(index).toBeLessThan(2);
    }

    const cards = await db.query<{ slug: string; status: string; theme: string }>(
      "SELECT slug, status, content->>'theme' AS theme FROM public.invitation_cards ORDER BY created_at",
    );
    expect(cards.rows).toEqual([
      { slug: "ayaan-zara-one", status: "published", theme: "royal-rajmahal" },
      { slug: "ayaan-zara-two", status: "published", theme: "royal-rajmahal" },
    ]);

    const partner = await db.query<{ cards_created: number }>(
      "SELECT cards_created FROM public.print_partners WHERE owner_id = $1",
      [owner],
    );
    expect(partner.rows[0]?.cards_created).toBe(2);
  });

  it("rejects a duplicate share slug instead of silently dropping the card", async () => {
    await db.exec(
      "TRUNCATE public.profiles, auth.users, auth.identities, public.print_partners, public.partner_cash_packages, public.invitation_cards CASCADE;",
    );
    const owner = await provision("dupe_slug_shop");
    await db.query(
      `INSERT INTO public.invitation_cards (owner_id, title, slug, content)
       VALUES ($1, 'Ayaan & Zara', 'ayaan-zara-abc123', $2::jsonb)`,
      [owner, JSON.stringify(content("royal-rajmahal"))],
    );
    // This is the 23505 the client now retries with a fresh slug.
    await expect(
      db.query(
        `INSERT INTO public.invitation_cards (owner_id, title, slug, content)
         VALUES ($1, 'Ayaan & Zara', 'ayaan-zara-abc123', $2::jsonb)`,
        [owner, JSON.stringify(content("royal-rajmahal"))],
      ),
    ).rejects.toThrow(/duplicate key|unique/i);
  });
});
