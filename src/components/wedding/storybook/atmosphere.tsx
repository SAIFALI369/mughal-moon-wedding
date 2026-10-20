import { useEffect, useRef, useState } from "react";
import type { InvitationDetails } from "../invitation-details";
/** Gesture consent unlocks sound. Scrolling never starts audio on its own. */
export function StorybookAtmosphere({ details }: { details: InvitationDetails }) {
  const [sound, setSound] = useState(false);
  const [build, setBuild] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const soundRef = useRef(false);
  useEffect(() => {
    const element = document.querySelector<HTMLElement>(
      `.personal-invite[data-theme="${details.theme}"]`,
    );
    const play = () => {
      if (!audio.current) {
        audio.current = new Audio(details.songs[0]?.url || "/audio/rosewater.mp3");
        audio.current.loop = true;
        audio.current.volume = 0.18;
      }
      void audio.current.play().catch(() => {
        setSound(false);
        soundRef.current = false;
        element?.setAttribute("data-sound", "false");
      });
    };
    const opened = (event: Event) => {
      const consent = !!(event as CustomEvent).detail?.sound;
      soundRef.current = consent;
      setSound(consent);
      element?.setAttribute("data-sound", String(consent));
      if (consent) play();
    };
    window.addEventListener("storybook:opened", opened);
    const toggle = () => {
      soundRef.current = !soundRef.current;
      setSound(soundRef.current);
      element?.setAttribute("data-sound", String(soundRef.current));
      if (soundRef.current) play();
      else audio.current?.pause();
    };
    window.addEventListener("storybook:toggle-sound", toggle);
    const rsvp = element?.querySelector("#rsvp");
    const observer = new IntersectionObserver(
      ([entry]) => {
        setBuild(entry.isIntersecting);
        if (audio.current) {
          audio.current.volume = entry.isIntersecting ? 0.28 : 0.18;
          audio.current.playbackRate = entry.isIntersecting ? 1.04 : 1;
        }
      },
      { threshold: 0.15 },
    );
    if (rsvp) observer.observe(rsvp);
    const visibility = () => {
      if (document.hidden)
        audio.current?.pause(); /* Returning never overrides the guest's pause. */
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      observer.disconnect();
      window.removeEventListener("storybook:opened", opened);
      window.removeEventListener("storybook:toggle-sound", toggle);
      document.removeEventListener("visibilitychange", visibility);
      audio.current?.pause();
      audio.current = null;
    };
  }, [details.theme, details.songs]);
  return (
    <button
      className="sb-audio"
      aria-pressed={sound}
      aria-label={sound ? "Mute soundtrack and effects" : "Enable soundtrack and effects"}
      onClick={() => window.dispatchEvent(new Event("storybook:toggle-sound"))}
    >
      {sound ? "♫" : "♪"}
      <span>{sound ? (build ? "Celebration · sound on" : "Sound on") : "Sound off"}</span>
    </button>
  );
}
