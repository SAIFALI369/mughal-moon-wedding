// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  formatClipTime,
  resolveSongSource,
  sanitizeInvitationSongs,
  songClip,
  withYouTubeClip,
} from "@/components/wedding/invitation-music";
import { invitationContentSchema } from "@/components/wedding/invitation-schema";

const youtube = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

describe("song excerpts", () => {
  it("normalises a host-chosen window and ignores unusable bounds", () => {
    expect(songClip({ clipStart: 42, clipEnd: 78 })).toEqual({ start: 42, end: 78 });
    expect(songClip({ clipStart: -10, clipEnd: 30 })).toEqual({ start: 0, end: 30 });
    // An end at or before the start means "play to the end", never a negative clip.
    expect(songClip({ clipStart: 60, clipEnd: 60 })).toEqual({ start: 60, end: null });
    expect(songClip({ clipStart: 0, clipEnd: 0 })).toEqual({ start: 0, end: null });
    expect(songClip({})).toEqual({ start: 0, end: null });
  });

  it("starts the YouTube embed at the chosen second", () => {
    const source = resolveSongSource(youtube);
    expect(source?.kind).toBe("youtube");
    if (source?.kind !== "youtube") return;
    expect(withYouTubeClip(source.embedUrl, { clipStart: 0, clipEnd: 0 })).toBe(source.embedUrl);
    const clipped = withYouTubeClip(source.embedUrl, { clipStart: 35, clipEnd: 70 });
    expect(clipped).toContain("start=35");
    expect(clipped).toContain("end=70");
    expect(clipped.startsWith(`${source.embedUrl}&`)).toBe(true);
  });

  it("formats clip times the way a host reads them", () => {
    expect(formatClipTime(0)).toBe("0:00");
    expect(formatClipTime(95)).toBe("1:35");
    expect(formatClipTime(-3)).toBe("0:00");
  });

  it("round-trips an excerpt through the card schema", () => {
    const parsed = invitationContentSchema.safeParse({
      groomName: "Ayaan",
      brideName: "Zara",
      date: "26/11/2029",
      time: "4:00 PM",
      venue: "Patna Club",
      address: "Patna",
      songs: [{ title: "Moonlit Dua", url: "/audio/moonlit-dua.mp3", clipStart: 20, clipEnd: 65 }],
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.songs[0]).toMatchObject({ clipStart: 20, clipEnd: 65 });
  });

  it("keeps untouched links exactly as they were stored", () => {
    expect(
      sanitizeInvitationSongs([{ title: "Moonlit Dua", url: "/audio/moonlit-dua.mp3" }]),
    ).toEqual([{ title: "Moonlit Dua", url: "/audio/moonlit-dua.mp3" }]);
    expect(
      sanitizeInvitationSongs([{ title: "Reel", url: youtube, clipStart: 12, clipEnd: 40 }])[0],
    ).toEqual({ title: "Reel", url: youtube, clipStart: 12, clipEnd: 40 });
  });
});
