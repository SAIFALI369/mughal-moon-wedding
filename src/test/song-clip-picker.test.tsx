// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SongClipPicker } from "@/components/wedding/song-clip-picker";

afterEach(cleanup);

const song = { title: "Moonlit Dua", url: "/audio/moonlit-dua.mp3", clipStart: 0, clipEnd: 0 };

describe("song excerpt picker", () => {
  it("offers the whole audio first, then the start and end of the excerpt", () => {
    render(<SongClipPicker song={song} index={0} onChange={() => {}} />);

    // The host hears the full track in the editor before trimming it.
    const audio = document.querySelector("audio") as HTMLAudioElement | null;
    expect(audio).not.toBeNull();
    expect(audio?.getAttribute("src")).toBe("/audio/moonlit-dua.mp3");
    expect(audio?.hasAttribute("controls")).toBe(true);

    expect(screen.getByLabelText("Start second for song 1")).toHaveAttribute("type", "range");
    expect(screen.getByLabelText("End second for song 1")).toHaveAttribute("type", "range");
    expect(screen.getByRole("button", { name: "Play the chosen part" })).toBeInTheDocument();
    expect(screen.getByText(/Choose the part guests hear/i)).toBeInTheDocument();
  });

  it("reports the chosen window as whole seconds", () => {
    const onChange = vi.fn();
    render(<SongClipPicker song={song} index={1} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText("Start second for song 2"), {
      target: { value: "32" },
    });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ clipStart: 32 }));

    fireEvent.change(screen.getByLabelText("End second for song 2"), { target: { value: "74" } });
    expect(onChange).toHaveBeenCalledWith({ clipEnd: 74 });

    fireEvent.click(screen.getByRole("button", { name: "Use full song" }));
    expect(onChange).toHaveBeenCalledWith({ clipStart: 0, clipEnd: 0 });
  });

  it("shows the picked window next to the control", () => {
    render(
      <SongClipPicker
        song={{ ...song, clipStart: 65, clipEnd: 125 }}
        index={2}
        onChange={() => {}}
      />,
    );
    expect(screen.getByText("1:05 – 2:05")).toBeInTheDocument();
    expect(screen.getByText(/1:00 of the song/)).toBeInTheDocument();
  });

  it("explains that Spotify embeds cannot be trimmed", () => {
    render(
      <SongClipPicker
        song={{ title: "Track", url: "https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC" }}
        index={3}
        onChange={() => {}}
      />,
    );
    expect(screen.getByText(/Spotify embeds always start at the beginning/i)).toBeInTheDocument();
  });

  it("previews a YouTube link inside the editor", () => {
    render(
      <SongClipPicker
        song={{
          title: "Video",
          url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          clipStart: 30,
          clipEnd: 90,
        }}
        index={4}
        onChange={() => {}}
      />,
    );
    const frame = document.querySelector("iframe");
    expect(frame?.getAttribute("src")).toContain("start=30");
    expect(frame?.getAttribute("src")).toContain("end=90");
  });
});
