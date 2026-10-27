import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Sparkles } from "lucide-react";
import { PlatformShell } from "@/components/platform/platform-shell";
import { useAuth } from "@/lib/auth-context";
import { ThemeDemoCard } from "@/components/wedding/theme-demo-card";
import { invitationThemeCategories } from "@/components/wedding/invitation-options";
import { themeDemos, type ThemeDemo } from "@/config/theme-demos";

export const Route = createFileRoute("/themes")({
  head: () => ({
    meta: [
      { title: "Every theme, as a real demo card — InvitingYou" },
      {
        name: "description",
        content:
          "Open a finished demo invitation for every theme: its own couple, film, gallery photos and YouTube soundtrack. Pick the one that feels like your celebration.",
      },
      { property: "og:title", content: "Every theme, as a real demo card" },
      {
        property: "og:description",
        content: "Twenty-two themes, twenty-two complete sample invitations. Open one and scroll.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ThemeDemosPage,
});

/**
 * The theme collection itself. Each tile is not a swatch: it is the opening
 * frame of a complete demo invitation, with that demo's own couple, city,
 * gallery strip and song, one tap from the full card.
 */
function ThemeDemosPage() {
  const { user } = useAuth();
  const [category, setCategory] = useState<string>("all");
  const visible = useMemo<ThemeDemo[]>(
    () =>
      category === "all" ? themeDemos : themeDemos.filter((demo) => demo.category === category),
    [category],
  );

  return (
    <PlatformShell workspace={Boolean(user)} activePage="themes">
      <div className="studio-content">
        <section className="studio-collection" aria-labelledby="theme-demos-heading">
          <div className="studio-section-heading">
            <div>
              <span className="studio-eyebrow">THE DESIGN COLLECTION</span>
              <h2 id="theme-demos-heading">Open a theme before you choose it.</h2>
            </div>
            <span className="studio-collection-tag">
              {themeDemos.length} complete demo cards <Sparkles size={14} />
            </span>
          </div>
          <p className="studio-collection-note">
            Every card below is a real invitation, not a picture of one — its own film, gallery
            photos, ceremony order and a YouTube soundtrack. Tap any card to scroll the whole
            invitation. Music and replies: the soundtrack plays inside the demo, guest replies are
            not saved.
          </p>

          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter themes by group">
            <button
              type="button"
              onClick={() => setCategory("all")}
              className={`admin-chip ${category === "all" ? "is-active" : ""}`}
            >
              All ({themeDemos.length})
            </button>
            {invitationThemeCategories.map((group) => (
              <button
                key={group.id}
                type="button"
                onClick={() => setCategory(group.id)}
                className={`admin-chip ${category === group.id ? "is-active" : ""}`}
                aria-pressed={category === group.id}
              >
                {group.label}
              </button>
            ))}
          </div>

          <div className="theme-demo-grid">
            {visible.map((demo, index) => (
              <ThemeDemoCard key={demo.theme} demo={demo} priority={index < 3} />
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-6">
            <Link to="/" className="studio-text-button">
              <ArrowLeft size={14} /> Back to the studio
            </Link>
            <Link to="/create" search={{ theme: "", card: "" }} className="studio-button">
              Start an invitation <Sparkles size={14} />
            </Link>
          </div>
        </section>
      </div>
    </PlatformShell>
  );
}
