import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Clock3, GitCompareArrows, Search, TrendingDown, TrendingUp, Users } from "lucide-react";
import { useState, useEffect } from "react";
import { AppShell } from "@/components/app-shell";
import { GlassCard, Status } from "@/components/ui";
import { useBranch } from "@/hooks/branch-context";
import { api, formatMetricValue, getMetric, getMetricValue, type BranchSummary } from "@/lib/api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Branch Overview" },
      { name: "description", content: "Branch network analytics and single-branch performance diagnosis." },
      { property: "og:title", content: "Branch Overview" },
      { property: "og:description", content: "Branch network analytics and single-branch performance diagnosis." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BranchOverview,
});

const SUMMARY_CODES = [
  "delinquency_rate_30_plus",
  "cure_rate",
  "ptp_kept_rate",
  "autopay_active_pct",
  "fpd_count",
];

function estimatedAccounts(b: BranchSummary): number {
  const dpd = getMetric(b.metrics, "delinquency_rate_30_plus");
  if (dpd && dpd.numerator != null && dpd.value != null && dpd.value > 0) {
    return Math.round(dpd.numerator / dpd.value);
  }
  return 0;
}

function BranchOverview() {
  const { selectedBranch, hasBranch } = useBranch();
  const navigate = useNavigate();

  useEffect(() => {
    if (hasBranch && selectedBranch) {
      navigate({ to: "/performance" });
    }
  }, [hasBranch, selectedBranch, navigate]);

  return <BranchNetworkOverview />;
}

function BranchNetworkOverview() {
  const { selectBranch } = useBranch();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["network"],
    queryFn: () => api.getNetwork(),
  });

  const branches = data?.data.branches ?? [];
  const averages = data?.data.networkAverages ?? {};
  const isDemo = data?.meta.isDemo ?? false;

  const filtered = branches.filter(
    (b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.region.toLowerCase().includes(search.toLowerCase())
  );

  // Rank by 30+ DPD descending — higher delinquency first
  const sorted = [...filtered].sort(
    (a, b) =>
      (getMetricValue(b.metrics, "delinquency_rate_30_plus") ?? 0) -
      (getMetricValue(a.metrics, "delinquency_rate_30_plus") ?? 0)
  );

  const totalAccounts = branches.reduce((sum, b) => sum + estimatedAccounts(b), 0);
  const avgDelinquency = averages["delinquency_rate_30_plus"];
  const avgCure = averages["cure_rate"];
  const avgPtp = averages["ptp_kept_rate"];

  return (
    <AppShell title="All Branches" section="Branch Level" subtitle="Network Overview">
      <div className="mx-auto max-w-[1280px] space-y-4">
        {isDemo && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-medium text-amber-700 dark:text-amber-400">
            <AlertTriangle className="size-4" />
            Demo data — values are synthetic and must not be used for production decisions.
          </div>
        )}

        {/* KPI strip */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <GlassCard className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[.12em] text-muted-foreground">Network 30+ DPD</p>
              <TrendingDown className="size-4 text-destructive" />
            </div>
            <p className="mt-2 text-3xl font-bold text-display">
              {avgDelinquency != null ? `${(avgDelinquency * 100).toFixed(1)}%` : "—"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{branches.length} branches total</p>
          </GlassCard>
          <GlassCard className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[.12em] text-muted-foreground">Total accounts</p>
              <Users className="size-4 text-primary" />
            </div>
            <p className="mt-2 text-3xl font-bold text-display">{totalAccounts.toLocaleString()}</p>
            <p className="mt-1 text-xs text-muted-foreground">Retail loan portfolio</p>
          </GlassCard>
          <GlassCard className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[.12em] text-muted-foreground">Avg cure rate</p>
              <TrendingUp className="size-4 text-success" />
            </div>
            <p className="mt-2 text-3xl font-bold text-display">
              {avgCure != null ? `${(avgCure * 100).toFixed(1)}%` : "—"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Across all regions</p>
          </GlassCard>
          <GlassCard className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[.12em] text-muted-foreground">Avg PTP kept</p>
              <Clock3 className="size-4 text-primary" />
            </div>
            <p className="mt-2 text-3xl font-bold text-display">
              {avgPtp != null ? `${(avgPtp * 100).toFixed(1)}%` : "—"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Promise fulfillment</p>
          </GlassCard>
        </div>

        {/* Branch directory / leaderboard */}
        <GlassCard className="overflow-hidden">
          <div className="flex flex-col justify-between gap-4 border-b p-5 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-bold text-display">Branch network performance</h2>
              <p className="text-xs text-muted-foreground">Ranked by 30+ DPD concentration · Click any branch to enter branch-level view</p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search branches..."
                className="w-full rounded-lg border bg-background/50 pl-9 pr-3 py-1.5 text-sm outline-none focus:border-primary"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {isLoading && (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading branch network…</div>
          )}
          {error && (
            <div className="p-8 text-center text-sm text-destructive">
              Failed to load branches. Is the backend running?
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-muted/50 text-[10px] uppercase tracking-[.1em] text-muted-foreground">
                <tr>
                  {["#", "Branch", "30+ DPD", "Cure rate", "PTP kept", "Autopay", "FPD count", ""].map((x) => (
                    <th className="px-5 py-3" key={x}>{x}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((b, i) => (
                  <tr
                    className="border-t hover:bg-card/60 cursor-pointer"
                    key={b.id}
                    onClick={() => {
                      selectBranch(b);
                      navigate({ to: "/performance" });
                    }}
                  >
                    <td className="px-5 py-4 text-muted-foreground">{i + 1}</td>
                    <td className="px-5 py-4">
                      <span className="font-semibold">{b.name}</span>
                      <span className="ml-2 text-[10px] text-muted-foreground">{b.region}</span>
                    </td>
                    <td className="px-5 py-4 font-bold">{formatMetricValue(getMetric(b.metrics, "delinquency_rate_30_plus"))}</td>
                    <td className="px-5 py-4">{formatMetricValue(getMetric(b.metrics, "cure_rate"))}</td>
                    <td className="px-5 py-4">{formatMetricValue(getMetric(b.metrics, "ptp_kept_rate"))}</td>
                    <td className="px-5 py-4">{formatMetricValue(getMetric(b.metrics, "autopay_active_pct"))}</td>
                    <td className="px-5 py-4">{formatMetricValue(getMetric(b.metrics, "fpd_count"))}</td>
                    <td className="px-5 py-4 text-right">
                      <span className="text-xs font-semibold text-primary">Select →</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>
    </AppShell>
  );
}
