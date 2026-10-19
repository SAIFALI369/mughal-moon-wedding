// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CardSongPlayer } from "@/components/wedding/card-song-player";
import type { InvitationSong } from "@/components/wedding/invitation-songs";

const { createSignedUrl, from } = vi.hoisted(() => ({
  createSignedUrl: vi.fn(),
  from: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ supabase: { storage: { from } } }));

class FakeAudio extends EventTarget {
  src = "";
  preload = "";
  play = vi.fn(async () => {
    this.dispatchEvent(new Event("play"));
  });
  pause = vi.fn(() => {
    this.dispatchEvent(new Event("pause"));
  });
}
let audio: FakeAudio;

const owner = "11111111-2222-4333-8444-555555555555";
const songs: InvitationSong[] = [
  { id: "s1", title: "Rosewater", path: `${owner}/66666666-7777-4888-8999-aaaaaaaaaaaa.mp3` },
  { id: "s2", title: "Sufi Breeze", path: `${owner}/77777777-7777-4888-8999-bbbbbbbbbbbb.m4a` },
];

beforeEach(() => {
  from.mockReturnValue({ createSignedUrl });
  createSignedUrl.mockReset();
  createSignedUrl.mockImplementation(async (path: string) => ({
    data: { signedUrl: `https://signed.example/${path}?token=t` },
    error: null,
  }));
  vi.stubGlobal(
    "Audio",
    class extends FakeAudio {
      constructor() {
        super();
        // eslint-disable-next-line @typescript-eslint/no-this-alias -- expose the test audio element
        audio = this;
      }
    },
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("guest song player", () => {
  it("renders nothing for a card without songs", () => {
    const { container } = render(<CardSongPlayer songs={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("requests a signed URL only when a guest presses Play, never on load", async () => {
    render(<CardSongPlayer songs={songs} />);
    expect(createSignedUrl).not.toHaveBeenCalled();
    expect(audio.preload).toBe("none");
    fireEvent.click(screen.getByRole("button", { name: "Open songs for this invitation (2)" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Play Rosewater" }));
    });
    expect(createSignedUrl).toHaveBeenCalledTimes(1);
    expect(createSignedUrl).toHaveBeenCalledWith(songs[0].path, 3600);
    expect(audio.src).toContain(songs[0].path);
    expect(audio.play).toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("Playing: Rosewater");
  });

  it("moves to the next song when one ends", async () => {
    render(<CardSongPlayer songs={songs} />);
    fireEvent.click(screen.getByRole("button", { name: "Open songs for this invitation (2)" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Play Rosewater" }));
    });
    await act(async () => {
      audio.dispatchEvent(new Event("ended"));
    });
    await waitFor(() => expect(createSignedUrl).toHaveBeenLastCalledWith(songs[1].path, 3600));
    expect(screen.getByRole("status")).toHaveTextContent("Sufi Breeze");
  });

  it("shows a plain message when a song's link cannot be made", async () => {
    createSignedUrl.mockResolvedValueOnce({ data: null, error: new Error("not found") });
    render(<CardSongPlayer songs={songs} />);
    fireEvent.click(screen.getByRole("button", { name: "Open songs for this invitation (2)" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Play Rosewater" }));
    });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This song can’t be played right now.",
    );
    expect(audio.play).not.toHaveBeenCalled();
  });
});
