import { createFileRoute } from "@tanstack/react-router";
import { Worklist } from "@/features/worklist/Worklist";

export const Route = createFileRoute("/worklist")({
  validateSearch: (s: Record<string, unknown>): { segment?: string | undefined } =>
    typeof s["segment"] === "string" ? { segment: s["segment"] } : {},
  head: () => ({
    meta: [
      { title: "Priority Worklist — RecoveryOps" },
      {
        name: "description",
        content: "Prioritized collections worklist and frontline execution workspace.",
      },
      { property: "og:title", content: "Priority Worklist — RecoveryOps" },
      {
        property: "og:description",
        content: "Prioritized collections worklist and frontline execution workspace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Worklist,
});
