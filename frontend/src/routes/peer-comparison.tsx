import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/peer-comparison")({
  beforeLoad: () => {
    throw redirect({ to: "/root-cause" });
  },
  component: () => null,
});
