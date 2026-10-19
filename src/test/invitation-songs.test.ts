import { describe, expect, it } from "vitest";
import {
  MAX_SONGS,
  MAX_SONG_BYTES,
  isSafeSongPath,
  normalizeSongs,
  songContentType,
  songExtension,
  songFileProblem,
  songTitleFromFileName,
} from "@/components/wedding/invitation-songs";
import { invitationContentSchema } from "@/components/wedding/invitation-schema";
import { assistantName, getInvitationDetails } from "@/components/wedding/invitation-details";

const owner = "11111111-2222-4333-8444-555555555555";
const goodPath = `${owner}/66666666-7777-4888-8999-aaaaaaaaaaaa.mp3`;

describe("song file rules", () => {
  it("accepts MP3, M4A, WAV and OGG under the size limit", () => {
    for (const name of ["a.mp3", "b.M4A", "c.wav", "d.ogg"]) {
      expect(songFileProblem({ name, size: 1000, type: "" }), name).toBeNull();
    }
    expect(songFileProblem({ name: "a.mp3", size: 1000, type: "audio/mpeg" })).toBeNull();
  });

  it("rejects other types, empty files, and files over 10 MB", () => {
    expect(songFileProblem({ name: "clip.exe", size: 1000, type: "" })).toMatch(
      /MP3, M4A, WAV or OGG/,
    );
    expect(songFileProblem({ name: "a.mp3", size: 1000, type: "video/mp4" })).toMatch(/MP3, M4A/);
    expect(songFileProblem({ name: "a.mp3", size: 0, type: "audio/mpeg" })).toMatch(/empty/);
    expect(
      songFileProblem({ name: "a.mp3", size: MAX_SONG_BYTES + 1, type: "audio/mpeg" }),
    ).toMatch(/10 MB/);
  });

  it("maps extensions to content types and ignores unknown extensions", () => {
    expect(songExtension("Track.WAV")).toBe("wav");
    expect(songExtension("notes")).toBeNull();
    expect(songContentType("m4a")).toBe("audio/mp4");
    expect(songContentType("zip")).toBe("application/octet-stream");
  });

  it("builds readable titles from file names", () => {
    expect(songTitleFromFileName("Rose_water-final.mp3")).toBe("Rose water final");
    expect(songTitleFromFileName(`${"x".repeat(200)}.ogg`)).toHaveLength(120);
  });
});

describe("stored song paths and records", () => {
  it("only accepts storage paths shaped like <owner>/<uuid>.<audio ext>", () => {
    expect(isSafeSongPath(goodPath)).toBe(true);
    expect(isSafeSongPath(`https://evil.example/${goodPath}`)).toBe(false);
    expect(isSafeSongPath(`../${goodPath}`)).toBe(false);
    expect(isSafeSongPath(`${owner}/track.exe`)).toBe(false);
    expect(isSafeSongPath(42)).toBe(false);
  });

  it("drops malformed stored songs and caps the list", () => {
    const valid = { id: "a", title: "Ghazal", path: goodPath };
    const songs = normalizeSongs([
      valid,
      { id: "", title: "No id", path: goodPath },
      { id: "b", title: "Bad path", path: "https://x.test/a.mp3" },
      { id: "c", title: "x".repeat(121), path: goodPath },
      null,
      ["array"],
      ...Array.from({ length: 9 }, (_, index) => ({
        id: `s${index}`,
        title: "Song",
        path: goodPath,
      })),
    ]);
    expect(songs[0]).toEqual(valid);
    expect(songs).toHaveLength(MAX_SONGS);
    expect(normalizeSongs("nope")).toEqual([]);
  });

  it("the form schema rejects more than five songs and keeps hostName optional", () => {
    const base = {
      groomName: "Ayaan",
      brideName: "Zara",
      date: "15 December 2030",
      time: "4:00 PM IST",
      venue: "Garden Pavilion",
      address: "Patna, Bihar",
    };
    const song = { id: "s", title: "Song", path: goodPath };
    expect(invitationContentSchema.safeParse({ ...base, songs: Array(6).fill(song) }).success).toBe(
      false,
    );
    const ok = invitationContentSchema.safeParse({ ...base, songs: [song] });
    expect(ok.success).toBe(true);
    expect(ok.success && ok.data.hostName).toBe("");
    expect(invitationContentSchema.safeParse({ ...base, hostName: "x".repeat(81) }).success).toBe(
      false,
    );
  });
});

describe("assistant name", () => {
  it("is the host name, then the contact name, then the groom", () => {
    expect(assistantName(getInvitationDetails({ groomName: "Ayaan", hostName: "Farah" }))).toBe(
      "Farah",
    );
    expect(assistantName(getInvitationDetails({ groomName: "Ayaan", contactName: "Imran" }))).toBe(
      "Imran",
    );
    expect(assistantName(getInvitationDetails({ groomName: "Ayaan", brideName: "Zara" }))).toBe(
      "Ayaan",
    );
  });
});
