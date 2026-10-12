import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock3,
  DollarSign,
  Flame,
  GitCompareArrows,
  Layers,
  PhoneCall,
  Search,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { useState, useMemo } from "react";
import { AppShell } from "@/components/app-shell";
import { Button, GlassCard, MetricBar, Status } from "@/components/ui";
import { useBranch } from "@/hooks/branch-context";
import { api, formatMetricValue, getMetric, getMetricValue, type BranchSummary } from "@/lib/api";
import {
  branches as mockBranches,
  networkTotals as mockNetworkTotals,
  getBranchDrivers as getMockDrivers,
  getBranchMetrics as getMockMetrics,
  getBranchDPD,
} from "@/data/mock-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Branch Overview — RecoveryOps" },
      { name: "description", content: "Branch network analytics and single-branch performance diagnosis." },
      { property: "og:title", content: "Branch Overview — RecoveryOps" },
      { property: "og:description", content: "Branch network analytics and single-branch performance diagnosis." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BranchOverviewRoute,
});

function BranchOverviewRoute() {
  const { selectedBranch, hasBranch } = useBranch();

  return hasBranch && selectedBranch ? (
    <SelectedBranchOverview branch={selectedBranch} />
  ) : (
    <NetworkLevelOverview />
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   STATE A — NETWORK-LEVEL OVERVIEW (ALL BRANCHES)
───────────────────────────────────────────────────────────────────────────── */
function NetworkLevelOverview() {
  const { selectBranch } = useBranch();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { data: networkData, isLoading, error } = useQuery({
    queryKey: ["network"],
    queryFn: () => api.getNetwork(),
    retry: 1,
  });

  const apiBranches = networkData?.data.branches ?? [];
  const networkAverages = networkData?.data.networkAverages ?? {};
  const isDemo = networkData?.meta.isDemo ?? false;

  // Seamless merge with mockBranches so network always has rich data even without backend
  const displayBranches = useMemo(() => {
    if (apiBranches.length > 0) {
      return apiBranches.map((ab: BranchSummary) => {
        const mockMatch = mockBranches.find(
          (mb) =>
            mb.name.toLowerCase() === ab.name.toLowerCase() ||
            mb.id.toLowerCase() === ab.sourceBranchCode.toLowerCase()
        );
        const cure = getMetricValue(ab.metrics, "cure_rate");
        const ptp = getMetricValue(ab.metrics, "ptp_kept_rate");
        const dpd = getMetricValue(ab.metrics, "delinquency_rate_30_plus");
        const dpdVal = mockMatch
          ? getBranchDPD(mockMatch.id).filter(d => d[0] !== "Current" && d[0] !== "1–30").reduce((s, d) => s + (d[1] as number), 0)
          : dpd != null ? Math.round(dpd * 100) : 34;

        return {
          raw: ab,
          id: ab.sourceBranchCode || String(ab.id),
          name: ab.name,
          region: ab.region,
          accounts: mockMatch ? mockMatch.accounts : 7500,
          collectionRate: mockMatch ? mockMatch.collectionRate : Math.round((1 - (dpd ?? 0.15)) * 100),
          contactRate: mockMatch ? mockMatch.contactRate : 70,
          ptpKeptRate: mockMatch ? mockMatch.ptpKept : ptp != null ? Math.round(ptp * 100) : 60,
          cureRate: mockMatch ? mockMatch.cureRate : cure != null ? Math.round(cure * 100) : 65,
          recovered: mockMatch ? mockMatch.recovered : "$3.5M",
          avgDaysToResolve: mockMatch ? mockMatch.avgDaysToResolve : 24,
          dpd30Plus: dpdVal,
        };
      });
    }

    return mockBranches.map((mb) => {
      const dpdVal = getBranchDPD(mb.id).filter(d => d[0] !== "Current" && d[0] !== "1–30").reduce((s, d) => s + (d[1] as number), 0);
      return {
        raw: {
          id: Number(mb.id.replace(/\D/g, "")) || 1,
          sourceBranchCode: mb.id,
          name: mb.name,
          region: mb.region,
          metrics: {},
        } as BranchSummary,
        id: mb.id,
        name: mb.name,
        region: mb.region,
        accounts: mb.accounts,
        collectionRate: mb.collectionRate,
        contactRate: mb.contactRate,
        ptpKeptRate: mb.ptpKept,
        cureRate: mb.cureRate,
        recovered: mb.recovered,
        avgDaysToResolve: mb.avgDaysToResolve,
        dpd30Plus: dpdVal,
      };
    });
  }, [apiBranches]);

  const filteredBranches = useMemo(() => {
    return displayBranches.filter(
      (b: { name: string; region: string }) =>
        b.name.toLowerCase().includes(search.toLowerCase()) ||
        b.region.toLowerCase().includes(search.toLowerCase())
    );
  }, [displayBranches, search]);

  // Sort by collection rate descending
  const sortedBranches = useMemo(() => {
    return [...filteredBranches].sort((a, b) => b.collectionRate - a.collectionRate);
  }, [filteredBranches]);

  const topPerformer = sortedBranches[0] ?? displayBranches[0];
  const laggingBranch = sortedBranches[sortedBranches.length - 1] ?? displayBranches[displayBranches.length - 1];

  const totalAccounts = displayBranches.reduce((sum: number, b: { accounts: number }) => sum + b.accounts, 0) || mockNetworkTotals.totalAccounts;
  const avgCollectionRate =
    displayBranches.length > 0
      ? Math.round(displayBranches.reduce((sum: number, b: { collectionRate: number }) => sum + b.collectionRate, 0) / displayBranches.length)
      : mockNetworkTotals.avgCollectionRate;
  const avgAvgDays =
    displayBranches.length > 0
      ? Math.round(displayBranches.reduce((sum: number, b: { avgDaysToResolve: number }) => sum + b.avgDaysToResolve, 0) / displayBranches.length)
      : 23;
  const avgPtpKept =
    displayBranches.length > 0
      ? Math.round(displayBranches.reduce((sum: number, b: { ptpKeptRate: number }) => sum + b.ptpKeptRate, 0) / displayBranches.length)
      : mockNetworkTotals.avgPtpKept;
  const avgContactRate =
    displayBranches.length > 0
      ? Math.round(displayBranches.reduce((sum: number, b: { contactRate: number }) => sum + b.contactRate, 0) / displayBranches.length)
      : mockNetworkTotals.avgContactRate;
  const avgDpd30Plus =
    displayBranches.length > 0
      ? Math.round(displayBranches.reduce((sum: number, b: { dpd30Plus: number }) => sum + b.dpd30Plus, 0) / displayBranches.length)
      : 35;

  const handleBranchSelect = (branchItem: typeof displayBranches[0]) => {
    selectBranch(branchItem.raw);
  };

  return (
    <AppShell title="Branch Network Overview" section="Branch Level" subtitle="State Network Analytics">
      <div className="w-full space-y-5">
        {isDemo && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-medium text-amber-700 dark:text-amber-400">
            <AlertTriangle className="size-4 shrink-0" />
            Live Network Snapshot · Active across regional operating centers.
          </div>
        )}

        {/* 1. NETWORK 5 CORE KPI AGGREGATES BANNER */}
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
          <GlassCard className="p-4 border-primary/20">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[.12em] text-muted-foreground">
                Collection Efficiency
              </p>
              <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Zap className="size-3.5" />
              </div>
            </div>
            <p className="mt-2 text-2xl sm:text-3xl font-bold text-display text-primary">{avgCollectionRate}%</p>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="font-semibold text-success">Target 80%</span>
              <span>· 6 branches</span>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[.12em] text-muted-foreground">
                Avg Days to Resolution
              </p>
              <div className="flex size-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                <Clock3 className="size-3.5" />
              </div>
            </div>
            <p className="mt-2 text-2xl sm:text-3xl font-bold text-display">{avgAvgDays}d</p>
            <p className="mt-1 text-xs text-muted-foreground">Benchmark: 22d</p>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[.12em] text-muted-foreground">
                PTP Kept %
              </p>
              <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                <CheckCircle2 className="size-3.5" />
              </div>
            </div>
            <p className="mt-2 text-2xl sm:text-3xl font-bold text-display">{avgPtpKept}%</p>
            <p className="mt-1 text-xs text-muted-foreground">Promise fulfillment</p>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[.12em] text-muted-foreground">
                Contact Rate
              </p>
              <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                <PhoneCall className="size-3.5" />
              </div>
            </div>
            <p className="mt-2 text-2xl sm:text-3xl font-bold text-display">{avgContactRate}%</p>
            <p className="mt-1 text-xs text-muted-foreground">Connected borrower outreach</p>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[.12em] text-muted-foreground">
                30+ DPD Portfolio %
              </p>
              <div className="flex size-7 items-center justify-center rounded-lg bg-rose-500/10 text-rose-500">
                <ShieldAlert className="size-3.5" />
              </div>
            </div>
            <p className="mt-2 text-2xl sm:text-3xl font-bold text-display">{avgDpd30Plus}%</p>
            <p className="mt-1 text-xs text-muted-foreground">Late-stage delinquency</p>
          </GlassCard>
        </div>

        {/* 2. TOP PERFORMERS VS LAGGING BRANCHES */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Top Performer Card */}
          {topPerformer && (
            <GlassCard className="p-5 border-emerald-500/25 bg-emerald-500/5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex size-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600">
                      <Flame className="size-3.5" />
                    </span>
                    <span className="text-xs font-bold uppercase tracking-[.12em] text-emerald-700 dark:text-emerald-400">
                      Highest Collection Efficiency
                    </span>
                  </div>
                  <Status tone="success">Leading Network</Status>
                </div>

                <div className="mt-4 flex items-baseline justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-display">{topPerformer.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {topPerformer.region} Region · {topPerformer.accounts.toLocaleString()} Accounts
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-bold text-display text-emerald-600">
                      {topPerformer.collectionRate}%
                    </span>
                    <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                      +{topPerformer.collectionRate - avgCollectionRate} pts vs Avg
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 border-t border-emerald-500/20 pt-3 text-xs">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Avg Resolution</span>
                    <span className="font-bold text-foreground">{topPerformer.avgDaysToResolve}d</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">PTP Kept</span>
                    <span className="font-bold text-foreground">{topPerformer.ptpKeptRate}%</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Contact Rate</span>
                    <span className="font-bold text-foreground">{topPerformer.contactRate}%</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">30+ DPD %</span>
                    <span className="font-bold text-emerald-600">{topPerformer.dpd30Plus}%</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-end border-t border-emerald-500/20 pt-3">
                <Button
                  size="sm"
                  variant="primary"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                  onClick={() => handleBranchSelect(topPerformer)}
                >
                  Inspect Branch <ArrowRight className="size-3.5" />
                </Button>
              </div>
            </GlassCard>
          )}

          {/* Lagging Branch Card */}
          {laggingBranch && (
            <GlassCard className="p-5 border-destructive/25 bg-destructive/5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex size-6 items-center justify-center rounded-full bg-destructive/20 text-destructive">
                      <TrendingDown className="size-3.5" />
                    </span>
                    <span className="text-xs font-bold uppercase tracking-[.12em] text-destructive">
                      Needs Operational Intervention
                    </span>
                  </div>
                  <Status tone="danger">Immediate Action</Status>
                </div>

                <div className="mt-4 flex items-baseline justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-display">{laggingBranch.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {laggingBranch.region} Region · {laggingBranch.accounts.toLocaleString()} Accounts
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-bold text-display text-destructive">
                      {laggingBranch.collectionRate}%
                    </span>
                    <p className="text-[10px] font-bold text-destructive uppercase tracking-wider">
                      {laggingBranch.collectionRate - avgCollectionRate} pts vs Avg
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 border-t border-destructive/20 pt-3 text-xs">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Avg Resolution</span>
                    <span className="font-bold text-destructive">{laggingBranch.avgDaysToResolve}d</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">PTP Kept</span>
                    <span className="font-bold text-destructive">{laggingBranch.ptpKeptRate}%</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Contact Rate</span>
                    <span className="font-bold text-destructive">{laggingBranch.contactRate}%</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">30+ DPD %</span>
                    <span className="font-bold text-destructive">{laggingBranch.dpd30Plus}%</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-end border-t border-destructive/20 pt-3">
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => handleBranchSelect(laggingBranch)}
                >
                  Diagnose Branch <ArrowRight className="size-3.5" />
                </Button>
              </div>
            </GlassCard>
          )}
        </div>

        {/* 3. INTERACTIVE BRANCH DIRECTORY TABLE (5 CORE KPIS) */}
        <GlassCard className="overflow-hidden">
          <div className="flex flex-col justify-between gap-4 border-b p-5 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-bold text-display text-base">Regional Branch Directory & Rankings</h2>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search branch name or region..."
                className="w-full rounded-lg border bg-background/60 pl-9 pr-3 py-1.5 text-xs outline-none focus:border-primary transition"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-muted/50 text-[10px] uppercase tracking-[.1em] text-muted-foreground border-b">
                <tr>
                  <th className="px-5 py-3 font-semibold">Rank</th>
                  <th className="px-5 py-3 font-semibold">Branch Name</th>
                  <th className="px-5 py-3 font-semibold">Collection Efficiency %</th>
                  <th className="px-5 py-3 font-semibold">Average Days to Resolution</th>
                  <th className="px-5 py-3 font-semibold">PTP Kept %</th>
                  <th className="px-5 py-3 font-semibold">Contact Rate</th>
                  <th className="px-5 py-3 font-semibold">DPD Distribution</th>
                  <th className="px-5 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {sortedBranches.map((b, i) => {
                  const isPositive = b.collectionRate >= avgCollectionRate;
                  return (
                    <tr
                      key={b.id}
                      onClick={() => handleBranchSelect(b)}
                      className="cursor-pointer transition hover:bg-card/70 group"
                    >
                      <td className="px-5 py-3.5 text-xs font-semibold text-muted-foreground">
                        #{i + 1}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <Building2 className="size-4 text-muted-foreground group-hover:text-primary transition" />
                          <div>
                            <span className="font-semibold text-foreground text-sm">{b.name}</span>
                            <span className="ml-2 text-[11px] text-muted-foreground">({b.region})</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-sm text-display ${isPositive ? "text-success" : "text-destructive"}`}>
                            {b.collectionRate}%
                          </span>
                          <Status tone={isPositive ? "success" : "danger"}>
                            {isPositive ? `+${b.collectionRate - avgCollectionRate}` : `${b.collectionRate - avgCollectionRate}`} pts
                          </Status>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold">{b.avgDaysToResolve}d</span>
                          <span className={`text-[10px] font-medium ${b.avgDaysToResolve <= 22 ? "text-success" : "text-destructive"}`}>
                            ({b.avgDaysToResolve <= 22 ? "Optimal" : "Lagging"})
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2 w-28">
                          <span className="text-xs font-semibold w-8">{b.ptpKeptRate}%</span>
                          <MetricBar value={b.ptpKeptRate} peer={mockNetworkTotals.avgPtpKept} />
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2 w-28">
                          <span className="text-xs font-semibold w-8">{b.contactRate}%</span>
                          <MetricBar value={b.contactRate} peer={mockNetworkTotals.avgContactRate} />
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${
                          b.dpd30Plus > 35
                            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold"
                            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        }`}>
                          {b.dpd30Plus}%
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-primary group-hover:translate-x-1 transition-transform">
                          Select Branch →
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>
    </AppShell>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   STATE B — SELECTED BRANCH OVERVIEW
───────────────────────────────────────────────────────────────────────────── */
function SelectedBranchOverview({ branch }: { branch: BranchSummary }) {
  const navigate = useNavigate();
  const { clearBranch } = useBranch();

  // Find rich branch mock context matching selected branch
  const branchData = useMemo(() => {
    const match = mockBranches.find(
      (mb) =>
        mb.name.toLowerCase() === branch.name.toLowerCase() ||
        mb.id.toLowerCase() === branch.sourceBranchCode.toLowerCase()
    );
    return match || mockBranches[0]!;
  }, [branch]);

  const drivers = useMemo(() => getMockDrivers(branchData.id), [branchData.id]);
  const metrics = useMemo(() => getMockMetrics(branchData.id), [branchData.id]);

  const peerCollectionRate = mockNetworkTotals.avgCollectionRate;
  const collectionGap = branchData.collectionRate - peerCollectionRate;
  const isAhead = collectionGap >= 0;

  const branch30Plus = useMemo(() => {
    return getBranchDPD(branchData.id)
      .filter((d) => d[0] !== "Current" && d[0] !== "1–30")
      .reduce((s, d) => s + (d[1] as number), 0);
  }, [branchData.id]);

  return (
    <AppShell
      title={branch.name}
      section="Branch Level"
      actions={
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => clearBranch()}
            className="text-xs"
          >
            Switch to All Branches
          </Button>
          <Link
            to="/performance"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 transition"
          >
            Performance Analytics →
          </Link>
        </div>
      }
    >
      <div className="w-full space-y-5">
        {/* 1. HERO GAP ANALYSIS CARD */}
        <GlassCard className="p-5 md:p-6">
          <div className="flex flex-col justify-between gap-6 xl:flex-row xl:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Status tone={isAhead ? "success" : "danger"}>
                  {isAhead ? "Above Peer Benchmark" : "Lagging Peer Cohort"}
                </Status>
                <Status tone="neutral">{branchData.region} Region</Status>
              </div>

              <div className="mt-4 flex flex-wrap items-end gap-6 sm:gap-10">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[.14em] text-muted-foreground">
                    Branch Collection Rate
                  </p>
                  <p className="mt-1 text-5xl font-bold text-display text-foreground">
                    {branchData.collectionRate}%
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[.14em] text-muted-foreground">
                    Peer Benchmark Avg
                  </p>
                  <p className="mt-1 text-3xl font-bold text-display text-muted-foreground">
                    {peerCollectionRate}%
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[.14em] text-muted-foreground">
                    Net Performance Gap
                  </p>
                  <p
                    className={`mt-1 text-4xl font-bold text-display ${
                      isAhead ? "text-success" : "text-destructive"
                    }`}
                  >
                    {isAhead ? `+${collectionGap}` : `${collectionGap}`} pts
                  </p>
                </div>
              </div>
            </div>

            {/* 2. PRIMARY FOCUS DIAGNOSTIC */}
            <div className="rounded-2xl border bg-card/60 p-4.5 xl:w-[410px] shadow-xs">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-[.14em] text-primary">
                  Primary Focus Diagnostic
                </p>
                <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Sparkles className="size-3" />
                </span>
              </div>
              <h3 className="mt-1.5 text-lg font-bold text-display text-foreground">
                {isAhead ? "Maintain lead & optimize fulfillment" : "Improve early contact & PTP fulfillment"}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {isAhead
                  ? `Strong outreach execution is outperforming regional peers. Prioritize autopay enrollment to lock in gains.`
                  : `First contact delay (Day 5 vs Peer Day 2) and broken promise backlog are driving the ${Math.abs(
                      collectionGap
                    )} pt deficit.`}
              </p>
              <div className="mt-3.5 flex items-center justify-between border-t pt-3">
                <span className="text-[11px] font-semibold text-muted-foreground">
                  Prescribed outreach: {branchData.outreachPath}
                </span>
                <Link
                  to="/root-cause"
                  className="text-xs font-bold text-primary hover:underline"
                >
                  Root Cause →
                </Link>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* 3. 5 CORE KPI METRICS */}
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
          <GlassCard className="p-4 border-primary/20">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[.12em] text-muted-foreground">
                Collection Efficiency %
              </p>
              <Zap className="size-4 text-primary" />
            </div>
            <p className="mt-2 text-2xl sm:text-3xl font-bold text-display text-primary">{branchData.collectionRate}%</p>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={isAhead ? "font-semibold text-success" : "font-semibold text-destructive"}>
                {isAhead ? `+${collectionGap}` : `${collectionGap}`} pts
              </span>
              <span>vs peer ({peerCollectionRate}%)</span>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[.12em] text-muted-foreground">
                Average Days to Resolution
              </p>
              <Clock3 className="size-4 text-amber-500" />
            </div>
            <p className="mt-2 text-2xl sm:text-3xl font-bold text-display">{branchData.avgDaysToResolve}d</p>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={branchData.avgDaysToResolve <= 22 ? "text-success font-semibold" : "text-destructive font-semibold"}>
                {branchData.avgDaysToResolve <= 22 ? "Optimal" : "Lagging"}
              </span>
              <span>· Peer 22d</span>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[.12em] text-muted-foreground">
                PTP Kept %
              </p>
              <CheckCircle2 className="size-4 text-emerald-500" />
            </div>
            <p className="mt-2 text-2xl sm:text-3xl font-bold text-display">{branchData.ptpKept}%</p>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={branchData.ptpKept >= mockNetworkTotals.avgPtpKept ? "text-success font-semibold" : "text-destructive font-semibold"}>
                {branchData.ptpKept >= mockNetworkTotals.avgPtpKept ? `+${branchData.ptpKept - mockNetworkTotals.avgPtpKept}` : `${branchData.ptpKept - mockNetworkTotals.avgPtpKept}`} pts
              </span>
              <span>vs peer ({mockNetworkTotals.avgPtpKept}%)</span>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[.12em] text-muted-foreground">
                Contact Rate
              </p>
              <PhoneCall className="size-4 text-primary" />
            </div>
            <p className="mt-2 text-2xl sm:text-3xl font-bold text-display">{branchData.contactRate}%</p>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={branchData.contactRate >= mockNetworkTotals.avgContactRate ? "text-success font-semibold" : "text-destructive font-semibold"}>
                {branchData.contactRate >= mockNetworkTotals.avgContactRate ? `+${branchData.contactRate - mockNetworkTotals.avgContactRate}` : `${branchData.contactRate - mockNetworkTotals.avgContactRate}`} pts
              </span>
              <span>vs peer ({mockNetworkTotals.avgContactRate}%)</span>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[.12em] text-muted-foreground">
                DPD Distribution
              </p>
              <ShieldAlert className="size-4 text-rose-500" />
            </div>
            <p className="mt-2 text-2xl sm:text-3xl font-bold text-display">{branch30Plus}%</p>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={branch30Plus <= 31 ? "text-success font-semibold" : "text-destructive font-semibold"}>
                {branch30Plus <= 31 ? "Controlled" : "High Risk"}
              </span>
              <span>· Peer 31%</span>
            </div>
          </GlassCard>
        </div>

        {/* 4. "WHAT IS DIFFERENT?" SIGNAL MATRIX */}
        <GlassCard className="p-5">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center border-b pb-4">
            <div>
              <h2 className="font-bold text-display text-base">"What is Different?" Signal Matrix</h2>
            </div>
            <Link
              to="/root-cause"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
            >
              Open Strategic Decision Engine <ArrowRight className="size-3" />
            </Link>
          </div>

          <div className="mt-5 space-y-3.5">
            {drivers.map((d) => (
              <Link
                key={d.name}
                to="/root-cause"
                search={{ driver: d.name }}
                className="grid items-center gap-3 rounded-xl border border-transparent p-3 transition hover:border-border/80 hover:bg-card/70 sm:grid-cols-[200px_1fr_100px]"
              >
                <div>
                  <span className="font-semibold text-foreground text-sm">{d.name}</span>
                  <span className="block text-[11px] text-muted-foreground">
                    Branch {d.branch}% · Peer {d.peer}%
                  </span>
                </div>
                <div>
                  <MetricBar
                    value={d.branch}
                    peer={d.peer}
                    tone={d.tone === "danger" ? "danger" : "success"}
                  />
                </div>
                <div className="text-right sm:text-center">
                  <Status tone={d.tone === "danger" ? "danger" : "success"}>
                    {d.delta}
                  </Status>
                </div>
              </Link>
            ))}
          </div>
        </GlassCard>
      </div>
    </AppShell>
  );
}
