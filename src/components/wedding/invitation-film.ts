import type { InvitationDetails } from "./invitation-details";
import { resolveSongSource } from "./invitation-music";

/**
 * Mughal Moon — The Film.
 *
 * A wedding invitation that opens as a short film instead of a card: a credit
 * card, three camera shots across a moonlit Mughal palace, and a title card
 * carrying the couple's names, date and venue. Everything below is a pure
 * description of that film — timings, shots, captions and the score — so the
 * player component stays a renderer and the script can be tested on its own.
 *
 * The film is drawn with photographs, CSS and inline SVG: no <video>, no
 * remote asset, no extra download. It plays after one tap (which is also what
 * lets the phone play the score), can be paused, scrubbed, skipped, and is
 * skipped automatically for guests who ask for reduced motion.
 */

export const FILM_THEME = "mughal-moon-film" as const;

export type FilmShotId = "palace" | "arch" | "courtyard";
export type FilmChapterId = "credit" | FilmShotId | "title";

export type FilmChapter = {
  id: FilmChapterId;
  /** Seconds from the first frame. Chapters deliberately overlap: that overlap is the cross-fade. */
  from: number;
  to: number;
};

/**
 * Twenty seconds, four movements. The title card starts while the courtyard is
 * still on screen so the names arrive in a dissolve rather than a cut.
 */
export const filmTimeline: readonly FilmChapter[] = [
  { id: "credit", from: 0, to: 2.4 },
  { id: "palace", from: 1.8, to: 6.6 },
  { id: "arch", from: 6.2, to: 10.8 },
  { id: "courtyard", from: 10.4, to: 14.8 },
  { id: "title", from: 14.2, to: 20.4 },
];

export const FILM_DURATION = 20.4;

/**
 * The hero cut: the film's three shots with the credit and title cards taken
 * out, so the opening screen can play and loop as a living hero instead of a
 * poster. Same overlaps, same dissolve.
 */
export const filmLoopTimeline: readonly FilmChapter[] = [
  { id: "palace", from: 0, to: 7.2 },
  { id: "arch", from: 6.6, to: 13.2 },
  { id: "courtyard", from: 12.6, to: 19.2 },
];

export const FILM_LOOP_DURATION = 19.2;

/** Where the looping hero cut is at `elapsed` seconds; it wraps on its own. */
export function loopChapterAt(elapsed: number): FilmChapter {
  const t = ((elapsed % FILM_LOOP_DURATION) + FILM_LOOP_DURATION) % FILM_LOOP_DURATION;
  let current = filmLoopTimeline[0]!;
  for (const chapter of filmLoopTimeline) if (t >= chapter.from) current = chapter;
  return current;
}
/** Seconds of cross-fade at each end of a shot. */
export const FILM_FADE = 0.9;

export function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

/** Which movement the film is in at `elapsed` seconds. Capsule titles in the player. */
export function chapterAt(elapsed: number): FilmChapter {
  let current = filmTimeline[0]!;
  for (const chapter of filmTimeline) if (elapsed >= chapter.from) current = chapter;
  return current;
}

/**
 * Fade in at the head of a shot and out at its tail. A shot that has not begun,
 * or has ended, is invisible; the last shot is held to the final frame.
 */
export function filmFade(elapsed: number, chapter: FilmChapter, fade = FILM_FADE): number {
  if (elapsed <= chapter.from || elapsed >= chapter.to) return 0;
  const last = chapter.id === "title";
  const head = clamp01((elapsed - chapter.from) / fade);
  const tail = last ? 1 : clamp01((chapter.to - elapsed) / fade);
  return Math.min(head, tail);
}

/** Slow push-in for each shot: the camera never stops moving. */
export function filmPush(elapsed: number, chapter: FilmChapter, amount = 0.11): number {
  return (
    1.02 + amount * clamp01((elapsed - chapter.from) / Math.max(chapter.to - chapter.from, 0.001))
  );
}

/** Where the guest is in the film, 0–1, for the progress rail. */
export function filmProgress(elapsed: number): number {
  return clamp01(elapsed / FILM_DURATION);
}

export type FilmShot = {
  id: FilmShotId;
  /** Two subtitle lines, so the film reads like a film and not a poster. */
  lines: [string, string];
  /** Vertical framing that keeps the subject in shot on a phone. */
  focus: string;
};

export type FilmStory = {
  credits: { studio: string; presents: string; line: string };
  shots: [FilmShot, FilmShot, FilmShot];
  title: {
    overline: string;
    groom: string;
    bride: string;
    date: string;
    venue: string;
    address: string;
    hashtag: string;
  };
  /** Six words of closing copy under the "enter" button. */
  invitation: string;
};

function join(parts: (string | undefined | null)[], separator = " · "): string {
  return parts.filter(Boolean).join(separator);
}

/**
 * The film's script, written from the host's own card. A card with no date or
 * venue still gets a complete film: the lines fall back to the studio's voice
 * rather than printing an empty subtitle.
 */
export function filmStory(details: InvitationDetails): FilmStory {
  const hosts = details.hosts || "Together with our families";
  const when = details.date || "The date will be announced";
  const where = details.venue || details.address || "The venue will be announced";
  const city = details.venue && details.address ? details.address : "";
  return {
    credits: {
      studio: "InvitingYou Pictures",
      presents: "presents",
      line: `a wedding film in one moonlit night`,
    },
    shots: [
      {
        id: "palace",
        lines: ["Two families. One moonlit night.", "They asked the moon to remember it."],
        focus: "50% 46%",
      },
      {
        id: "arch",
        lines: [hosts, "invite you to witness a promise."],
        focus: "50% 52%",
      },
      {
        id: "courtyard",
        lines: [join([when, details.time]), join([where, city])],
        focus: "50% 50%",
      },
    ],
    title: {
      overline: details.eventType || "A Wedding Invitation",
      groom: details.groomName,
      bride: details.brideName,
      date: join([details.date || "The date will be announced", details.time]),
      venue: join([where, city]),
      address: details.address,
      hashtag: details.hashtag,
    },
    invitation: "The film ends here. The celebration is only beginning.",
  };
}

/**
 * The film's score. A host who put their own song on the card hears that one;
 * everybody else hears the studio's own courtyard theme. Only a real audio
 * source can score a film, so a YouTube or Spotify entry falls back to the
 * bundled track and is left for the card's own music player.
 */
export function filmSoundtrack(details: InvitationDetails): string {
  const first = details.songs[0];
  const source = first ? resolveSongSource(first.url) : null;
  if (source?.kind === "audio") return source.src;
  return "/audio/royal-courtyard.mp3";
}

/** "00:20" — the runtime printed on the poster and the player. */
export function filmRuntime(seconds = FILM_DURATION): string {
  const whole = Math.max(0, Math.round(seconds));
  return `${String(Math.floor(whole / 60)).padStart(2, "0")}:${String(whole % 60).padStart(2, "0")}`;
}

/**
 * The three acts shown on the strip between sections. Each act keeps the
 * personal caption, so the strip repeats the film's own words rather than
 * generic labels.
 */
export function filmActs(details: InvitationDetails): { label: string; caption: string }[] {
  const story = filmStory(details);
  return [
    { label: "Act I · The Palace", caption: story.shots[0].lines[0] },
    { label: "Act II · The Arch", caption: story.shots[1].lines[0] },
    { label: "Act III · The Courtyard", caption: story.shots[2].lines[1] },
  ];
}
