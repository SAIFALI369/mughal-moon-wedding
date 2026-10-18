import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Divider } from "@/components/wedding/ornaments";
import { Countdown, DressCode, Events, Footer, Gallery, Hero, MusicToggle, Preloader, Rsvp, Story, VenueMap } from "@/components/wedding/sections";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mohsin & Simran — Wedding Invitation" },
      { name: "description", content: "Join Mohsin & Simran for their Nikah, Barat and Walima celebrations. RSVP, event details and more." },
      { property: "og:title", content: "Mohsin & Simran — Wedding Invitation" },
      { property: "og:description", content: "You're invited to celebrate the Nikah of Mohsin & Simran. #MohsinWedsSimran" },
    ],
  }),
  component: Index,
});

function Index() {
  const [, setReady] = useState(false);
  return (
    <main className="overflow-x-hidden">
      <Preloader onDone={() => setReady(true)} />
      <Hero />
      <Countdown />
      <Story />
      <Events />
      <Divider className="bg-muted" />
      <Gallery />
      <DressCode />
      <Rsvp />
      <VenueMap />
      <Footer />
      <MusicToggle />
    </main>
  );
}
