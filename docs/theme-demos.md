# Theme demos — one real, openable invitation per theme

A customer should never choose a look from a colour swatch. Every theme in the
collection has a **complete demo card**: its own couple, city, ceremony order,
love note, dress code, gallery photos, portraits and a real YouTube soundtrack.
Open it, scroll it, hear it, then pick.

- Data: `src/config/theme-demos.ts` — `themeDemos`, one entry per theme
- Tile: `src/components/wedding/theme-demo-card.tsx` (`ThemeDemoCard`)
- Collection page: **`/themes`** (sidebar → *Theme demos*, or *Template collection*)
- One demo: **`/theme/<themeId>`** (e.g. `/theme/kashi-ghat`)
- Tests: `src/test/theme-demos.test.tsx`

## What a demo contains

`themeDemos` is a plain array; each entry is a whole celebration:

| Field | Purpose |
| --- | --- |
| `theme` | the theme id this demo belongs to (must exist in `invitationThemeIds`) |
| `mood` | one line used on the tile — *why* this theme exists |
| `groomName`, `brideName`, `title` | the demo couple; unique across all demos |
| `date`, `time`, `endTime` | `DD/MM/YYYY` + clock time, so the countdown and calendar work |
| `venue`, `address`, `mapUrl` | venue block, directions and the map button |
| `eventType`, `hosts`, `hostName` | the ceremony name and who is hosting |
| `message`, `story` | the note from the couple and the longer story section |
| `dressCode`, `hashtag`, `giftsNote`, `arrivalNotes` | the practical blocks |
| `contactName`, `contactPhone`, `rsvpDeadline` | contact card and RSVP deadline |
| `additionalEvents` | 2–3 ceremonies, which drive the schedule/order section |
| `songs` | 1–2 real YouTube links (with optional `clipStart`/`clipEnd` excerpts) |
| `portraits` | bundled portrait artwork (groom/bride) |
| `gallery` | 5–6 bundled gallery frames with captions |
| `framework` | the layout framework the demo opens with |

`demoContent(demo)` turns that into the object `PersonalInvitation` expects, with
**every element switched on** (`defaultInvitationElements`), so a customer sees
the full card: gates, countdown, note, portraits, story, gallery, schedule, map,
dress code, contact, RSVP, wishes, gifts and livestream.

## Bundled photos instead of uploads

Real cards store portraits as base64 JPEGs (`isSafePortrait` allows only
`data:image/jpeg;base64,/9j/…`, ≤ 240 KB). A demo cannot ask anyone to upload
eight photos, so `PersonalInvitation` accepts an optional `demoPhotos` prop:

```tsx
<PersonalInvitation
  content={demoContent(demo)}
  preview
  demoPhotos={{ groom, bride, gallery: demo.gallery }}
/>
```

- `groom` / `bride` override the portraits (bundled webp artwork).
- `gallery` is handed to `InvitationGallery` as fixed frames — nothing is
  fetched from `invitation_photos`, so a demo works offline and never shows
  another couple's uploaded photos.

Both paths are additive: published cards and the editor keep using uploads.

## The demo page

`/theme/$themeId` is the whole card, not a mockup:

1. A sticky toolbar: back to the collection, a theme picker (all 22), a
   **See the opening** toggle (the real gates/doors plus the soundtrack) and
   **Use this theme**, which opens `/create?theme=<id>` with that theme applied.
2. The soundtrack links straight to YouTube with the excerpt start time.
3. The card itself, rendered by `PersonalInvitation` — the theme's film loops in
   the hero, the gallery shows the demo frames, every section is present.

Replies are never saved: there is no `cardId`, so the RSVP block renders its
private-preview state instead of writing anything.

## Where the demos appear

| Place | What is shown |
| --- | --- |
| `/` landing page, `#collection` | all 22 tiles, each with the theme's looping film and gallery strip |
| `/themes` | the same tiles with category filters and a "every element on" note |
| sidebar (guest and workspace) | **Theme demos** → `/themes` |
| dashboard → *Templates* | a **Demo** link on every theme tile, plus a link to the collection |

## Adding or changing a demo

1. Add the theme to `invitationThemeIds` and `invitationThemes` in
   `src/components/wedding/invitation-options.ts`.
2. Add artwork to `invitationArt` and a cut to `scripts/build-theme-loops.mjs`,
   then run `npm run film:loops`.
3. Add a `demo({...})` entry to `themeDemos` — the module warns in dev if a theme
   has no demo, and `src/test/theme-demos.test.tsx` fails the build.
4. Keep names, cities, dates and stories unique: the tests assert no two demos
   share a couple, title, venue, date or story.

## Retired themes (the duplicate cleanup)

`mughal` and `classic` were **the same design as Eid Light**: the identical
`eid-sky` artwork, an identical `eid.mp4` film (verified by checksum) and a
colour filter as the only difference. They also had zero or near-zero of their
own CSS. Both were removed — the collection is 22 themes now, each with distinct
artwork, a distinct film and a distinct demo.

Old links and saved cards keep working: `normalizeInvitationTheme()` maps the
retired ids onto the surviving designs (`mughal → royal-rajmahal`,
`classic → calligraphy`), and `invitationContentSchema` preprocesses `theme`
through it, so an imported or stored card never fails to load.
