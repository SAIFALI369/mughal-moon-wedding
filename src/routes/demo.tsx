import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { wishesQuery } from "@/components/wedding/wishes-query";
import { Wishes } from "@/components/wedding/wishes";
import { Divider } from "@/components/wedding/ornaments";
import { NoorArchExperience, noorArchStill } from "@/components/wedding/noor-arch-gate";
import { useInvitedGuestName } from "@/hooks/use-invited-guest";
import { getSiteOrigin } from "@/lib/site-origin";
import {
  buildInvitationSocialMeta,
  demoEidDetails,
  sanitizeGuestParam,
} from "@/lib/social-preview";
import {
  Countdown,
  DressCode,
  Events,
  Footer,
  Gallery,
  Hero,
  MusicToggle,
  Navbar,
  Rsvp,
  SimranFloatingWidget,
  Story,
  VenueMap,
} from "@/components/wedding/sections";

export const Route = createFileRoute("/demo")({
  validateSearch: (search: Record<string, unknown>): { guest?: string; to?: string } => {
    const guest = sanitizeGuestParam(typeof search.guest === "string" ? search.guest : undefined);
    const to = sanitizeGuestParam(typeof search.to === "string" ? search.to : undefined);
    return {
      ...(guest ? { guest } : {}),
      ...(to ? { to } : {}),
    };
  },
  loader: async ({ context }) => {
    const [, siteOrigin] = await Promise.all([
      context.queryClient.ensureQueryData(wishesQuery),
      getSiteOrigin(),
    ]);
    return { siteOrigin };
  },
  head: ({ loaderData, match }) => ({
    meta: buildInvitationSocialMeta({
      details: demoEidDetails(),
      path: "/demo",
      guest: match.search.guest || match.search.to,
      origin: loaderData?.siteOrigin,
    }),
  }),
  component: Index,
});

function Index() {
  const [simranOpen, setSimranOpen] = useState(false);
  const guestName = useInvitedGuestName();

  return (
    <NoorArchExperience
      groomName="Mohsin"
      brideName="Simran"
      theme="eid"
      onPrime={() => window.dispatchEvent(new Event("wedding:prime-music"))}
      onOpen={(withMusic = true) => {
        window.dispatchEvent(new CustomEvent("wedding:enter", { detail: { music: withMusic } }));
      }}
    >
      <main className="overflow-x-clip">
        <Navbar onOpenSimran={() => setSimranOpen(true)} />
        <Hero
          guestName={guestName}
          backgroundImage={noorArchStill}
          dateLine="22–23 November 2026"
          actions={null}
          theme="eid"
          entranceDelay={0}
        />
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
    </NoorArchExperience>
  );
}
