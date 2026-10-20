# Personal wedding invitations

## For invitation creators

1. Sign in and open **Your invitations** (`/dashboard`). A new card starts as a **private draft**; each account can have up to three active cards.
2. Fill in both names, a real wedding date, the time, venue, address/city and main ceremony. All six essential wedding details always appear on the invitation. Add a message, story, hosting families, host contact, arrival notes, RSVP-by date and up to four extra events if you wish. The **host name** field names your card's own AI assistant; if it is blank, the host contact, family line and finally the groom's first name are used.
3. Choose a **theme** (twenty, grouped by tradition — Jharokha Dawn, Haldi Baag and Vows in Ink in their own Signature Structures group; Eid Light, Mughal Night, Aladin, Mecca–Madinah and Riad Noor; Diya Utsav, Sacred Mandap, Kashi Ghat and Bihari Vibe; Mehndi Night; Fairytale Castle and Grand Ballroom; Luxury and Futuristic; Classic) and separately a **framework** (Moonlit Journey, Royal Folio, Cinematic Stage, Modern Mosaic or Grand Curtain). The cover and full preview update immediately. The original moonlit gate/hero remains the default.
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

## Storybook themes and the Grand Curtain scroll

Two themes join the collection, both light and type-safe so long names stay readable:

- **Fairytale Castle** — a painterly kingdom at dusk, with fireworks over the towers, a lake and a lantern-lit garden path.
- **Grand Ballroom** — chandeliers, candlelight and champagne gold under arches that open onto a starry sky.

Both themes flow through every surface: the card cover, the gate, the section ornaments, the print package palettes and the QR inserts, exactly like the older themes. There is no reduced feature set.

**Grand Curtain** is the fifth framework, and it turns the top of the invitation into one continuous camera move:

- The hero is taller than the screen and its stage is **sticky**, so a scroll gesture reads as a single shot rather than a page jumping.
- Two **velvet drapes** hang in a gilded proscenium. Scrolling swings them apart in 3D (`rotateY` plus a lateral slide) while the artwork behind pushes forward and drifts, as though the guest is walking into the scene.
- The couple's names sit in the window and glide past the camera at the end of the move; the "Enter the celebration" link skips straight to the first section.
- After the hero, every section **flies in from depth** using CSS scroll timelines (`animation-timeline: view()`), and a hairline of gold runs along the top of the screen as a scroll/film progress bar.
- For this layout the opening gate is dressed as **velvet curtains** instead of lacquered doors.

Practical notes:

- The effect is CSS transform and opacity only — no video file, no autoplay, no sound. It works offline and downloads nothing extra.
- `prefers-reduced-motion` visitors get a still, fully readable hero with no curtains, and the scroll timelines are skipped in browsers that do not support them (the sections simply appear in place).
- Phones get a shorter hero and slightly wider drapes so the names keep a clear channel.

## Hindu themes, Sanskrit and living fire

Two Hindu themes join the collection. Both are full members of the suite — cover, gate, ornaments, print palettes and QR inserts included.

- **Diya Utsav** — a Hindu wedding night: hundreds of clay lamps along a marble courtyard, a marigold rangoli, garlanded temple pillars and fireworks over a distant shikhara.
- **Sacred Mandap** — a sunlit flower mandap with carved pillars, marigold garlands, brass kalash and a havan kund in the centre.

**Sanskrit.** Cards on these themes show **॥ श्री गणेशाय नमः ॥** above the names and on the opening gate, set in _Tiro Devanagari Sanskrit_ (loaded from Google Fonts alongside Amiri). A second line is yours: the **Blessing or opening line** field accepts anything up to 80 characters, such as `॥ शुभ विवाह ॥` or `सर्वे भवन्तु सुखिनः`. Starting a Diya Utsav or Sacred Mandap card also defaults the ceremony to **Shubh Vivah** and the line to `॥ शुभ विवाह ॥`; both are editable. Cards on the Muslim themes keep the Bismillah, and the neutral themes keep the star ornament.

**Mandap stage.** On these themes the top of the card becomes a _Mandap Aarti_ stage instead of the generic hero: a taller sticky section where scrolling walks the guest under a swinging flower canopy (hanging bells sway) while the artwork pushes forward and a **living havan fire** — three flame tongues plus rising embers — burns at the foot of the stage.

**Living fire in every theme.** All twenty-three themes now carry a `LivingScene` layer over their artwork:

- **Fireworks** — four repeating CSS bursts in warm gold, rose and ice-blue, each on its own long, offset cycle, so the sky is always changing; light themes get a softer subset.
- **Diyas** — five clay lamps with flickering flames and breathing glows along the floor of the hero and the gate (Hindu themes and the gate of every card can show them).
- **Bokeh and embers** — slow golden haze and sparks drifting upward for depth.

It is all CSS gradients and keyframes: no video file, no canvas, no audio, nothing fetched. That means it also works offline and never blocks the card, and it costs no bandwidth on a phone. `prefers-reduced-motion` freezes everything into a single still frame.

## Three signature structures, and categories to find them

Three themes were rebuilt from the structure up rather than recoloured, and each now owns a layout of its own:

| Theme | Structure | Type | Palette |
| --- | --- | --- | --- |
| **Jharokha Dawn** | A raised balcony: full-bleed dawn artwork, jaali side columns, names inside a cusped sandstone window, carved sill, rose petals drifting down | Fraunces (soft high-contrast serif) | Rose sandstone, brass, pale dawn |
| **Haldi Baag** | A courtyard collage: taped, tilted photograph on the left, stacked paper strips and stat cards on the right, a strung marigold garland across the top | Bricolage Grotesque (bold sans) | Turmeric, marigold, leaf green, cream |
| **Vows in Ink** | One printed page: hairline rules, small-caps facts, a thin vermilion thread that draws itself on scroll, the artwork matted like a framed print, no arch or glow | Instrument Serif (editorial) | Bone paper, black ink, one vermilion seal |
| **Chand Bagh** | A moonlit charbagh: full-bleed night garden, constellation and fireflies, names on a night plaque, Noor the cat on the wall | Fraunces | Indigo, silver moon, brass |
| **Mela Maidan** | A fairground: bunting and drifting kites over a ticket-shaped name plate, cat and squirrel on the drum | Bricolage Grotesque | Coral, teal, marigold, cream |

`invitationLayoutFor(theme, framework)` resolves the structure. A theme's signature layout wins over the shared frameworks, so these three can never fall back into the same stage; **Grand Curtain** stays an explicit opt-in on every theme. Each signature theme also brings its own cover frame, gate treatment, section chrome (arched cards, taped paper, bare print), an interlude band that carries the structure past the hero, and its own footer, while showing the same real content as every other theme. The quiet paper theme suppresses fireworks, sparks, diyas and drapes instead of painting a night sky over handmade paper.

## Playable invitations: Chand Bagh and Mela Maidan

The last two signature structures are the first **playable** cards.

**A world that follows the guest.** A fixed sky (stars, fireflies, a moon) drifts with the pointer and with scroll, while a docked cat and squirrel walk down the whole card and change what they say as the guest scrolls. They never sit over an input: the dock is bottom-left, twenty-one rem wide at most, and on a phone the speech bubble only opens when it is tapped.

**Nine stars, one per section.** Every star is a 44 px button inside a section — in the message, the story, the album, the game room, the celebration, the schedule, the venue, the dress code and the RSVP — so the hunt scrolls with the words instead of floating over them. Found stars stay found, and the dock shows `n/9 stars · n/5 wonders`.

**The games tent.** Five wonders: collect nine stars, answer the cat's three riddles (right answers advance, wrong ones are forgiven), spin the moon through all eight phases, send up three lanterns (or leave a wish on the wall), and open the keepers' letter. Finishing all five unlocks the letter — written from this card's own names, date, venue and hashtag — plus a closing line that invites the guest to bring a friend.

**Remembered per device, per card.** Progress is stored under `invite-world:<cardId | slug>`, so a guest who leaves and returns finds the same garden. Nothing is sent to the server: the game is the guest's, and RSVP/wish privacy is untouched.

**Everything else still speaks.** Both worlds keep every component — countdown, message, story, album, timeline, venue map, dress code, gifts, livestream, host contact, RSVP, wishes, share and the AI host — but their headings are rewritten in the world's voice ("Noor is waiting" for RSVP, "The Wish Tent" for wishes) and the RSVP, wishes and host cards are restyled as game panels. Other themes are untouched, and a test enforces that.

**Phones first.** The two heroes are single-column by construction, use `100svh` and safe-area padding, and the stability pass sizes every signature hero, heading and tap target for a 360 px screen. All motion is CSS or framer-motion transforms, and `prefers-reduced-motion` freezes the sky, the mascots and the lanterns while leaving every button usable.

## Three more themes, and categories to find them

Three further themes join the collection, one for each side of a shared wedding:

- **Riad Noor** — a Moroccan riad at night: horseshoe arches, zellige tilework, a still fountain, brass lanterns and a crescent over the courtyard. Muslim rite.
- **Kashi Ghat** — the Varanasi ghats at dusk: aarti lamps on the steps, drifting diyas on the river, wooden boats and temple spires. Hindu rite, so it carries the Sanskrit blessing and opens on the Mandap Aarti stage.
- **Mehndi Night** — an emerald darbar hung with marigold strings, henna patterns on the floor and warm music light. Neutral rite, suitable for either family.

All three use freshly drawn artwork, so no card looks like the existing twelve, and all three are full suite members: cover wash, gate, ornaments, print palette, A5 artwork and QR inserts.

**Categories.** Both theme pickers now group the collection instead of one long scroll:

| Category         | Themes                                                    |
| ---------------- | --------------------------------------------------------- |
| Islamic & Mughal | Eid Light, Mughal Night, Aladin, Mecca–Madinah, Riad Noor |
| Hindu & Sanskrit | Bihari Vibe, Diya Utsav, Sacred Mandap, Kashi Ghat        |
| Festive & Shared | Mehndi Night                                              |
| Storybook        | Fairytale Castle, Grand Ballroom                          |
| Modern & Luxury  | Luxury, Futuristic                                        |
| Classic          | Classic                                                   |

The partner workspace shows a row of jump chips (with a count per group) above the grouped grids, so an admin can go straight to a section; the card editor shows the same groups as headings. Category membership lives in `invitationThemeCategories` in `src/components/wedding/invitation-options.ts`, and every theme must declare a `category`, which a test enforces.

**The whole photograph, never cropped.** Theme artwork is a full picture, so it is now shown whole with a blurred copy of the same frame filling the letterbox (`FullArtFrame`). Nothing important is cut off on a phone, and the colour around the picture comes from the picture itself rather than a flat band.

**The theme runs to the footer.** Themes marked `immersive` — the two Hindu, the three new ones and the two storybook ones — render a `ThemeBackdrop`: a fixed, blurred copy of the artwork behind the page, a veil in the card's own palette, and a quiet repeating motif (lantern, diya, marigold, ornament or stars). Sections, the suite cards, the RSVP panel and the footer turn translucent over it, so scrolling never drops back to plain white.

**Living elements, top to bottom.** Each new theme keeps a signature layer running across the page, not just in the hero:

- **Riad Noor** — brass lanterns swaying on their cords with a breathing glow.
- **Kashi Ghat** — diyas drifting down the river band at the foot of the screen while the stage burns its havan fire.
- **Mehndi Night** — marigold and rose petals falling with a slow horizontal drift.

All three also get soft **floating drapes** — blurred fabric folds that drift and breathe like a video loop — and they inherit the fireworks, bokeh, embers and diyas of `LivingScene`. Everything is CSS gradients and keyframes: no video file, no canvas, no audio, no extra download. `prefers-reduced-motion` freezes every layer into a still frame.

## Print package: QR, inserts and A5 artwork

Each row in **Your invitations** has a **Print card & QR** button (also under the row's “more” menu). It opens a three-tab dialog — **QR code**, **Guest list** and **Print card** — that turns one card into everything a print shop needs.

### QR code

- **PNG (1200 px)** — drop into Word, Canva or a print template. 1200 px is 300 dpi at four inches, so it stays sharp on a card or table tent.
- **SVG for print** — vector output for a professional print shop. It has no fixed pixel size and prints crisply at any dimension.
- **Print insert** — a print-ready 90 × 55 mm insert with the QR on the left, the couple's names, the date and venue on the right, and “Scan for the map & RSVP”. The print window contains only the insert, so the dashboard is never printed.
- **Copy link** — the exact URL the code points to.

A guest name can be added before exporting, which produces the same personalised `?guest=Name` link as the share panel, so a printed card can greet its recipient by name.

### A5 front and back artwork

The **Print card** tab opens an A5 portrait sheet with two pages, built from the card's own theme colours and text:

- **Front** — hosting families, the couple's names, the ceremony, date and time, venue and address, and a tinted QR block.
- **Back** — names, your message, the full **order of celebration** (the main ceremony plus every extra event with its own date, time and venue), and **good to know** lines for dress code, RSVP-by date, host contact and arrival notes, with a second QR.

Empty optional fields are left off instead of printing a lone label. In the browser print dialog choose **Save as PDF**, set **A5**, and keep margins at **none** — the sheet already includes its own margins. The result can go straight to a shop; nothing else on the dashboard is printed.

### Guest list → batch personalised QR inserts

The **Guest list** tab prints one insert per guest, each QR pointing at `?guest=Their%20Name` so the invitation greets them personally.

- Paste names one per line, or import a `.csv` / `.txt` file up to **1 MB**.
- A CSV with a **Name** / _Full name_ / _Guest_ / _Family_ / _Mehmaan_ / _Naam_ header uses that column; without a header the parser picks the column that looks most like names. Phone, email, serial-number, address and notes columns are ignored.
- Names shorter than two characters, without letters, or containing symbols are skipped. Duplicates are dropped regardless of case and spacing. Names are capped at 80 characters and the list at **300 guests**; anything beyond that is reported and not printed.
- **Eight inserts** fit on one A4 sheet at 90 × 55 mm with dashed cut guides, and longer lists paginate automatically. The dialog shows the guest count and the number of A4 sheets before you print.

### RSVP dashboard and export

**My profile & RSVPs** (`/profile`) now summarises replies instead of only listing them:

- **Responses**, **accepting** and **guests expected** across every card, plus a **dietary summary** that groups notes case-insensitively (e.g. “Vegetarian · 2”, “Jain · 1”).
- Each card gets its own **responses / attending / guests / declined / dietary** figures and a **CSV** button; **Export all replies** downloads every card at once.
- The CSV has the columns _Guest name, Attending, Guests, Contact, Dietary notes, Message, Replied at_. It is UTF-8 with a byte-order mark and CRLF line endings, so Hindi and Urdu names open correctly in Excel, and cells starting with `=`, `+`, `-` or `@` are prefixed with `'` so a typed name cannot run as a spreadsheet formula. Guests who declined are written as `No` with `0` guests.

Replies remain owner-only: the profile reads only cards you own, and the database grants no public read on `invitation_rsvps`.

Practical limits, enforced by the QR renderer:

- Error correction is **Q (25%)**, so smudges, low ink or a glossy finish still scan.
- The quiet zone is **4 modules** — the minimum the QR specification allows. The generated code already includes it, so leave that white border visible when placing the image.
- The code is black on white on purpose. Do not recolour it or place it on a photo; if a designer must tint it, keep the dark modules dark and the background near-white.
- A draft card's QR works, but scans show “invitation not available” until the card is published. The dialog says so before you print anything.
- QR generation is local to the browser (`qrcode-generator`, MIT). No guest data, card content or URL is sent to a third-party QR service.
- Print at least **2 cm** wide, flat, on matte stock. Test one copy with a phone before the full run — `src/test/card-qr.test.ts` decodes the generated matrix back to the link in CI, but a printer can still mis-handle scaling.
- If the browser blocks the print window, allow pop-ups for the site; the dialog shows that message instead of failing silently.

## Your card's AI host assistant and soundtrack

Every card is published with its own AI host assistant named after its host (for example “Ask Ayesha”). The floating assistant is rendered only on that card's page and answers guests from the saved card content: ceremony, date, time, venue, address, dress code, story, note, contact, extra events and the chosen songs. It never uses Mohsin & Simran's schedule, story or playlist.

- The **card content is the source of truth**. `askCardConcierge` re-reads the published card on the server for each request, so a guest cannot inject different facts. Drafts and expired cards cannot be queried.
- Answers go through `src/components/wedding/card-concierge.functions.ts`. If the app server has a `GEMINI_API_KEY` (hosting environment or the ignored `supabase/.env`), it calls Gemini directly. Otherwise it forwards the question to the `wedding-concierge` Edge Function in card mode, which loads the same published card and uses the Supabase secret — so card chat works without adding the key to the hosting provider.
- Common questions (date, venue, dress code, contact, schedule, playlist, RSVP, greetings) are answered instantly in the browser, so the assistant still helps when no API key is configured or the network is slow.
- Each guest gets six AI answers per card per day, counted in Postgres (`public.consume_ai_message`, migration `0016_shared_ai_quota.sql`) against an anonymous per-browser id — shared IPs do not share an allowance, and a failed answer is refunded. The assistant cannot submit an RSVP, take payments, browse the web, or read other guests' replies.
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

`npm test` includes all 20 × 5 theme/framework combinations (including gallery, wishes, map and share sections in every one), required-field and element-selection tests, a browser-form mock for portrait compression and RSVP insertion, and PGlite policy tests for anonymous insert, owner-only reads, the twelve-photo limit, gallery and wishes toggles, expired or draft cards, refused anonymous gallery uploads and rejected invalid RSVP names. The print package is covered separately: `src/test/guest-list.test.ts` (CSV quoting, header detection, dedupe, rejected rows, the 300-guest cap), `src/test/rsvp-export.test.ts` (totals, dietary grouping, CSV BOM/CRLF and the formula guard), `src/test/print-sheets.test.ts` (eight inserts per A4 sheet, escaping, palette per theme, A5 front and back) and `src/test/profile-rsvps.test.tsx` (per-card stats and both CSV downloads). `src/test/card-qr.test.ts` still decodes a generated QR back to the invitation link, `src/test/invitation-curtain.test.tsx` covers the storybook themes and the Grand Curtain stage and gate (no video, no remote asset, the card's own details only), `src/test/hindu-themes.test.tsx` covers the two Hindu themes, the rite map, the Sanskrit blessing, the mandap stage, the havan fire and the living-scene layers (fires, diyas, fireworks, reduced-motion), `src/test/signature-layouts.test.tsx` covers the three signature structures (distinct stages, covers and interludes, the older themes keeping their old stages, and three typefaces and palettes in the stylesheet), and `src/test/theme-categories.test.tsx` covers the new themes, their print palettes, the seven categories and the page-wide living layers.

Run `npx tsc --noEmit` and `npm run build` as well. For a visual check of the print output, open the dialog, print to PDF, and confirm the page size is **A5** (artwork) or **A4** (insert sheets) before sending anything to a shop. These tests do **not** replace checking the live database after deployment.

## Playable keepsakes

Royal Rajmahal, Lotus Goddess and Calligraphy are available in the Playable Keepsakes group and the quick theme dropdown. They use the same creation, publishing, RSVP, host and print features with a new unboxing/scratch/flip/venue-trail interface. See [storybook-suite.md](storybook-suite.md) for the JSON contract and modular components.
