import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { wishesQuery } from "@/components/wedding/wishes-query";
import { Wishes } from "@/components/wedding/wishes";
import { Divider } from "@/components/wedding/ornaments";
import { useInvitedGuestName } from "@/hooks/use-invited-guest";
import {
  Countdown,
  DressCode,
  Events,
  Footer,
  Gallery,
  Hero,
  MusicToggle,
  Navbar,
  Preloader,
  Rsvp,
  SimranFloatingWidget,
  Story,
  VenueMap,
} from "@/components/wedding/sections";

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(wishesQuery),
  head: () => ({
    meta: [
      { title: "Mohsin & Simran — Wedding Invitation" },
      {
        name: "description",
        content:
          "Join Mohsin & Simran for their Nikah, Barat and Walima celebrations. RSVP, event details and more.",
      },
      { property: "og:title", content: "Mohsin & Simran — Wedding Invitation" },
      {
        property: "og:description",
        content: "You're invited to celebrate the Nikah of Mohsin & Simran. #MohsinWedsSimran",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [, setReady] = useState(false);
  const [simranOpen, setSimranOpen] = useState(false);
  const guestName = useInvitedGuestName();

  return (
    <main className="overflow-x-hidden">
      <Preloader onDone={() => setReady(true)} />
      <Navbar onOpenSimran={() => setSimranOpen(true)} />
      <Hero guestName={guestName} />
      <Countdown />
      <Story />
      <Events />
      <Divider className="bg-muted" />
      <Gallery />
      <DressCode />
      <Rsvp defaultGuestName={guestName} />
      <VenueMap />
      <Wishes />
      <Footer />
      <SimranFloatingWidget open={simranOpen} onOpenChange={setSimranOpen} />
      <MusicToggle />
    </main>
  );
}
