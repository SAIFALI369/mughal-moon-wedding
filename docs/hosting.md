# Hosting: Supabase + Vercel

This project is hosted with:

| Layer | Provider | What it runs |
| ----- | -------- | ------------ |
| Database, Auth, Realtime | **Supabase** project `ibqkslwleelhijhujjcm` (region `ap-northeast-1`) | Postgres schema, username/password auth, Realtime publications, private RSVP storage |
| AI concierge | **Supabase Edge Function** `wedding-concierge` | Server-side Gemini proxy for Simran |
| Website / SSR | **Vercel** project `mughal-moon-wedding` | TanStack Start server rendering, static assets, API server functions |

Production URLs:

- https://invitingyou.vercel.app (canonical `VITE_SITE_URL`)
- https://mughal-moon-wedding.vercel.app
- `invitation.cashiea.app` is attached to the project, but its DNS currently does not point at Vercel (`misconfigured: true`). Add the recommended `CNAME` at the registrar before sharing it.

Supabase API URL: `https://ibqkslwleelhijhujjcm.supabase.co`

> `supabase/config.toml` is pinned to this project ref. `.env` is git-ignored and holds the local copies of the public values. Never commit the service-role key or the Gemini key.

---

## 1. Supabase database

The schema is the ten migrations in [`drizzle/migrations`](../drizzle/migrations). They are mirrored, with timestamps, in [`supabase/migrations`](../supabase/migrations). Apply them in filename order (`0000` → `0009`; `0006` is a comment-only marker).

### Apply with a database connection string

```sh
export LOVABLE_DB_MIGRATION_URL="postgresql://postgres:[YOUR-DB-PASSWORD]@db.ibqkslwleelhijhujjcm.supabase.co:5432/postgres"
npm run db:migrate
```

`scripts/migrate.mjs` records applied files in `public.app_sql_migrations`, takes an advisory lock per file, and is safe to rerun. Without a URL it exits 0 during hosting builds (Vercel sets `CI=true`), and only fails when `REQUIRE_DB_MIGRATIONS=1` is explicitly set — the GitHub Actions job does that so CI never silently skips migrations.

### Apply from the Supabase Dashboard

Open **SQL Editor** and run each file in order. The same SQL is also runnable through the Supabase connector/API used to provision this project.

### Expected objects

Tables: `profiles`, `invitation_cards`, `invitation_rsvps`, `wedding_rsvps`, `wedding_wishes`, `wedding_photos`, `username_login_attempts`.

Functions: `register_username`, `username_login_address`, `add_wedding_photo`, `delete_wedding_photo`, `replace_wedding_photo`, `enforce_invitation_card_limit`, `delete_expired_invitations`, `valid_invitation_portrait`.

Realtime publications: `wedding_wishes`, `wedding_photos`.

Quick verification:

```sql
select tablename from pg_tables where schemaname = 'public' order by 1;
select proname from pg_proc where proname in
  ('register_username','username_login_address','add_wedding_photo','delete_expired_invitations');
```

### Auth model

- Guests do not need an account to view the invitation, submit the main RSVP, add a gallery photo, or chat with Simran.
- Creators authenticate with **username + password** or with the email address of an existing Supabase account. `register_username` writes the `profiles` row and the matching `auth.users` / `auth.identities` rows in one transaction; no email confirmation or mailbox is involved. The internal address is `<uuid>@accounts.invalid`.
- `0013_automatic_account_access.sql` adds an `AFTER INSERT` trigger on `auth.users`: any account created by the operator (dashboard, Auth admin API or CLI) gets a profile and a 10-credit `print_partners` row in the same transaction.
- RLS keeps `profiles` self-only, `wedding_rsvps` insert-only for visitors, and `invitation_rsvps` insert-only for guests / owner-readable for the card owner.

---

## 2. Supabase Edge Function

`supabase/functions/wedding-concierge` is deployed with `verify_jwt = false` because wedding guests are anonymous; the function does its own origin check, body-size limits and rate limiting.

```sh
supabase functions deploy wedding-concierge --project-ref ibqkslwleelhijhujjcm
```

Set the server secret in **Supabase Dashboard → Edge Functions → Secrets** (or `supabase secrets set`):

| Secret | Required | Purpose |
| ------ | -------- | ------- |
| `GEMINI_API_KEY` | For free-form AI replies | Google AI Studio key. Without it the chat still answers common greetings/music commands from the offline copy in the browser, and open-ended questions return a friendly "not configured" fallback. |
| `ALLOWED_ORIGIN` | Recommended | Exact production origin, e.g. `https://invitingyou.vercel.app`. Leave unset to accept any origin (CORS `*`) while the domain is being decided. |
| `GEMINI_MODEL` | Optional | Defaults to `gemini-2.5-flash`. |

The app server also has a fallback path (`src/components/wedding/gemini.server.ts`) that reads `GEMINI_API_KEY` from Vercel environment variables. Set the key in **both** places if you want the concierge to work when the Edge Function is unreachable.

If you do not have the Supabase CLI, the same function can be deployed through the Supabase connector/API by bundling the function first:

```sh
npx esbuild supabase/functions/wedding-concierge/index.ts \
  --bundle --format=esm --platform=neutral --target=esnext \
  --outfile=/tmp/wedding-concierge.bundle.ts
```

Then upload `/tmp/wedding-concierge.bundle.ts` as the `wedding-concierge` function body with JWT verification off.

---

## 3. Vercel environment variables

Project: `mughal-moon-wedding` (`prj_wklzWAFEg7zl73Gg1QB52IGOUEPq`, team `team_Z0Mwp7VGEOtLGRPMxP3n7znB`).

| Variable | Scope | Value |
| -------- | ----- | ----- |
| `SUPABASE_PROJECT_ID` | All | `ibqkslwleelhijhujjcm` |
| `SUPABASE_URL` | All | `https://ibqkslwleelhijhujjcm.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | All | Publishable key (`sb_publishable_…`) |
| `SUPABASE_SERVICE_ROLE_KEY` | All, sensitive | Service-role key. Required by `src/integrations/supabase/client.server.ts` for admin server functions. Never expose to the browser. |
| `VITE_SUPABASE_PROJECT_ID` | All | `ibqkslwleelhijhujjcm` |
| `VITE_SUPABASE_URL` | All | `https://ibqkslwleelhijhujjcm.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | All | Same publishable key |
| `VITE_SITE_URL` | Production | `https://invitingyou.vercel.app` |
| `GEMINI_API_KEY` | Production (optional) | Server fallback for the concierge |
| `LOVABLE_DB_MIGRATION_URL` | Production (optional) | Only if you want `postbuild` to apply migrations during a Vercel build. Prefer the GitHub Actions job or the Supabase Dashboard. |

`VITE_*` values are baked into the client bundle at build time, so change them in Vercel and redeploy; editing `.env` locally only affects local dev.

Project build settings already configured:

- Install command: `npm ci --allow-remote=all`
- Build command: `npm run build`
- Node.js: `24.x`
- Output: Nitro's Vercel preset (`.vercel/output`), selected automatically because `VERCEL=1`.
- Framework preset: `tanstack-start-lovable`

---

## 4. Deploying

### Automatic via GitHub

The Vercel project is linked to `SAIFALI369/mughal-moon-wedding` with production branch `main`, but Git-triggered deployments are currently **disabled** on the project (`gitProviderOptions.createDeployments = "disabled"`). Pushing to `main` therefore does not create a deployment. Enable Git deployments in **Vercel → Project → Settings → Git** if you want pushes to deploy automatically.

### Manual from this repository

```sh
npm ci
npm run build
npx vercel deploy --prod
```

Or, through the Vercel connector, create a deployment from the `main` (or feature) Git ref with `target: "production"`.

`postbuild` runs `node scripts/migrate.mjs`. On Vercel there is no database password, so it logs a skip and exits 0. Apply schema changes through the Supabase Dashboard, the connector, or the GitHub Actions migration job.

### Database migrations in CI

[`.github/workflows/migrate.yml`](../.github/workflows/migrate.yml) runs on every push to `main`, every six hours, and manually. It needs one repository secret:

```
LOVABLE_DB_MIGRATION_URL = postgresql://postgres:[password]@db.ibqkslwleelhijhujjcm.supabase.co:5432/postgres
```

(`DATABASE_URL` or `SUPABASE_DB_URL` also work.) The job applies pending migrations, verifies tables/policies/functions, and deletes expired invitation cards.

---

## 5. Smoke test after deployment

1. `GET /` — hero, countdown, event cards, gallery, RSVP form render.
2. Submit an RSVP with a unique name → success toast; the wish appears on the wishes wall. A duplicate name is rejected by the unique index.
3. `GET /sign-up` → create a username/password account → sign in at `/sign-in` → `/dashboard` loads.
4. Create and publish an invitation card → open `/invite/<slug>` in a private window, submit the private RSVP, confirm the owner sees it in the dashboard.
5. `GET /ai-concierge` and the homepage chat — offline greeting works without a Gemini key; with a key, an open-ended question returns a live answer.
6. `GET /cards/<id>` and `/invite-preview` load their previews.
7. Check the browser console/network for CORS errors against `https://ibqkslwleelhijhujjcm.supabase.co`.

## 6. Troubleshooting

- **`Missing Supabase environment variable(s)`** — a `VITE_SUPABASE_*` value is missing in the build environment. Add it in Vercel and redeploy (Vite inlines values at build time).
- **401/403 from PostgREST** — verify the publishable key belongs to project `ibqkslwleelhijhujjcm`; the old Lovable Cloud keys do not work here.
- **Server functions fail with service-role errors** — `SUPABASE_SERVICE_ROLE_KEY` is missing or scoped to the wrong environment.
- **Concierge returns "AI service is not configured"** — add `GEMINI_API_KEY` to the Edge Function secrets and to Vercel, then redeploy.
- **CORS 403 from the Edge Function** — `ALLOWED_ORIGIN` does not match the site origin exactly (scheme + host, no trailing slash).
- **RSVP duplicate error** — expected: one reply per normalized name.
- **Build fails at `postbuild`** — confirm the modified `scripts/migrate.mjs` is deployed (it skips when no DB URL and `REQUIRE_DB_MIGRATIONS` is unset).
