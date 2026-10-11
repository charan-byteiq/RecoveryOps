import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { GlassCard, MetricBar, Status } from "@/components/ui";
import { useBranch } from "@/hooks/branch-context";
import { api, formatMetricValue, getMetric, getMetricValue, type BranchSummary } from "@/lib/api";
import { AlertTriangle, GitCompareArrows } from "lucide-react";

export const Route = createFileRoute("/peer-comparison")({
  head: () => ({
    meta: [
      { title: "Peer Comparison — RecoveryOps" },
      { name: "description", content: "Compare branch performance against peer branches." },
      { property: "og:title", content: "Peer Comparison — RecoveryOps" },
      { property: "og:description", content: "Compare branch performance against peer branches." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PeerComparison,
});

const HERO_METRIC = "delinquency_rate_30_plus";
const COMPARE_CODES = ["delinquency_rate_30_plus", "cure_rate", "ptp_kept_rate", "autopay_active_pct", "fpd_count"];

function PeerComparison() {
  const { selectedBranch, hasBranch, selectBranch } = useBranch();
  const branchesQuery = useQuery({ queryKey: ["branches"], queryFn: () => api.getBranches(), enabled: !hasBranch });

  if (!hasBranch) {
    return (
      <AppShell title="Peer Comparison" section="Branch Level" subtitle="Benchmark vs peers">
        <div className="mx-auto max-w-[600px] py-16 text-center">
          <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary/10">
            <GitCompareArrows className="size-7 text-primary" />
          </div>
          <h2 className="mt-5 text-xl font-bold text-display">Select a branch to compare</h2>
          <p className="mt-2 text-sm text-muted-foreground">Peer comparison shows how a branch ranks against the rest of the network.</p>
          <div className="mt-8 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {branchesQuery.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {branchesQuery.data?.data.map((b: BranchSummary) => (
              <button
                key={b.id}
                className="rounded-xl border bg-card/50 p-4 text-left transition hover:bg-primary/5 hover:border-primary/20"
                onClick={() => selectBranch(b)}
              >
                <p className="text-sm font-semibold">{b.name}</p>
                <p className="text-xs text-muted-foreground">{b.region} · {formatMetricValue(getMetric(b.metrics, HERO_METRIC))}</p>
              </button>
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  return <PeerComparisonContent branch={selectedBranch!} />;
}

function PeerComparisonContent({ branch }: { branch: BranchSummary }) {
  const peersQuery = useQuery({ queryKey: ["branch", branch.id, "peers"], queryFn: () => api.getBranchPeers(branch.id) });
  const isDemo = peersQuery.data?.meta.isDemo ?? false;
  const peers = peersQuery.data?.data.peers ?? [];
  const networkAvg = peersQuery.data?.data.networkAverages ?? {};

  const allRows = [branch, ...peers].sort(
    (a, b) => (getMetricValue(b.metrics, HERO_METRIC) ?? 0) - (getMetricValue(a.metrics, HERO_METRIC) ?? 0)
  );

  return (
    <AppShell title={branch.name} section="Branch Level" subtitle="Peer comparison">
      <div className="mx-auto max-w-[1280px] space-y-4">
        {isDemo && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-medium text-amber-700 dark:text-amber-400">
            <AlertTriangle className="size-4" />
            Demo data — values are synthetic and must not be used for production decisions.
          </div>
        )}

        <GlassCard className="overflow-hidden p-5">
          <div className="mb-3">
            <h2 className="font-bold text-display">Peer ranking</h2>
            <p className="text-xs text-muted-foreground">Branches ranked by 30+ DPD concentration</p>
          </div>
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-[10px] uppercase tracking-[.1em] text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">Branch</th>
                  {COMPARE_CODES.map((code) => (
                    <th className="px-5 py-3" key={code}>{code.replace(/_/g, " ")}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allRows.map((p) => (
                  <tr
                    className={`border-t transition-colors ${p.id === branch.id ? "bg-primary/5 font-semibold text-primary" : "hover:bg-card/60"}`}
                    key={p.id}
                  >
                    <td className="px-5 py-3.5 font-semibold">
                      {p.name}
                      {p.id === branch.id && (
                        <span className="ml-2 rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">SELECTED</span>
                      )}
                    </td>
                    {COMPARE_CODES.map((code) => (
                      <td className="px-5 py-3.5" key={code}>
                        {formatMetricValue(getMetric(p.metrics, code))}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>

        <div className="grid gap-4 lg:grid-cols-2">
          {COMPARE_CODES.filter((c) => c !== "fpd_count").map((code) => {
            const avg = networkAvg[code] ?? 0;
            const branchValue = getMetricValue(branch.metrics, code) ?? 0;
            return (
              <GlassCard className="p-5" key={code}>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-display capitalize">{code.replace(/_/g, " ")}</h3>
                  <Status tone={code === HERO_METRIC ? (branchValue > avg ? "danger" : "good") : branchValue >= avg ? "good" : "danger"}>
                    {formatMetricValue(getMetric(branch.metrics, code))}
                  </Status>
                </div>
                <div className="mt-4">
                  <MetricBar
                    value={Math.round(branchValue * 100)}
                    peer={Math.round(avg * 100)}
                    tone={code === HERO_METRIC ? (branchValue > avg ? "danger" : "success") : branchValue >= avg ? "success" : "danger"}
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Branch {(branchValue * 100).toFixed(1)}% · Peer avg {(avg * 100).toFixed(1)}%
                </p>
              </GlassCard>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
