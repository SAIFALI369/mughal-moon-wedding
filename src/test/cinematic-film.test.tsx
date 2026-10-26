// @vitest-environment node
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MughalMoonFilm } from "@/components/wedding/invitation-film-player";
import {
  FILM_DURATION,
  FILM_LOOP_DURATION,
  chapterAt,
  filmActs,
  filmLoopTimeline,
  loopChapterAt,
  filmFade,
  filmProgress,
  filmRuntime,
  filmSoundtrack,
  filmStory,
  filmTimeline,
} from "@/components/wedding/invitation-film";
import { invitationFilmArt } from "@/components/wedding/invitation-art";
import { getInvitationDetails } from "@/components/wedding/invitation-details";
import {
  invitationThemeCategories,
  invitationThemeIds,
  invitationThemes,
  invitationLayoutFor,
} from "@/components/wedding/invitation-options";
import { InvitationCover, PersonalInvitation } from "@/components/wedding/invitation-template";
import { defaultInvitationElements } from "@/components/wedding/invitation-options";
import { paletteForTheme } from "@/lib/print-sheets";

const card = {
  groomName: "Ayaan",
  brideName: "Zara",
  date: "15 December 2030",
  time: "4:00 PM IST",
  venue: "Garden Pavilion",
  address: "Patna, Bihar",
  eventType: "Nikah",
  hosts: "The Khan family",
  hashtag: "#AyaanWedsZara",
  theme: "mughal-moon-film",
  framework: "cinematic-stage",
};

const details = getInvitationDetails({
  ...card,
  songs: [{ title: "Rosewater", url: "/audio/rosewater.mp3" }],
});

const film = (preview = true) =>
  renderToStaticMarkup(<MughalMoonFilm details={details} onEnter={() => {}} preview={preview} />);

describe("Mughal Moon — The Film", () => {
  it("registers the cinematic theme with its own group, layout, art and print palette", () => {
    expect(invitationThemeIds).toContain("mughal-moon-film");
    const entry = invitationThemes.find((theme) => theme.id === "mughal-moon-film");
    expect(entry?.category).toBe("cinema");
    expect(entry?.layout).toBe("reel");
    expect(entry?.immersive).toBe(true);
    expect(invitationThemeCategories.map((category) => category.id)).toContain("cinema");
    expect(invitationLayoutFor("mughal-moon-film", "modern-mosaic")).toBe("reel");
    expect(paletteForTheme("mughal-moon-film").ink).toBeTruthy();
    for (const art of Object.values(invitationFilmArt)) expect(art).toBeTruthy();
  });

  it("runs one continuous twenty-second timeline of overlapping movements", () => {
    expect(FILM_DURATION).toBeGreaterThan(15);
    expect(filmTimeline[0]!.from).toBe(0);
    expect(filmTimeline.at(-1)!.to).toBeCloseTo(FILM_DURATION, 5);
    expect(filmTimeline.map((chapter) => chapter.id)).toEqual([
      "credit",
      "palace",
      "arch",
      "courtyard",
      "title",
    ]);
    for (let index = 1; index < filmTimeline.length; index += 1) {
      // Each movement starts before the previous one ends: that overlap is the dissolve.
      expect(filmTimeline[index]!.from).toBeLessThan(filmTimeline[index - 1]!.to);
      expect(filmTimeline[index]!.to).toBeGreaterThan(filmTimeline[index]!.from);
    }
    expect(chapterAt(0).id).toBe("credit");
    expect(chapterAt(5).id).toBe("palace");
    expect(chapterAt(8).id).toBe("arch");
    expect(chapterAt(12).id).toBe("courtyard");
    expect(chapterAt(FILM_DURATION).id).toBe("title");
    expect(filmRuntime()).toBe("00:20");
  });

  it("fades each shot in and out, never showing two shots at full strength mid-dissolve", () => {
    const palace = filmTimeline.find((chapter) => chapter.id === "palace")!;
    expect(filmFade(palace.from, palace)).toBe(0);
    expect(filmFade((palace.from + palace.to) / 2, palace)).toBe(1);
    expect(filmFade(palace.to, palace)).toBe(0);
    expect(filmProgress(0)).toBe(0);
    expect(filmProgress(FILM_DURATION)).toBe(1);
    expect(filmProgress(0.5)).toBeCloseTo(0.5 / FILM_DURATION, 5);
  });

  it("writes the film from the host's own card, with a complete fallback", () => {
    const story = filmStory(details);
    expect(story.shots[0].lines[0]).toMatch(/Two families/);
    expect(story.shots[1].lines[0]).toBe("The Khan family");
    expect(story.shots[2].lines[0]).toContain("15 December 2030");
    expect(story.title.groom).toBe("Ayaan");
    expect(story.title.bride).toBe("Zara");
    expect(story.title.venue).toContain("Garden Pavilion");
    expect(story.title.hashtag).toBe("#AyaanWedsZara");
    expect(filmActs(details)).toHaveLength(3);

    const bare = getInvitationDetails({ theme: "mughal-moon-film" });
    const minimal = filmStory(bare);
    // A card with nothing filled in still reads as a finished film.
    for (const shot of minimal.shots)
      for (const line of shot.lines) expect(line.length).toBeGreaterThan(3);
    expect(minimal.title.date).toContain("announced");
  });

  it("scores the film with the host's own audio, and with the studio theme otherwise", () => {
    expect(filmSoundtrack(details)).toBe("/audio/rosewater.mp3");
    // A YouTube or Spotify soundtrack cannot score the film; the card's own player keeps it.
    const youtube = getInvitationDetails({
      ...card,
      songs: [{ title: "Song", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" }],
    });
    expect(filmSoundtrack(youtube)).toBe("/audio/royal-courtyard.mp3");
    expect(filmSoundtrack(getInvitationDetails({ theme: "mughal-moon-film" }))).toBe(
      "/audio/royal-courtyard.mp3",
    );
  });

  it("opens on a poster with one tap to start, a mute choice and a way past it", () => {
    const html = film();
    expect(html).toContain('data-film-phase="poster"');
    expect(html).toContain("Play the film");
    expect(html).toContain("00:20 · with sound");
    expect(html).toContain("Skip the film");
    expect(html).toContain("Sound on");
    expect(html).toContain("A cinematic wedding invitation");
    expect(html).toContain("بِسْمِ");
    expect(html).toContain("Ayaan");
    expect(html).toContain("Zara");
    expect(html).toContain("Garden Pavilion");
    // The score only loads once the guest starts the picture.
    expect(html).not.toContain("<audio");
    // The picture itself is a real video, muted, looping and inline.
    expect(html).toContain("<video");
    expect(html).toContain('src="/film/mughal-moon-film.mp4"');
    expect(html).not.toContain("<iframe");
  });

  it("writes every shot, caption and the title card into the page for screen readers", () => {
    const html = film();
    expect(html).toContain("InvitingYou Pictures");
    expect(html).toContain("a wedding film in one moonlit night");
    expect(html).toContain("Two families. One moonlit night.");
    expect(html).toContain("The Khan family invite you to witness a promise.");
    expect(html).toContain("Nikah: Ayaan and Zara");
    expect(html).toContain('aria-label="Ayaan and Zara, a cinematic wedding invitation"');
    // The title card and its hand-over copy are written by the same script.
    expect(filmStory(details).invitation).toContain("The celebration is only beginning");
  });

  it("draws the film only from the card's own bundled artwork and its own video", () => {
    const sources = [...film().matchAll(/src="([^"]+)"/g)].map((match) => match[1]!);
    expect(sources.length).toBeGreaterThan(0);
    for (const source of sources) {
      // Stills come from the theme's bundled shots; the picture is its own film.
      expect(
        Object.values(invitationFilmArt).includes(source) ||
          source === "/film/mughal-moon-film.mp4",
      );
      expect(source).not.toMatch(/^https?:/);
    }
  });

  it("loops the three shots as a living hero, with no credit or title card in the cut", () => {
    expect(FILM_LOOP_DURATION).toBeGreaterThan(10);
    expect(filmLoopTimeline.map((chapter) => chapter.id)).toEqual(["palace", "arch", "courtyard"]);
    for (let index = 1; index < filmLoopTimeline.length; index += 1) {
      // The same overlap as the film: that is the dissolve.
      expect(filmLoopTimeline[index]!.from).toBeLessThan(filmLoopTimeline[index - 1]!.to);
    }
    expect(loopChapterAt(0).id).toBe("palace");
    expect(loopChapterAt(9).id).toBe("arch");
    expect(loopChapterAt(15).id).toBe("courtyard");
    // The hero cut wraps on its own instead of ending.
    expect(loopChapterAt(FILM_LOOP_DURATION + 1).id).toBe("palace");
    expect(loopChapterAt(FILM_LOOP_DURATION * 3 + 9).id).toBe("arch");
  });

  it("puts the film in the live hero — a still poster never blocks the card", () => {
    const page = renderToStaticMarkup(
      <PersonalInvitation title="Our Day" content={card} preview showGate={false} />,
    );
    expect(page).toContain('data-theme="mughal-moon-film"');
    expect(page).toContain('data-layout="reel"');
    expect(page).toContain("reel-live");
    expect(page).toContain('data-auto="true"');
    expect(page).toContain("reel-live-frame");
    expect(page).toContain("reel-names");
    expect(page).toContain("reel-interlude");
    expect(page).toContain("reel-cell");
    expect(page).toContain("Act I · The Palace");
    expect(page).toContain("Scroll to begin");
    // The hero opens the full film on demand rather than gating the card.
    expect(page).toContain("Watch the film");
    expect(page).toContain("Sound off");
    expect(page).not.toContain('data-film-phase="poster"');
    expect(page).toContain('id="celebration"');
    expect(page).toContain('id="rsvp"');
    // The hero runs the theme's real film, and the only iframe is the venue map.
    expect(page).toContain('src="/film/mughal-moon-film.mp4"');
    expect(page.match(/<iframe/g)?.length).toBe(1);
  });

  it("honours the host turning motion off: the hero becomes one still frame", () => {
    const still = renderToStaticMarkup(
      <PersonalInvitation
        title="Our Day"
        content={{ ...card, elements: { ...defaultInvitationElements, gate: false } }}
        preview
        showGate={false}
      />,
    );
    expect(still).toContain('data-auto="false"');
    expect(still).toContain("reel-live");
    // No score and no video are mounted when the hero cannot move: it is a still.
    expect(still).not.toContain("<audio");
    expect(still).not.toContain("<video");
  });

  it("gives the card a cover of its own, not the shared tombstone", () => {
    const cover = renderToStaticMarkup(<InvitationCover content={card} />);
    expect(cover).toContain('data-theme="mughal-moon-film"');
    expect(cover).toContain("Ayaan");
    expect(cover).toContain("Zara");
    expect(cover).toContain("15"); // the date plate still prints the day
  });
});
