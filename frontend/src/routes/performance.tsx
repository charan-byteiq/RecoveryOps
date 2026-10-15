import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronRight, ChartNoAxesCombined, ArrowRight } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { AppShell } from "@/components/app-shell";
import { GlassCard, Status } from "@/components/ui";
import { useBranch } from "@/hooks/branch-context";
import { useDate } from "@/hooks/date-context";
import { useScrollInView } from "@/hooks/use-scroll-in-view";
import { api, type BranchSummary, type MetricValue, formatMetricValue } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/performance")({
  head: () => ({
    meta: [
      { title: "Branch Performance Analytics — RecoveryOps" },
      { property: "og:title", content: "Branch Performance Analytics — RecoveryOps" },
      {
        property: "og:description",
        content: "Explore 5 core KPI metrics, DPD portfolio mix, and key drivers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PerformanceRoute,
});

function PerformanceRoute() {
  const { selectedBranch, hasBranch, selectBranch } = useBranch();
  const { selectedDate } = useDate();

  const branchesQuery = useQuery({
    queryKey: ["branches", selectedDate],
    queryFn: () => api.getBranches(selectedDate),
    enabled: !hasBranch,
  });

  // Branch Switching Guard: Fallback branch selector view if no branch has been activated
  if (!hasBranch || !selectedBranch) {
    const list = branchesQuery.data?.data ?? [];

    return (
      <AppShell
        title="Performance Analytics"
        section="Branch Level"
        subtitle="Trend & Portfolio Quality"
      >
        <div className="mx-auto max-w-[680px] py-16 text-center">
          <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary/10 text-primary shadow-sm">
            <ChartNoAxesCombined className="size-8" />
          </div>
          <h2 className="mt-5 text-2xl font-bold text-display">
            Select a Branch to Activate Analytics
          </h2>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Performance trend analysis, 5-stage DPD distribution, and diagnostic driver breakdowns
            require an active branch context. Select a regional branch below to open its performance
            workspace.
          </p>
          <div className="mt-8 grid gap-2.5 sm:grid-cols-2">
            {branchesQuery.isLoading && (
              <p className="text-sm text-muted-foreground col-span-2">Loading regional branches…</p>
            )}
            {branchesQuery.isError && (
              <p className="text-sm text-destructive col-span-2">
                Failed to load branches.{" "}
                {branchesQuery.error instanceof Error
                  ? branchesQuery.error.message
                  : "Unknown error"}
              </p>
            )}
            {list.map((b) => (
              <button
                key={b.sourceBranchCode || b.id}
                className="group flex items-center justify-between rounded-xl border border-border/70 bg-card/60 p-4 text-left transition hover:border-primary/40 hover:bg-card hover:shadow-xs"
                onClick={() => selectBranch(b)}
              >
                <div>
                  <p className="text-sm font-semibold text-foreground group-hover:text-primary transition">
                    {b.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{b.region} Region</p>
                </div>
                <ChevronRight className="size-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition" />
              </button>
            ))}
            {!branchesQuery.isLoading && list.length === 0 && (
              <p className="text-sm text-muted-foreground col-span-2">
                No branches available for the selected date.
              </p>
            )}
          </div>
        </div>
      </AppShell>
    );
  }

  return <BranchPerformanceContent branch={selectedBranch} />;
}

const KPI_CONFIG = [
  {
    id: "collection_efficiency",
    code: "collection_efficiency",
    title: "Collection Efficiency %",
    subTitle: "Recovery vs. Portfolio Target",
    unit: "%",
    maxScale: 100,
    yTicks: ["100%", "50%", "0%"],
  },
  {
    id: "avg_resolution_days",
    code: "avg_days_to_resolve",
    title: "Average Days to Resolution",
    subTitle: "Delinquency to Cure Velocity",
    unit: "d",
    maxScale: 35,
    yTicks: ["35d", "18d", "0d"],
  },
  {
    id: "ptp_kept_pct",
    code: "ptp_kept_rate",
    title: "PTP Kept %",
    subTitle: "Promise Fulfillment Rate",
    unit: "%",
    maxScale: 100,
    yTicks: ["100%", "50%", "0%"],
  },
  {
    id: "contact_rate",
    code: "contact_rate",
    title: "Contact Rate",
    subTitle: "Frontline Outreach Reach",
    unit: "%",
    maxScale: 100,
    yTicks: ["100%", "50%", "0%"],
  },
  {
    id: "dpd_distribution",
    code: "dpd_30_plus_concentration",
    title: "DPD Distribution",
    subTitle: "30+ DPD Portfolio Concentration",
    unit: "%",
    maxScale: 35,
    yTicks: ["35%", "18%", "0%"],
  },
];

const DPD_BUCKET_ORDER = ["current", "1-30", "31-60", "61-90", "90+"];

const DPD_BUCKET_LABELS: Record<string, string> = {
  current: "Current",
  "1-30": "1–30",
  "31-60": "31–60",
  "61-90": "61–90",
  "90+": "90+",
};

const DPD_BUCKET_COLORS: Record<string, string> = {
  current: "#10b981",
  "1-30": "#3b82f6",
  "31-60": "#f59e0b",
  "61-90": "#ef4444",
  "90+": "#991b1b",
};

function metricToChartValue(m: MetricValue | undefined): number | null {
  if (!m || m.value == null || m.availability !== "available") return null;
  return rawToChartValue(m.value, m.unit);
}

function rawToChartValue(value: number | null | undefined, unit: string): number | null {
  if (value == null) return null;
  switch (unit) {
    case "percent":
      return value * 100;
    case "currency":
      return value / 1000;
    case "count":
    case "days":
    default:
      return value;
  }
}

function metricDisplayValue(m: MetricValue | undefined): string {
  if (!m || m.availability !== "available" || m.value == null) return "—";
  return formatMetricValue(m);
}

function rawDisplayValue(value: number | null | undefined, unit: string): string {
  if (value == null) return "—";
  return formatMetricValue({
    metricCode: "",
    name: "",
    value,
    unit,
    availability: "available",
    source: "",
    definitionVersion: 1,
  });
}

function is30PlusBucket(bucket: string): boolean {
  return bucket === "31-60" || bucket === "61-90" || bucket === "90+";
}

function isLowerBetterKpi(code: string): boolean {
  return code === "avg_days_to_resolve" || code === "dpd_30_plus_concentration";
}

function comparisonTone(
  code: string,
  previous: number | null,
  current: number | null,
): "success" | "danger" | "neutral" {
  if (previous == null || current == null || current === previous) return "neutral";
  const improved = isLowerBetterKpi(code) ? current < previous : current > previous;
  return improved ? "success" : "danger";
}

function BranchPerformanceContent({ branch }: { branch: BranchSummary }) {
  const { selectedDate } = useDate();

  const perfQuery = useQuery({
    queryKey: ["branch-performance", branch.id, selectedDate],
    queryFn: () => api.getBranchPerformance(branch.id, selectedDate),
    staleTime: 60_000,
    retry: 1,
  });

  const networkQuery = useQuery({
    queryKey: ["network", selectedDate],
    queryFn: () => api.getNetwork(selectedDate),
    staleTime: 60_000,
    retry: 1,
  });

  const data = perfQuery.data?.data;
  const outcomes = data?.outcomes ?? {};
  const networkAverages = networkQuery.data?.data.networkAverages ?? {};

  // 1. DPD Bucket Portfolio Distribution (canonical order)
  const hasDpdData = (data?.dpdDistribution ?? []).length > 0;

  const dpdEntries = useMemo(() => {
    const distribution = data?.dpdDistribution ?? [];
    const byBucket = new Map(distribution.map((b) => [b.bucket, b]));
    return DPD_BUCKET_ORDER.map((bucket) => ({
      bucket,
      label: DPD_BUCKET_LABELS[bucket] ?? bucket,
      accountCount: byBucket.get(bucket)?.accountCount ?? 0,
      balance: byBucket.get(bucket)?.balance ?? null,
      portfolioShare: byBucket.get(bucket)?.portfolioShare ?? null,
    }));
  }, [data?.dpdDistribution]);

  const pieData = useMemo(() => {
    return dpdEntries.map((entry) => ({
      name: entry.label,
      bucket: entry.bucket,
      value: entry.portfolioShare != null ? Math.round(entry.portfolioShare * 100) : 0,
      color: DPD_BUCKET_COLORS[entry.bucket] ?? "#6b7280",
      accountCount: entry.accountCount,
      balance: entry.balance,
    }));
  }, [dpdEntries]);

  // 30+ DPD concentration derived from canonical bucket definition only
  const current30Plus = useMemo(() => {
    return dpdEntries
      .filter((d) => is30PlusBucket(d.bucket))
      .reduce((sum, d) => sum + (d.portfolioShare ?? 0) * 100, 0);
  }, [dpdEntries]);

  // 2. Monthly KPI comparison (previous month vs selected reporting month)
  const comparisonPeriods = data?.comparisonPeriods ?? [];
  const kpiComparisonData = useMemo(() => {
    const monthlyKpis = data?.monthlyKpis ?? {};
    const [period0, period1] = comparisonPeriods;
    return KPI_CONFIG.map((kpi) => {
      const records = monthlyKpis[kpi.code] ?? [];
      const findValue = (end: string | undefined) => {
        if (!end) return null;
        const m = records.find((r) => r.period?.end === end);
        return metricToChartValue(m);
      };
      const prev2Value = period0 ? findValue(period0.end) : null;
      const prevValue = period1 ? findValue(period1.end) : null;
      const trendTone = comparisonTone(kpi.code, prev2Value, prevValue);
      const recentValue =
        prevValue == null ? "No data" : `${Math.round(prevValue * 10) / 10}${kpi.unit}`;
      const trendLabel =
        trendTone === "success" ? "improving" : trendTone === "danger" ? "declining" : "flat";
      return {
        ...kpi,
        prev2Label: period0?.label ?? "—",
        prevLabel: period1?.label ?? "—",
        prev2Value,
        prevValue,
        trendTone,
        recentValue,
        trendLabel,
        unavailable: period0 == null || period1 == null || prev2Value == null || prevValue == null,
      };
    });
  }, [comparisonPeriods, data?.monthlyKpis]);

  // Executive summary values
  const collectionEfficiency = metricToChartValue(outcomes.collection_efficiency);
  const peerCollectionRate = rawToChartValue(networkAverages.collection_efficiency, "percent");
  const collectionGap =
    collectionEfficiency != null && peerCollectionRate != null
      ? collectionEfficiency - peerCollectionRate
      : null;
  const isAhead = collectionGap != null ? collectionGap >= 0 : null;

  const avgDaysToResolve = metricToChartValue(outcomes.avg_days_to_resolve);
  const peerAvgDaysToResolve = rawToChartValue(networkAverages.avg_days_to_resolve, "days");

  const ptpKept = metricToChartValue(outcomes.ptp_kept_rate);
  const peerPtpKept = rawToChartValue(networkAverages.ptp_kept_rate, "percent");

  const contactRate = metricToChartValue(outcomes.contact_rate);
  const peerContactRate = rawToChartValue(networkAverages.contact_rate, "percent");

  const dpd30PlusConcentration = metricToChartValue(outcomes.dpd_30_plus_concentration);
  const peerDpd30Plus = rawToChartValue(networkAverages.dpd_30_plus_concentration, "percent");

  // Scroll In View Observers for animations
  const kpiBarsObserver = useScrollInView<HTMLDivElement>({ threshold: 0.15 });
  const dpdDonut = useScrollInView<HTMLDivElement>({ threshold: 0.15 });

  const [activeBucketIndex, setActiveBucketIndex] = useState(1);

  const currentPieItem = pieData[activeBucketIndex] ?? pieData[1] ?? pieData[0]!;
  const activeAccountCount = currentPieItem.accountCount ?? 0;

  const isLoading = perfQuery.isLoading || networkQuery.isLoading;
  const isError = perfQuery.isError || networkQuery.isError;

  return (
    <AppShell
      title={`${branch.name} · Performance`}
      section="Branch Level"
      actions={
        <div className="flex items-center gap-2">
          <Link
            to="/root-cause"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 transition"
          >
            Root Cause Diagnosis →
          </Link>
        </div>
      }
    >
      <div className="w-full space-y-5">
        {isLoading && (
          <GlassCard className="p-5 md:p-6">
            <p className="text-sm text-muted-foreground">Loading performance data…</p>
          </GlassCard>
        )}

        {isError && (
          <GlassCard className="p-5 md:p-6 border-destructive/50">
            <p className="text-sm text-destructive">
              Failed to load performance data.{" "}
              {perfQuery.error instanceof Error ? perfQuery.error.message : ""}
              {networkQuery.error instanceof Error ? networkQuery.error.message : ""}
            </p>
          </GlassCard>
        )}

        {/* 1. TOP EXECUTIVE CARD: COLLECTION EFFICIENCY SUMMARY */}
        <GlassCard className="p-5 md:p-6 overflow-hidden">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Status tone={isAhead == null ? "neutral" : isAhead ? "success" : "danger"}>
                {isAhead == null
                  ? "No Comparison Data"
                  : isAhead
                    ? "Above Network Efficiency"
                    : "Lagging Network Average"}
              </Status>
              <Status tone="neutral">{branch.region} Region</Status>
            </div>

            <div className="flex flex-wrap items-end gap-6 sm:gap-12">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[.14em] text-muted-foreground">
                  Collection Efficiency
                </p>
                <p className="mt-1 text-5xl font-bold text-display text-foreground">
                  {metricDisplayValue(outcomes.collection_efficiency)}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[.14em] text-muted-foreground">
                  Peer Benchmark Avg
                </p>
                <p className="mt-1 text-3xl font-bold text-display text-muted-foreground">
                  {rawDisplayValue(networkAverages.collection_efficiency, "percent")}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[.14em] text-muted-foreground">
                  Variance Delta
                </p>
                <p
                  className={`mt-1 text-3xl font-bold text-display ${
                    isAhead == null
                      ? "text-muted-foreground"
                      : isAhead
                        ? "text-success"
                        : "text-destructive"
                  }`}
                >
                  {collectionGap == null
                    ? "—"
                    : `${isAhead ? "+" : ""}${Math.round(collectionGap * 10) / 10} pts`}
                </p>
              </div>
            </div>

            {/* Operational summary — data-backed, no hardcoded AI narrative */}
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 shadow-2xs">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-[.14em] text-primary">
                  Operational Summary
                </p>
              </div>
              <p className="mt-2 text-xs sm:text-sm leading-relaxed text-muted-foreground max-w-4xl">
                {collectionEfficiency != null && peerCollectionRate != null
                  ? `${branch.name} collection efficiency is ${metricDisplayValue(
                      outcomes.collection_efficiency,
                    )} versus a network average of ${rawDisplayValue(
                      networkAverages.collection_efficiency,
                      "percent",
                    )}.`
                  : "Collection efficiency data is unavailable for the selected reporting period."}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-primary/10 pt-3">
                <Status tone={collectionGap == null ? "neutral" : isAhead ? "success" : "danger"}>
                  Collection rate:{" "}
                  {collectionGap == null
                    ? "—"
                    : `${isAhead ? "+" : ""}${Math.round(collectionGap * 10) / 10} pts`}
                </Status>
                <Status
                  tone={
                    avgDaysToResolve == null || peerAvgDaysToResolve == null
                      ? "neutral"
                      : avgDaysToResolve <= peerAvgDaysToResolve
                        ? "success"
                        : "danger"
                  }
                >
                  Avg Resolution:{" "}
                  {avgDaysToResolve == null ? "—" : `${Math.round(avgDaysToResolve * 10) / 10}d`}
                </Status>
                <Status
                  tone={
                    ptpKept == null || peerPtpKept == null
                      ? "neutral"
                      : ptpKept >= peerPtpKept
                        ? "success"
                        : "danger"
                  }
                >
                  PTP kept:{" "}
                  {ptpKept == null || peerPtpKept == null
                    ? "—"
                    : `${ptpKept >= peerPtpKept ? "+" : ""}${Math.round((ptpKept - peerPtpKept) * 10) / 10} pts`}
                </Status>
                <Status
                  tone={
                    contactRate == null || peerContactRate == null
                      ? "neutral"
                      : contactRate >= peerContactRate
                        ? "success"
                        : "danger"
                  }
                >
                  Contact rate:{" "}
                  {contactRate == null || peerContactRate == null
                    ? "—"
                    : `${contactRate >= peerContactRate ? "+" : ""}${Math.round((contactRate - peerContactRate) * 10) / 10} pts`}
                </Status>
                <Status
                  tone={
                    dpd30PlusConcentration == null || peerDpd30Plus == null
                      ? "neutral"
                      : dpd30PlusConcentration <= peerDpd30Plus
                        ? "success"
                        : "danger"
                  }
                >
                  30+ DPD concentration:{" "}
                  {dpd30PlusConcentration == null || peerDpd30Plus == null
                    ? "—"
                    : `${dpd30PlusConcentration <= peerDpd30Plus ? "" : "+"}${Math.round((dpd30PlusConcentration - peerDpd30Plus) * 10) / 10} pts`}
                </Status>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* 2. FULL-SECTION: 5 CORE KPIS COMPARATIVE BAR CHARTS (PREV2 vs PREV) */}
        <div ref={kpiBarsObserver.ref}>
          <GlassCard className="p-5 md:p-6">
            {/* Header & Legend */}
            <div className="flex flex-col justify-between gap-3 border-b pb-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="font-bold text-display text-base sm:text-lg">
                  Core KPI Performance Comparison ({comparisonPeriods[0]?.label ?? "Previous"} vs.{" "}
                  {comparisonPeriods[1]?.label ?? "Current"})
                </h2>
                <p className="text-xs text-muted-foreground">
                  Side-by-side progression across the 5 primary operational dimensions for{" "}
                  {branch.name}
                </p>
              </div>

              {/* Comparison Legend */}
              <div className="flex items-center gap-4 text-xs font-semibold">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="size-3 rounded-xs border border-dashed border-slate-400 bg-slate-200" />
                  <span className="font-normal">
                    {comparisonPeriods[0]?.label ?? "Earlier Month"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="size-3 rounded-xs bg-primary shadow-xs" />
                  <span className="text-primary font-bold">
                    {comparisonPeriods[1]?.label ?? "Recent Month"}
                  </span>
                </div>
              </div>
            </div>

            {/* 5 KPI Columns with Dedicated Y-Axes and Dual Bars */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {kpiComparisonData.map((kpi, index) => {
                const earlierHeightPct =
                  kpi.prev2Value == null
                    ? 4
                    : Math.min(100, Math.max(6, (kpi.prev2Value / kpi.maxScale) * 100));
                const recentHeightPct =
                  kpi.prevValue == null
                    ? 4
                    : Math.min(100, Math.max(6, (kpi.prevValue / kpi.maxScale) * 100));

                return (
                  <div
                    key={kpi.id}
                    className="group relative flex flex-col justify-between rounded-2xl border border-border/80 bg-card/60 p-3.5 transition-all duration-200 hover:border-primary/40 hover:bg-card hover:shadow-sm"
                  >
                    {/* KPI Title */}
                    <div className="min-h-[46px] flex flex-col justify-start">
                      <div className="flex items-center justify-between gap-1.5">
                        <h3
                          className="font-bold text-xs text-foreground truncate"
                          title={kpi.title}
                        >
                          {kpi.title}
                        </h3>
                      </div>
                      <p className="mt-1 text-[10px] text-muted-foreground truncate">
                        {kpi.subTitle}
                      </p>
                    </div>

                    {/* Dedicated Chart Container with Y-Axis */}
                    <div className="relative mt-6 mb-2 flex h-52 items-end justify-center border-b border-l border-border/80 pl-6 pr-2 pb-0">
                      {/* Y-Axis Labels */}
                      <div className="absolute left-1 top-0 text-[9px] font-medium text-muted-foreground">
                        {kpi.yTicks[0]}
                      </div>
                      <div className="absolute left-1 bottom-1/2 text-[9px] font-medium text-muted-foreground">
                        {kpi.yTicks[1]}
                      </div>
                      <div className="absolute left-1 bottom-0 text-[9px] font-medium text-muted-foreground">
                        {kpi.yTicks[2]}
                      </div>

                      {/* Dotted Horizontal Guidelines */}
                      <div className="absolute top-0 left-6 right-0 border-b border-dashed border-border/50 pointer-events-none" />
                      <div className="absolute bottom-1/2 left-6 right-0 border-b border-dashed border-border/50 pointer-events-none" />

                      {/* Dual Bars Container */}
                      <div className="relative z-10 flex h-full items-end justify-center gap-2 sm:gap-3">
                        {/* Earlier Month Bar */}
                        <div className="group/bar relative flex flex-col items-center justify-end h-full">
                          <div
                            className="relative w-6 sm:w-7.5 rounded-t border-b-2 border-dashed border-slate-400 bg-slate-200 transition-all duration-700 ease-out"
                            style={{
                              height: kpiBarsObserver.isInView ? `${earlierHeightPct}%` : "0%",
                              transitionDelay: `${index * 50}ms`,
                            }}
                          >
                            <div className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-card border px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground shadow-md opacity-0 transition-opacity duration-150 group-hover/bar:opacity-100 z-30">
                              {kpi.prev2Label}:{" "}
                              {kpi.prev2Value == null
                                ? "No Data"
                                : `${Math.round(kpi.prev2Value * 10) / 10}${kpi.unit}`}
                            </div>
                          </div>
                          <span className="mt-1.5 text-[10px] font-medium text-muted-foreground/60">
                            {kpi.prev2Value == null
                              ? "—"
                              : `${Math.round(kpi.prev2Value * 10) / 10}${kpi.unit}`}
                          </span>
                        </div>

                        {/* Recent Month Bar */}
                        <div className="group/bar relative flex flex-col items-center justify-end h-full">
                          <div
                            className={`relative w-6 sm:w-7.5 rounded-t shadow-[0_0_10px_rgba(37,99,235,0.2)] transition-all duration-700 ease-out hover:brightness-110 ${
                              kpi.trendTone === "success"
                                ? "bg-emerald-500"
                                : kpi.trendTone === "danger"
                                  ? "bg-rose-500"
                                  : "bg-primary"
                            }`}
                            style={{
                              height: kpiBarsObserver.isInView ? `${recentHeightPct}%` : "0%",
                              transitionDelay: `${index * 50 + 40}ms`,
                            }}
                            title={`${kpi.prevLabel}: ${kpi.recentValue} (${kpi.trendLabel})`}
                          >
                            <div className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-primary text-primary-foreground px-1.5 py-0.5 text-[9px] font-bold shadow-md opacity-0 transition-opacity duration-150 group-hover/bar:opacity-100 z-30">
                              {kpi.prevLabel}:{" "}
                              {kpi.prevValue == null
                                ? "No Data"
                                : `${Math.round(kpi.prevValue * 10) / 10}${kpi.unit}`}
                            </div>
                          </div>
                          <span
                            className={`mt-1.5 text-[10px] font-bold ${
                              kpi.trendTone === "success"
                                ? "text-emerald-600"
                                : kpi.trendTone === "danger"
                                  ? "text-rose-600"
                                  : "text-primary"
                            }`}
                          >
                            {kpi.prevValue == null
                              ? "—"
                              : `${Math.round(kpi.prevValue * 10) / 10}${kpi.unit}`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Footing comparison labels */}
                    <div className="mt-2 flex items-center justify-between border-t border-border/50 pt-2 text-[10px]">
                      <span className="text-muted-foreground/70">
                        {kpi.prev2Label}:{" "}
                        {kpi.prev2Value == null
                          ? "—"
                          : `${Math.round(kpi.prev2Value * 10) / 10}${kpi.unit}`}
                      </span>
                      <span className="font-bold text-primary">
                        {kpi.prevLabel}:{" "}
                        {kpi.prevValue == null
                          ? "—"
                          : `${Math.round(kpi.prevValue * 10) / 10}${kpi.unit}`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </div>

        {/* 3. DPD BUCKET DISTRIBUTION & INTERACTIVE PORTFOLIO ROLL ANALYSIS */}
        <div ref={dpdDonut.ref}>
          <GlassCard className="p-5 md:p-6 overflow-hidden">
            {/* Section Header */}
            <div className="flex flex-col justify-between gap-3 border-b pb-4 sm:flex-row sm:items-center">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-display text-base sm:text-lg">
                    DPD Bucket Distribution & Portfolio Roll Analysis
                  </h2>
                  <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary uppercase">
                    Interactive
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Click any delinquency bucket in the chart or directory below to inspect
                  point-to-point risk drivers and operational resolution playbooks.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  Active Accounts:{" "}
                  <strong className="text-foreground">{activeAccountCount.toLocaleString()}</strong>
                </span>
                <span className="text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">
                  30+ DPD:{" "}
                  <strong className={current30Plus > 35 ? "text-destructive" : "text-success"}>
                    {hasDpdData ? `${Math.round(current30Plus * 10) / 10}%` : "—"}
                  </strong>
                </span>
              </div>
            </div>

            {!hasDpdData && (
              <div className="mt-6 rounded-2xl border border-border/80 bg-card/60 p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  DPD distribution data is unavailable for the selected reporting period.
                </p>
              </div>
            )}

            {/* Main Interactive Grid */}
            {hasDpdData && (
              <div className="mt-6 grid items-start gap-6 lg:grid-cols-12">
                {/* Left Column: Interactive Donut Chart + Bucket Selectors (5 cols) */}
                <div className="lg:col-span-5 flex flex-col items-center rounded-2xl border border-border/70 bg-card/50 p-4.5 shadow-2xs">
                  <div className="w-full flex items-center justify-between border-b pb-2.5">
                    <span className="text-xs font-bold text-foreground">
                      Delinquency Segment Mix
                    </span>
                    <span className="text-[10px] text-muted-foreground font-medium">
                      Click slice to diagnose
                    </span>
                  </div>

                  {/* Donut Chart with active slice & central badge */}
                  <div className="relative my-3 h-52 w-full flex items-center justify-center">
                    {pieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart key={dpdDonut.key}>
                          <RechartsTooltip
                            formatter={(value: string | number, name: string | number) => [
                              `${value}% portfolio share`,
                              `${name} DPD`,
                            ]}
                            contentStyle={{
                              backgroundColor: "oklch(1 0 0 / 0.95)",
                              borderColor: "oklch(0.88 0.022 255)",
                              borderRadius: "0.75rem",
                              fontSize: "12px",
                              boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
                              fontWeight: 600,
                            }}
                          />
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={80}
                            paddingAngle={3}
                            dataKey="value"
                            activeIndex={activeBucketIndex}
                            onClick={(_, index) => setActiveBucketIndex(index)}
                            cursor="pointer"
                            animationDuration={900}
                            animationEasing="ease-out"
                          >
                            {pieData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={entry.color}
                                stroke={index === activeBucketIndex ? "#ffffff" : "transparent"}
                                strokeWidth={index === activeBucketIndex ? 3 : 0}
                                className="cursor-pointer transition-all duration-200"
                              />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-sm text-muted-foreground">No DPD data available.</p>
                    )}

                    {/* Central Active Slice Details */}
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-2xl font-bold text-display text-foreground">
                        {currentPieItem.value}%
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {currentPieItem.name} DPD
                      </span>
                    </div>
                  </div>

                  {/* Interactive Bucket Cards / Selectors */}
                  <div className="w-full space-y-1.5 border-t pt-3">
                    {pieData.map((d, idx) => {
                      const isSelected = idx === activeBucketIndex;
                      const count = d.accountCount ?? 0;

                      return (
                        <button
                          key={d.name}
                          onClick={() => setActiveBucketIndex(idx)}
                          className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs transition-all duration-150 ${
                            isSelected
                              ? "bg-primary/10 border border-primary/30 shadow-xs ring-1 ring-primary/20"
                              : "bg-card/60 border border-border/70 hover:bg-card hover:border-border"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <span
                              className="size-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: d.color }}
                            />
                            <span
                              className={`font-semibold truncate ${isSelected ? "text-primary" : "text-foreground"}`}
                            >
                              {d.name} DPD
                            </span>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-[11px] text-muted-foreground">
                              {count.toLocaleString()} accts
                            </span>
                            <span
                              className={`font-bold ${isSelected ? "text-primary" : "text-foreground"}`}
                            >
                              {d.value}%
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Right Column: Selected Bucket Deep Dive */}
                <div className="lg:col-span-7 flex flex-col gap-5 rounded-2xl border border-border/80 bg-card/60 p-5 shadow-xs">
                  {/* Bucket Header */}
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className="size-3 rounded-full shrink-0"
                            style={{ backgroundColor: currentPieItem.color }}
                          />
                          <h3 className="text-lg font-bold text-display text-foreground">
                            {currentPieItem.name} DPD
                          </h3>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Portfolio share and account breakdown for the selected delinquency bucket.
                        </p>
                      </div>
                    </div>

                    {/* Summary Metric Stats for this Bucket */}
                    <div className="mt-3.5 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div className="rounded-xl border border-border/60 bg-muted/20 p-2.5">
                        <span className="text-[10px] text-muted-foreground block font-medium">
                          Branch Share
                        </span>
                        <span className="text-base font-bold text-display text-foreground">
                          {currentPieItem.value}%
                        </span>
                      </div>
                      <div className="rounded-xl border border-border/60 bg-muted/20 p-2.5">
                        <span className="text-[10px] text-muted-foreground block font-medium">
                          Bucket Balance
                        </span>
                        <span className="text-base font-bold text-display text-muted-foreground">
                          {currentPieItem.balance != null
                            ? `$${(currentPieItem.balance / 1000).toFixed(1)}K`
                            : "—"}
                        </span>
                      </div>
                      <div className="rounded-xl border border-border/60 bg-muted/20 p-2.5">
                        <span className="text-[10px] text-muted-foreground block font-medium">
                          Active Accounts
                        </span>
                        <span className="text-base font-bold text-display text-foreground">
                          {(currentPieItem.accountCount ?? 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="rounded-xl border border-border/60 bg-muted/20 p-2.5">
                        <span className="text-[10px] text-muted-foreground block font-medium">
                          30+ DPD Concentration
                        </span>
                        <span className="text-base font-bold text-display text-foreground">
                          {Math.round(current30Plus * 10) / 10}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Analytical explanation */}
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Bucket Analysis
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      The 30+ DPD concentration is derived from the canonical buckets 31–60, 61–90,
                      and 90+ only, based on backend portfolio share data.
                    </p>
                  </div>

                  {/* Prescribed Resolution Playbook Footer */}
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary block">
                        Prescribed Action Protocol
                      </span>
                      <p className="text-xs font-semibold text-foreground mt-0.5">
                        Review root-cause drivers for {currentPieItem.name} DPD accounts and align
                        frontline actions to the current portfolio mix.
                      </p>
                    </div>

                    <Link
                      to="/root-cause"
                      search={{ driver: "dpd_distribution" }}
                      className="inline-flex items-center gap-1.5 shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 transition"
                    >
                      Examine Root Cause <ArrowRight className="size-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </AppShell>
  );
}
