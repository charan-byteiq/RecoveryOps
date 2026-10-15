import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock3,
  Flame,
  PhoneCall,
  Search,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  Zap,
} from "lucide-react";
import { useState, useMemo } from "react";
import { AppShell } from "@/components/app-shell";
import { Button, GlassCard, MetricBar, Status } from "@/components/ui";
import { Skeleton } from "@/components/ui/skeleton";
import { useBranch } from "@/hooks/branch-context";
import { useDate } from "@/hooks/date-context";
import {
  api,
  getMetric,
  type BranchSummary,
  type MetricValue,
  type RootCauseDriverItem,
} from "@/lib/api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Branch Overview — RecoveryOps" },
      {
        name: "description",
        content: "Branch network analytics and single-branch performance diagnosis.",
      },
      { property: "og:title", content: "Branch Overview — RecoveryOps" },
      {
        property: "og:description",
        content: "Branch network analytics and single-branch performance diagnosis.",
      },
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
   METRIC HELPERS
────────────────────────────────────────────────────────────────────────────── */

function toDisplayValue(metric: MetricValue | undefined): number | null {
  if (!metric || metric.value == null || metric.availability !== "available") return null;
  if (metric.unit === "percent") return metric.value * 100;
  return metric.value;
}

function formatDisplayValue(value: number | null | undefined, unit?: string): string {
  if (value == null) return "—";
  if (unit === "percent" || unit === "%") return `${Math.round(value)}%`;
  if (unit === "days") return `${Math.round(value)}d`;
  return `${Math.round(value)}`;
}

function formatMetricDelta(value: number | null | undefined, unit?: string): string {
  if (value == null) return "—";
  const rounded = Math.round(value * 10) / 10;
  const sign = rounded > 0 ? "+" : "";
  const suffix = unit === "percent" || unit === "%" ? " pts" : unit === "days" ? "d" : "";
  return `${sign}${rounded}${suffix}`;
}

function networkAveragePercent(
  averages: Record<string, number | null>,
  code: string,
): number | null {
  const raw = averages[code];
  if (raw == null) return null;
  return raw * 100;
}

function isHigherBadKpi(metricCode: string): boolean {
  return metricCode === "avg_days_to_resolve" || metricCode === "dpd_30_plus_concentration";
}

function kpiDisplayValue(value: number | null | undefined, unit: string): number | null {
  if (value == null) return null;
  return unit === "percent" ? value * 100 : value;
}

function kpiDeltaTone(metricCode: string, delta: number): "success" | "danger" | "warning" {
  if (delta === 0) return "warning";
  const higherBad = isHigherBadKpi(metricCode);
  return higherBad ? (delta > 0 ? "danger" : "success") : delta > 0 ? "success" : "danger";
}

const CORE_KPI_CONFIG = [
  { code: "collection_efficiency", label: "Collection Efficiency" },
  { code: "avg_days_to_resolve", label: "Average Days to Resolution" },
  { code: "ptp_kept_rate", label: "PTP Kept %" },
  { code: "contact_rate", label: "Contact Rate" },
  { code: "dpd_30_plus_concentration", label: "30+ DPD Concentration" },
] as const;

/* ─────────────────────────────────────────────────────────────────────────────
   STATE A — NETWORK-LEVEL OVERVIEW (ALL BRANCHES)
────────────────────────────────────────────────────────────────────────────── */

interface DisplayBranch {
  raw: BranchSummary;
  id: number;
  name: string;
  region: string;
  collectionEfficiency: number | null;
  avgDaysToResolve: number | null;
  ptpKeptRate: number | null;
  contactRate: number | null;
  dpd30Plus: number | null;
}

function NetworkLevelOverview() {
  const { selectBranch } = useBranch();
  const navigate = useNavigate();
  const { selectedDate } = useDate();
  const [search, setSearch] = useState("");

  const {
    data: networkData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["network", selectedDate],
    queryFn: () => api.getNetwork(selectedDate),
    retry: 1,
  });

  const apiBranches = networkData?.data.branches;
  const networkAverages = networkData?.data.networkAverages ?? {};
  const isDemo = networkData?.meta.isDemo ?? false;
  const asOfDate = networkData?.meta.asOfDate;

  const displayBranches: DisplayBranch[] = useMemo(() => {
    return (apiBranches ?? []).map((ab) => ({
      raw: ab,
      id: ab.id,
      name: ab.name,
      region: ab.region,
      collectionEfficiency: toDisplayValue(getMetric(ab.metrics, "collection_efficiency")),
      avgDaysToResolve: toDisplayValue(getMetric(ab.metrics, "avg_days_to_resolve")),
      ptpKeptRate: toDisplayValue(getMetric(ab.metrics, "ptp_kept_rate")),
      contactRate: toDisplayValue(getMetric(ab.metrics, "contact_rate")),
      dpd30Plus: toDisplayValue(getMetric(ab.metrics, "dpd_30_plus_concentration")),
    }));
  }, [apiBranches]);

  const filteredBranches = useMemo(() => {
    return displayBranches.filter(
      (b) =>
        b.name.toLowerCase().includes(search.toLowerCase()) ||
        b.region.toLowerCase().includes(search.toLowerCase()),
    );
  }, [displayBranches, search]);

  // Rank by collection efficiency only.
  const sortedBranches = useMemo(() => {
    return [...filteredBranches].sort((a, b) => {
      const aVal = a.collectionEfficiency ?? Number.NEGATIVE_INFINITY;
      const bVal = b.collectionEfficiency ?? Number.NEGATIVE_INFINITY;
      return bVal - aVal;
    });
  }, [filteredBranches]);

  const topPerformer = sortedBranches[0];
  const laggingBranch = sortedBranches[sortedBranches.length - 1];

  const avgCollectionEfficiency = networkAveragePercent(networkAverages, "collection_efficiency");
  const avgAvgDays = networkAverages["avg_days_to_resolve"] ?? null;
  const avgPtpKept = networkAveragePercent(networkAverages, "ptp_kept_rate");
  const avgContactRate = networkAveragePercent(networkAverages, "contact_rate");
  const avgDpd30Plus = networkAveragePercent(networkAverages, "dpd_30_plus_concentration");

  const handleBranchSelect = (branchItem: DisplayBranch) => {
    selectBranch(branchItem.raw);
  };

  if (isLoading) {
    return (
      <AppShell
        title="Branch Network Overview"
        section="Branch Level"
        subtitle="State Network Analytics"
      >
        <div className="w-full space-y-5">
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <GlassCard key={i} className="p-4 h-28">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="mt-4 h-8 w-16" />
              </GlassCard>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <GlassCard className="p-5 h-56">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="mt-4 h-8 w-48" />
            </GlassCard>
            <GlassCard className="p-5 h-56">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="mt-4 h-8 w-48" />
            </GlassCard>
          </div>
          <GlassCard className="p-5 h-64">
            <Skeleton className="h-4 w-48" />
          </GlassCard>
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell
        title="Branch Network Overview"
        section="Branch Level"
        subtitle="State Network Analytics"
      >
        <GlassCard className="p-6 text-center">
          <AlertTriangle className="mx-auto size-8 text-destructive" />
          <h3 className="mt-3 font-bold text-display">Unable to load network data</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "Please try again later."}
          </p>
          <Button className="mt-4" onClick={() => navigate({ to: "/" })}>
            Retry
          </Button>
        </GlassCard>
      </AppShell>
    );
  }

  if (displayBranches.length === 0) {
    return (
      <AppShell
        title="Branch Network Overview"
        section="Branch Level"
        subtitle="State Network Analytics"
      >
        <GlassCard className="p-6 text-center">
          <Building2 className="mx-auto size-8 text-muted-foreground" />
          <h3 className="mt-3 font-bold text-display">No branch data available</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            No branch snapshots were found for {asOfDate ?? selectedDate}.
          </p>
        </GlassCard>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Branch Network Overview"
      section="Branch Level"
      subtitle="State Network Analytics"
    >
      <div className="w-full space-y-5">
        {isDemo && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-medium text-amber-700 dark:text-amber-400">
            <AlertTriangle className="size-4 shrink-0" />
            Demo Network Snapshot · Synthetic data for {asOfDate ?? selectedDate}.
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
            <p className="mt-2 text-2xl sm:text-3xl font-bold text-display text-primary">
              {formatDisplayValue(avgCollectionEfficiency, "percent")}
            </p>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="font-semibold text-success">Target 80%</span>
              <span>· {displayBranches.length} branches</span>
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
            <p className="mt-2 text-2xl sm:text-3xl font-bold text-display">
              {formatDisplayValue(avgAvgDays, "days")}
            </p>
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
            <p className="mt-2 text-2xl sm:text-3xl font-bold text-display">
              {formatDisplayValue(avgPtpKept, "percent")}
            </p>
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
            <p className="mt-2 text-2xl sm:text-3xl font-bold text-display">
              {formatDisplayValue(avgContactRate, "percent")}
            </p>
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
            <p className="mt-2 text-2xl sm:text-3xl font-bold text-display">
              {formatDisplayValue(avgDpd30Plus, "percent")}
            </p>
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
                    <p className="text-xs text-muted-foreground">{topPerformer.region} Region</p>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-bold text-display text-emerald-600">
                      {formatDisplayValue(topPerformer.collectionEfficiency, "percent")}
                    </span>
                    <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                      {formatMetricDelta(
                        topPerformer.collectionEfficiency != null && avgCollectionEfficiency != null
                          ? topPerformer.collectionEfficiency - avgCollectionEfficiency
                          : null,
                        "percent",
                      )}{" "}
                      vs Avg
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 border-t border-emerald-500/20 pt-3 text-xs">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Avg Resolution</span>
                    <span className="font-bold text-foreground">
                      {formatDisplayValue(topPerformer.avgDaysToResolve, "days")}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">PTP Kept</span>
                    <span className="font-bold text-foreground">
                      {formatDisplayValue(topPerformer.ptpKeptRate, "percent")}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Contact Rate</span>
                    <span className="font-bold text-foreground">
                      {formatDisplayValue(topPerformer.contactRate, "percent")}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">30+ DPD %</span>
                    <span className="font-bold text-emerald-600">
                      {formatDisplayValue(topPerformer.dpd30Plus, "percent")}
                    </span>
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
                    <p className="text-xs text-muted-foreground">{laggingBranch.region} Region</p>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-bold text-display text-destructive">
                      {formatDisplayValue(laggingBranch.collectionEfficiency, "percent")}
                    </span>
                    <p className="text-[10px] font-bold text-destructive uppercase tracking-wider">
                      {formatMetricDelta(
                        laggingBranch.collectionEfficiency != null &&
                          avgCollectionEfficiency != null
                          ? laggingBranch.collectionEfficiency - avgCollectionEfficiency
                          : null,
                        "percent",
                      )}{" "}
                      vs Avg
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 border-t border-destructive/20 pt-3 text-xs">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Avg Resolution</span>
                    <span className="font-bold text-destructive">
                      {formatDisplayValue(laggingBranch.avgDaysToResolve, "days")}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">PTP Kept</span>
                    <span className="font-bold text-destructive">
                      {formatDisplayValue(laggingBranch.ptpKeptRate, "percent")}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Contact Rate</span>
                    <span className="font-bold text-destructive">
                      {formatDisplayValue(laggingBranch.contactRate, "percent")}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">30+ DPD %</span>
                    <span className="font-bold text-destructive">
                      {formatDisplayValue(laggingBranch.dpd30Plus, "percent")}
                    </span>
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
              <h2 className="font-bold text-display text-base">
                Regional Branch Directory & Rankings
              </h2>
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
                  const isPositive =
                    b.collectionEfficiency != null &&
                    avgCollectionEfficiency != null &&
                    b.collectionEfficiency >= avgCollectionEfficiency;
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
                            <span className="ml-2 text-[11px] text-muted-foreground">
                              ({b.region})
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-bold text-sm text-display ${
                              isPositive ? "text-success" : "text-destructive"
                            }`}
                          >
                            {formatDisplayValue(b.collectionEfficiency, "percent")}
                          </span>
                          {b.collectionEfficiency != null && avgCollectionEfficiency != null && (
                            <Status tone={isPositive ? "success" : "danger"}>
                              {formatMetricDelta(
                                b.collectionEfficiency - avgCollectionEfficiency,
                                "percent",
                              )}{" "}
                              pts
                            </Status>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold">
                            {formatDisplayValue(b.avgDaysToResolve, "days")}
                          </span>
                          {b.avgDaysToResolve != null && (
                            <span
                              className={`text-[10px] font-medium ${
                                b.avgDaysToResolve <= 22 ? "text-success" : "text-destructive"
                              }`}
                            >
                              ({b.avgDaysToResolve <= 22 ? "Optimal" : "Lagging"})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2 w-28">
                          <span className="text-xs font-semibold w-8">
                            {formatDisplayValue(b.ptpKeptRate, "percent")}
                          </span>
                          <MetricBar
                            value={b.ptpKeptRate ?? 0}
                            peer={avgPtpKept ?? undefined}
                            tone={
                              b.ptpKeptRate != null &&
                              avgPtpKept != null &&
                              b.ptpKeptRate >= avgPtpKept
                                ? "success"
                                : "danger"
                            }
                          />
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2 w-28">
                          <span className="text-xs font-semibold w-8">
                            {formatDisplayValue(b.contactRate, "percent")}
                          </span>
                          <MetricBar
                            value={b.contactRate ?? 0}
                            peer={avgContactRate ?? undefined}
                            tone={
                              b.contactRate != null &&
                              avgContactRate != null &&
                              b.contactRate >= avgContactRate
                                ? "success"
                                : "danger"
                            }
                          />
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${
                            b.dpd30Plus != null && b.dpd30Plus > 35
                              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold"
                              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {formatDisplayValue(b.dpd30Plus, "percent")}
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
────────────────────────────────────────────────────────────────────────────── */

function SelectedBranchOverview({ branch }: { branch: BranchSummary }) {
  const navigate = useNavigate();
  const { clearBranch } = useBranch();
  const { selectedDate } = useDate();

  const overviewQuery = useQuery({
    queryKey: ["branch-overview", branch.id, selectedDate],
    queryFn: () => api.getBranchOverview(branch.id, selectedDate),
    retry: 1,
  });

  const networkQuery = useQuery({
    queryKey: ["network", selectedDate],
    queryFn: () => api.getNetwork(selectedDate),
    retry: 1,
  });

  const driversQuery = useQuery({
    queryKey: ["branch-drivers", branch.id, selectedDate],
    queryFn: () => api.getBranchDrivers(branch.id, selectedDate),
    retry: 1,
  });

  const overview = overviewQuery.data?.data;
  const metrics = overview?.metrics ?? {};
  const networkAverages = networkQuery.data?.data.networkAverages ?? {};
  const rootCauseDrivers = driversQuery.data?.data.rootCauseDrivers ?? [];

  const collectionEfficiency = toDisplayValue(getMetric(metrics, "collection_efficiency"));
  const avgDaysToResolve = toDisplayValue(getMetric(metrics, "avg_days_to_resolve"));
  const ptpKeptRate = toDisplayValue(getMetric(metrics, "ptp_kept_rate"));
  const contactRate = toDisplayValue(getMetric(metrics, "contact_rate"));
  const dpd30Plus = toDisplayValue(getMetric(metrics, "dpd_30_plus_concentration"));

  const networkCollectionEfficiency = networkAveragePercent(
    networkAverages,
    "collection_efficiency",
  );
  const collectionGap =
    collectionEfficiency != null && networkCollectionEfficiency != null
      ? collectionEfficiency - networkCollectionEfficiency
      : null;
  const isAhead = collectionGap != null && collectionGap >= 0;

  const isLoading = overviewQuery.isLoading || networkQuery.isLoading || driversQuery.isLoading;
  const error = overviewQuery.error || networkQuery.error || driversQuery.error;

  if (isLoading) {
    return (
      <AppShell title={branch.name} section="Branch Level">
        <div className="w-full space-y-5">
          <GlassCard className="p-5 md:p-6 h-48">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="mt-4 h-12 w-32" />
          </GlassCard>
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <GlassCard key={i} className="p-4 h-28">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="mt-4 h-8 w-16" />
              </GlassCard>
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell title={branch.name} section="Branch Level">
        <GlassCard className="p-6 text-center">
          <AlertTriangle className="mx-auto size-8 text-destructive" />
          <h3 className="mt-3 font-bold text-display">Unable to load branch overview</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "Please try again later."}
          </p>
          <Button className="mt-4" onClick={() => navigate({ to: "/" })}>
            Retry
          </Button>
        </GlassCard>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={branch.name}
      section="Branch Level"
      actions={
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => clearBranch()} className="text-xs">
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
                <Status tone="neutral">{branch.region} Region</Status>
              </div>

              <div className="mt-4 flex flex-wrap items-end gap-6 sm:gap-10">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[.14em] text-muted-foreground">
                    Branch Collection Rate
                  </p>
                  <p className="mt-1 text-5xl font-bold text-display text-foreground">
                    {formatDisplayValue(collectionEfficiency, "percent")}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[.14em] text-muted-foreground">
                    Peer Benchmark Avg
                  </p>
                  <p className="mt-1 text-3xl font-bold text-display text-muted-foreground">
                    {formatDisplayValue(networkCollectionEfficiency, "percent")}
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
                    {formatMetricDelta(collectionGap, "percent")} pts
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
                {isAhead
                  ? "Maintain lead & optimize fulfillment"
                  : "Improve early contact & PTP fulfillment"}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {isAhead
                  ? "Strong outreach execution is outperforming regional peers. Prioritize autopay enrollment to lock in gains."
                  : `First contact delay and broken promise backlog are driving the ${formatMetricDelta(
                      collectionGap,
                      "percent",
                    )} pt deficit.`}
              </p>
              <div className="mt-3.5 flex items-center justify-between border-t pt-3">
                <span className="text-[11px] font-semibold text-muted-foreground">
                  Snapshot date: {overviewQuery.data?.meta.asOfDate ?? selectedDate}
                </span>
                <Link to="/root-cause" className="text-xs font-bold text-primary hover:underline">
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
            <p className="mt-2 text-2xl sm:text-3xl font-bold text-display text-primary">
              {formatDisplayValue(collectionEfficiency, "percent")}
            </p>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span
                className={
                  isAhead ? "font-semibold text-success" : "font-semibold text-destructive"
                }
              >
                {formatMetricDelta(collectionGap, "percent")} pts
              </span>
              <span>vs peer ({formatDisplayValue(networkCollectionEfficiency, "percent")})</span>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[.12em] text-muted-foreground">
                Average Days to Resolution
              </p>
              <Clock3 className="size-4 text-amber-500" />
            </div>
            <p className="mt-2 text-2xl sm:text-3xl font-bold text-display">
              {formatDisplayValue(avgDaysToResolve, "days")}
            </p>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              {avgDaysToResolve != null && (
                <span
                  className={
                    avgDaysToResolve <= 22
                      ? "text-success font-semibold"
                      : "text-destructive font-semibold"
                  }
                >
                  {avgDaysToResolve <= 22 ? "Optimal" : "Lagging"}
                </span>
              )}
              <span>
                · Peer {formatDisplayValue(networkAverages["avg_days_to_resolve"] ?? null, "days")}
              </span>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[.12em] text-muted-foreground">
                PTP Kept %
              </p>
              <CheckCircle2 className="size-4 text-emerald-500" />
            </div>
            <p className="mt-2 text-2xl sm:text-3xl font-bold text-display">
              {formatDisplayValue(ptpKeptRate, "percent")}
            </p>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              {ptpKeptRate != null && (
                <span
                  className={
                    ptpKeptRate >=
                    (networkAveragePercent(networkAverages, "ptp_kept_rate") ??
                      Number.NEGATIVE_INFINITY)
                      ? "text-success font-semibold"
                      : "text-destructive font-semibold"
                  }
                >
                  {formatMetricDelta(
                    ptpKeptRate - (networkAveragePercent(networkAverages, "ptp_kept_rate") ?? 0),
                    "percent",
                  )}{" "}
                  pts
                </span>
              )}
              <span>
                vs peer (
                {formatDisplayValue(
                  networkAveragePercent(networkAverages, "ptp_kept_rate"),
                  "percent",
                )}
                )
              </span>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[.12em] text-muted-foreground">
                Contact Rate
              </p>
              <PhoneCall className="size-4 text-primary" />
            </div>
            <p className="mt-2 text-2xl sm:text-3xl font-bold text-display">
              {formatDisplayValue(contactRate, "percent")}
            </p>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              {contactRate != null && (
                <span
                  className={
                    contactRate >=
                    (networkAveragePercent(networkAverages, "contact_rate") ??
                      Number.NEGATIVE_INFINITY)
                      ? "text-success font-semibold"
                      : "text-destructive font-semibold"
                  }
                >
                  {formatMetricDelta(
                    contactRate - (networkAveragePercent(networkAverages, "contact_rate") ?? 0),
                    "percent",
                  )}{" "}
                  pts
                </span>
              )}
              <span>
                vs peer (
                {formatDisplayValue(
                  networkAveragePercent(networkAverages, "contact_rate"),
                  "percent",
                )}
                )
              </span>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[.12em] text-muted-foreground">
                DPD Distribution
              </p>
              <ShieldAlert className="size-4 text-rose-500" />
            </div>
            <p className="mt-2 text-2xl sm:text-3xl font-bold text-display">
              {formatDisplayValue(dpd30Plus, "percent")}
            </p>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              {dpd30Plus != null && (
                <span
                  className={
                    dpd30Plus <= 31
                      ? "text-success font-semibold"
                      : "text-destructive font-semibold"
                  }
                >
                  {dpd30Plus <= 31 ? "Controlled" : "High Risk"}
                </span>
              )}
              <span>
                · Peer{" "}
                {formatDisplayValue(
                  networkAveragePercent(networkAverages, "dpd_30_plus_concentration"),
                  "percent",
                )}
              </span>
            </div>
          </GlassCard>
        </div>

        {/* 4. "WHAT IS DIFFERENT?" SIGNAL MATRIX */}
        <GlassCard className="p-5">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center border-b pb-4">
            <div>
              <h2 className="font-bold text-display text-base">
                "What is Different?" Signal Matrix
              </h2>
            </div>
            <Link
              to="/root-cause"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
            >
              Open Strategic Decision Engine <ArrowRight className="size-3" />
            </Link>
          </div>

          <div className="mt-5 space-y-3.5">
            {CORE_KPI_CONFIG.map((kpi) => {
              const driver = rootCauseDrivers.find((d) => d.metricCode === kpi.code);
              const unit = driver?.unit ?? "percent";
              const branchValue = kpiDisplayValue(driver?.value ?? null, unit);
              const peerValue = kpiDisplayValue(networkAverages[kpi.code] ?? null, unit);
              const delta =
                branchValue != null && peerValue != null ? branchValue - peerValue : null;
              const tone = kpiDeltaTone(kpi.code, delta ?? 0);

              return (
                <Link
                  key={kpi.code}
                  to="/root-cause"
                  search={{ driver: kpi.code }}
                  className="grid items-center gap-3 rounded-xl border border-transparent p-3 transition hover:border-border/80 hover:bg-card/70 sm:grid-cols-[200px_1fr_100px]"
                >
                  <div>
                    <span className="font-semibold text-foreground text-sm">{kpi.label}</span>
                    <span className="block text-[11px] text-muted-foreground">
                      Branch {formatDisplayValue(branchValue, unit)} · Peer{" "}
                      {formatDisplayValue(peerValue, unit)}
                    </span>
                  </div>
                  <div>
                    <MetricBar value={branchValue ?? 0} peer={peerValue ?? undefined} tone={tone} />
                  </div>
                  <div className="text-right">
                    <Status tone={tone}>{formatMetricDelta(delta, unit)}</Status>
                  </div>
                </Link>
              );
            })}
          </div>
        </GlassCard>
      </div>
    </AppShell>
  );
}
