# Personal wedding invitations

## For invitation creators

1. Sign in and open **Your invitations** (`/dashboard`). A new card starts as a **private draft**; each account can have up to three active cards.
2. Fill in both names, a real wedding date, the time, venue, address/city and main ceremony. All six essential wedding details always appear on the invitation. Add a message, story, hosting families, dress code, host contact, arrival notes, RSVP-by date and up to four extra events if you wish.
3. Choose a **theme** (Eid Light, Mughal Night, Classic, Aladin, Bihari Vibe, Mecca–Madinah, Luxury or Futuristic) and separately a **framework** (Moonlit Journey, Royal Folio, Cinematic Stage or Modern Mosaic). The cover and full preview update immediately. The original moonlit gate/hero remains the default.
4. Optionally upload groom and bride portraits. JPEG, PNG and WebP files up to 8 MB are resized and converted locally in the browser to JPEG data URLs under 180 KB each. Remove a photo at any time. Choose which optional sections are visible, including the opening gate, portraits and RSVP.
5. Preview before publishing. Only published, unexpired cards have public links. Publish and share the card's `/invite/:slug` link. To see guest replies, visit **My profile & RSVPs** (`/profile`) or the **RSVPs** link on a card. Only you can see replies for cards you own. Unpublishing stops new submissions while preserving existing replies for you; deleting a card removes its replies too.

### Host name and your AI assistant

Every personal card has its own AI assistant, named after the card's **host name** (`content.hostName`, up to 80 characters). The field is prefilled from your account name when you create a card, and you can change it. If it is left empty, the assistant uses the contact name, then the groom's name, so it always has a name.

- The assistant appears as a button on the **published** card at `/invite/:slug` only. It does not appear in the dashboard preview.
- It answers only from the card's visible sections. Sections you hide with the element toggles (message, story, schedule, venue map, dress code, contact, RSVP) are left out of its knowledge, not just from the page.
- It says that it is an AI assistant, never claims to be a person or the couple, and sends RSVPs to the on-page RSVP form. It cannot submit RSVPs, see guest replies or change music.
- It has its own limit: each visitor can send 5 messages per card per 24 hours. It does not use the main site's Simran quick replies, wedding facts or visitor counter.
- Anything you type into the card is treated as information for the assistant, not as instructions. Text such as "ignore your rules" in a story does not change how it behaves.
- Do not put private notes, phone numbers you do not want public, dietary details or payment information in the host name, message or story. Card content is public once published.

### Songs

Section **05 — Songs for your guests** in the editor lets you add up to **5 songs**:

- Files: MP3, M4A, WAV or OGG, up to **10 MB** each. Each song gets a title, taken from the file name and editable.
- Songs are uploaded when you choose them, into a **private** storage bucket named `invitation-songs`, under your own user-id folder. Only you can list or delete them.
- Guests see a **Songs** button on the published card. Playback starts only after a guest presses Play. Each song is requested as a signed link that expires after one hour, and only while the card is published and unexpired.
- **Songs are public to anyone with the link once the card is published.** Upload only music you have the right to share.
- Saving the card deletes songs you removed or replaced. Cancelling an edit deletes songs uploaded during that edit. Deleting a card removes its song files.

## Main invitation separation

The main Mohsin–Simran invitation, gallery, wishes, Simran concierge and RSVP are separate from every creator's card. Your card never borrows their couple portraits, event story or facts, and personal cards never show "Ask Simran", "Mohsin" or "Simran".

## Privacy and migration

Guest replies are inserted into `public.invitation_rsvps` without a client-side read or a public wishes post. Database row-level security permits an anonymous or signed-in guest to **insert** only while the associated card is published, unexpired and RSVP-enabled; **SELECT** is owner-only, through the card's immutable `owner_id`. Guest updates/deletions are not granted. Profile queries additionally filter to the signed-in user's card IDs. The per-card assistant never reads `invitation_rsvps`.

Portrait data and song references live in `invitation_cards.content`. Drafts are owner-only; publishing deliberately makes the chosen portraits and songs visible to everyone with the link. Database constraints block oversized/malformed JPEG data, and prevent newly published cards from omitting basic details. Existing published cards are grandfathered with a `NOT VALID` constraint but must be completed on subsequent edits. The client also validates before publishing. Do not put private notes into public invitation content.

### Song storage (migration 0010)

Migration `0010_invitation_songs` creates the private `invitation-songs` bucket (10 MB limit, audio MIME types only) and its storage policies:

- **Owners** can insert, list and delete objects only inside their own `auth.uid()` folder.
- **Guests** (anonymous or signed-in) can read an object only when a published, unexpired card lists its path in `content->'songs'`. Drafts, expired cards and unreferenced files stay private.
- Guests cannot upload, replace or delete.

Identical SQL lives in `drizzle/migrations/0010_invitation_songs.sql` and `supabase/migrations/20261019120000_invitation_songs.sql`, and the Drizzle journal lists it. Earlier migrations are unchanged.

**Storage sweep:** `delete_expired_invitations()` removes expired card rows but cannot remove files. The scheduled `scripts/cleanup-expired.mjs` therefore runs a sweep after the database delete. It lists the `invitation-songs` bucket through the Storage API with the service-role key, and removes files that no card's `content.songs` still references and that are at least 24 hours old. The age guard protects a host who has uploaded a song but not yet saved the card. Files that do not match the app's song path shape are never touched. The workflow passes `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from repository secrets to that step. Without them the script logs a warning and skips the sweep, so expired song files stay in the private bucket, unreadable by guests. The service-role key is never sent to the browser or put in a `VITE_` variable. Never delete `storage.objects` rows with SQL; use the Storage API.

Identical SQL for 0009 lives in `drizzle/migrations/0009_private_card_rsvps_and_portraits.sql` and `supabase/migrations/20261019090000_private_card_rsvps_and_portraits.sql`. This allows Lovable's Supabase migration sync and the repository runner to converge safely: the SQL is idempotent, and the Drizzle journal lists each file. `.github/workflows/migrate.yml` runs `scripts/migrate.mjs` on **every push/merge to `main`** and retries every six hours; the workflow fails rather than silently skipping if no authorized database URL is configured. It then checks tables, RLS policies, permissions and constraints. Configure a repository Actions secret `LOVABLE_DB_MIGRATION_URL` (or `DATABASE_URL` / `SUPABASE_DB_URL`) with a database connection string held only by the CI environment. Never put a database URL in frontend/Vite variables or commit it.

The assistant runs through the `wedding-concierge` Edge Function (`card` slug) with the app-server fallback `askHostAssistantServer`. Both use the Gemini key already configured for Simran. Gemini keys never go in `VITE_` variables or tracked files. The Edge Function reads the card through the public REST API with the publishable key, so it sees only published, unexpired cards. Redeploy the function after this change.

**Before treating the feature as live:** check that the merge's `Migrate Lovable Supabase` run passed both the migration and verification steps, that the `invitation-songs` bucket exists and is private, and that the redeployed `wedding-concierge` function answers a live card's slug. A deployed UI by itself does not prove that the private RSVP table or song bucket exists. If the migration job fails, repair the authorized database connection or apply the SQL through the connected Supabase project, then rerun the workflow and verify owner-only reads and private songs before sharing new links.

## Local verification

`npm test` includes:

- all 8 × 4 theme/framework combinations, required-field and element-selection tests, a browser-form mock for portrait compression and RSVP insertion, and PGlite policy tests for anonymous insert and owner-only reads;
- PGlite tests for migration 0010 using a stub `storage` schema: private bucket, owner-only folder access, guest reads only for published, unexpired cards, and byte-identical SQL in both migration folders;
- unit tests for the storage sweep (which files are removed, the 24-hour guard, batching, paging) and for the workflow wiring;
- unit tests for song file rules, stored song paths, assistant naming, the assistant's facts (hidden sections, control characters, length caps, main-site isolation) and the Edge Function's card branch;
- component tests for the assistant (Edge call, server fallback, retry, visitor limit), the guest song player (signed URLs only on Play, auto-advance, errors) and the editor's song section (upload, rejection, five-song cap, cleanup session);
- personal-invitation assertions that a live card names its assistant after the host and never shows Simran, while the dashboard preview shows neither the assistant nor the songs.

Run `npx tsc --noEmit` and `npm run build` as well. These tests do **not** replace checking the live database and Edge Function after deployment.
