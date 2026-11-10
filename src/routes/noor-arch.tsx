import { createFileRoute, Link } from "@tanstack/react-router";
import { NoorArchExperience } from "@/components/wedding/noor-arch-gate";
import { EVENTS, WEDDING_HASHTAG } from "@/components/wedding/config";
import { getSiteOrigin } from "@/lib/site-origin";
import { buildSiteSocialMeta, themeOgImage } from "@/lib/social-preview";

export const Route = createFileRoute("/noor-arch")({
  loader: async () => ({ siteOrigin: await getSiteOrigin() }),
  head: ({ loaderData }) => ({
    meta: buildSiteSocialMeta({
      title: "Noor Archway — Mohsin & Simran's Invitation",
      description:
        "Tap to open the invitation and step through the lantern-lit archway to Mohsin & Simran's union.",
      origin: loaderData?.siteOrigin,
      path: "/noor-arch",
      imagePath: themeOgImage("eid", loaderData?.siteOrigin).url,
    }),
  }),
  component: NoorArch,
});

const scenes = [
  {
    kicker: "22–23 November 2026",
    title: "Mohsin & Simran",
    body: "With gratitude and joy, we invite you to share in the beginning of our forever.",
  },
  ...EVENTS.map((e) => ({
    kicker: e.date,
    title: e.title,
    body: `${e.time} · ${e.venue}, ${e.address} · Dress: ${e.dress}`,
  })),
];

function NoorArch() {
  return (
    <main className="relative min-h-svh bg-background text-foreground">
      <NoorArchExperience groomName="Mohsin" brideName="Simran" theme="eid" scenes={scenes}>
        <section className="flex min-h-svh flex-col items-center justify-center gap-5 px-6 text-center">
          <div className="card-calligraphy-plate is-light-art max-w-md">
            <h2 className="card-calligraphy-names text-4xl">Will you join us?</h2>
            <Link
              to="/"
              hash="rsvp"
              className="noor-tap-open mt-6 inline-flex items-center justify-center rounded-full px-7 py-3 text-sm uppercase tracking-[0.18em]"
            >
              RSVP now
            </Link>
            <p className="card-calligraphy-kicker mt-6 text-xs uppercase tracking-[0.22em]">
              {WEDDING_HASHTAG}
            </p>
          </div>
        </section>
      </NoorArchExperience>
    </main>
  );
}
