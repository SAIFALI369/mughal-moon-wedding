import { useEffect, useRef, useState } from "react";
import { ExternalLink, ListMusic, Pause, Play, SkipForward, Volume2, X } from "lucide-react";
import type { InvitationDetails } from "./invitation-details";
import {
  INVITATION_MUSIC_EVENT,
  getSongLabel,
  resolveSongSource,
  type InvitationMusicCommand,
} from "./invitation-music";

function postYouTubeCommand(
  iframe: HTMLIFrameElement | null,
  func: "playVideo" | "pauseVideo" | "setVolume",
  args: unknown[] = [],
) {
  iframe?.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args }), "*");
}

/**
 * The host's own soundtrack. Supports built-in instrumentals, direct HTTPS audio,
 * YouTube video/music links, and Spotify track/playlist/album links.
 * Never autoplays on page load: playback begins only after guest interaction.
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
  const [embedActive, setEmbedActive] = useState(false);
  const [volume, setVolume] = useState(0.35);
  const [status, setStatus] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ytIframeRef = useRef<HTMLIFrameElement | null>(null);
  const indexRef = useRef(0);
  const volumeRef = useRef(0.35);
  const handlerRef = useRef<(command: InvitationMusicCommand) => void>(() => {});

  function stopHtmlAudio() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
  }

  function ensureAudio() {
    if (audioRef.current) return audioRef.current;
    const audio = new Audio();
    audio.preload = "metadata";
    audio.volume = volumeRef.current;
    audio.addEventListener("play", () => setPlaying(true));
    audio.addEventListener("pause", () => setPlaying(false));
    audio.addEventListener("error", () => {
      setPlaying(false);
      setStatus("That song couldn't load. Try another track.");
    });
    audioRef.current = audio;
    return audio;
  }

  function playIndex(nextIndex: number, autoplay = true) {
    if (!songs.length) return;
    const bounded = ((nextIndex % songs.length) + songs.length) % songs.length;
    const nextSong = songs[bounded]!;
    const source = resolveSongSource(nextSong.url);

    const trackChanged = indexRef.current !== bounded;
    indexRef.current = bounded;
    setIndex(bounded);
    setStatus("");

    if (!source || source.kind === "audio") {
      setEmbedActive(false);
      const audio = ensureAudio();
      const targetSrc = source ? source.src : nextSong.url;
      if (audio.dataset["track"] !== `${bounded}:${targetSrc}`) {
        audio.src = targetSrc;
        audio.dataset["track"] = `${bounded}:${targetSrc}`;
      }
      if (autoplay) {
        void audio
          .play()
          .then(() => setPlaying(true))
          .catch(() => {
            setPlaying(false);
            setStatus("Tap play once more to start the music.");
          });
      }
      return;
    }

    stopHtmlAudio();

    if (source.kind === "youtube") {
      if (autoplay) {
        if (embedActive && !trackChanged && ytIframeRef.current) {
          postYouTubeCommand(ytIframeRef.current, "playVideo");
        }
        setEmbedActive(true);
        setPlaying(true);
      } else {
        setPlaying(false);
      }
      return;
    }

    // Spotify tracks use Spotify's official embedded player controls
    setEmbedActive(true);
    setPlaying(false);
    if (!inline) setOpen(true);
    setStatus("Tap play inside the Spotify player above.");
  }

  function pauseCurrent() {
    const currentSong = songs[indexRef.current];
    const source = currentSong ? resolveSongSource(currentSong.url) : null;
    if (source?.kind === "youtube") {
      postYouTubeCommand(ytIframeRef.current, "pauseVideo");
      setPlaying(false);
      return;
    }
    audioRef.current?.pause();
    setPlaying(false);
  }

  function toggle() {
    const currentSong = songs[indexRef.current];
    const source = currentSong ? resolveSongSource(currentSong.url) : null;
    if (playing) {
      pauseCurrent();
      return;
    }
    if (source?.kind === "spotify") {
      setEmbedActive(true);
      if (!inline) setOpen(true);
      setStatus("Tap play inside the Spotify player above.");
      return;
    }
    playIndex(indexRef.current);
  }

  handlerRef.current = (command) => {
    if (command.action === "pause") {
      pauseCurrent();
      return;
    }
    if (command.action === "next") {
      playIndex(indexRef.current + 1);
      return;
    }
    if (command.action === "play") {
      playIndex(command.index ?? indexRef.current);
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
      const audio = audioRef.current;
      if (!audio) return;
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      audioRef.current = null;
    };
  }, []);

  if (!songs.length) return null;
  const boundedIndex = Math.min(index, songs.length - 1);
  const current = songs[boundedIndex]!;
  const currentSource = resolveSongSource(current.url);
  const keepEmbedMounted =
    embedActive && (currentSource?.kind === "youtube" || currentSource?.kind === "spotify");
  const panelVisible = inline || open;

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

      {currentSource?.kind === "youtube" && embedActive && (
        <div className="invite-music-embed-wrap">
          <iframe
            key={currentSource.videoId}
            ref={ytIframeRef}
            src={`${currentSource.embedUrl}&autoplay=1`}
            title={current.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
            className="invite-music-embed invite-music-embed-youtube"
            onLoad={() => {
              postYouTubeCommand(ytIframeRef.current, "setVolume", [
                Math.round(volumeRef.current * 100),
              ]);
            }}
          />
        </div>
      )}

      {currentSource?.kind === "spotify" && (panelVisible || embedActive) && (
        <div className="invite-music-embed-wrap">
          <iframe
            key={`${currentSource.itemType}-${currentSource.itemId}`}
            src={currentSource.embedUrl}
            title={current.title}
            height="80"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            className="invite-music-embed invite-music-embed-spotify"
          />
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
              onClick={() => playIndex(songIndex)}
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
        {currentSource?.kind !== "spotify" && (
          <button
            type="button"
            className="invite-music-play"
            aria-label={playing ? "Pause music" : "Play music"}
            onClick={toggle}
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
        )}
        {songs.length > 1 && (
          <button
            type="button"
            className="invite-music-icon-button"
            aria-label="Next song"
            onClick={() => playIndex(boundedIndex + 1)}
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
      <p className="invite-music-hint">
        Chosen by the host · plays only for you, only when you press play
      </p>
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
