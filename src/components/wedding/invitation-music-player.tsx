import { useEffect, useRef, useState } from "react";
import { ListMusic, Pause, Play, SkipForward, Volume2, X } from "lucide-react";
import type { InvitationDetails } from "./invitation-details";
import {
  INVITATION_MUSIC_EVENT,
  getSongLabel,
  type InvitationMusicCommand,
} from "./invitation-music";

/**
 * The host's own soundtrack. It never autoplays: the guest taps play, so browser
 * autoplay policies and wedding etiquette are both respected.
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
  const [volume, setVolume] = useState(0.35);
  const [status, setStatus] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const indexRef = useRef(0);
  const volumeRef = useRef(0.35);
  const handlerRef = useRef<(command: InvitationMusicCommand) => void>(() => {});

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
    const audio = ensureAudio();
    if (audio.dataset["track"] !== String(bounded)) {
      audio.src = songs[bounded].url;
      audio.dataset["track"] = String(bounded);
    }
    indexRef.current = bounded;
    setIndex(bounded);
    setStatus("");
    if (autoplay) {
      void audio
        .play()
        .then(() => setPlaying(true))
        .catch(() => {
          setPlaying(false);
          setStatus("Tap play once more to start the music.");
        });
    }
  }

  function toggle() {
    const audio = audioRef.current;
    if (playing && audio) {
      audio.pause();
      return;
    }
    playIndex(indexRef.current);
  }

  handlerRef.current = (command) => {
    if (command.action === "pause") {
      audioRef.current?.pause();
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
  const current = songs[Math.min(index, songs.length - 1)]!;

  const panel = (
    <section
      id="invite-music-panel"
      className={`invite-music-panel ${inline ? "invite-music-panel-inline" : ""}`}
      aria-label="Invitation soundtrack"
    >
      <div className="invite-music-panel-head">
        <div>
          <p className="invite-music-eyebrow">The host's soundtrack</p>
          <h3 className="font-serif text-xl leading-tight">{current.title}</h3>
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
      <div className="invite-music-list">
        {songs.map((song, songIndex) => (
          <button
            key={`${song.url}-${songIndex}`}
            type="button"
            aria-pressed={index === songIndex}
            onClick={() => playIndex(songIndex)}
            className={`invite-music-track ${index === songIndex ? "is-active" : ""}`}
          >
            <span className="invite-music-track-number">0{songIndex + 1}</span>
            <span className="min-w-0 flex-1 truncate">{getSongLabel(song, songIndex)}</span>
            {index === songIndex && playing ? (
              <Pause className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            ) : (
              <Play className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            )}
          </button>
        ))}
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
        <button
          type="button"
          className="invite-music-icon-button"
          aria-label="Next song"
          onClick={() => playIndex(index + 1)}
        >
          <SkipForward className="h-4 w-4" />
        </button>
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
            }}
          />
        </label>
      </div>
      <p role="status" className="invite-music-status">
        {status || (playing ? `Playing · ${current.title}` : "Paused")}
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
      {open && panel}
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
