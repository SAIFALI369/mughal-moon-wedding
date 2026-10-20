import { createFileRoute, notFound } from "@tanstack/react-router";
import { PersonalInvitation } from "@/components/wedding/invitation-template";

/**
 * Development-only design sandbox for the personal invitation suite. It renders the
 * same component guests see, with sample content, so the card can be reviewed without
 * publishing anything or touching the production database.
 */
export const Route = createFileRoute("/invite-preview")({
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
  theme: "eid",
  framework: "moonlit",
};

function DesignPreview() {
  if (!import.meta.env.DEV) throw notFound();
  return (
    <>
      <div className="fixed left-1/2 top-3 z-[60] -translate-x-1/2 rounded-full border border-gold/40 bg-background/80 px-4 py-1.5 text-[10px] uppercase tracking-[0.24em] text-gold shadow-lg backdrop-blur">
        Design preview · sample card
      </div>
      <PersonalInvitation title="Ayaan & Zara" content={sampleContent} showGate={false} preview />
    </>
  );
}
