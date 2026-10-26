import { useEffect, useRef, useState, type ReactNode } from "react";
import { useReducedMotion } from "framer-motion";
import { ChevronDown, Clapperboard, Film, Volume2, VolumeX } from "lucide-react";
import type { InvitationDetails } from "./invitation-details";
import { invitationFilmArt } from "./invitation-art";
import { themeLoop } from "./invitation-art";
import { playMedia } from "./theme-loop";
import { CouplePortraits } from "./invitation-stage";
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
 * The live hero.
 *
 * This is the film, but not in a player: the three moonlit shots dissolve into
 * each other behind the couple's names from the first second the page opens, on
 * a loop, with the score running muted until the guest asks for sound. Browsers
 * only allow sound after a tap, so the picture is never blocked by a poster and
 * the invitation feels like one living thing from the first frame.
 *
 * The clock stops when the hero scrolls away or the tab hides, and guests who
 * ask for reduced motion get the first shot as a still.
 */
export function LiveReelHero({
  details,
  actions,
  scrollTo,
  autoPlay = true,
  onWatchFilm,
}: {
  details: InvitationDetails;
  actions: ReactNode;
  scrollTo: string;
  /** "Opening gates" off means a still frame: the host chose no motion. */
  autoPlay?: boolean;
  /** Opens the full film — sound, captions, title card — over the card. */
  onWatchFilm: () => void;
}) {
  const reduced = useReducedMotion();
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

  const running = autoPlay && !reduced && onScreen;
  const loopTime = elapsed % FILM_LOOP_DURATION;
  const chapter = loopChapterAt(elapsed);
  // The theme film runs continuously behind all three shots: each shot joins it
  // where that shot begins in the full cut, so a dissolve never jumps.
  const videoOffset = (chapter.from / FILM_DURATION) * 100;
  const shot = story.shots.find((entry) => entry.id === chapter.id) ?? story.shots[0];
  const act = acts[chapter.id === "palace" ? 0 : chapter.id === "arch" ? 1 : 2];

  // The clock: 30 fps is enough for a slow push-in and keeps a phone cool.
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

  // The hero's own film follows the same rule as the clock: it runs only while
  // the hero is on screen. It is one continuous film, seeked to each act.
  useEffect(() => {
    const element = filmRef.current;
    if (!element) return;
    if (running) {
      playMedia(element);
      // Join the film where this act begins, so the cut stays continuous.
      if (element.duration) {
        const wanted = (chapter.from / FILM_DURATION) * element.duration;
        if (Math.abs(element.currentTime - wanted) > element.duration * 0.12) {
          element.currentTime = wanted;
        }
      }
    } else {
      element.pause();
    }
  }, [running, chapter.id]);

  // Only move while the hero is actually on screen and the tab is visible.
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

  // The score follows the guest, not the page: muted until they ask for sound,
  // and always in step with the picture.
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
        // Some browsers still refuse; the picture keeps playing and the button
        // stays honest about it.
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
      reduced || !autoPlay ? (entry.id === "palace" ? 1 : 0) : filmFade(loopTime, loop, FILM_FADE);
    const push = reduced || !autoPlay ? 1.02 : filmPush(loopTime, loop, 0.09);
    return { ...entry, art: invitationFilmArt[entry.id], opacity, push };
  });

  return (
    <section
      ref={ref}
      id="invitation-top"
      aria-label="Wedding invitation"
      className="reel-live"
      data-theme={details.theme}
      data-film={filmLive && autoPlay && !reduced ? "live" : undefined}
      data-reduced={reduced ? "true" : undefined}
      data-auto={autoPlay ? "true" : "false"}
      data-chapter={chapter.id}
    >
      <div className="reel-live-stage">
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

        {/* The theme's real film, one continuous take behind all three shots.
            It fades in over the stills as soon as its first frame is decoded. */}
        {autoPlay && !reduced && (
          <video
            ref={filmRef}
            className="reel-live-film"
            src={themeLoop(details.theme)}
            style={{ objectPosition: "50% 45%", translate: `0 ${-videoOffset * 0.12}%` }}
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

        <div className="reel-live-copy">
          <p className="reel-kicker">{details.hosts || "Together with their families"}</p>
          <p className="reel-act-line">
            <Film className="h-3.5 w-3.5" aria-hidden="true" /> Now showing
          </p>
          <h1 className="reel-names">
            <span>{details.groomName}</span>
            <span className="reel-amp">&amp;</span>
            <span>{details.brideName}</span>
          </h1>
          <p className="reel-date">{[details.date, details.time].filter(Boolean).join(" · ")}</p>
          <p className="reel-venue">
            {[details.venue, details.address].filter(Boolean).join(" · ")}
          </p>
          <CouplePortraits details={details} />
          <div className="reel-actions">{actions}</div>
          <div className="reel-live-buttons">
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
        </div>

        <p className="reel-live-caption" aria-live="off">
          <span className="reel-live-act">{act.label}</span>
          <span className="reel-live-line">{shot.lines[0]}</span>
        </p>

        <a href={scrollTo} className="reel-scroll">
          Scroll to begin
          <ChevronDown className="mx-auto mt-1 h-5 w-5" aria-hidden="true" />
        </a>

        {autoPlay && (
          <audio ref={audioRef} src={soundtrack} loop preload="none" aria-hidden="true" />
        )}
      </div>
    </section>
  );
}

/**
 * The three acts, as a strip of film between sections: sprocket holes, warm
 * frames and the film's own captions. Decorative for a screen reader — the same
 * words are already in the story and gallery — and still under reduced motion.
 */
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
