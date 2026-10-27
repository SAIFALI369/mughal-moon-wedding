# Choosing the part of a song guests hear

A soundtrack entry can carry an excerpt: `clipStart` and `clipEnd` in whole seconds (`0` / absent
means "no bound"). Old cards without these fields keep playing exactly as before.

## In the form

`src/components/wedding/song-clip-picker.tsx` sits under every song link in **Music**:

- direct audio (`/audio/…` or any `https://` file) → a real `<audio controls>` of the **whole track**,
  plus **Play chosen part**, plus start/end sliders bounded by the file's own duration;
- YouTube → the video embedded at the chosen window (`start` / `end` query params on the nocookie
  embed), so the host watches the excerpt they are choosing;
- Spotify → a note explaining embeds always start at the beginning (use a YouTube or MP3 link to trim).

The header shows the window (`1:05 – 2:05`) and the body shows how much of the track that is.

## At play time

`invitation-music.ts`:

- `songClip(song)` → `{ start, end }`, clamped, with a too-short window treated as "to the end";
- `withYouTubeClip(embedUrl, song)` → adds `start` / `end` to the embed;
- `formatClipTime(seconds)` → `m:ss`.

`invitation-music-player.tsx` seeks HTML audio to `start` before playing, stops at `end` (advancing
to the next track, or rewinding to `start` when it is the only one) and builds the YouTube embed with
the same window, so the guest hears what the host previewed.

`sanitizeInvitationSongs` round-trips the fields and drops them when unset, so stored content stays
byte-identical for cards that never used an excerpt.
