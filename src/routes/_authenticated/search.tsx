import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/search")({
  beforeLoad: () => {
    throw redirect({ to: "/upcoming", replace: true });
  },
});
