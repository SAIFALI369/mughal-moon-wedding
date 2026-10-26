import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { themeLoop } from "@/components/wedding/invitation-art";
import { invitationThemes } from "@/components/wedding/invitation-options";

/**
 * The film wall.
 *
 * Every theme's real hero film, side by side and playing at once — the fastest
 * way to see that the video is there and moving, and to check it on whatever
 * device or site is being looked at. Each tile reports what the browser is
 * actually doing (playing, blocked, or failed), so "no video" becomes a fact
 * rather than a guess.
 */
export const Route = createFileRoute("/films")({
  head: () => ({
    meta: [
      { title: "Theme films — InvitingYou" },
      {
        name: "description",
        content:
          "Every invitation theme's looping hero film, playing side by side: silent eight-second camera moves over the theme's own artwork.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FilmWall,
});

type State = "loading" | "playing" | "paused" | "blocked" | "error";

function Tile({ theme, label }: { theme: (typeof invitationThemes)[number]; label: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<State>("loading");

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const sync = () => {
      if (element.error) return setState("error");
      if (!element.paused) return setState("playing");
      setState((current) => (current === "playing" ? "paused" : current));
    };
    const events = ["playing", "pause", "waiting", "error", "loadeddata"] as const;
    for (const event of events) element.addEventListener(event, sync);
    const timer = window.setTimeout(() => {
      const started = element.play();
      if (started && typeof started.catch === "function") {
        started.catch(() => setState((current) => (current === "playing" ? current : "blocked")));
      }
    }, 250);
    const poll = window.setInterval(sync, 1200);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(poll);
      for (const event of events) element.removeEventListener(event, sync);
    };
  }, []);

  return (
    <figure className="film-tile" data-theme={theme.id}>
      <video
        ref={ref}
        src={themeLoop(theme.id)}
        muted
        loop
        playsInline
        autoPlay
        preload="auto"
        disablePictureInPicture
        aria-label={`${label} hero film`}
      />
      <figcaption>
        <strong>{label}</strong>
        <span data-state={state}>{state === "loading" ? "loading…" : state}</span>
        <small>{themeLoop(theme.id)}</small>
      </figcaption>
    </figure>
  );
}

function FilmWall() {
  const themes = [...invitationThemes].sort((a, b) => a.label.localeCompare(b.label));
  return (
    <main className="film-wall">
      <header>
        <p className="film-wall-kicker">Theme films</p>
        <h1>Every theme, moving</h1>
        <p className="film-wall-lede">
          Each invitation theme ships a real, silent eight-second hero film, cut from its own
          artwork. These are the same files the cards play behind the names — if they move here, the
          card is playing them too.
        </p>
        <p className="film-wall-links">
          <Link to="/film">Open the cinematic invitation (/film)</Link>
          <Link to="/demo">Open the classic invitation (/demo)</Link>
        </p>
      </header>
      <div className="film-wall-grid">
        {themes.map((theme) => (
          <Tile key={theme.id} theme={theme} label={theme.label} />
        ))}
      </div>
      <footer>
        <p>
          A tile that says <em>blocked</em> means the browser refused autoplay: tap the page once
          and it starts. <em>error</em> means the file did not load on this host.
        </p>
      </footer>
    </main>
  );
}
