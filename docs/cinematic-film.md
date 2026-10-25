# Mughal Moon — The Film

The cinematic invitation. Where every other theme opens with a gate and a scroll,
this one opens with a **short film**, then hands the guest a stage their thumb
keeps scrubbing.

- Demo: `/film`
- Theme id: `mughal-moon-film` (group: *Cinematic*, layout: `reel`)
- Artwork: `src/assets/themes/film-palace.webp`, `film-arch.webp`, `film-courtyard.webp`
- Script and timeline: `src/components/wedding/invitation-film.ts`
- Player: `src/components/wedding/invitation-film-player.tsx`
- Scroll stage and act strip: `src/components/wedding/invitation-reel.tsx`

## The hero is the film

The card does **not** open on a poster any more. The moment the page renders, the
hero is already the film: the three shots dissolve into each other behind the
couple's names, on a 19.2-second loop (`filmLoopTimeline` / `FILM_LOOP_DURATION`),
with the score running **muted** — browsers only allow sound after a tap, so the
picture is never held back waiting for one.

- **Sound off / Sound on** on the hero unmutes in place; if a browser still
  refuses, the hero says so instead of lying about it.
- **Watch the film** opens the full cut (`MughalMoonFilm`, `autoStart`) over the
  card: studio credit, captions, title card, and it is already playing because
  the tap that opened it counts as the gesture.
- The clock stops when the hero scrolls out of view or the tab is hidden.
- Setting **Opening gates** off turns the motion off: the hero holds the first
  shot, mounts no score and still shows every word.
- `prefers-reduced-motion` gets the same still frame automatically.

## The full film, shot by shot

| Time | Movement | What the guest sees |
| --- | --- | --- |
| — | Poster | The names, the date, one gold **Play the film** button, sound and skip |
| 0.0–2.4 s | Studio credit | "InvitingYou Pictures presents…" over the palace |
| 1.8–6.6 s | Palace | The moon over the reflecting pool, captions in the film's voice |
| 6.2–10.8 s | Arch | The jali arch, the hosts' invitation line |
| 10.4–14.8 s | Courtyard | Date, time and venue under the lanterns |
| 14.2–20.4 s | Title card | Names, date, venue, hashtag and **Enter the invitation** |

Movements overlap on purpose: the overlap is the dissolve. The letterbox opens
as the title card arrives, the score steps back, and the button hands over to the
card. `FILM_DURATION`, `filmTimeline`, `filmFade()` and `filmPush()` in
`invitation-film.ts` are the whole edit — change them and the player follows.

## Why there is no `<video>` file

The shots are the theme's own photographs moved with CSS transforms, graded with
gradients, grain and halation. That means:

- nothing extra to download before the names appear (a 20-second 4K film would);
- it keeps working offline, inside a saved card and on a slow phone;
- the captions and the title card carry the host's own names, date and venue;
- a partner never has to render or upload a video to ship a card.

## Sound

The film is scored by the host's first **audio** track (`/audio/...` or a direct
`https://…/file.mp3`). A YouTube or Spotify entry cannot score a film, so those
cards fall back to the bundled `royal-courtyard.mp3` and the entry stays with the
card's own music player.

Nothing plays until the guest taps **Play the film** — that tap is what lets a
phone play sound at all. From there the score fades in over two seconds, sits
under the captions, and fades out under the title card. Muting or pausing the
film pauses the score with it.

## Controls and accessibility

- Play / pause, mute, chapter ticks (jump to any movement), elapsed time, skip.
- Keyboard: `Space` or `K` pause, `←`/`→` seek two seconds, `Esc` skip the film.
- The whole script is written into an `sr-only` paragraph, so a screen reader
  hears the film as a synopsis rather than silence.
- `prefers-reduced-motion`: no push-in, no dissolves, no grain — the poster opens
  straight on the title card, and the stage below is one still frame.
- Every control is at least 44 px; the poster scrolls instead of clipping on a
  short screen.

## After the film

The hero itself is 100 svh and hands the guest straight on to the countdown and
the rest of the card; the acts are labelled under the names as they change.

Below the hero, `ReelInterlude` is a strip of film — sprocket holes and three
framed stills with the film's own captions — that replaces the usual interlude
for this layout only. It pauses on hover and stays still under reduced motion.

## Editing and previewing

The hero plays everywhere the card is shown — published card, `/film`, and the
studio preview — and never covers the card with an overlay:

- the full-screen cut only opens from **Watch the film**;
- the cover thumbnail stays a still frame;
- turning off *Opening gates* on a card freezes the hero and removes the score.
