import { createFileRoute } from "@tanstack/react-router";
import { PersonalInvitation } from "@/components/wedding/invitation-template";
import { storybookThemes } from "@/components/wedding/storybook";
import wedding from "@/config/wedding.config.json";
import { getSiteOrigin } from "@/lib/site-origin";
import { buildSiteSocialMeta } from "@/lib/social-preview";

export const Route = createFileRoute("/storybook")({
  validateSearch: (search: Record<string, unknown>) => ({
    theme: storybookThemes.includes(search.theme as (typeof storybookThemes)[number])
      ? (search.theme as (typeof storybookThemes)[number])
      : ("royal-rajmahal" as const),
  }),
  loader: async () => ({ siteOrigin: await getSiteOrigin() }),
  head: ({ loaderData, match }) => {
    const theme = match.search.theme;
    return {
      meta: buildSiteSocialMeta({
        title: "Royal Editions — InvitingYou",
        description: "Preview Royal Rajmahal, Lotus Goddess and Calligraphy invitations.",
        origin: loaderData?.siteOrigin,
        path: `/storybook?theme=${encodeURIComponent(theme)}`,
        imagePath: `/og/themes/${theme}.jpg`,
        robots: "noindex",
      }),
    };
  },
  component: StorybookPreview,
});
function StorybookPreview() {
  const { theme } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <>
      <nav className="sb-preview-picker" aria-label="Theme preview">
        <label htmlFor="sb-theme">Theme</label>
        <select
          id="sb-theme"
          value={theme}
          onChange={(e) => void navigate({ search: { theme: e.target.value as typeof theme } })}
        >
          <option value="royal-rajmahal">Royal Rajmahal</option>
          <option value="lotus-goddess">Lotus Goddess</option>
          <option value="calligraphy">Calligraphy</option>
        </select>
        <span>Sample invitation · no replies saved</span>
      </nav>
      <PersonalInvitation title={wedding.title} content={{ ...wedding, theme }} preview />
    </>
  );
}
