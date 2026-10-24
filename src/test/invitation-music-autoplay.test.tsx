import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PersonalInvitation } from "@/components/wedding/invitation-template";
import { resolveSongSource, sanitizeInvitationSongs } from "@/components/wedding/invitation-music";
import { invitationContentSchema } from "@/components/wedding/invitation-schema";

vi.mock("@/lib/db", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: async () => ({ data: [], error: null }),
        }),
      }),
      insert: async () => ({ error: null }),
    }),
  },
}));

const baseCard = {
  groomName: "Ayaan",
  brideName: "Zara",
  date: "15/12/2026",
  time: "7:00 PM",
  venue: "Garden Pavilion",
  address: "Patna, Bihar",
  theme: "mughal" as const,
  framework: "royal-folio" as const,
};

beforeEach(() => {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      disconnect() {}
      unobserve() {}
    },
  );
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("soundtrack door-open autoplay", () => {
  it("assigns default titles to untitled MP3, YouTube, and Spotify links", () => {
    const sanitized = sanitizeInvitationSongs([
      { title: "", url: "https://cdn.example.com/song.mp3" },
      { title: "   ", url: "https://youtu.be/dQw4w9WgXcQ" },
      { title: "", url: "https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC" },
    ]);

    expect(sanitized).toEqual([
      { title: "Wedding Song 1", url: "https://cdn.example.com/song.mp3" },
      { title: "YouTube Song 2", url: "https://youtu.be/dQw4w9WgXcQ" },
      { title: "Spotify Track 3", url: "https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC" },
    ]);

    const parsed = invitationContentSchema.safeParse({
      ...baseCard,
      songs: [{ title: "", url: "https://youtu.be/dQw4w9WgXcQ" }],
    });
    expect(parsed.success).toBe(true);

    const spotify = resolveSongSource("https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC");
    expect(spotify).toMatchObject({
      kind: "spotify",
      spotifyUri: "spotify:track:4uLU6hMCjMI75M1A2tKUQC",
    });
  });

  it("plays MP3 audio synchronously when opening Preloader gates on a published card", () => {
    const playSpy = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();

    render(
      <PersonalInvitation
        title="Our Day"
        content={{
          ...baseCard,
          songs: [{ title: "", url: "/music/sitar.mp3" }],
        }}
      />,
    );

    expect(playSpy).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /Open the gates/i }));
    expect(playSpy).toHaveBeenCalledTimes(1);
  });

  it("plays MP3 audio synchronously when opening Royal Editions double doors", () => {
    const playSpy = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();

    render(
      <PersonalInvitation
        title="Our Day"
        content={{
          ...baseCard,
          theme: "royal-rajmahal",
          songs: [{ title: "Palace Raga", url: "/music/sitar.mp3" }],
        }}
      />,
    );

    expect(playSpy).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /Open invitation/i }));
    expect(playSpy).toHaveBeenCalledTimes(1);
  });

  it("sends YouTube IFrame API playVideo commands synchronously on door open", () => {
    render(
      <PersonalInvitation
        title="Our Day"
        content={{
          ...baseCard,
          songs: [{ title: "Wedding Song", url: "https://youtu.be/dQw4w9WgXcQ" }],
        }}
      />,
    );

    const iframe = document.querySelector<HTMLIFrameElement>("iframe.invite-music-embed-youtube");
    expect(iframe).toBeTruthy();
    expect(iframe?.src).toContain("enablejsapi=1");

    const postMessage = vi.fn();
    Object.defineProperty(iframe!, "contentWindow", {
      value: { postMessage },
      configurable: true,
    });

    fireEvent.click(screen.getByRole("button", { name: /Open the gates/i }));

    const funcs = postMessage.mock.calls.map(([msg]) => JSON.parse(msg as string).func);
    expect(funcs).toContain("unMute");
    expect(funcs).toContain("playVideo");
  });

  it("calls Spotify Embed Controller play() synchronously on door open", () => {
    const spotifyPlay = vi.fn();
    window.SpotifyIframeApi = {
      createController: (_el, _opts, cb) => {
        cb({
          loadUri: vi.fn(),
          play: spotifyPlay,
          pause: vi.fn(),
          destroy: vi.fn(),
          addListener: vi.fn(),
        });
      },
    };

    render(
      <PersonalInvitation
        title="Our Day"
        content={{
          ...baseCard,
          songs: [
            { title: "Spotify Love", url: "https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC" },
          ],
        }}
      />,
    );

    expect(spotifyPlay).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /Open the gates/i }));
    expect(spotifyPlay).toHaveBeenCalledTimes(1);

    delete window.SpotifyIframeApi;
  });

  it("never autoplays inside editor previews", () => {
    const playSpy = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();

    render(
      <PersonalInvitation
        title="Our Day"
        preview
        showGate={false}
        content={{
          ...baseCard,
          songs: [{ title: "Preview Track", url: "/music/sitar.mp3" }],
        }}
      />,
    );

    fireEvent.pointerDown(document.body);
    expect(playSpy).not.toHaveBeenCalled();
  });

  it("starts playback on first interaction when a published card has gate disabled", () => {
    const playSpy = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();

    render(
      <PersonalInvitation
        title="Our Day"
        content={{
          ...baseCard,
          elements: {
            gate: false,
            countdown: true,
            message: true,
            story: true,
            gallery: true,
            schedule: true,
            venueMap: true,
            rsvp: true,
            wishes: true,
            contact: true,
          },
          songs: [{ title: "First Touch Track", url: "/music/sitar.mp3" }],
        }}
      />,
    );

    expect(playSpy).not.toHaveBeenCalled();
    fireEvent.pointerDown(document.body);
    expect(playSpy).toHaveBeenCalledTimes(1);
  });
});
