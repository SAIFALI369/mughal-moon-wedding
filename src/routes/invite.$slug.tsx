import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getInvitationCardBySlug } from "@/components/wedding/invitation-cards.functions";
import { getInvitationDetails } from "@/components/wedding/invitation-details";
import { PersonalInvitation } from "@/components/wedding/invitation-template";
import { getSiteOrigin } from "@/lib/site-origin";
import {
  buildCardUnavailableMeta,
  buildInvitationSocialMeta,
  sanitizeGuestParam,
} from "@/lib/social-preview";

export const Route = createFileRoute("/invite/$slug")({
  validateSearch: (search: Record<string, unknown>): { guest?: string; to?: string } => {
    const guest = sanitizeGuestParam(typeof search.guest === "string" ? search.guest : undefined);
    const to = sanitizeGuestParam(typeof search.to === "string" ? search.to : undefined);
    return {
      ...(guest ? { guest } : {}),
      ...(to ? { to } : {}),
    };
  },
  loader: async ({ params }) => {
    // Fetch on the server so the names, date, venue, entrance-door preview image
    // and personalised guest greeting are visible even before hydration.
    // A private draft, expired card, or unknown slug must reveal no card details.
    const [card, siteOrigin] = await Promise.all([
      getInvitationCardBySlug({ data: { slug: params.slug } }).catch((error) => {
        console.error("Could not load public invitation", error);
        return null;
      }),
      getSiteOrigin(),
    ]);
    return { card, siteOrigin };
  },
  head: ({ loaderData, match }) => {
    const card = loaderData?.card ?? null;
    const origin = loaderData?.siteOrigin;
    const guest = match.search.guest || match.search.to;
    if (!card) {
      return { meta: buildCardUnavailableMeta(origin) };
    }
    const details = getInvitationDetails(card.content);
    return {
      meta: buildInvitationSocialMeta({
        details,
        path: `/invite/${card.slug}`,
        guest,
        origin,
      }),
    };
  },
  component: InviteView,
});

function InviteView() {
  const { card } = Route.useLoaderData();
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

  return (
    <PersonalInvitation
      title={card.title}
      content={card.content}
      cardId={card.id}
      slug={card.slug}
    />
  );
}
