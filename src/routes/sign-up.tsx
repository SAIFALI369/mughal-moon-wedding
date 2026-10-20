import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy URL only: public registration is intentionally unavailable.
export const Route = createFileRoute("/sign-up")({
  beforeLoad: () => {
    throw redirect({ to: "/sign-in", replace: true });
  },
});
