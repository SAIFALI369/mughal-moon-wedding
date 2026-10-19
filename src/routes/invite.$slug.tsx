import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getInvitationCardBySlug } from "@/components/wedding/invitation-cards.functions";
import { getInvitationDetails } from "@/components/wedding/invitation-details";
import { PersonalInvitation } from "@/components/wedding/invitation-template";
import { invitationArt } from "@/components/wedding/invitation-art";

export const Route = createFileRoute("/invite/$slug")({
  loader: async ({ params }) => {
    // Fetch on the server so the names, date and venue are visible even before hydration.
    // A private draft, expired card, or unknown slug must reveal no card details.
    try {
      return await getInvitationCardBySlug({ data: { slug: params.slug } });
    } catch (error) {
      console.error("Could not load public invitation", error);
      return null;
    }
  },
  head: ({ loaderData: card }) => {
    const details = card && getInvitationDetails(card.content);
    const heading = details
      ? `${details.groomName} & ${details.brideName} — Wedding Invitation`
      : "Invitation unavailable";
    const description = details
      ? `Celebrate with ${details.groomName} and ${details.brideName}${details.date ? ` on ${details.date}` : ""}${details.venue ? ` at ${details.venue}` : ""}.`
      : "This invitation is not available. Ask the host for a published link.";
    const base = (import.meta.env["VITE_SITE_URL"] || "").replace(/\/$/, "");
    return {
      meta: [
        { title: heading },
        { name: "description", content: description },
        { name: "robots", content: card ? "index, follow" : "noindex" },
        { property: "og:title", content: heading },
        { property: "og:description", content: description },
        ...(card
          ? [
              { property: "og:image", content: `${base}${invitationArt[details!.theme]}` },
              { property: "og:image:alt", content: heading },
              { name: "twitter:card", content: "summary_large_image" },
            ]
          : []),
      ],
    };
  },
  component: InviteView,
});

function InviteView() {
  const card = Route.useLoaderData();
  if (!card) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
        <Card className="w-full max-w-lg text-center">
          <CardHeader>
            <CardTitle className="font-serif text-2xl">Invitation unavailable</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This invitation is private, expired, or does not exist. Ask the host to publish and
              share their link.
            </p>
            <Link
              to="/"
              className="inline-flex rounded-full bg-burgundy px-6 py-2 text-sm text-ivory"
            >
              Back to the main invitation
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  return <PersonalInvitation title={card.title} content={card.content} cardId={card.id} />;
}
