import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronDown, Clapperboard, Volume2, VolumeX } from "lucide-react";
import type { InvitationDetails } from "./invitation-details";
import { heroVideoForTheme, invitationFilmArt, themeLoop } from "./invitation-art";
import { isDarkOpeningTheme, useOpeningPhase } from "./noor-arch-gate";
import { playMedia } from "./theme-loop";
import {
  FILM_LOOP_DURATION,
  FILM_FADE,
  FILM_DURATION,
  filmActs,
  filmFade,
  filmLoopTimeline,
  filmPush,
  filmSoundtrack,
  filmStory,
  loopChapterAt,
} from "./invitation-film";

/**
 * The live hero — stabilized GPU film playback without mid-stream jitter,
 * simple dark-brown & goldenish calligraphy with sudden pop-up transition.
 */
export function LiveReelHero({
  details,
  scrollTo,
  autoPlay = true,
  onWatchFilm,
}: {
  details: InvitationDetails;
  actions: ReactNode;
  scrollTo: string;
  autoPlay?: boolean;
  onWatchFilm: () => void;
}) {
  const reduced = useReducedMotion();
  const { revealed, gated, heroVideoLive } = useOpeningPhase();
  const followUp = heroVideoForTheme(details.theme);
  const copyVisible = !gated || revealed;
  const darkSurface = isDarkOpeningTheme(details.theme);
  const story = filmStory(details);
  const acts = filmActs(details);
  const soundtrack = filmSoundtrack(details);
  const [elapsed, setElapsed] = useState(0);
  const [onScreen, setOnScreen] = useState(true);
  const [sound, setSound] = useState(false);
  const [soundBlocked, setSoundBlocked] = useState(false);
  const [filmLive, setFilmLive] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const filmRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const allowFilm = !gated || (heroVideoLive && Boolean(followUp));
  const running = autoPlay && allowFilm && !reduced && onScreen;
  const loopTime = elapsed % FILM_LOOP_DURATION;
  const chapter = loopChapterAt(elapsed);
  const shot = story.shots.find((entry) => entry.id === chapter.id) ?? story.shots[0];
  const act = acts[chapter.id === "palace" ? 0 : chapter.id === "arch" ? 1 : 2];

  useEffect(() => {
    if (!running) return;
    let frame = 0;
    let last = performance.now();
    let carry = 0;
    const tick = (now: number) => {
      const delta = Math.min(0.25, (now - last) / 1000);
      last = now;
      carry += delta;
      if (carry >= 1 / 30) {
        const step = carry;
        carry = 0;
        setElapsed((value) => (value + step) % FILM_LOOP_DURATION);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running]);

  useEffect(() => {
    const element = filmRef.current;
    if (!element) return;
    if (running) {
      playMedia(element);
      if (element.duration) {
        const wanted = (chapter.from / FILM_DURATION) * element.duration;
        if (Math.abs(element.currentTime - wanted) > element.duration * 0.3) {
          element.currentTime = wanted;
        }
      }
    } else {
      element.pause();
    }
  }, [running, chapter.id, chapter.from]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let visible = true;
    const sync = () => setOnScreen(visible && !document.hidden);
    const observer =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(
            ([entry]) => {
              visible = entry?.isIntersecting ?? false;
              sync();
            },
            { threshold: 0.05 },
          )
        : null;
    observer?.observe(element);
    document.addEventListener("visibilitychange", sync);
    return () => {
      observer?.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !sound;
    audio.volume = 0.5;
    if (!running) {
      audio.pause();
      return;
    }
    if (audio.paused) {
      void audio.play().catch(() => {
        if (sound) setSoundBlocked(true);
      });
    }
  }, [sound, running, soundtrack]);

  function toggleSound() {
    setSoundBlocked(false);
    const next = !sound;
    setSound(next);
    const audio = audioRef.current;
    if (next && audio) {
      audio.muted = false;
      void audio.play().catch(() => setSoundBlocked(true));
    }
  }

  const shots = story.shots.map((entry) => {
    const loop = filmLoopTimeline.find((item) => item.id === entry.id)!;
    const opacity =
      reduced || !running ? (entry.id === "palace" ? 1 : 0) : filmFade(loopTime, loop, FILM_FADE);
    const push = reduced || !running ? 1.02 : filmPush(loopTime, loop, 0.08);
    return { ...entry, art: invitationFilmArt[entry.id], opacity, push };
  });

  return (
    <section
      ref={ref}
      id="invitation-top"
      aria-label="Wedding invitation"
      className="reel-live"
      data-theme={details.theme}
      data-film={filmLive && running ? "live" : undefined}
      data-reduced={reduced ? "true" : undefined}
      data-auto={autoPlay ? "true" : "false"}
      data-chapter={chapter.id}
    >
      <div className="reel-live-stage hero-media-lock">
        {shots.map((entry) => (
          <div
            key={entry.id}
            className={`reel-live-shot reel-live-shot-${entry.id}`}
            data-on={entry.opacity > 0.02 ? "true" : undefined}
            style={{ opacity: entry.opacity, transform: `scale(${entry.push.toFixed(4)})` }}
          >
            <img
              className="reel-live-fill"
              src={entry.art}
              alt=""
              aria-hidden="true"
              draggable={false}
              decoding="async"
            />
            <img
              className="reel-live-frame"
              src={entry.art}
              alt=""
              aria-hidden="true"
              draggable={false}
              decoding="async"
              fetchPriority={entry.id === "palace" ? "high" : undefined}
              style={{ objectPosition: entry.focus }}
            />
          </div>
        ))}

        {running && (
          <video
            ref={filmRef}
            className="reel-live-film"
            src={followUp ?? themeLoop(details.theme)}
            style={{ objectPosition: "50% 45%" }}
            muted
            loop
            playsInline
            preload="auto"
            disablePictureInPicture
            tabIndex={-1}
            aria-hidden="true"
            data-live={filmLive ? "true" : undefined}
            onLoadedData={() => setFilmLive(true)}
            onError={() => setFilmLive(false)}
          />
        )}

        <div className="reel-grade" aria-hidden="true" />
        <div className="film-leak" aria-hidden="true" />
        <div className="reel-grain" aria-hidden="true" />
        <span className="reel-bar reel-bar-top" aria-hidden="true" />
        <span className="reel-bar reel-bar-bottom" aria-hidden="true" />

        <motion.div
          initial={gated && !reduced ? { opacity: 0, y: 28, scale: 0.92 } : false}
          animate={
            copyVisible ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 28, scale: 0.92 }
          }
          transition={reduced ? { duration: 0 } : { duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
          className={`reel-live-copy card-calligraphy-plate ${
            darkSurface ? "is-dark-art" : "is-light-art"
          }`}
        >
          <h1 className="reel-names card-calligraphy-names">
            <span className="card-calligraphy-name">{details.groomName}</span>
            <span className="reel-amp card-calligraphy-amp" aria-hidden="true">
              &amp;
            </span>
            <span className="card-calligraphy-name">{details.brideName}</span>
          </h1>
          {(details.date || details.time) && (
            <>
              <span className="card-calligraphy-rule" aria-hidden="true" />
              <p className="reel-date card-calligraphy-date mt-4">
                {[details.date, details.time].filter(Boolean).join(" · ")}
              </p>
            </>
          )}
          <div className="reel-live-buttons mt-5">
            <button type="button" className="reel-watch" onClick={onWatchFilm}>
              <Clapperboard className="h-4 w-4" aria-hidden="true" /> Watch the film
            </button>
            <button
              type="button"
              className="reel-replay"
              onClick={toggleSound}
              aria-pressed={sound}
              aria-label={sound ? "Mute the film" : "Play the film with sound"}
            >
              {sound ? (
                <Volume2 className="h-4 w-4" aria-hidden="true" />
              ) : (
                <VolumeX className="h-4 w-4" aria-hidden="true" />
              )}
              {sound ? "Sound on" : "Sound off"}
            </button>
          </div>
          {soundBlocked && (
            <p className="reel-sound-note" role="status">
              Your browser blocked the sound — tap the speaker again.
            </p>
          )}
        </motion.div>

        <p className="reel-live-caption" aria-live="off">
          <span className="reel-live-act">{act.label}</span>
          <span className="reel-live-line">{shot.lines[0]}</span>
        </p>

        <a href={scrollTo} className="reel-scroll card-scroll-cue">
          Scroll to begin
          <ChevronDown className="mx-auto mt-1 h-5 w-5" aria-hidden="true" />
        </a>

        {running && (
          <audio ref={audioRef} src={soundtrack} loop preload="none" aria-hidden="true" />
        )}
      </div>
    </section>
  );
}

export function ReelInterlude({ details }: { details: InvitationDetails }) {
  const acts = filmActs(details);
  const frames = acts.map((act, index) => ({
    ...act,
    art: invitationFilmArt[(["palace", "arch", "courtyard"] as const)[index]!],
  }));
  return (
    <div className="reel-interlude" aria-hidden="true">
      <span className="reel-perf reel-perf-top" />
      <div className="reel-strip">
        <div className="reel-strip-track">
          {[0, 1].map((round) =>
            frames.map((frame) => (
              <figure className="reel-cell" key={`${round}-${frame.label}`}>
                <img src={frame.art} alt="" loading="lazy" />
                <figcaption>
                  <span>{frame.label}</span>
                  <small>{frame.caption}</small>
                </figcaption>
              </figure>
            )),
          )}
        </div>
      </div>
      <span className="reel-perf reel-perf-bottom" />
    </div>
  );
}
