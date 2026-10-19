import { useEffect, useRef, useState } from "react";
import { Music2, Pause, Play, SkipForward, X } from "lucide-react";
import type { InvitationSong } from "./invitation-songs";
import { songPlaybackUrl } from "./invitation-song-storage";

/**
 * Songs the host added to this invitation. Playback starts only after a guest presses Play,
 * because browsers block autoplay. Signed URLs are requested per song and expire after an hour.
 */
export function CardSongPlayer({ songs }: { songs: InvitationSong[] }) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const loadedPath = useRef<string | null>(null);
  const requestId = useRef(0);
  const indexRef = useRef(index);
  const songCount = songs.length;

  async function play(next: number) {
    const song = songs[next];
    if (!song || !audioRef.current) return;
    const token = ++requestId.current;
    setIndex(next);
    setError("");
    setLoading(true);
    try {
      const audio = audioRef.current;
      if (loadedPath.current !== song.path) {
        const url = await songPlaybackUrl(song.path);
        if (token !== requestId.current) return;
        audio.src = url;
        loadedPath.current = song.path;
      }
      await audio.play();
    } catch {
      if (token !== requestId.current) return;
      setPlaying(false);
      setError("This song can’t be played right now. Try another song.");
    } finally {
      if (token === requestId.current) setLoading(false);
    }
  }

  // Keep the latest play function reachable from the audio listeners set up once below.
  const playRef = useRef(play);
  useEffect(() => {
    playRef.current = play;
    indexRef.current = index;
  });

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "none";
    audioRef.current = audio;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      if (songCount > 1) void playRef.current((indexRef.current + 1) % songCount);
      else setPlaying(false);
    };
    const onError = () => {
      setPlaying(false);
      setError("This song can’t be played right now. Try another song.");
    };
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    return () => {
      requestId.current += 1;
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      audio.pause();
      audioRef.current = null;
    };
    // The element is created once; the listeners read the latest values through refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (songCount === 0) return null;
  const current = songs[index] ?? songs[0];

  function toggle(target: number) {
    const audio = audioRef.current;
    if (!audio) return;
    if (target === index && loadedPath.current === songs[target]?.path && audio.src) {
      if (playing) audio.pause();
      else void play(target);
      return;
    }
    audio.pause();
    void play(target);
  }

  return (
    <div className="fixed bottom-6 right-4 z-40 flex flex-col items-end gap-3 sm:right-6">
      {open && (
        <section
          id="card-songs-panel"
          aria-label="Songs for this invitation"
          className="w-[min(320px,calc(100vw-32px))] rounded-3xl border border-emerald-700/25 bg-card p-5 shadow-2xl"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-2xl">Songs for the celebration</h3>
            <button
              type="button"
              aria-label="Close songs"
              className="p-2"
              onClick={() => setOpen(false)}
            >
              <X size={18} />
            </button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Chosen by the host · only for your visit
          </p>
          <ol className="my-4 flex max-h-[40dvh] flex-col gap-1 overflow-y-auto">
            {songs.map((song, i) => {
              const active = i === index;
              const isPlaying = active && playing;
              return (
                <li key={song.id}>
                  <button
                    type="button"
                    aria-label={`${isPlaying ? "Pause" : "Play"} ${song.title}`}
                    aria-pressed={active}
                    disabled={loading && active}
                    onClick={() => toggle(i)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm disabled:opacity-60 ${active ? "bg-emerald-900 text-white" : "hover:bg-muted"}`}
                  >
                    <span className="w-5 text-center opacity-70">
                      {isPlaying ? (
                        <Pause size={14} aria-hidden="true" />
                      ) : (
                        <Play size={14} aria-hidden="true" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{song.title}</span>
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="p-3"
              aria-label="Next song"
              disabled={songCount < 2 || loading}
              onClick={() => void play((index + 1) % songCount)}
            >
              <SkipForward size={18} />
            </button>
            <p role="status" className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
              {loading
                ? `Loading ${current.title}…`
                : `${playing ? "Playing" : "Paused"}: ${current.title}`}
            </p>
          </div>
          {error && (
            <p role="alert" className="mt-3 text-xs text-destructive">
              {error}
            </p>
          )}
        </section>
      )}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-controls="card-songs-panel"
        aria-expanded={open}
        aria-label={`Open songs for this invitation (${songCount})`}
        className="simran-action flex h-14 items-center gap-2 rounded-2xl px-4"
      >
        <Music2 size={21} aria-hidden="true" />
        <span className="hidden text-xs sm:inline">{playing ? "Now playing" : "Songs"}</span>
      </button>
    </div>
  );
}
