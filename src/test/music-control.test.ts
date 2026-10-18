import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import {
  MUSIC_LIBRARY,
  MUSIC_EVENT,
  applyMusicReply,
  isMusicCommand,
} from "@/components/wedding/music-control";
import { musicInstruction } from "../../supabase/functions/_shared/music";

afterEach(() => vi.restoreAllMocks());
describe("safe Gemini music actions", () => {
  it("ships six distinct playable local MP3 files", () => {
    expect(MUSIC_LIBRARY).toHaveLength(6);
    expect(new Set(MUSIC_LIBRARY.map((track) => track.id)).size).toBe(6);
    MUSIC_LIBRARY.forEach((track) => {
      expect(existsSync(`public${track.url}`)).toBe(true);
      expect(readFileSync(`public${track.url}`).byteLength).toBeGreaterThan(10000);
      expect(musicInstruction).toContain(track.id);
    });
  });
  it("dispatches a whitelisted request and hides the machine marker", () => {
    const dispatch = vi.spyOn(window, "dispatchEvent");
    expect(
      applyMusicReply("A softer selection for you. [MUSIC:moonlit-dua]", "Play softer music"),
    ).toBe("A softer selection for you.");
    expect(dispatch).toHaveBeenCalledTimes(1);
    const event = dispatch.mock.calls[0]![0] as CustomEvent;
    expect(event.type).toBe(MUSIC_EVENT);
    expect(event.detail).toBe("moonlit-dua");
  });
  it.each([
    ["[MUSIC:https://evil.test/song.mp3]", "Play music"],
    ["[MUSIC:pause][MUSIC:next]", "Change music"],
    ["[MUSIC:pause]", "When is the Nikah?"],
  ])("does not execute unsafe or unrelated output %s", (reply, question) => {
    const dispatch = vi.spyOn(window, "dispatchEvent");
    expect(applyMusicReply(reply, question)).not.toContain("[MUSIC:");
    expect(dispatch).not.toHaveBeenCalled();
  });
  it.each(["pause", "play", "next", "sufi-breeze"])("accepts supported command %s", (action) =>
    expect(isMusicCommand(action)).toBe(true),
  );
  it.each(["javascript:alert(1)", "unknown", ""])("rejects command %s", (action) =>
    expect(isMusicCommand(action)).toBe(false),
  );
});

// Keep frequently requested playback changes independent of network/key setup.
describe("instant music requests", () => {
  it("handles exact known requests but leaves unknown or compound requests to Gemini", async () => {
    const { getInstantMusicReply } = await import("@/components/wedding/music-control");
    expect(getInstantMusicReply("Play softer music", "English")).toContain("[MUSIC:moonlit-dua]");
    expect(getInstantMusicReply("Play Rosewater", "English")).toContain("[MUSIC:rosewater]");
    expect(getInstantMusicReply("Pause the music", "English")).toContain("[MUSIC:pause]");
    expect(getInstantMusicReply("Play an unavailable famous song", "English")).toBeUndefined();
    expect(
      getInstantMusicReply("Pause the music and tell me the dress code", "English"),
    ).toBeUndefined();
  });
});
