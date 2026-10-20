import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PersonalInvitation } from "@/components/wedding/invitation-template";
import {
  invitationFrameworkIds,
  invitationLayoutFor,
  invitationThemeCategories,
  invitationThemeIds,
  invitationThemes,
  type InvitationFramework,
  type InvitationTheme,
} from "@/components/wedding/invitation-options";

/**
 * Development-only design sandbox for the personal invitation suite. It renders the
 * same component guests see, with sample content, so the card can be reviewed without
 * publishing anything or touching the production database.
 */
export const Route = createFileRoute("/invite-preview")({
  validateSearch: (search: Record<string, unknown>) => ({
    theme:
      typeof search.theme === "string" &&
      (invitationThemeIds as readonly string[]).includes(search.theme)
        ? search.theme
        : "chand-bagh",
    framework:
      typeof search.framework === "string" &&
      (invitationFrameworkIds as readonly string[]).includes(search.framework)
        ? search.framework
        : "moonlit",
  }),
  head: () => ({
    meta: [{ title: "Personal invitation design preview" }, { name: "robots", content: "noindex" }],
  }),
  component: DesignPreview,
});

const sampleContent = {
  groomName: "Ayaan",
  brideName: "Zara",
  date: "15 December 2030",
  time: "4:00 PM IST",
  venue: "The Garden Pavilion",
  address: "Boring Road, Patna, Bihar",
  eventType: "Nikah ceremony",
  hosts: "Together with the Khan and Siddiqui families",
  hostName: "Ayesha",
  message:
    "Join us under the winter moon as two families become one. Your presence, your duas and your laughter are the only gifts we need.",
  story:
    "It began over chai and a shared crossword on a rain-soaked afternoon in Patna. Six winters later, we are still arguing about the last word — and choosing forever.",
  dressCode: "Festive ivory, antique gold and deep emerald",
  contactName: "Imran Khan",
  contactPhone: "+91 98765 43210",
  arrivalNotes:
    "Valet parking is available beside the east lawn. Please arrive by 3:30 PM for the welcome sherbet.",
  rsvpDeadline: "1 December 2030",
  giftsNote: "Your blessings and duas are the only gifts we need.",
  livestreamUrl: "https://example.com/live",
  hashtag: "#AyaanWedsZara",
  additionalEvents: [
    {
      title: "Mehndi & Sangeet",
      date: "13 December 2030",
      time: "6:00 PM",
      venue: "Khan House",
      address: "Fraser Road, Patna",
    },
    {
      title: "Nikah",
      date: "15 December 2030",
      time: "4:00 PM",
      venue: "The Garden Pavilion",
      address: "Boring Road, Patna",
    },
    {
      title: "Walima Reception",
      date: "16 December 2030",
      time: "7:30 PM",
      venue: "The Maurya",
      address: "Gandhi Maidan, Patna",
    },
  ],
  songs: [
    { title: "Moonlit Dua", url: "/audio/moonlit-dua.mp3" },
    { title: "Evening Mehfil", url: "/audio/evening-mehfil.mp3" },
    { title: "Royal Courtyard", url: "/audio/royal-courtyard.mp3" },
  ],
  theme: "eid" as InvitationTheme,
  framework: "moonlit" as InvitationFramework,
};

function DesignPreview() {
  if (!import.meta.env.DEV) throw notFound();

  const search = Route.useSearch();
  const [theme, setTheme] = useState<InvitationTheme>(search.theme as InvitationTheme);
  // On a phone the panel starts folded; the pill alone is enough to switch worlds.
  const [open, setOpen] = useState(true);
  const [framework, setFramework] = useState<InvitationFramework>(
    search.framework as InvitationFramework,
  );

  useEffect(() => {
    setOpen(window.innerWidth >= 720);
    const params = new URLSearchParams(window.location.search);
    const wantedTheme = params.get("theme");
    const wantedFramework = params.get("framework");
    if (wantedTheme && (invitationThemeIds as readonly string[]).includes(wantedTheme)) {
      setTheme(wantedTheme as InvitationTheme);
    }
    if (
      wantedFramework &&
      (invitationFrameworkIds as readonly string[]).includes(wantedFramework)
    ) {
      setFramework(wantedFramework as InvitationFramework);
    }
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("theme", theme);
    url.searchParams.set("framework", framework);
    window.history.replaceState(null, "", url);
  }, [theme, framework]);

  const layout = invitationLayoutFor(theme, framework);
  const signature = invitationThemes.find((value) => value.id === theme)?.layout;

  return (
    <>
      <div className={`preview-bar ${open ? "is-open" : ""}`}>
        <button
          type="button"
          className="preview-toggle"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <span>Preview</span>
          <b>{invitationThemes.find((item) => item.id === theme)?.label ?? theme}</b>
          <span aria-hidden="true">{open ? "×" : "▾"}</span>
        </button>
        {open && (
          <div className="preview-panel">
            <label>
              <span>Theme</span>
              <select
                value={theme}
                onChange={(event) => setTheme(event.target.value as InvitationTheme)}
              >
                {invitationThemeCategories.map((category) => (
                  <optgroup key={category.id} label={category.label}>
                    {invitationThemes
                      .filter((item) => item.category === category.id)
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.label}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
            </label>
            <label>
              <span>Layout</span>
              <select
                value={framework}
                onChange={(event) => setFramework(event.target.value as InvitationFramework)}
              >
                {invitationFrameworkIds.map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
              </select>
            </label>
            <p className="preview-note">
              Structure in force: <b>{layout}</b>
              {signature ? " · signature" : ""}
            </p>
            <div className="preview-shortcuts">
              {[
                ["chand-bagh", "Chand Bagh"],
                ["mela-maidan", "Mela Maidan"],
                ["jharokha-dawn", "Jharokha"],
                ["haldi-baag", "Haldi Baag"],
                ["vows-in-ink", "Vows in Ink"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={theme === id ? "is-active" : ""}
                  onClick={() => setTheme(id as InvitationTheme)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <PersonalInvitation
        title="Ayaan & Zara"
        content={{ ...sampleContent, theme, framework }}
        showGate={false}
        preview
      />
    </>
  );
}
