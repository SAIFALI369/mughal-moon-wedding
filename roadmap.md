# Wedding invitation update

- [x] Save RSVP replies and show live public Wishes; enforce one reply per normalized name.
- [x] Replace dark backgrounds with a light moon, clouds, and stars Eid look.
- [x] Test duplicate names and verify the live submission flow.
- [x] Update the complete invitation schedule to 22–23 November 2026.
- [x] Add the multilingual AI wedding concierge (**Simran**) and Supabase Gemini API key configuration files (`supabase/functions/wedding-concierge/gemini-key.ts` and `supabase/.env`).
- [x] Add glimmering flying butterflies and sparkles to the opening experience.
- [x] Create bride & groom photo configuration (`src/components/wedding/photos.ts` and `public/photos/`).
- [x] Configure soothing _Balagal Ula Bi Kamalihi_ background audio (`public/audio/balagal-ula-bi-kamalihi.wav`) with interactive Ruba'i verse card.
- [x] Add sticky navigation bar, Royal Mughal Night / Eid Day theme toggle, floating Simran chat widget, 3-venue interactive map, Google Calendar links, enhanced lightbox, and personalized guest invitation links (`/?guest=`).

## Guest gallery, soundtrack and chat polish

- [x] Add five insert-only, public guest-photo slots with a database-enforced global cap, image compression, live updates, lightbox and clear error states.
- [x] Add six local instrumental selections, including five original generated loops, and a visitor-local music panel with volume/next/pause controls.
- [x] Let Simran handle common music commands instantly and free-form Gemini requests through whitelisted playback actions.
- [x] Add chat retry/clear controls, more instant replies, request locking, WebP assets and a social share image.
- [x] Share event data across the invitation and both AI backends; add SQL permission/limit and chat/music tests.
- [ ] Apply `0001_shared_guest_gallery.sql` to the production Supabase database.
- [ ] Deploy the updated concierge Edge Function with a valid Gemini secret and set `VITE_SITE_URL` for production share metadata.
- [ ] Verify production uploads, cross-device Realtime and real Gemini playback commands after deployment.

## Compact phone layout and broader Simran conversation

- [x] Reduce phone header to 52px, remove duplicate header chat action, and use 48px floating chat/music controls.
- [x] Share a broader conversational personality across both backends: general assistance, happy wit and optional mild dark humour, with wedding accuracy and privacy intact.
- [x] Add offline capability/humour previews and regression tests; verify compact layouts and chat flow in a headless browser at 375px and 320px.
- [x] Bound server-side wishes loading to five seconds so an unavailable backend cannot indefinitely hold the page loader.

## Personal card assistants and songs

- [x] Give every personal invitation card its own AI assistant, named after the card's host name (fallback: contact name, then groom's name) and shown only on the published `/invite/:slug` page.
- [x] Answer only from the card's visible sections (element toggles respected), disclose that it is AI, refer RSVPs to the on-page form, and never read RSVP rows.
- [x] Keep personal cards free of the main site's Simran quick replies, wedding facts, visitor counter and "Ask Simran" / "Mohsin" text.
- [x] Let hosts add up to five songs (MP3, M4A, WAV or OGG, 10 MB each) to a card's editor, stored in a private `invitation-songs` bucket.
- [x] Serve songs to guests only as one-hour signed links, and only while the card is published and unexpired.
- [x] Delete replaced, removed or cancelled song files on save or cancel, and remove a card's songs when the card is deleted.
- [x] Add migration `0010_invitation_songs` in both migration directories, with a journal entry and PGlite policy tests.
- [x] Add unit, component and PGlite tests for the assistant, songs, storage policies and migration packaging.
- [x] Update `docs/personal-invitations.md`.
- [x] Sweep unreferenced song files older than a day from the private bucket after expired cards are deleted, through the Storage API with the service role (`scripts/song-sweep.mjs`, `scripts/cleanup-expired.mjs`).
- [ ] Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as repository Actions secrets so the storage sweep runs; without them it is skipped with a warning.
- [ ] Apply `0010_invitation_songs.sql` to the production Supabase database and confirm the `invitation-songs` bucket is private.
- [ ] Redeploy the `wedding-concierge` Edge Function and confirm a live card's assistant answers with its host name.
- [ ] Check a published card in a browser on a phone-sized screen: the assistant panel, the Songs panel, and playback.
