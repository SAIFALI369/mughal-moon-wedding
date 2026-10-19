# Personal wedding invitations

## For invitation creators

1. Sign in and open **Your invitations** (`/dashboard`). A new card starts as a **private draft**; each account can have up to three active cards.
2. Fill in both names, a real wedding date, the time, venue, address/city and main ceremony. All six essential wedding details always appear on the invitation. Add a message, story, hosting families, dress code, host contact, arrival notes, RSVP-by date and up to four extra events if you wish.
3. Choose a **theme** (Eid Light, Mughal Night, Classic, Aladin, Bihari Vibe, Mecca–Madinah, Luxury or Futuristic) and separately a **framework** (Moonlit Journey, Royal Folio, Cinematic Stage or Modern Mosaic). The cover and full preview update immediately. The original moonlit gate/hero remains the default.
4. Optionally upload groom and bride portraits. JPEG, PNG and WebP files up to 8 MB are resized and converted locally in the browser to JPEG data URLs under 180 KB each. Remove a photo at any time. Choose which optional sections are visible, including the opening gate, portraits and RSVP.
5. Preview before publishing. Only published, unexpired cards have public links. Publish and share the card's `/invite/:slug` link. To see guest replies, visit **My profile & RSVPs** (`/profile`) or the **RSVPs** link on a card. Only you can see replies for cards you own. Unpublishing stops new submissions while preserving existing replies for you; deleting a card removes its replies too.

The main Mohsin–Simran invitation, gallery, wishes and RSVP are separate from every creator's card. Your card never borrows their couple portraits or event story.

## Privacy and migration

Guest replies are inserted into `public.invitation_rsvps` without a client-side read or a public wishes post. Database row-level security permits an anonymous or signed-in guest to **insert** only while the associated card is published, unexpired and RSVP-enabled; **SELECT** is owner-only, through the card's immutable `owner_id`. Guest updates/deletions are not granted. Profile queries additionally filter to the signed-in user's card IDs.

Portrait data lives in `invitation_cards.content`. Drafts are owner-only; publishing deliberately makes the chosen portraits visible to everyone with the link. Database constraints block oversized/malformed JPEG data, and prevent newly published cards from omitting basic details. Existing published cards are grandfathered with a `NOT VALID` constraint but must be completed on subsequent edits. The client also validates before publishing. Do not put private notes into public invitation content.

Identical SQL lives in `drizzle/migrations/0009_private_card_rsvps_and_portraits.sql` and `supabase/migrations/20261019090000_private_card_rsvps_and_portraits.sql`. This allows Lovable's Supabase migration sync and the repository runner to converge safely: the SQL is idempotent, and the Drizzle journal lists the file. `.github/workflows/migrate.yml` runs `scripts/migrate.mjs` on **every push/merge to `main`** and retries every six hours; the workflow fails rather than silently skipping if no authorized database URL is configured. It then checks tables, RLS policies, permissions and constraints. Configure a repository Actions secret `LOVABLE_DB_MIGRATION_URL` (or `DATABASE_URL` / `SUPABASE_DB_URL`) with a database connection string held only by the CI environment. Never put a database URL in frontend/Vite variables or commit it.

**Before treating the feature as live:** check that the merge's `Migrate Lovable Supabase` run passed both the migration and verification steps. A deployed UI by itself does not prove that the private RSVP table exists. If the migration job fails, repair the authorized database connection or apply the SQL through the connected Supabase project, then rerun the workflow and verify owner-only reads before sharing new links.

## Local verification

`npm test` includes all 8 × 4 theme/framework combinations, required-field and element-selection tests, a browser-form mock for portrait compression and RSVP insertion, and PGlite policy tests for anonymous insert and owner-only reads. Run `npx tsc --noEmit` and `npm run build` as well. These tests do **not** replace checking the live database after deployment.
