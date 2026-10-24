import { useEffect, useRef, useState } from "react";
import { ExternalLink, ListMusic, Pause, Play, SkipForward, Volume2, X } from "lucide-react";
import type { InvitationDetails } from "./invitation-details";
import {
  INVITATION_MUSIC_EVENT,
  getSongLabel,
  resolveSongSource,
  type InvitationMusicCommand,
} from "./invitation-music";

type SpotifyPlaybackUpdate = {
  data?: {
    isPaused?: boolean;
  };
};

type SpotifyEmbedController = {
  play: () => void;
  pause: () => void;
  togglePlay?: () => void;
  loadUri: (uri: string) => void;
  destroy?: () => void;
  addListener: (event: string, cb: (payload: SpotifyPlaybackUpdate) => void) => void;
};

type SpotifyIframeApi = {
  createController: (
    element: HTMLElement,
    options: { uri: string; width?: string | number; height?: number },
    callback: (controller: SpotifyEmbedController) => void,
  ) => void;
};

declare global {
  interface Window {
    SpotifyIframeApi?: SpotifyIframeApi;
    onSpotifyIframeApiReady?: (api: SpotifyIframeApi) => void;
  }
}

let spotifyApiListeners: Array<(api: SpotifyIframeApi) => void> = [];

function loadSpotifyIframeApi(onReady: (api: SpotifyIframeApi) => void): () => void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return () => {};
  }
  if (window.SpotifyIframeApi) {
    onReady(window.SpotifyIframeApi);
    return () => {};
  }
  spotifyApiListeners.push(onReady);
  if (!document.getElementById("spotify-iframe-api-script")) {
    const previous = window.onSpotifyIframeApiReady;
    window.onSpotifyIframeApiReady = (api: SpotifyIframeApi) => {
      window.SpotifyIframeApi = api;
      previous?.(api);
      const listeners = [...spotifyApiListeners];
      spotifyApiListeners = [];
      for (const listener of listeners) listener(api);
    };
    const script = document.createElement("script");
    script.id = "spotify-iframe-api-script";
    script.src = "https://open.spotify.com/embed/iframe-api/v1";
    script.async = true;
    document.head.appendChild(script);
  }
  return () => {
    spotifyApiListeners = spotifyApiListeners.filter((cb) => cb !== onReady);
  };
}

function postYouTubeCommand(
  iframe: HTMLIFrameElement | null,
  func: "playVideo" | "pauseVideo" | "unMute" | "setVolume",
  args: unknown[] = [],
) {
  iframe?.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args }), "*");
}

/**
 * The host's own soundtrack. Supports built-in instrumentals, direct HTTPS audio,
 * YouTube video/music links, and Spotify track/playlist/album links.
 * Pre-warms track 0 silently and starts playback automatically when the guest opens
 * the invitation doors (or interacts with the card).
 */
export function InvitationMusicPlayer({
  details,
  inline = false,
}: {
  details: InvitationDetails;
  inline?: boolean;
}) {
  const songs = details.songs;
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [ytAutoplay, setYtAutoplay] = useState(false);
  const [spotifyControllerReady, setSpotifyControllerReady] = useState(false);
  const [volume, setVolume] = useState(0.45);
  const [status, setStatus] = useState("");

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ytIframeRef = useRef<HTMLIFrameElement | null>(null);
  const spotifyHostRef = useRef<HTMLDivElement | null>(null);
  const spotifyControllerRef = useRef<SpotifyEmbedController | null>(null);
  const spotifyLoadedUriRef = useRef<string | null>(null);
  const pendingSpotifyPlayRef = useRef(false);
  const spotifyFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const indexRef = useRef(0);
  const playingRef = useRef(false);
  const volumeRef = useRef(0.45);
  const songsRef = useRef(songs);
  songsRef.current = songs;
  const handlerRef = useRef<(command: InvitationMusicCommand) => void>(() => {});

  function updatePlaying(next: boolean) {
    playingRef.current = next;
    setPlaying(next);
  }

  function stopHtmlAudio() {
    try {
      audioRef.current?.pause();
    } catch {
      // Ignore environments without HTMLMediaElement.pause implementation
    }
  }

  function ensureAudio() {
    if (audioRef.current) return audioRef.current;
    const audio = new Audio();
    audio.preload = "auto";
    audio.volume = volumeRef.current;
    audio.addEventListener("play", () => updatePlaying(true));
    audio.addEventListener("pause", () => updatePlaying(false));
    audio.addEventListener("ended", () => {
      if (songsRef.current.length > 1) {
        handlerRef.current({ action: "next" });
      } else {
        audio.currentTime = 0;
        void audio.play().catch(() => updatePlaying(false));
      }
    });
    audio.addEventListener("error", () => {
      updatePlaying(false);
      setStatus("That song couldn't load. Try another track.");
    });
    audioRef.current = audio;
    return audio;
  }

  // Pre-warm audio track 0 on live cards so door-open click plays with zero buffering lag.
  useEffect(() => {
    if (inline || !songs.length) return;
    const first = songs[0];
    if (!first) return;
    const source = resolveSongSource(first.url);
    if (!source || source.kind === "audio") {
      const audio = ensureAudio();
      const targetSrc = source ? source.src : first.url;
      if (audio.dataset["track"] !== `0:${targetSrc}`) {
        audio.src = targetSrc;
        audio.dataset["track"] = `0:${targetSrc}`;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inline, songs[0]?.url]);

  const boundedIndex = songs.length ? Math.min(index, songs.length - 1) : 0;
  const current = songs[boundedIndex];
  const currentSource = current ? resolveSongSource(current.url) : null;
  const activeSpotifyUri = currentSource?.kind === "spotify" ? currentSource.spotifyUri : "";

  // Initialize official Spotify EmbedController when the active track is a Spotify URI.
  useEffect(() => {
    if (!activeSpotifyUri) return;
    const targetUri = activeSpotifyUri;

    if (spotifyControllerRef.current) {
      if (spotifyLoadedUriRef.current !== targetUri) {
        spotifyLoadedUriRef.current = targetUri;
        spotifyControllerRef.current.loadUri(targetUri);
      }
      if (pendingSpotifyPlayRef.current) {
        pendingSpotifyPlayRef.current = false;
        spotifyControllerRef.current.play();
      }
      return;
    }

    const cancel = loadSpotifyIframeApi((api) => {
      const host = spotifyHostRef.current;
      if (!host || spotifyControllerRef.current) return;
      api.createController(host, { uri: targetUri, width: "100%", height: 80 }, (controller) => {
        spotifyControllerRef.current = controller;
        spotifyLoadedUriRef.current = targetUri;
        setSpotifyControllerReady(true);
        controller.addListener("playback_update", (event) => {
          const paused = event?.data?.isPaused;
          if (typeof paused === "boolean") {
            updatePlaying(!paused);
            if (!paused) setStatus("");
          }
        });
        if (pendingSpotifyPlayRef.current) {
          pendingSpotifyPlayRef.current = false;
          controller.play();
        }
      });
    });
    return cancel;
  }, [activeSpotifyUri]);

  function playIndex(nextIndex: number, autoplay = true) {
    if (!songs.length) return;
    const bounded = ((nextIndex % songs.length) + songs.length) % songs.length;
    const nextSong = songs[bounded]!;
    const source = resolveSongSource(nextSong.url);

    indexRef.current = bounded;
    setIndex(bounded);
    setStatus("");

    if (!source || source.kind === "audio") {
      setYtAutoplay(false);
      postYouTubeCommand(ytIframeRef.current, "pauseVideo");
      spotifyControllerRef.current?.pause();
      const audio = ensureAudio();
      const targetSrc = source ? source.src : nextSong.url;
      if (audio.dataset["track"] !== `${bounded}:${targetSrc}`) {
        audio.src = targetSrc;
        audio.dataset["track"] = `${bounded}:${targetSrc}`;
      }
      if (autoplay) {
        void audio
          .play()
          .then(() => updatePlaying(true))
          .catch(() => {
            updatePlaying(false);
            setStatus("Tap play once more to start the music.");
          });
      }
      return;
    }

    stopHtmlAudio();

    if (source.kind === "youtube") {
      spotifyControllerRef.current?.pause();
      if (autoplay) {
        if (ytIframeRef.current && bounded === boundedIndex) {
          postYouTubeCommand(ytIframeRef.current, "unMute");
          postYouTubeCommand(ytIframeRef.current, "setVolume", [
            Math.round(volumeRef.current * 100),
          ]);
          postYouTubeCommand(ytIframeRef.current, "playVideo");
        } else {
          setYtAutoplay(true);
        }
        updatePlaying(true);
      } else {
        updatePlaying(false);
      }
      return;
    }

    // Spotify track / playlist / album
    postYouTubeCommand(ytIframeRef.current, "pauseVideo");
    if (autoplay) {
      if (spotifyControllerRef.current) {
        if (spotifyLoadedUriRef.current !== source.spotifyUri) {
          spotifyLoadedUriRef.current = source.spotifyUri;
          spotifyControllerRef.current.loadUri(source.spotifyUri);
        }
        spotifyControllerRef.current.play();
        updatePlaying(true);
      } else {
        pendingSpotifyPlayRef.current = true;
      }
      if (!inline) {
        if (spotifyFallbackTimerRef.current) clearTimeout(spotifyFallbackTimerRef.current);
        spotifyFallbackTimerRef.current = setTimeout(() => {
          if (!playingRef.current) {
            setOpen(true);
          }
        }, 1600);
      }
    }
  }

  function pauseCurrent() {
    const currentSong = songs[indexRef.current];
    const source = currentSong ? resolveSongSource(currentSong.url) : null;
    if (source?.kind === "youtube") {
      postYouTubeCommand(ytIframeRef.current, "pauseVideo");
      updatePlaying(false);
      return;
    }
    if (source?.kind === "spotify") {
      pendingSpotifyPlayRef.current = false;
      spotifyControllerRef.current?.pause();
      updatePlaying(false);
      return;
    }
    stopHtmlAudio();
    updatePlaying(false);
  }

  function toggle() {
    if (playing) {
      pauseCurrent();
      return;
    }
    playIndex(indexRef.current, true);
  }

  handlerRef.current = (command) => {
    if (command.action === "pause") {
      pauseCurrent();
      return;
    }
    if (command.action === "next") {
      playIndex(indexRef.current + 1, true);
      return;
    }
    if (command.action === "play") {
      playIndex(command.index ?? indexRef.current, true);
    }
  };

  useEffect(() => {
    const onCommand = (event: Event) => {
      const detail = (event as CustomEvent<InvitationMusicCommand>).detail;
      if (!detail || typeof detail !== "object") return;
      handlerRef.current(detail);
    };
    const closePanel = () => setOpen(false);
    window.addEventListener(INVITATION_MUSIC_EVENT, onCommand);
    window.addEventListener("invite:close-music", closePanel);
    return () => {
      window.removeEventListener(INVITATION_MUSIC_EVENT, onCommand);
      window.removeEventListener("invite:close-music", closePanel);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (spotifyFallbackTimerRef.current) clearTimeout(spotifyFallbackTimerRef.current);
      spotifyControllerRef.current?.destroy?.();
      spotifyControllerRef.current = null;
      const audio = audioRef.current;
      if (!audio) return;
      try {
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
      } catch {
        // Ignore non-browser media stubs during unmount
      }
      audioRef.current = null;
    };
  }, []);

  if (!songs.length || !current) return null;
  const keepEmbedMounted =
    !inline && (currentSource?.kind === "youtube" || currentSource?.kind === "spotify");
  const panelVisible = inline || open;

  const youtubeSrc =
    currentSource?.kind === "youtube"
      ? `${currentSource.embedUrl}${ytAutoplay ? "&autoplay=1" : ""}`
      : "";

  const panel = (
    <section
      id="invite-music-panel"
      className={`invite-music-panel ${inline ? "invite-music-panel-inline" : ""} ${!panelVisible ? "is-minimized" : ""}`}
      aria-label="Invitation soundtrack"
      aria-hidden={!panelVisible ? true : undefined}
    >
      <div className="invite-music-panel-head">
        <div className="min-w-0">
          <p className="invite-music-eyebrow">The host&apos;s soundtrack</p>
          <h3 className="truncate font-serif text-xl leading-tight">{current.title}</h3>
        </div>
        {!inline && (
          <button
            type="button"
            className="invite-music-icon-button"
            aria-label="Close music panel"
            onClick={() => setOpen(false)}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {currentSource?.kind === "youtube" && (
        <div className="invite-music-embed-wrap">
          <iframe
            key={`${currentSource.videoId}-${ytAutoplay ? "auto" : "ready"}`}
            ref={ytIframeRef}
            src={youtubeSrc}
            title={current.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
            className="invite-music-embed invite-music-embed-youtube"
            onLoad={() => {
              postYouTubeCommand(ytIframeRef.current, "setVolume", [
                Math.round(volumeRef.current * 100),
              ]);
              if (playingRef.current || ytAutoplay) {
                postYouTubeCommand(ytIframeRef.current, "unMute");
                postYouTubeCommand(ytIframeRef.current, "playVideo");
              }
            }}
          />
        </div>
      )}

      {currentSource?.kind === "spotify" && (
        <div className="invite-music-embed-wrap">
          <div ref={spotifyHostRef} className="invite-music-spotify-host" />
          {!spotifyControllerReady && (
            <iframe
              key={`${currentSource.itemType}-${currentSource.itemId}`}
              src={`${currentSource.embedUrl}${pendingSpotifyPlayRef.current ? "&autoplay=1" : ""}`}
              title={current.title}
              height="80"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              className="invite-music-embed invite-music-embed-spotify"
            />
          )}
        </div>
      )}

      <div className="invite-music-list">
        {songs.map((song, songIndex) => {
          const songSource = resolveSongSource(song.url);
          const badge =
            songSource?.kind === "youtube"
              ? "YT"
              : songSource?.kind === "spotify"
                ? "Spotify"
                : null;
          return (
            <button
              key={`${song.url}-${songIndex}`}
              type="button"
              aria-pressed={boundedIndex === songIndex}
              onClick={() => playIndex(songIndex, true)}
              className={`invite-music-track ${boundedIndex === songIndex ? "is-active" : ""}`}
            >
              <span className="invite-music-track-number">0{songIndex + 1}</span>
              <span className="min-w-0 flex-1 truncate">{getSongLabel(song, songIndex)}</span>
              {badge && <span className="invite-music-source-pill">{badge}</span>}
              {boundedIndex === songIndex && playing ? (
                <Pause className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              ) : (
                <Play className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              )}
            </button>
          );
        })}
      </div>

      <div className="invite-music-controls">
        <button
          type="button"
          className="invite-music-play"
          aria-label={playing ? "Pause music" : "Play music"}
          onClick={toggle}
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
        {songs.length > 1 && (
          <button
            type="button"
            className="invite-music-icon-button"
            aria-label="Next song"
            onClick={() => playIndex(boundedIndex + 1, true)}
          >
            <SkipForward className="h-4 w-4" />
          </button>
        )}
        {currentSource?.kind !== "spotify" && (
          <label className="invite-music-volume">
            <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
            <input
              aria-label="Music volume"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(event) => {
                const next = Number(event.target.value);
                volumeRef.current = next;
                setVolume(next);
                if (audioRef.current) audioRef.current.volume = next;
                if (currentSource?.kind === "youtube") {
                  postYouTubeCommand(ytIframeRef.current, "setVolume", [Math.round(next * 100)]);
                }
              }}
            />
          </label>
        )}
        {(currentSource?.kind === "youtube" || currentSource?.kind === "spotify") && (
          <a
            href={currentSource.kind === "youtube" ? currentSource.watchUrl : currentSource.openUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="invite-music-external-link"
          >
            Open in {currentSource.kind === "youtube" ? "YouTube" : "Spotify"}
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        )}
      </div>

      <p role="status" className="invite-music-status">
        {status ||
          (playing
            ? `Playing · ${current.title}`
            : currentSource?.kind === "spotify"
              ? `Spotify · ${current.title}`
              : "Paused")}
      </p>
      <p className="invite-music-hint">Chosen by the host · tap pause anytime</p>
    </section>
  );

  if (inline) {
    return <div className="invite-music invite-music-inline">{panel}</div>;
  }

  return (
    <div className="invite-music">
      {(open || keepEmbedMounted) && panel}
      <button
        type="button"
        className="invite-music-launcher"
        aria-expanded={open}
        aria-controls="invite-music-panel"
        aria-label="Open the invitation soundtrack"
        onClick={() =>
          setOpen((value) => {
            const next = !value;
            if (next) window.dispatchEvent(new CustomEvent("invite:close-concierge"));
            return next;
          })
        }
      >
        <ListMusic className="h-5 w-5" aria-hidden="true" />
        <span className="invite-music-launcher-label">
          {playing ? "Now playing" : "Soundtrack"}
        </span>
      </button>
    </div>
  );
}
