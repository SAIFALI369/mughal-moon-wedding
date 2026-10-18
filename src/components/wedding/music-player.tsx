import { useEffect, useRef, useState } from "react";
import { Music2, Pause, Play, SkipForward, X } from "lucide-react";
import { toast } from "sonner";
import { MUSIC_URL, CUSTOM_MUSIC_URL, MUSIC_TRACK } from "./config";
import {
  isMusicCommand,
  MUSIC_EVENT,
  MUSIC_LIBRARY,
  sendMusicCommand,
  type MusicCommand,
} from "./music-control";

export function MusicToggle() {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [track, setTrack] = useState<string>(MUSIC_LIBRARY[0].id);
  const [expanded, setExpanded] = useState(false);
  const [volume, setVolume] = useState(0.3);
  useEffect(() => {
    const player = new Audio();
    player.preload = "none";
    player.loop = true;
    player.volume = 0.3;
    audio.current = player;
    let current: string = MUSIC_LIBRARY[0].id;
    try {
      const saved = localStorage.getItem("wedding-music-track");
      if (MUSIC_LIBRARY.some((t) => t.id === saved)) current = saved!;
    } catch {
      /* storage optional */
    }
    const source = () =>
      current === "balagal" && CUSTOM_MUSIC_URL
        ? MUSIC_URL
        : MUSIC_LIBRARY.find((t) => t.id === current)!.url;
    player.src = source();
    setTrack(current);
    const play = () => {
      void player.play().catch(() => {
        setPlaying(false);
        setExpanded(true);
        toast("Tap Play in the music panel to start the selected track.");
      });
    };
    const pause = () => {
      player.pause();
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onError = () => {
      setPlaying(false);
      toast("This track couldn't load. Try another track.");
    };
    const command = (event: Event) => {
      const action: unknown = (event as CustomEvent).detail;
      if (typeof action !== "string" || !isMusicCommand(action)) return;
      if (action === "pause") {
        pause();
        return;
      }
      if (action === "play") {
        play();
        return;
      }
      current =
        action === "next"
          ? MUSIC_LIBRARY[
              (MUSIC_LIBRARY.findIndex((t) => t.id === current) + 1) % MUSIC_LIBRARY.length
            ]!.id
          : action;
      player.pause();
      player.src = source();
      setTrack(current);
      try {
        localStorage.setItem("wedding-music-track", current);
      } catch {
        /* storage optional */
      }
      play();
    };
    player.addEventListener("play", onPlay);
    player.addEventListener("pause", onPause);
    player.addEventListener("error", onError);
    window.addEventListener(MUSIC_EVENT, command);
    window.addEventListener("wedding:enter", play);
    window.addEventListener("wedding:enter-silent", pause);
    return () => {
      player.pause();
      player.removeAttribute("src");
      player.load();
      audio.current = null;
      window.removeEventListener(MUSIC_EVENT, command);
      window.removeEventListener("wedding:enter", play);
      window.removeEventListener("wedding:enter-silent", pause);
      player.removeEventListener("play", onPlay);
      player.removeEventListener("pause", onPause);
      player.removeEventListener("error", onError);
    };
  }, []);
  function choose(command: MusicCommand) {
    sendMusicCommand(command);
  }
  const current = MUSIC_LIBRARY.find((t) => t.id === track)!;
  return (
    <div className="music-widget fixed bottom-6 right-4 z-40 flex flex-col items-end gap-3 sm:right-6">
      {expanded && (
        <section
          id="wedding-music-panel"
          aria-label="Background music"
          className="w-[min(320px,calc(100vw-32px))] rounded-3xl border border-emerald-700/25 bg-card p-5 shadow-2xl"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-2xl">The wedding soundtrack</h3>
            <button
              type="button"
              aria-label="Close music panel"
              className="p-2"
              onClick={() => setExpanded(false)}
            >
              <X size={18} />
            </button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Six gentle instrumentals · only for your visit
          </p>
          <div className="my-4 flex max-h-[35dvh] flex-col gap-1 overflow-y-auto">
            {MUSIC_LIBRARY.map((item, i) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={track === item.id}
                onClick={() => choose(item.id)}
                className={`rounded-xl px-3 py-2 text-left text-sm ${track === item.id ? "bg-emerald-900 text-white" : "hover:bg-muted"}`}
              >
                <span className="mr-3 opacity-60">0{i + 1}</span>
                {item.title}
                <span className="mt-1 block pl-7 text-[11px] opacity-70">{item.mood}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="simran-action rounded-full p-3"
              aria-label={playing ? "Pause music" : "Play music"}
              onClick={() => choose(playing ? "pause" : "play")}
            >
              {playing ? <Pause size={18} /> : <Play size={18} />}
            </button>
            <button
              type="button"
              className="p-3"
              aria-label="Next track"
              onClick={() => choose("next")}
            >
              <SkipForward size={18} />
            </button>
            <label className="flex flex-1 flex-col gap-1 text-xs">
              Volume
              <input
                aria-label="Music volume"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  setVolume(value);
                  if (audio.current) audio.current.volume = value;
                }}
                className="w-full accent-emerald-700"
              />
            </label>
          </div>
          <p role="status" className="mt-3 text-xs text-muted-foreground">
            {playing ? "Playing" : "Paused"}: {current.title}
          </p>
          {track === "balagal" && (
            <details className="mt-4 text-xs">
              <summary className="cursor-pointer py-2 text-muted-foreground">
                Read the Balagal Ula verses
              </summary>
              <div className="space-y-3 pt-2">
                {MUSIC_TRACK.verses.map((verse) => (
                  <div key={verse.arabic}>
                    <p dir="rtl" className="font-arabic text-lg">
                      {verse.arabic}
                    </p>
                    <p className="mt-1 italic">{verse.transliteration}</p>
                    <p className="mt-1 text-muted-foreground">{verse.meaning}</p>
                  </div>
                ))}
              </div>
            </details>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Try asking Simran: “Play softer music” or “Pause the music”. Original instrumentals, not
            sung qawwali recordings.
          </p>
        </section>
      )}
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-controls="wedding-music-panel"
        aria-expanded={expanded}
        aria-label="Open background music playlist"
        className="simran-action flex h-14 items-center gap-2 rounded-2xl px-4"
      >
        <Music2 size={21} />
        <span className="hidden text-xs sm:inline">{playing ? "Now playing" : "Music"}</span>
      </button>
    </div>
  );
}
