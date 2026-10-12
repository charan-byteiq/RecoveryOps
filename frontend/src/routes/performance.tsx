import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Sparkles,
  ChevronRight,
  ChartNoAxesCombined,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  ShieldAlert,
  Clock3,
  CheckCircle2,
  PhoneCall,
  Zap,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import { AppShell } from "@/components/app-shell";
import { GlassCard, Status, MetricBar } from "@/components/ui";
import { useBranch } from "@/hooks/branch-context";
import { useScrollInView } from "@/hooks/use-scroll-in-view";
import {
  branches as mockBranches,
  networkTotals as mockNetworkTotals,
  getBranchPerformanceTrend,
  getBranchDPD,
} from "@/data/mock-data";
import { api, type BranchSummary } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/performance")({
  head: () => ({
    meta: [
      { title: "Branch Performance Analytics — RecoveryOps" },
      { property: "og:title", content: "Branch Performance Analytics — RecoveryOps" },
      { property: "og:description", content: "Explore 5 core KPI metrics, DPD portfolio mix, and key drivers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PerformanceRoute,
});

function PerformanceRoute() {
  const { selectedBranch, hasBranch, selectBranch } = useBranch();

  const branchesQuery = useQuery({
    queryKey: ["branches"],
    queryFn: () => api.getBranches(),
    enabled: !hasBranch,
  });

  // Branch Switching Guard: Fallback branch selector view if no branch has been activated
  if (!hasBranch || !selectedBranch) {
    const list = branchesQuery.data?.data && branchesQuery.data.data.length > 0
      ? branchesQuery.data.data
      : mockBranches.map((mb) => ({
          id: Number(mb.id.replace(/\D/g, "")) || 1,
          sourceBranchCode: mb.id,
          name: mb.name,
          region: mb.region,
          metrics: {},
        } as BranchSummary));

    return (
      <AppShell title="Performance Analytics" section="Branch Level" subtitle="Trend & Portfolio Quality">
        <div className="mx-auto max-w-[680px] py-16 text-center">
          <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary/10 text-primary shadow-sm">
            <ChartNoAxesCombined className="size-8" />
          </div>
          <h2 className="mt-5 text-2xl font-bold text-display">Select a Branch to Activate Analytics</h2>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Performance trend analysis, 5-stage DPD distribution, and diagnostic driver breakdowns require an active branch context. Select a regional branch below to open its performance workspace.
          </p>
          <div className="mt-8 grid gap-2.5 sm:grid-cols-2">
            {branchesQuery.isLoading && <p className="text-sm text-muted-foreground col-span-2">Loading regional branches…</p>}
            {list.map((b) => (
              <button
                key={b.sourceBranchCode || b.id}
                className="group flex items-center justify-between rounded-xl border border-border/70 bg-card/60 p-4 text-left transition hover:border-primary/40 hover:bg-card hover:shadow-xs"
                onClick={() => selectBranch(b)}
              >
                <div>
                  <p className="text-sm font-semibold text-foreground group-hover:text-primary transition">{b.name}</p>
                  <p className="text-xs text-muted-foreground">{b.region} Region</p>
                </div>
                <ChevronRight className="size-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition" />
              </button>
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  return <BranchPerformanceContent branch={selectedBranch} />;
}

function BranchPerformanceContent({ branch }: { branch: BranchSummary }) {
  // Matched mock data context for branch
  const branchData = useMemo(() => {
    const match = mockBranches.find(
      (mb) =>
        mb.name.toLowerCase() === branch.name.toLowerCase() ||
        (branch.sourceBranchCode && mb.id.toLowerCase() === branch.sourceBranchCode.toLowerCase())
    );
    return match || mockBranches[0]!;
  }, [branch]);

  // Optional backend performance query
  const perfQuery = useQuery({
    queryKey: ["branch-performance", branch.id],
    queryFn: () => api.getBranchPerformance(branch.id),
    staleTime: 60_000,
    retry: 1,
  });

  // 1. Trend Analysis
  const trendData = useMemo(() => {
    return getBranchPerformanceTrend(branchData.id);
  }, [branchData.id]);

  // 2. DPD Bucket Portfolio Distribution (5 segments)
  const dpdEntries = useMemo(() => {
    // If backend data is available, map from backend
    if (perfQuery.data?.data?.dpdDistribution && perfQuery.data.data.dpdDistribution.length > 0) {
      return perfQuery.data.data.dpdDistribution.map((b) => [
        b.bucket,
        Math.round((b.portfolioShare ?? 0) * 100),
      ] as [string, number]);
    }
    return getBranchDPD(branchData.id);
  }, [branchData.id, perfQuery.data]);

  const pieData = useMemo(() => {
    return dpdEntries.map(([name, val]) => ({
      name,
      value: val,
      color:
        name === "Current"
          ? "#10b981"
          : name === "1–30" || name === "1-30"
          ? "#3b82f6"
          : name === "31–60" || name === "30-59"
          ? "#f59e0b"
          : name === "61–90" || name === "60-89"
          ? "#ef4444"
          : "#991b1b",
    }));
  }, [dpdEntries]);

  // Scroll In View Observers for animations
  const kpiBarsObserver = useScrollInView<HTMLDivElement>({ threshold: 0.15 });
  const dpdDonut = useScrollInView<HTMLDivElement>({ threshold: 0.15 });

  const peerCollectionRate = mockNetworkTotals.avgCollectionRate;
  const collectionGap = branchData.collectionRate - peerCollectionRate;
  const isAhead = collectionGap >= 0;

  // 5 CORE KPI METRICS: Month-over-Month Comparison (Last Month Blank - No Prior Data, This Month in Blue)
  const kpiComparisonData = useMemo(() => {
    // 5. DPD distribution (30+ DPD % concentration)
    const lateDpd = dpdEntries
      .filter(([k]) => k.includes("30") || k.includes("60") || k.includes("90") || k.includes("+"))
      .reduce((sum, [, v]) => sum + v, 0);
    const thisMonthDpd = lateDpd > 0 ? lateDpd : Math.round((100 - branchData.cureRate) * 0.45);

    return [
      {
        id: "collection_efficiency",
        title: "Collection Efficiency %",
        subTitle: "Recovery vs. Portfolio Target",
        lastMonth: null,
        thisMonth: branchData.collectionRate,
        unit: "%",
        maxScale: 100,
        yTicks: ["100%", "50%", "0%"],
        badgeText: "Current Month",
      },
      {
        id: "avg_resolution_days",
        title: "Average Days to Resolution",
        subTitle: "Delinquency to Cure Velocity",
        lastMonth: null,
        thisMonth: branchData.avgDaysToResolve,
        unit: "d",
        maxScale: 35,
        yTicks: ["35d", "18d", "0d"],
        badgeText: "Current Month",
      },
      {
        id: "ptp_kept_pct",
        title: "PTP Kept %",
        subTitle: "Promise Fulfillment Rate",
        lastMonth: null,
        thisMonth: branchData.ptpKept,
        unit: "%",
        maxScale: 100,
        yTicks: ["100%", "50%", "0%"],
        badgeText: "Current Month",
      },
      {
        id: "contact_rate",
        title: "Contact Rate",
        subTitle: "Frontline Outreach Reach",
        lastMonth: null,
        thisMonth: branchData.contactRate,
        unit: "%",
        maxScale: 100,
        yTicks: ["100%", "50%", "0%"],
        badgeText: "Current Month",
      },
      {
        id: "dpd_distribution",
        title: "DPD Distribution",
        subTitle: "30+ DPD Portfolio Concentration",
        lastMonth: null,
        thisMonth: thisMonthDpd,
        unit: "%",
        maxScale: 35,
        yTicks: ["35%", "18%", "0%"],
        badgeText: "Current Month",
      },
    ];
  }, [branchData, dpdEntries]);

  const [activeBucketIndex, setActiveBucketIndex] = useState(1);

  const dpdBucketInsights = useMemo(() => [
    {
      key: "Current",
      range: "0 DPD",
      title: "Current (Performing Portfolio)",
      subTitle: "Up-to-date accounts with standard recurring amortizations",
      statusTone: "success" as const,
      badgeText: "Zero Delinquency",
      riskLevel: "Low Risk",
      sla: "T-3 Day Billing Reminders",
      peerShare: 38,
      points: [
        {
          title: "Portfolio Stability",
          desc: "Borrowers consistently service scheduled installments on time with zero delinquency roll pressure.",
        },
        {
          title: "Frontline Outreach",
          desc: "Automated digital payment reminder links dispatched via WhatsApp & SMS 72 hours prior to debit date.",
        },
        {
          title: "Autopay Penetration",
          desc: "74% mandate enrollment shields against inadvertent settlement lapses; accounts with bank ACH alerts are flagged.",
        },
        {
          title: "Early Warning Protocol",
          desc: "Continuous credit bureau monitoring tracks sudden leverage increases across other institutions to prevent initial default.",
        },
      ],
      recommendation: "Maintain proactive digital nudges & incentivize auto-debit renewals.",
    },
    {
      key: "1–30",
      range: "1–30 DPD",
      title: "1–30 DPD (Early Delinquency)",
      subTitle: "First missed payment cycle — soft collections window",
      statusTone: "info" as const,
      badgeText: "Soft Collection Stage",
      riskLevel: "Medium Risk",
      sla: "Day 2 Outreach SLA",
      peerShare: 27,
      points: [
        {
          title: "Delinquency Nature",
          desc: "Primarily driven by temporary cashflow timing mismatches, forgotten cycles, or banking clearing friction.",
        },
        {
          title: "Frontline Outreach Timing",
          desc: "Day 2 prompt outreach achieves a 68% conversion rate within 48 hours compared to only 34% when delayed past Day 5.",
        },
        {
          title: "Self-Cure Potential",
          desc: "High self-cure responsiveness when provided frictionless instant digital UPI/payment gateway settlement links.",
        },
        {
          title: "Roll Prevention Lever",
          desc: "Enforce strict agent SLA: all accounts entering Day 1 delinquency must receive digital touch within 24h and voice call by Day 2.",
        },
      ],
      recommendation: "Enforce Day 2 outreach mandate to lock in early liquidity before roll into chronic 30+ buckets.",
    },
    {
      key: "31–60",
      range: "31–60 DPD",
      title: "31–60 DPD (Escalating Risk)",
      subTitle: "Two consecutive missed installments — active tele-calling queue",
      statusTone: "warn" as const,
      badgeText: "Critical Escalation",
      riskLevel: "Elevated Risk",
      sla: "48–72h PTP Commitment Limit",
      peerShare: 17,
      points: [
        {
          title: "Delinquency Nature",
          desc: "Two unpaid cycles indicating sustained liquidity stress, income disruption, or intentional payment deferral.",
        },
        {
          title: "Roll Velocity Threshold",
          desc: "Critical boundary stage: failure to resolve here increases probability of 90+ hard default by 2.8x.",
        },
        {
          title: "Commitment Horizon Discipline",
          desc: "Frontline agents must restrict PTP commitments to maximum 72h; extended >7 day promises suffer a 44% breakage rate.",
        },
        {
          title: "Resolution Playbook",
          desc: "Introduce structured 2-part settlement concessions and collect micro-tokens ($500–$1,000) during call to confirm intent.",
        },
      ],
      recommendation: "Restrict PTP horizons to 72 hours and route to senior recovery specialists.",
    },
    {
      key: "61–90",
      range: "61–90 DPD",
      title: "61–90 DPD (Pre-NPA Critical)",
      subTitle: "Three missed installments — pre-default warning threshold",
      statusTone: "danger" as const,
      badgeText: "Pre-NPA Cutoff",
      riskLevel: "High Risk",
      sla: "5-Day Field Visit Escalation",
      peerShare: 11,
      points: [
        {
          title: "Delinquency Nature",
          desc: "Severe financial distress, non-responsive borrower contact numbers, or disputed obligation liabilities.",
        },
        {
          title: "Frontline Channel Transition",
          desc: "Shift from telephony-only dial attempts to intensive skip-tracing combined with localized field agent in-person visits.",
        },
        {
          title: "Portfolio Impact",
          desc: "Approaching statutory non-performing asset classification; immediately degrades branch recovery efficiency.",
        },
        {
          title: "Resolution Playbook",
          desc: "Offer loan tenor restructuring or penal interest waivers contingent upon an upfront 30% principal payment.",
        },
      ],
      recommendation: "Deploy field agents and activate restructuring proposals before 90-day NPA threshold.",
    },
    {
      key: "90+",
      range: "90+ DPD",
      title: "90+ DPD (Chronic Default / Impaired)",
      subTitle: "Regulatory default stage requiring specialist recovery & legal levers",
      statusTone: "danger" as const,
      badgeText: "NPA / Legal Action",
      riskLevel: "Critical Risk",
      sla: "Immediate Legal Demand Notice",
      peerShare: 7,
      points: [
        {
          title: "Delinquency Nature",
          desc: "Hardened delinquency, prolonged borrower unresponsiveness, customer insolvency, or willful default.",
        },
        {
          title: "Provisioning & Capital Burden",
          desc: "Mandates 100% loss-provisioning reserves; accounts transfer out of branch calling teams to centralized recovery specialists.",
        },
        {
          title: "Enforcement Levers",
          desc: "Issue statutory legal demand notices and initiate legal recovery filings or collateral repossession workflows.",
        },
        {
          title: "Settlement Strategy",
          desc: "Execute structured One-Time Settlement (OTS) negotiations with haircut caps and mandatory immediate upfront clearance.",
        },
      ],
      recommendation: "Initiate formal statutory legal notices and evaluate One-Time Settlement (OTS) options.",
    },
  ], []);

  const currentPieItem = pieData[activeBucketIndex] ?? pieData[1]!;
  const currentInsight = dpdBucketInsights[activeBucketIndex] ?? dpdBucketInsights[1]!;
  const activeAccountCount = Math.round((branchData.accounts * currentPieItem.value) / 100);
  const current30Plus = pieData
    .filter((d) => d.name !== "Current" && !d.name.includes("1–30") && !d.name.includes("1-30"))
    .reduce((s, d) => s + d.value, 0);

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
        {/* 1. TOP EXECUTIVE CARD: OPERATIONAL TRAJECTORY (FULL WIDTH ACROSS FROM LEFT TO RIGHT) */}
        <GlassCard className="p-5 md:p-6 overflow-hidden">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Status tone={isAhead ? "success" : "danger"}>
                {isAhead ? "Above Network Efficiency" : "Lagging Network Average"}
              </Status>
              <Status tone="neutral">{branchData.region} Region</Status>
            </div>

            <div className="flex flex-wrap items-end gap-6 sm:gap-12">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[.14em] text-muted-foreground">
                  Collection Efficiency
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
                  Variance Delta
                </p>
                <p
                  className={`mt-1 text-3xl font-bold text-display ${
                    isAhead ? "text-success" : "text-destructive"
                  }`}
                >
                  {isAhead ? `+${collectionGap}` : `${collectionGap}`} pts
                </p>
              </div>
            </div>

            {/* Operational Trajectory Box - Full Width */}
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 shadow-2xs">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-[.14em] text-primary">
                  Operational Trajectory
                </p>
              </div>
              <h3 className="mt-1 text-lg sm:text-xl font-bold text-display text-foreground">
                {isAhead ? "Sustained High Cure Trajectory" : "PTP Degradation & Roll Risk"}
              </h3>
              <p className="mt-2 text-xs sm:text-sm leading-relaxed text-muted-foreground max-w-4xl">
                {isAhead
                  ? `${branchData.name} maintains an eight-point lead over regional peers, driven by prompt Day 2 initial outreach and strict 72h promise tracking.`
                  : `Delinquency roll into 31–60 DPD is elevated due to delayed first contact. Early intervention can recover an estimated 8–12% contact lift.`}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-primary/10 pt-3">
                <Status tone="success">
                  Collection rate: {isAhead ? `+${collectionGap}` : `${collectionGap}`} pts
                </Status>
                <Status tone={branchData.avgDaysToResolve <= 22 ? "success" : "danger"}>
                  Avg Resolution: {branchData.avgDaysToResolve}d ({branchData.avgDaysToResolve <= 22 ? "-1d ahead" : `+${branchData.avgDaysToResolve - 22}d lag`})
                </Status>
                <Status tone={branchData.ptpKept >= mockNetworkTotals.avgPtpKept ? "success" : "danger"}>
                  PTP kept: {branchData.ptpKept >= mockNetworkTotals.avgPtpKept ? `+${branchData.ptpKept - mockNetworkTotals.avgPtpKept}` : `${branchData.ptpKept - mockNetworkTotals.avgPtpKept}`} pts
                </Status>
                <Status tone={branchData.contactRate >= mockNetworkTotals.avgContactRate ? "success" : "danger"}>
                  Contact rate: {branchData.contactRate >= mockNetworkTotals.avgContactRate ? `+${branchData.contactRate - mockNetworkTotals.avgContactRate}` : `${branchData.contactRate - mockNetworkTotals.avgContactRate}`} pts
                </Status>
                <Status tone={branchData.id === "TPA" ? "danger" : "success"}>
                  30+ DPD concentration: {branchData.id === "TPA" ? "+7 pts" : "-3 pts"}
                </Status>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* 2. FULL-SECTION: 5 CORE KPIS COMPARATIVE BAR CHARTS (LAST MONTH IN WHITE vs THIS MONTH IN BLUE) */}
        <div ref={kpiBarsObserver.ref}>
          <GlassCard className="p-5 md:p-6">
          {/* Header & Legend */}
          <div className="flex flex-col justify-between gap-3 border-b pb-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-bold text-display text-base sm:text-lg">
                Core KPI Performance Comparison (Last Month vs. This Month)
              </h2>
              <p className="text-xs text-muted-foreground">
                Side-by-side progression across the 5 primary operational dimensions for {branch.name}
              </p>
            </div>

            {/* Blue & Blank Legend */}
            <div className="flex items-center gap-4 text-xs font-semibold">
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="size-3 rounded-xs border border-dashed border-border/90 bg-muted/20" />
                <span className="font-normal">Last Month (No Data)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-3 rounded-xs bg-primary shadow-xs" />
                <span className="text-primary font-bold">This Month</span>
              </div>
            </div>
          </div>

          {/* 5 KPI Columns with Dedicated Y-Axes and Dual Bars */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {kpiComparisonData.map((kpi, index) => {
              const thisHeightPct = Math.min(100, Math.max(6, (kpi.thisMonth / kpi.maxScale) * 100));

              return (
                <div
                  key={kpi.id}
                  className="group relative flex flex-col justify-between rounded-2xl border border-border/80 bg-card/60 p-3.5 transition-all duration-200 hover:border-primary/40 hover:bg-card hover:shadow-sm"
                >
                  {/* KPI Title & Delta Badge */}
                  <div className="min-h-[46px] flex flex-col justify-start">
                    <div className="flex items-center justify-between gap-1.5">
                      <h3 className="font-bold text-xs text-foreground truncate" title={kpi.title}>
                        {kpi.title}
                      </h3>
                      <span className="shrink-0 whitespace-nowrap inline-flex items-center rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                        {kpi.badgeText}
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] text-muted-foreground truncate">{kpi.subTitle}</p>
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
                      {/* Last Month Bar (Blank - No Prior Data) */}
                      <div className="group/bar relative flex flex-col items-center justify-end h-full">
                        <div
                          className="relative w-6 sm:w-7.5 rounded-t border-b-2 border-dashed border-border/90 bg-muted/15 transition-all duration-300"
                          style={{ height: "4px" }}
                        >
                          {/* Tooltip */}
                          <div className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-card border px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground shadow-md opacity-0 transition-opacity duration-150 group-hover/bar:opacity-100 z-30">
                            Last Month: No Data
                          </div>
                        </div>
                        <span className="mt-1.5 text-[10px] font-medium text-muted-foreground/60">
                          —
                        </span>
                      </div>

                      {/* This Month Bar (Blue with glowing gradient) */}
                      <div className="group/bar relative flex flex-col items-center justify-end h-full">
                        <div
                          className="relative w-6 sm:w-7.5 rounded-t bg-primary bg-gradient-to-t from-blue-700 via-primary to-blue-400 shadow-[0_0_10px_rgba(37,99,235,0.35)] transition-all duration-700 ease-out hover:brightness-110"
                          style={{
                            height: kpiBarsObserver.isInView ? `${thisHeightPct}%` : "0%",
                            transitionDelay: `${index * 50 + 40}ms`,
                          }}
                        >
                          {/* Tooltip */}
                          <div className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-primary text-primary-foreground px-1.5 py-0.5 text-[9px] font-bold shadow-md opacity-0 transition-opacity duration-150 group-hover/bar:opacity-100 z-30">
                            This: {kpi.thisMonth}{kpi.unit}
                          </div>
                        </div>
                        <span className="mt-1.5 text-[10px] font-bold text-primary">
                          {kpi.thisMonth}{kpi.unit}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Footing comparison labels */}
                  <div className="mt-2 flex items-center justify-between border-t border-border/50 pt-2 text-[10px]">
                    <span className="text-muted-foreground/70">Last Mo: —</span>
                    <span className="font-bold text-primary">This Mo: {kpi.thisMonth}{kpi.unit}</span>
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
                  Click any delinquency bucket in the chart or directory below to inspect point-to-point risk drivers and operational resolution playbooks.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  Active Accounts: <strong className="text-foreground">{branchData.accounts.toLocaleString()}</strong>
                </span>
                <span className="text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">
                  30+ DPD: <strong className={current30Plus > 35 ? "text-destructive" : "text-success"}>{current30Plus}%</strong>
                </span>
              </div>
            </div>

            {/* Main Interactive Grid */}
            <div className="mt-6 grid gap-6 lg:grid-cols-12 items-start">
              {/* Left Column: Interactive Donut Chart + Bucket Selectors (5 cols) */}
              <div className="lg:col-span-5 flex flex-col items-center justify-between rounded-2xl border border-border/70 bg-card/50 p-4.5 shadow-2xs">
                <div className="w-full flex items-center justify-between border-b pb-2.5">
                  <span className="text-xs font-bold text-foreground">Delinquency Segment Mix</span>
                  <span className="text-[10px] text-muted-foreground font-medium">Click slice to diagnose</span>
                </div>

                {/* Donut Chart with active slice & central badge */}
                <div className="relative my-3 h-52 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart key={dpdDonut.key}>
                      <RechartsTooltip
                        formatter={(value: any, name: any) => [`${value}% portfolio share`, `${name} DPD`]}
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
                    const insight = dpdBucketInsights[idx] ?? dpdBucketInsights[0]!;
                    const count = Math.round((branchData.accounts * d.value) / 100);

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
                          <span className={`font-semibold truncate ${isSelected ? "text-primary" : "text-foreground"}`}>
                            {d.name} DPD
                          </span>
                          <span className="text-[10px] text-muted-foreground hidden sm:inline">
                            ({insight.badgeText})
                          </span>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-[11px] text-muted-foreground">
                            {count.toLocaleString()} accts
                          </span>
                          <span className={`font-bold ${isSelected ? "text-primary" : "text-foreground"}`}>
                            {d.value}%
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Selected Bucket Deep Dive (Point-to-Point Insights & Frontline Playbook) (7 cols) */}
              <div className="lg:col-span-7 flex flex-col justify-between rounded-2xl border border-border/80 bg-card/60 p-5 shadow-xs space-y-5">
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
                          {currentInsight.title}
                        </h3>
                        <Status tone={currentInsight.statusTone}>
                          {currentInsight.riskLevel}
                        </Status>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {currentInsight.subTitle}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="rounded-lg border border-border/80 bg-card/80 px-2.5 py-1 text-[11px] font-semibold text-foreground">
                        SLA: <strong className="text-primary">{currentInsight.sla}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Summary Metric Stats for this Bucket */}
                  <div className="mt-3.5 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="rounded-xl border border-border/60 bg-muted/20 p-2.5">
                      <span className="text-[10px] text-muted-foreground block font-medium">Branch Share</span>
                      <span className="text-base font-bold text-display text-foreground">{currentPieItem.value}%</span>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-muted/20 p-2.5">
                      <span className="text-[10px] text-muted-foreground block font-medium">Peer Benchmark</span>
                      <span className="text-base font-bold text-display text-muted-foreground">{currentInsight.peerShare}%</span>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-muted/20 p-2.5">
                      <span className="text-[10px] text-muted-foreground block font-medium">Variance vs Peer</span>
                      <span className={`text-base font-bold text-display ${
                        currentPieItem.value <= currentInsight.peerShare ? "text-success" : "text-destructive"
                      }`}>
                        {currentPieItem.value - currentInsight.peerShare >= 0 ? "+" : ""}
                        {currentPieItem.value - currentInsight.peerShare} pts
                      </span>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-muted/20 p-2.5">
                      <span className="text-[10px] text-muted-foreground block font-medium">Active Accounts</span>
                      <span className="text-base font-bold text-display text-foreground">{activeAccountCount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Point-to-Point One-Liners (Point-by-Point Cards) */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Point-to-Point Key Insights & Frontline Diagnosis
                  </h4>

                  <div className="grid gap-2.5">
                    {currentInsight.points.map((pt, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 rounded-xl border border-border/70 bg-card/70 p-3 hover:border-primary/30 transition"
                      >
                        <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary mt-0.5 font-bold text-xs">
                          {i + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-foreground leading-relaxed">
                            {pt.desc}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Prescribed Resolution Playbook Footer */}
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary block">
                      Prescribed Action Protocol
                    </span>
                    <p className="text-xs font-semibold text-foreground mt-0.5">
                      {currentInsight.recommendation}
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
          </GlassCard>
        </div>
      </div>
    </AppShell>
  );
}
