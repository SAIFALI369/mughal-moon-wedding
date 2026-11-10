import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
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
  theme: "royal-rajmahal" as const,
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
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/**
 * Hero films are videos and they autoplay (muted, silently). These tests are
 * about the soundtrack, so count only the <audio> elements that were played.
 */
function audioInstances(spy: ReturnType<typeof vi.spyOn>): HTMLAudioElement[] {
  return (spy.mock.instances as unknown[]).filter(
    (instance): instance is HTMLAudioElement =>
      typeof HTMLAudioElement !== "undefined" && instance instanceof HTMLAudioElement,
  );
}

function audioPlays(spy: ReturnType<typeof vi.spyOn>): number {
  return audioInstances(spy).length;
}

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

  it("primes MP3 audio on Tap to open and starts audible playback after the opening video finishes", () => {
    const playSpy = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();

    const { container } = render(
      <PersonalInvitation
        title="Our Day"
        content={{
          ...baseCard,
          theme: "eid",
          songs: [{ title: "", url: "/music/sitar.mp3" }],
        }}
      />,
    );

    expect(audioPlays(playSpy)).toBe(0);
    fireEvent.click(screen.getByRole("button", { name: /^Tap to open$/i }));
    // Only a silent muted unlock happens on tap; audible playback waits until video completes.
    const [audio] = audioInstances(playSpy);
    expect(audio).toBeDefined();
    expect(audio.muted).toBe(true);
    expect(audioPlays(playSpy)).toBe(1);

    const video = container.querySelector("video")!;
    fireEvent.ended(video);
    expect(audio.muted).toBe(false);
    expect(audioPlays(playSpy)).toBe(2);
  });

  it("plays MP3 audio after the zoom video transition finishes on non-eid themes", () => {
    vi.useFakeTimers();
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

    expect(audioPlays(playSpy)).toBe(0);
    fireEvent.click(screen.getByRole("button", { name: /^Tap to open$/i }));
    const [audio] = audioInstances(playSpy);
    expect(audio).toBeDefined();
    expect(audio.muted).toBe(true);
    expect(audioPlays(playSpy)).toBe(1);

    act(() => vi.advanceTimersByTime(2600));
    expect(audio.muted).toBe(false);
    expect(audioPlays(playSpy)).toBe(2);
  });

  it("sends YouTube IFrame API playVideo commands right after the opening video finishes", () => {
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    const { container } = render(
      <PersonalInvitation
        title="Our Day"
        content={{
          ...baseCard,
          theme: "eid",
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

    fireEvent.click(screen.getByRole("button", { name: /^Tap to open$/i }));
    // Does not blast YouTube audio mid-transition
    const midCalls = postMessage.mock.calls.map(([msg]) => JSON.parse(msg as string).func);
    expect(midCalls).not.toContain("playVideo");

    const video = container.querySelector("video")!;
    fireEvent.ended(video);

    const funcs = postMessage.mock.calls.map(([msg]) => JSON.parse(msg as string).func);
    expect(funcs).toContain("unMute");
    expect(funcs).toContain("playVideo");
  });

  it("calls Spotify Embed Controller play() right after the opening video finishes", () => {
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
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

    const { container } = render(
      <PersonalInvitation
        title="Our Day"
        content={{
          ...baseCard,
          theme: "eid",
          songs: [
            { title: "Spotify Love", url: "https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC" },
          ],
        }}
      />,
    );

    expect(spotifyPlay).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /^Tap to open$/i }));
    expect(spotifyPlay).not.toHaveBeenCalled();

    const video = container.querySelector("video")!;
    fireEvent.ended(video);
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
    expect(audioPlays(playSpy)).toBe(0);
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

    expect(audioPlays(playSpy)).toBe(0);
    fireEvent.pointerDown(document.body);
    expect(audioPlays(playSpy)).toBe(1);
  });
});
