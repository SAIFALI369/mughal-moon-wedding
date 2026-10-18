import { cleanup, fireEvent, render, screen, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MusicToggle } from "@/components/wedding/music-player";
import { sendMusicCommand } from "@/components/wedding/music-control";

class FakeAudio extends EventTarget {
  src = "";
  loop = false;
  volume = 1;
  preload = "";
  play = vi.fn(async () => {
    this.dispatchEvent(new Event("play"));
  });
  pause = vi.fn(() => {
    this.dispatchEvent(new Event("pause"));
  });
  removeAttribute = vi.fn();
  load = vi.fn();
}
let audio: FakeAudio;
beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal(
    "Audio",
    class extends FakeAudio {
      constructor() {
        super();
        // eslint-disable-next-line @typescript-eslint/no-this-alias -- expose the constructed test audio instance
        audio = this;
      }
    },
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("visitor-local music player", () => {
  it("does not autoplay on mount, switches via chat commands, pauses and adjusts volume", async () => {
    render(<MusicToggle />);
    expect(audio.play).not.toHaveBeenCalled();
    expect(audio.preload).toBe("none");
    fireEvent.click(screen.getByRole("button", { name: "Open background music playlist" }));
    await act(async () => sendMusicCommand("rosewater"));
    expect(audio.src).toBe("/audio/rosewater.mp3");
    expect(screen.getByRole("status")).toHaveTextContent("Playing: Rosewater");
    act(() => sendMusicCommand("pause"));
    expect(screen.getByRole("status")).toHaveTextContent("Paused: Rosewater");
    fireEvent.change(screen.getByRole("slider", { name: "Music volume" }), {
      target: { value: "0.6" },
    });
    expect(audio.volume).toBe(0.6);
    await act(async () => sendMusicCommand("next"));
    expect(audio.src).toBe("/audio/royal-courtyard.mp3");
  });
  it("shows a Play fallback when the browser blocks playback", async () => {
    render(<MusicToggle />);
    audio.play.mockRejectedValueOnce(new Error("Autoplay blocked"));
    await act(async () => sendMusicCommand("sufi-breeze"));
    expect(screen.getByRole("status")).toHaveTextContent("Paused: Sufi Breeze");
    expect(screen.getByRole("button", { name: "Play music" })).toBeInTheDocument();
  });
  it("cleans up its listener when leaving the page", () => {
    const { unmount } = render(<MusicToggle />);
    unmount();
    audio.play.mockClear();
    sendMusicCommand("moonlit-dua");
    expect(audio.play).not.toHaveBeenCalled();
    expect(audio.load).toHaveBeenCalled();
  });
});
