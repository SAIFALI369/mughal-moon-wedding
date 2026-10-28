# Theme films — real video in the existing themes

Every theme now ships a real, silent, looping video beside its illustration.
The hero plays it automatically the moment the card renders; the illustration
stays underneath as the poster frame.

- Built by `node scripts/build-theme-loops.mjs`
- Output: `public/film/<theme>.mp4` — 8 s, 1024×576, H.264 (main), ~120–580 KB
- Rendered by `src/components/wedding/theme-loop.tsx`
- Gallery of all 22, with live playback state: **`/films`**
- Tests: `src/test/theme-loops.test.tsx`

## What each film is

The illustration is the plate; the script adds the movement and the air:

The frame is cut to each illustration's own aspect ratio (Eid Light's wide sky
and the vertical Mughal Moon film are not 16:9), so the film fades in over its
still without the picture jumping.

| Camera move | Where it is used | Feel |
| --- | --- | --- |
| `push` | luxury, fairytale | a 20 % dolly-in, no sway |
| `drift` | rajmahal, aladin, ballroom, mehndi, mela, riad, bihari, haldi, calligraphy, diya | push plus a 60 px sideways sway |
| `breathe` | lotus, mandap, jharokha, vows-in-ink, mecca | gentle 8 % light-led zoom, minimal sway |
| `rise` | eid, futuristic, chand-bagh | a 14 % push while the lens lifts ~96 px toward the sky |
| `water` | kashi-ghat | a push plus downward travel, so the river reads as flowing |

The moves are deliberately readable: a guest should notice within two seconds
that this is a film, not a photograph.

On top of the plate, one ambient layer drifts continuously:

- **petals** — soft bokeh petals (wedding, spring, mehndi, haldi themes)
- **embers** — rising sparks and diya light (luxury, calligraphy, kashi, diya)
- **stars** — fine twinkle over the night skies (eid, mecca, chand-bagh)
- **lantern** — large, dim lantern bokeh (rajmahal, aladin, ballroom, riad)

Everything is derived from the theme's own art, so a theme recolor reskins both
the still and the film. The cut list lives at the top of the script; change a
`move` or an `air` and rerun.

## Build

```bash
node scripts/build-theme-loops.mjs            # rebuild only what changed
node scripts/build-theme-loops.mjs --force    # rebuild all 22
node scripts/build-theme-loops.mjs --theme riad-noor
```

Requirements: `ffmpeg` (bundled via `@ffmpeg-installer/ffmpeg`, a devDependency)
and ImageMagick's `convert` for the particle overlays. The script is idempotent:
it skips any film newer than its illustration and itself, so a normal build never
re-encodes 22 videos.

## How it plays (and how it stays smooth)

Playback is rationed by `src/lib/film-budget.ts`. A page can show twenty-odd
theme tiles; twenty-odd decoders is what made the studio stutter. Every
`ThemeLoop` reports how much of itself is on screen and the budget hands the
film to the most visible one or two players (one on a phone, two on a desktop,
none under reduced motion or data saver). Every other tile keeps the still,
which is the same picture. `/films` obeys the same budget and says so.


- `<video autoplay muted loop playsinline preload="none">`, `aria-hidden`, no
  controls — a background film, never a second player competing with the
  soundtrack. `autoPlay` lets the browser start it before hydration; a script
  effect backs it up and wakes browsers that refused at load.
- The film layer has no fade-in gate: it is visible from the first frame, which
  is the same picture as the still underneath, so nothing flashes or jumps.
- The hero loads on mount (`priority`); anything further down the page waits
  until it is within 400 px of the viewport.
- Playback follows visibility: it pauses when the stage scrolls away or the tab
  is hidden, and resumes on return. One tap anywhere wakes a browser that
  refused autoplay at load.
- The still stays underneath as the poster frame: a card is complete before the
  video lands, and stays complete if the video fails (an `onError` drops the
  element and leaves the photograph).
- `prefers-reduced-motion`, or a host who turned **Opening gates** off, keeps the
  still and mounts no video at all.
- The cinematic theme (`mughal-moon-film`) uses its vertical film twice: inside
  the full-screen player, and as one continuous take behind the live hero — a
  single `<video>` seeked to each act, so the shot changes are straight cuts in
  a reel rather than three separate clips. Its CSS stills fade out beneath it as
  soon as the first frame decodes.

## Adding a theme

1. Drop the illustration in `src/assets/themes/`, register it in
   `invitation-art.ts` and `invitation-options.ts`.
2. Add one line to `cuts` in `scripts/build-theme-loops.mjs`.
3. Run the script. `src/test/theme-loops.test.tsx` fails until the film exists.
