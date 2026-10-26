# Wedding invitation update

## Cinematic theme refinement
- [ ] Harden motion pause/resume, gate timing and phone efficiency; preserve guest state in the theme showcase.
- [ ] Recheck cinematic themes, interactions and reduced motion; run targeted tests and inspect automatic build results.
- [x] Integrate restrained curtain reveals, image motion, layered parallax and theme transitions into existing invitation heroes.
- [x] Verify desktop/mobile, reduced motion, theme changes and unobstructed controls; run relevant tests (55 passing).

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

## Free AI capacity

- [x] Replace the single-key Gemini dependency with a pooled free-tier router (`supabase/functions/_shared/free-router.ts`) shared by the Edge Function, the app server, card chat and the partner form reader.
- [x] Add three keyless providers (Kilo Code, OVHcloud, LLM7.io) so a fresh deploy answers with zero configuration, plus failover, key rotation, per-route cooldowns and a total time budget.
- [x] Vendor `mnfst/awesome-free-llm-apis`, `neuralnexustech/freeroute` and `freellms/free-llm-api-keys` under `third-party/` as git submodules and derive the provider catalogue from them.
- [x] Make the daily allowance environment-driven (`AI_DAILY_LIMIT_*`, default 100, `0` = unlimited) instead of hard-coded at 5 and 6.
- [x] Add `npm run ai:check` to probe every configured route and report which providers are live.
- [ ] Add at least three free `*_API_KEY` values to the Supabase Edge Function secrets and to Vercel, then run `npm run ai:check` from a networked machine.
- [ ] Re-deploy `wedding-concierge` (it now imports `_shared/free-router.ts`) and verify Hindi/Urdu replies.

- [ ] Apply `0001_shared_guest_gallery.sql` to the production Supabase database.
- [ ] Deploy the updated concierge Edge Function with a valid Gemini secret and set `VITE_SITE_URL` for production share metadata.
- [ ] Verify production uploads, cross-device Realtime and real Gemini playback commands after deployment.

## Compact phone layout and broader Simran conversation

- [x] Reduce phone header to 52px, remove duplicate header chat action, and use 48px floating chat/music controls.
- [x] Share a broader conversational personality across both backends: general assistance, happy wit and optional mild dark humour, with wedding accuracy and privacy intact.
- [x] Add offline capability/humour previews and regression tests; verify compact layouts and chat flow in a headless browser at 375px and 320px.
- [x] Bound server-side wishes loading to five seconds so an unavailable backend cannot indefinitely hold the page loader.

## Per-card AI host assistants, soundtracks and a richer invitation suite

- [x] Give every creator card its own AI host assistant, named from the card's host name (falling back to host contact, family line, then the groom's name).
- [x] Ground card replies in the published card's own ceremony, story, contact, events and playlist; never use Mohsin & Simran's facts.
- [x] Add an instant offline answer layer for date, venue, dress code, contact, schedule, playlist and RSVP.
- [x] Add up to five host-chosen songs with safe-URL validation, quick-adds for the bundled instrumentals, and a guest-played soundtrack panel.
- [x] Redesign the cover and full invitation suite: gold monogram seals, arch frames, corner filigree, a date plate, a timeline, a venue card and a decorative back page.
