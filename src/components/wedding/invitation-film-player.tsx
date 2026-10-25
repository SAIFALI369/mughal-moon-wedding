import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { Pause, Play, SkipForward, Volume2, VolumeX, X } from "lucide-react";
import type { InvitationDetails } from "./invitation-details";
import { invitationFilmArt } from "./invitation-art";
import {
  FILM_DURATION,
  chapterAt,
  clamp01,
  filmFade,
  filmProgress,
  filmPush,
  filmRuntime,
  filmSoundtrack,
  filmStory,
  filmTimeline,
} from "./invitation-film";

/**
 * The player for "Mughal Moon — The Film".
 *
 * The guest's single tap on the poster starts both the picture and the score,
 * which is exactly what mobile browsers require. From then on the film is a
 * clock: the same script drives the door-credit, three camera shots, the title
 * card and the hand-over to the invitation, so pause, seek and skip are simply
 * that clock stopping, jumping and ending.
 *
 * Nothing here is a <video>: the shots are the theme's own photographs, moved
 * with transforms and graded with CSS. That keeps the opening instant on a
 * phone, works offline, and lets the caption carry the guest's own names.
 */
export function MughalMoonFilm({
  details,
  onEnter,
  preview = false,
}: {
  details: InvitationDetails;
  /** Called once the guest walks into the invitation (by button or by skip). */
  onEnter: () => void;
  preview?: boolean;
}) {
  const reduced = useReducedMotion();
  const story = useMemo(() => filmStory(details), [details]);
  const soundtrack = useMemo(() => filmSoundtrack(details), [details]);
  const [phase, setPhase] = useState<"poster" | "playing">("poster");
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [sound, setSound] = useState(true);
  const [closing, setClosing] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const closeTimer = useRef<number | null>(null);

  const chapter = chapterAt(elapsed);
  const progress = filmProgress(elapsed);
  const finished = elapsed >= FILM_DURATION - 0.2;
  const showEnter = elapsed >= FILM_DURATION - 3.4;

  const shots = useMemo(
    () =>
      story.shots.map((shot) => ({
        ...shot,
        art: invitationFilmArt[shot.id],
        chapter: filmTimeline.find((entry) => entry.id === shot.id)!,
      })),
    [story],
  );
  const titleChapter = filmTimeline[filmTimeline.length - 1]!;

  // The film owns the screen; the page underneath must not scroll behind it.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(
    () => () => {
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
      audioRef.current?.pause();
    },
    [],
  );

  // The clock. A 30 fps cadence keeps React renders light on a phone while the
  // push-in still reads as continuous motion.
  useEffect(() => {
    if (phase !== "playing" || paused || closing) return;
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
        setElapsed((value) => Math.min(FILM_DURATION, value + step));
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase, paused, closing]);

  // Score: starts with the picture, breathes up over the first two seconds and
  // steps back under the title card.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || phase !== "playing" || closing) return;
    if (!sound) {
      audio.pause();
      return;
    }
    const fadeIn = clamp01((elapsed - 0.2) / 2.2);
    const fadeOut =
      chapter.id === "title" ? 1 - clamp01((elapsed - (titleChapter.from + 1.6)) / 4) : 1;
    audio.volume = Math.max(0, Math.min(0.55, 0.55 * fadeIn * fadeOut));
    if (audio.paused) void audio.play().catch(() => undefined);
  }, [elapsed, sound, phase, closing, chapter.id, titleChapter.from]);

  // A visible pause should be heard as well as seen.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (paused || phase !== "playing") audio.pause();
  }, [paused, phase]);

  function start() {
    setPhase("playing");
    setPaused(false);
    // Reduced motion: no push-in, no dissolves — open on the title card.
    setElapsed(reduced ? titleChapter.from + 0.4 : 0);
  }

  function enter() {
    if (closing) return;
    setClosing(true);
    audioRef.current?.pause();
    closeTimer.current = window.setTimeout(onEnter, preview ? 120 : 520);
  }

  function seek(to: number) {
    setElapsed(Math.max(0, Math.min(FILM_DURATION, to)));
    setPaused(false);
  }

  useEffect(() => {
    if (phase !== "playing") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        enter();
      } else if (event.key === " " || event.key === "k") {
        event.preventDefault();
        setPaused((value) => !value);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        seek(elapsed + 2);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        seek(elapsed - 2);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // The handlers close over this render's elapsed time on purpose: a keypress
    // must act on the frame the guest is watching, not a stale one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, elapsed, closing]);

  const captionLines = story.shots.find((shot) => shot.id === chapter.id)?.lines ?? null;
  const shotStart = chapter.id === "credit" ? 0 : chapter.from;
  const captionHead = clamp01((elapsed - shotStart - 0.7) / 0.8);
  const captionTail = clamp01((elapsed - shotStart - 2.1) / 0.8);

  return (
    <div
      className={`film ${phase === "poster" ? "film-poster-phase" : ""} ${closing ? "is-exiting" : ""}`}
      data-film-phase={phase}
      data-film-chapter={chapter.id}
      role="dialog"
      aria-modal="true"
      aria-label={`${details.groomName} and ${details.brideName}, a cinematic wedding invitation`}
    >
      <div className="film-stage">
        {shots.map((shot) => {
          const opacity =
            phase === "poster" ? (shot.id === "palace" ? 1 : 0) : filmFade(elapsed, shot.chapter);
          const push = phase === "poster" ? 1.06 : filmPush(elapsed, shot.chapter);
          return (
            <div
              key={shot.id}
              className={`film-shot film-shot-${shot.id}`}
              data-shot={shot.id}
              data-on={opacity > 0.02 ? "true" : undefined}
              style={{ opacity, transform: `scale(${push.toFixed(4)})` }}
            >
              {/* A blurred fill keeps the screen edge-to-edge while the whole
                  vertical frame stays visible — a portrait film on any shape. */}
              <img
                className="film-shot-fill"
                src={shot.art}
                alt=""
                aria-hidden="true"
                draggable={false}
                decoding="async"
              />
              <img
                className="film-shot-frame"
                src={shot.art}
                alt=""
                aria-hidden="true"
                draggable={false}
                decoding="async"
                fetchPriority={shot.id === "palace" ? "high" : undefined}
                style={{ objectPosition: shot.focus }}
              />
            </div>
          );
        })}

        <div className="film-grade" aria-hidden="true" />
        <div className="film-leak" style={{ opacity: 0.5 + progress * 0.4 }} aria-hidden="true" />
        <div className="film-grain" aria-hidden="true" />
        <div className="film-scratch" aria-hidden="true" />
        <div
          className="film-bar film-bar-top"
          aria-hidden="true"
          data-open={showEnter ? "true" : undefined}
        />
        <div
          className="film-bar film-bar-bottom"
          aria-hidden="true"
          data-open={showEnter ? "true" : undefined}
        />

        <p className="sr-only">
          {story.credits.studio} {story.credits.presents} {story.credits.line}.{" "}
          {story.shots[0].lines.join(" ")} {story.shots[1].lines.join(" ")}{" "}
          {story.shots[2].lines.join(" ")}. {story.title.overline}: {details.groomName} and{" "}
          {details.brideName}, {story.title.date} at {story.title.venue}.
        </p>

        {phase === "poster" ? (
          <div className="film-poster">
            <div className="film-marquee" aria-hidden="true">
              <span />
              <span />
            </div>
            <p className="film-poster-kicker">A cinematic wedding invitation</p>
            <p className="film-blessing font-arabic" dir="rtl">
              بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
            </p>
            <h2 className="film-poster-names">
              <span>{details.groomName}</span>
              <span className="film-amp">&amp;</span>
              <span>{details.brideName}</span>
            </h2>
            <p className="film-poster-line">
              {[details.date, details.time].filter(Boolean).join(" · ")}
              {details.venue ? ` · ${details.venue}` : ""}
            </p>
            <div className="film-poster-actions">
              <button type="button" className="film-play" onClick={start} autoFocus>
                <span className="film-play-icon" aria-hidden="true">
                  <Play className="h-4 w-4" />
                </span>
                <span>
                  Play the film
                  <small>{filmRuntime()} · with sound</small>
                </span>
              </button>
              <div className="film-poster-row">
                <button
                  type="button"
                  className="film-ghost"
                  onClick={() => setSound((value) => !value)}
                  aria-pressed={sound}
                >
                  {sound ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                  {sound ? "Sound on" : "Muted"}
                </button>
                <button type="button" className="film-ghost" onClick={enter}>
                  <SkipForward className="h-4 w-4" />
                  Skip the film
                </button>
              </div>
            </div>
            <p className="film-poster-foot">
              {reduced
                ? "Reduced motion is on — the film opens on its title card."
                : story.credits.line}
            </p>
          </div>
        ) : (
          <>
            <div
              className="film-credit"
              style={{
                opacity: clamp01((elapsed - 0.2) / 0.7) * (1 - clamp01((elapsed - 1.5) / 0.7)),
              }}
              aria-hidden="true"
            >
              <span className="film-credit-studio">{story.credits.studio}</span>
              <span className="film-credit-rule" />
              <span className="film-credit-presents">{story.credits.presents}</span>
              <span className="film-credit-line">{story.credits.line}</span>
            </div>

            {captionLines && (
              <div className="film-captions" aria-hidden="true">
                <p
                  style={{
                    opacity: captionHead,
                    transform: `translateY(${(1 - captionHead) * 14}px)`,
                  }}
                >
                  {captionLines[0]}
                </p>
                <p
                  style={{
                    opacity: captionTail,
                    transform: `translateY(${(1 - captionTail) * 14}px)`,
                  }}
                >
                  {captionLines[1]}
                </p>
              </div>
            )}

            <div
              className="film-title"
              style={{ opacity: filmFade(elapsed, titleChapter, 1.5) }}
              aria-hidden={chapter.id === "title" ? undefined : "true"}
            >
              <p className="film-title-overline">{story.title.overline}</p>
              <h1 className="film-title-names">
                <span>{story.title.groom}</span>
                <span className="film-amp">&amp;</span>
                <span>{story.title.bride}</span>
              </h1>
              <div className="film-title-plate">
                <span className="film-title-date">{story.title.date}</span>
                <span className="film-title-rule" aria-hidden="true" />
                <span className="film-title-venue">{story.title.venue}</span>
              </div>
              {story.title.hashtag && <p className="film-title-hashtag">{story.title.hashtag}</p>}
              <p
                className="film-enter"
                style={{ opacity: showEnter ? 1 : 0, pointerEvents: showEnter ? "auto" : "none" }}
              >
                <button type="button" onClick={enter} className="film-enter-button">
                  Enter the invitation
                </button>
                <span className="film-enter-note">{story.invitation}</span>
              </p>
            </div>

            <div className="film-controls">
              <div className="film-controls-row">
                <button
                  type="button"
                  className="film-icon"
                  onClick={() => setPaused((value) => !value)}
                  aria-label={paused ? "Play the film" : "Pause the film"}
                >
                  {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  className="film-icon"
                  onClick={() => setSound((value) => !value)}
                  aria-label={sound ? "Mute the film" : "Unmute the film"}
                  aria-pressed={sound}
                >
                  {sound ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </button>
                <div className="film-rail" role="group" aria-label="Film chapters">
                  <span className="film-rail-fill" style={{ width: `${progress * 100}%` }} />
                  {filmTimeline.map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      className="film-tick"
                      data-active={chapter.id === entry.id ? "true" : undefined}
                      style={{ left: `${(entry.from / FILM_DURATION) * 100}%` }}
                      onClick={() => seek(entry.from + 0.01)}
                      aria-label={`Jump to ${entry.id === "title" ? "the title card" : entry.id}`}
                    />
                  ))}
                </div>
                <span className="film-time">
                  {filmRuntime(elapsed)} / {filmRuntime()}
                </span>
                <button
                  type="button"
                  className="film-icon"
                  onClick={enter}
                  aria-label="Skip the film"
                >
                  {finished ? <SkipForward className="h-4 w-4" /> : <X className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </>
        )}

        {phase === "playing" && (
          <audio ref={audioRef} src={soundtrack} loop preload="auto" aria-hidden="true" />
        )}
      </div>
    </div>
  );
}
