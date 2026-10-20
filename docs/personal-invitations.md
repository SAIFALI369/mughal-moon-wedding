# Personal wedding invitations

## For invitation creators

1. Sign in and open **Your invitations** (`/dashboard`). A new card starts as a **private draft**; each account can have up to three active cards.
2. Fill in both names, a real wedding date, the time, venue, address/city and main ceremony. All six essential wedding details always appear on the invitation. Add a message, story, hosting families, host contact, arrival notes, RSVP-by date and up to four extra events if you wish. The **host name** field names your card's own AI assistant; if it is blank, the host contact, family line and finally the groom's first name are used.
3. Choose a **theme** (Eid Light, Mughal Night, Classic, Aladin, Bihari Vibe, Mecca–Madinah, Luxury or Futuristic) and separately a **framework** (Moonlit Journey, Royal Folio, Cinematic Stage or Modern Mosaic). The cover and full preview update immediately. The original moonlit gate/hero remains the default.
4. Add up to five songs (title + an `https://` audio link or a bundled `/audio/` file). Guests get a private soundtrack panel; nothing auto-plays. Quick-add buttons offer the six local instrumentals. Only share audio you have permission to distribute.
5. Optionally upload groom and bride portraits. JPEG, PNG and WebP files up to 8 MB are resized and converted locally in the browser to JPEG data URLs under 180 KB each. Remove a photo at any time. In the same **Photos** panel, add up to twelve shared gallery photos. **Only you can add or remove gallery photos**; guests get a read-only gallery with the lightbox. Choose which optional sections are visible, including the opening gate, portraits, gallery, wishes wall and RSVP.
6. Preview before publishing. Only published, unexpired cards have public links. Publish and share the card's `/invite/:slug` link. To see guest replies, visit **My profile & RSVPs** (`/profile`) or the **RSVPs** link on a card. Only you can see replies for cards you own. Unpublishing stops new submissions while preserving existing replies for you; deleting a card removes its replies too.

Every theme and framework now carries the same celebration features as the main Mohsin–Simran invitation, driven only by the card's own content:

- A **photo gallery** with the couple's portraits and up to twelve host photos. Guests can only look: tiles open a lightbox with previous/next buttons, arrow-key navigation and Escape to close. There is no visitor upload control, and the database rejects anonymous uploads even if somebody calls the API directly.
- A **wishes wall** where guests leave a name and a blessing; it refreshes live and is limited to 500 wishes per card.
- An **RSVP that accepts one reply per device**. After a successful reply the browser remembers it for that card and shows "Your reply is already with the host" instead of the form, so a guest cannot send a second reply from the same device.
- An **embedded map** with one tab per listed venue (the main ceremony plus extra events), plus "Open in Google Maps".
- **Per-event calendar links**, so each function can be saved separately, and a gold **confetti** celebration when an RSVP is accepted.
- A **share panel** that builds a personalised `/invite/:slug?guest=Name` link, copies it, or opens WhatsApp with the card's own names, date and venue. The `guest` parameter greets the visitor by name and prefills their RSVP.

The main Mohsin–Simran invitation, gallery, wishes and RSVP are separate from every creator's card. Your card never borrows their couple portraits or event story.

## Your card's AI host assistant and soundtrack

Every card is published with its own AI host assistant named after its host (for example “Ask Ayesha”). The floating assistant is rendered only on that card's page and answers guests from the saved card content: ceremony, date, time, venue, address, dress code, story, note, contact, extra events and the chosen songs. It never uses Mohsin & Simran's schedule, story or playlist.

- The **card content is the source of truth**. `askCardConcierge` re-reads the published card on the server for each request, so a guest cannot inject different facts. Drafts and expired cards cannot be queried.
- Answers go straight to the app server's Gemini fallback (`src/components/wedding/card-concierge.functions.ts` → `gemini.server.ts`); the homepage Edge Function is not required for card assistants. Set `GEMINI_API_KEY` in the hosting/server environment or the ignored `supabase/.env` for local development.
- Common questions (date, venue, dress code, contact, schedule, playlist, RSVP, greetings) are answered instantly in the browser, so the assistant still helps when no API key is configured or the network is slow.
- Each guest gets six AI answers per card per day (tracked in the browser) and the server applies a separate per-IP daily guard. The assistant cannot submit an RSVP, take payments, browse the web, or read other guests' replies.
- Model music changes are whitelisted: only `play`, `pause`, `next` and a 1-based track number are allowed. The guest still has to start playback themselves.
- Song URLs are restricted to `https://` or same-origin paths; `javascript:`, `data:` and credentialed URLs are rejected at validation and rendering.

The AI assistant and playlist only appear inside the published card (or as a non-floating preview inside the editor/dashboard) so they cannot cover the authoring UI.

## Gallery and wishes privacy

Both features are card-scoped: `public.invitation_photos` and `public.invitation_wishes` reference `invitation_cards(id)` with `ON DELETE CASCADE`, so a photo or blessing can never appear on another couple's invitation, and deleting a card removes both.

- Guest reads are permitted only while the card is published, unexpired and the relevant element toggle is on (`content->elements->>'gallery'` or `'wishes'`). The host can always read their own draft.
- Uploads go through the `add_invitation_photo` security-definer function, which now requires the caller to be the card's owner. It validates a JPEG data URL under 2 MB (and its JPEG start/end markers), serializes slot allocation per card and caps the total at twelve photos. `EXECUTE` is revoked from `anon`, so an anonymous visitor cannot reach the function at all; a signed-in non-owner is rejected by the ownership check inside it.
- `delete_invitation_photo` is owner-only for the same reason. Anonymous guests cannot delete anything, and legacy guest-uploaded photos stay visible but no new ones can be created (`invitation_photos_host_only` check constraint).
- Wishes accept direct inserts with column-level grants only, are capped at 500 per card, and are readable by anyone with the public link. RSVP contact details remain private in `invitation_rsvps` and are never mirrored to the wishes wall.
- RSVP names are compulsory and validated twice: in the browser (letters of any script, spaces and `. ' -`, at least two letters, no numbers/emoji/links/initials/placeholders) and by the `invitation_rsvps_valid_name` database constraint. The constraint is `NOT VALID` so existing replies stay readable while every new insert must pass.
- The card editor's **Photos** panel uses the same host upload path, so gallery photos appear in the published card and in preview.

## Privacy and migration

Guest replies are inserted into `public.invitation_rsvps` without a client-side read or a public wishes post. Database row-level security permits an anonymous or signed-in guest to **insert** only while the associated card is published, unexpired and RSVP-enabled; **SELECT** is owner-only, through the card's immutable `owner_id`. Guest updates/deletions are not granted. Profile queries additionally filter to the signed-in user's card IDs.

Portrait data lives in `invitation_cards.content`. Drafts are owner-only; publishing deliberately makes the chosen portraits visible to everyone with the link. Database constraints block oversized/malformed JPEG data, and prevent newly published cards from omitting basic details. Existing published cards are grandfathered with a `NOT VALID` constraint but must be completed on subsequent edits. The client also validates before publishing. Do not put private notes into public invitation content.

Card gallery and wishes SQL lives in `drizzle/migrations/0014_card_gallery_and_wishes.sql` and the byte-identical `supabase/migrations/20261021000000_card_gallery_and_wishes.sql`. Guest-proofing lives in `drizzle/migrations/0015_host_only_gallery_and_real_rsvp_names.sql` and `supabase/migrations/20261021090000_host_only_gallery_and_real_rsvp_names.sql`: it makes the gallery host-only and adds the real-name RSVP constraint. It also adds both tables to the `supabase_realtime` publication when that publication exists, which powers the live gallery and wishes wall.

Identical SQL lives in `drizzle/migrations/0009_private_card_rsvps_and_portraits.sql` and `supabase/migrations/20261019090000_private_card_rsvps_and_portraits.sql`. This allows Lovable's Supabase migration sync and the repository runner to converge safely: the SQL is idempotent, and the Drizzle journal lists the file. `.github/workflows/migrate.yml` runs `scripts/migrate.mjs` on **every push/merge to `main`** and retries every six hours; the workflow fails rather than silently skipping if no authorized database URL is configured. It then checks tables, RLS policies, permissions and constraints. Configure a repository Actions secret `LOVABLE_DB_MIGRATION_URL` (or `DATABASE_URL` / `SUPABASE_DB_URL`) with a database connection string held only by the CI environment. Never put a database URL in frontend/Vite variables or commit it.

**Before treating the feature as live:** check that the merge's `Migrate Lovable Supabase` run passed both the migration and verification steps. A deployed UI by itself does not prove that the private RSVP table exists. If the migration job fails, repair the authorized database connection or apply the SQL through the connected Supabase project, then rerun the workflow and verify owner-only reads before sharing new links.

## Local verification

`npm test` includes all 8 × 4 theme/framework combinations (including gallery, wishes, map and share sections in every one), required-field and element-selection tests, a browser-form mock for portrait compression and RSVP insertion, and PGlite policy tests for anonymous insert, owner-only reads, the twelve-photo limit, gallery and wishes toggles, expired or draft cards, refused anonymous gallery uploads and rejected invalid RSVP names. Run `npx tsc --noEmit` and `npm run build` as well. These tests do **not** replace checking the live database after deployment.
