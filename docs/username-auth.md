# Username/password accounts

New accounts are created with a username and password only; public registration is
disabled and every shop account is issued by an operator. Sign-in accepts either
that username or the email address of an existing Supabase Auth account. Handles
are unique ignoring case and leading/trailing spaces. New accounts are confirmed
immediately; no OTP, email entry or inbox is involved. Supabase password sessions
remain in use (with a UUID-based `@accounts.invalid` internal identifier).
Passwords are bcrypt hashed in the database. Registration reserves the profile and
creates the Auth user and identity in one transaction. Requires the standard
Supabase Auth schema and a migration role able to write `auth.users` /
`auth.identities` and install pgcrypto.

## Existing Supabase email accounts

Accounts created directly in Supabase (for example with **Add user** in the Auth
dashboard) have an `auth.users` row and a password but no `public.profiles` row.
The username login RPC joins `profiles`, so those accounts previously could not
sign in at all. Migration `0012_link_existing_email_accounts.sql` fixes this
without changing any account ID, email or password:

- Each **confirmed** email account that lacks a profile receives one, with a
  username derived from the email local part (`resham@gmail.com` → `resham`).
  Collisions get `-2`, `-3`, …; accounts whose address is already owned by another
  profile are skipped for operator review.
- `username_login_address` now matches either the profile username or the Auth
  email, still only returning the address after the supplied password verifies.
  Handles longer than 30 characters are accepted for email identifiers (up to the
  254-character email limit).
- `@accounts.invalid` internal accounts and unconfirmed addresses are untouched.

The form in `src/routes/sign-in.tsx` also sends any identifier containing `@`
straight to `signInWithPassword`, so a legacy email account works even before the
profile backfill is deployed. Signing in does **not** grant partner credits; an
operator still records the ₹1,000 cash package before cards can be created.

There is **no application password recovery/reset route**. Losing a password means
creating a different username/account; old cards remain with the original account.
Existing users and cards retain their IDs. The migration also backfills valid
username metadata from previous pending signups, and confirms existing profile
accounts so they can sign in without an email OTP. Conflicting handles are not
reassigned. The login RPC verifies the password before returning the private login
identifier and allows at most 20 checks per normalized handle per minute. Supabase
Auth applies its own rate limits to the subsequent password grant. Invalid handles
and wrong passwords use the same UI message.

This removes recovery from this app; it does not disable Supabase Auth's hosted
recovery API for legacy email accounts or prevent privileged administrators from
changing accounts. New accounts use a non-deliverable internal address.

## Automatic deployment after merge

Matching SQL is checked into both migration directories:

- `supabase/migrations/20261018000000_username_password_auth.sql`
- `drizzle/migrations/0005_username_password_auth.sql`
- `supabase/migrations/20261020000000_link_existing_email_accounts.sql`
- `drizzle/migrations/0012_link_existing_email_accounts.sql`

The existing `npm run build` postbuild hook invokes `scripts/migrate.mjs`. Set
`LOVABLE_DB_MIGRATION_URL` (or `DATABASE_URL` / `SUPABASE_DB_URL`) **in the server-side
Lovable build environment** for it to apply migrations. Never prefix these secrets
with `VITE_` or expose them in browser code. A source merge alone does **not**
guarantee Lovable will apply SQL; neither database credentials nor native Lovable
migration execution can be provisioned from repository files here.

As an alternative, the GitHub workflow runs on every merge/push to `main`, manually,
and every six hours using the Actions secret `LOVABLE_DB_MIGRATION_URL` (with
`DATABASE_URL` / `SUPABASE_DB_URL` accepted as fallbacks). Runs are serialized and
not cancelled by subsequent merges. It intentionally
does not run production migrations on pull requests. Missing credentials now fail
the workflow rather than claiming success. The build hook skips when no database
URL exists for local builds; CI or `REQUIRE_DB_MIGRATIONS=1` fails on a missing URL.
Configured-DB migration failures always fail the build.

The runner tracks successful files in `public.app_sql_migrations`, uses a database
advisory lock, and applies new SQL atomically. Pre-existing untracked migrations
0000–0004 retain compatibility with historical “already exists” skips. New
migrations never swallow SQL errors. This auth migration is also safe to reapply
through the native Supabase migration path.

After deployment, check workflow/build logs and test: mixed-case username login,
email-account login, logout, duplicate username, wrong password, and direct
recovery URLs (404).
Tests use PGlite with mocked Auth schema and hashing functions; they do not replace
a smoke test against the actual hosted Supabase Auth API.
