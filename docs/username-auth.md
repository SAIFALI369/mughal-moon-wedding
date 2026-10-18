# Username/password accounts

Sign up and sign in with a username and password only. Handles are unique ignoring
case and leading/trailing spaces. New accounts are confirmed immediately; no OTP,
email entry or inbox is involved. Supabase password sessions remain in use (with
a UUID-based `@accounts.invalid` internal identifier). Passwords are bcrypt hashed
in the database. Registration reserves the profile and creates the Auth user and
identity in one transaction. Requires the standard Supabase Auth schema and a
migration role able to write `auth.users` / `auth.identities` and install pgcrypto.

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

After deployment, check workflow/build logs and test: signup, logout, mixed-case
username login, duplicate username, wrong password, and direct recovery URLs (404).
Tests use PGlite with mocked Auth schema and hashing functions; they do not replace
a smoke test against the actual hosted Supabase Auth API.
