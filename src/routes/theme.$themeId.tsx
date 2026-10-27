import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ArrowUpRight, DoorOpen, Music2, Sparkles } from "lucide-react";
import { PersonalInvitation } from "@/components/wedding/invitation-template";
import { invitationThemeIds, type InvitationTheme } from "@/components/wedding/invitation-options";
import {
  demoContent,
  demoForTheme,
  demoThemeLabel,
  themeDemos,
  type ThemeDemo,
} from "@/config/theme-demos";
import { demoCategoryLabel } from "@/config/theme-demos";

export const Route = createFileRoute("/theme/$themeId")({
  head: ({ params }) => {
    const demo = themeDemos.find((entry) => entry.theme === params.themeId);
    const label = demo ? demoThemeLabel(demo.theme) : "Invitation";
    const title = `${demo ? `${demo.groomName} & ${demo.brideName}` : "Demo"} — ${label} demo · InvitingYou`;
    const description = demo
      ? `Open the full ${label} invitation: ${demo.mood.toLowerCase()}. ${demo.date} · ${demo.venue}, ${demo.address}.`
      : "Open a complete InvitingYou invitation demo.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "twitter:card", content: "summary_large_image" },
        { name: "robots", content: "noindex" },
      ],
    };
  },
  component: ThemeDemoPage,
});

/**
 * One openable demo per theme. The customer scrolls a finished invitation — its
 * film, gallery, ceremony order and YouTube soundtrack — instead of squinting at
 * a colour swatch.
 */
function ThemeDemoPage() {
  const { themeId } = Route.useParams();
  const navigate = useNavigate();
  const demo = demoForTheme(themeId);
  const [gated, setGated] = useState(false);

  return (
    <div className="theme-demo-page">
      <div className="theme-demo-bar">
        <Link to="/themes" className="theme-demo-bar-back">
          <ArrowLeft size={14} aria-hidden="true" /> All theme demos
        </Link>
        <div className="theme-demo-bar-title">
          <strong>{demoThemeLabel(demo.theme)}</strong>
          <span>{demo.mood}</span>
        </div>
        <label className="sr-only" htmlFor="theme-demo-picker">
          Choose a theme demo
        </label>
        <select
          id="theme-demo-picker"
          value={demo.theme}
          onChange={(event) =>
            void navigate({
              to: "/theme/$themeId",
              params: { themeId: event.target.value as InvitationTheme },
            })
          }
        >
          {invitationThemeIds.map((theme) => (
            <option key={theme} value={theme}>
              {demoThemeLabel(theme)} — {demoCategoryLabel(theme)}
            </option>
          ))}
        </select>
        <div className="theme-demo-bar-actions">
          <button
            type="button"
            aria-pressed={gated}
            onClick={() => setGated((current) => !current)}
            title="Play the real opening: gates, doors and soundtrack"
          >
            <DoorOpen size={13} aria-hidden="true" />
            {gated ? "Opening on" : "See the opening"}
          </button>
          <Link
            to="/create"
            search={{ theme: demo.theme, card: "" }}
            className="is-primary"
            aria-label={`Create an invitation with the ${demoThemeLabel(demo.theme)} theme`}
          >
            Use this theme <ArrowUpRight size={13} aria-hidden="true" />
          </Link>
        </div>
      </div>

      <div className="theme-demo-songs">
        <span>
          <Music2 size={11} aria-hidden="true" /> Soundtrack
        </span>
        {demo.songs.map((song) => (
          <a key={song.url} href={song.url} target="_blank" rel="noreferrer noopener">
            {song.title}
            {song.clipStart !== undefined ? ` · excerpt from ${formatSeconds(song.clipStart)}` : ""}
            <ArrowUpRight size={11} aria-hidden="true" />
          </a>
        ))}
      </div>

      <PersonalInvitation
        title={demo.title}
        content={demoContent(demo)}
        preview={!gated}
        showGate={gated}
        demoPhotos={{
          groom: demo.portraits.groom,
          bride: demo.portraits.bride,
          gallery: demo.gallery,
        }}
      />

      <p className="theme-demo-page-note">
        <Sparkles size={11} aria-hidden="true" /> A complete sample card: every element on, the
        theme&rsquo;s own film looping, {demo.gallery.length} demo gallery photos and a real YouTube
        soundtrack. {demoDescriptionTail(demo)}
      </p>
    </div>
  );
}

function formatSeconds(total: number) {
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/** A little context under the card so the demo reads as a real celebration. */
function demoDescriptionTail(demo: ThemeDemo) {
  return `Sample celebration for ${demo.groomName} & ${demo.brideName}, ${demo.date} at ${demo.venue}. Replies are not saved.`;
}
