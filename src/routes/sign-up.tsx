import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy URL only: public registration is intentionally unavailable.
export const Route = createFileRoute("/sign-up")({
  head: () => ({
    meta: [
      { title: "Account access — InvitingYou" },
      { name: "description", content: "Access your personally issued InvitingYou account." },
      { property: "og:title", content: "Account access — InvitingYou" },
      { property: "og:description", content: "Access your personally issued InvitingYou account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/sign-in", replace: true });
  },
});
