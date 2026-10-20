import { createFileRoute } from "@tanstack/react-router";
import { PersonalInvitation } from "@/components/wedding/invitation-template";
import { storybookThemes } from "@/components/wedding/storybook";
import wedding from "@/config/wedding.config.json";

export const Route = createFileRoute("/storybook")({
  validateSearch: (search: Record<string, unknown>) => ({
    theme: storybookThemes.includes(search.theme as (typeof storybookThemes)[number])
      ? (search.theme as (typeof storybookThemes)[number])
      : ("royal-rajmahal" as const),
  }),
  head: () => ({
    meta: [
      { title: "Storybook invitations — three worlds to discover" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StorybookPreview,
});
function StorybookPreview() {
  const { theme } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <>
      <nav className="sb-preview-picker" aria-label="Storybook theme preview">
        <label htmlFor="sb-theme">Explore a world</label>
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
      <PersonalInvitation
        key={theme}
        title={wedding.title}
        content={{ ...wedding, theme }}
        preview
      />
    </>
  );
}
