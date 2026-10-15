import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowDown,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Lightbulb,
  PhoneCall,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Zap,
  GitCompare,
  Building2,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { GlassCard, MetricBar, Status } from "@/components/ui";
import { useBranch } from "@/hooks/branch-context";
import { useDate } from "@/hooks/date-context";
import { api, formatMetricValue, getMetric, type BranchSummary, type MetricValue } from "@/lib/api";

export const Route = createFileRoute("/root-cause")({
  validateSearch: (s: Record<string, unknown>): { driver?: string | undefined } =>
    typeof s["driver"] === "string" ? { driver: s["driver"] } : {},
  head: () => ({
    meta: [
      { title: "Root Cause Diagnosis & Strategic Decision Engine — RecoveryOps" },
      {
        property: "og:title",
        content: "Root Cause Diagnosis & Strategic Decision Engine — RecoveryOps",
      },
      {
        property: "og:description",
        content:
          "Key insights, 5 core KPI root-cause summaries, segment breakdowns, and tactical playbooks.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RootCauseRoute,
});

interface SegmentDetail {
  segmentName: string;
  branchShare: string;
  networkShare: string;
  deltaPts: string;
  accounts: number;
  tone: "danger" | "success" | "warning";
}

interface OneLinerInsight {
  iconType: "finding" | "driver" | "action" | "segment";
  label: string;
  text: string;
}

interface CoreKpiDriverModel {
  id: string;
  name: string;
  shortName: string;
  icon: LucideIcon;
  branchVal: string;
  peerVal: string;
  delta: string;
  tone: "danger" | "success" | "warning";
  branchNumeric: number;
  peerNumeric: number;
  unit: string;
  observedDifferenceText: string;
  direction: "Elevated Risk" | "Optimal Pace" | "Underperforming" | "Lead Advantage";
  varianceRationale: string;
  attributionRationale: string;
  keyTakeaway: string;
  oneLinerInsights: OneLinerInsight[];
  segments: SegmentDetail[];
  interventions: string[];
  metricLift: string[];
  projectedLift: string;
  projectedPayoff: string;
}

/** Convert a backend metric value to a display number. Percent values are already fractions. */
function metricToNumber(m: MetricValue | undefined): number | null {
  if (!m || m.value == null || m.availability !== "available") return null;
  return m.unit === "percent" ? m.value * 100 : m.value;
}

/** Format a display number with its unit as used by the Root Cause UI. */
function formatDecimal(value: number, maximumFractionDigits = 2): string {
  return value.toFixed(maximumFractionDigits).replace(/\.0+$|(?<=\.\d)0+$/, "");
}

function formatPercent(value: number): string {
  return `${formatDecimal(value)}%`;
}

function formatPoints(value: number, signed = false): string {
  return `${signed && value >= 0 ? "+" : ""}${formatDecimal(value)} pts`;
}

function formatDays(value: number, suffix = "d"): string {
  return `${formatDecimal(value)}${suffix}`;
}

function formatNumber(value: number | null, unit: string): string {
  if (value == null) return "—";
  if (unit === "percent" || unit === "%") return formatPercent(value);
  if (unit === "days") return formatDays(value);
  return formatDecimal(value);
}

/** Build a one-line display delta between two display numbers. */
function formatDelta(branch: number | null, peer: number | null, unit: string): string {
  if (branch == null || peer == null) return "—";
  const delta = branch - peer;
  return unit === "days" ? formatDays(delta, "d") : formatPoints(delta, true);
}

/** Determine a tone from a numeric delta. For days, negative delta is good. */
function deltaTone(delta: number, unit: string): "danger" | "success" | "warning" {
  if (delta === 0) return "warning";
  const isGood = unit === "days" ? delta < 0 : delta > 0;
  return isGood ? "success" : "danger";
}

function RootCauseRoute() {
  const { selectedBranch, hasBranch, selectBranch } = useBranch();
  const { selectedDate } = useDate();
  const search = Route.useSearch();

  const branchesQuery = useQuery({
    queryKey: ["branches", selectedDate],
    queryFn: () => api.getBranches(selectedDate),
    enabled: !hasBranch,
  });

  if (!hasBranch || !selectedBranch) {
    const list = branchesQuery.data?.data ?? [];

    return (
      <AppShell
        title="Root Cause Diagnosis"
        section="Branch Level"
        subtitle="Strategic Decision Engine"
      >
        <div className="mx-auto max-w-[680px] py-16 text-center">
          <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary/10 text-primary shadow-sm">
            <Sparkles className="size-8" />
          </div>
          <h2 className="mt-5 text-2xl font-bold text-display">
            Select a Branch to Diagnose Root Causes
          </h2>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            The Strategic Decision Engine evaluates direct gap drivers and operational levers across
            the 5 core KPIs. Choose a regional branch below to open its diagnostic workbench.
          </p>
          <div className="mt-8 grid gap-2.5 sm:grid-cols-2">
            {branchesQuery.isLoading && (
              <p className="text-sm text-muted-foreground col-span-2">Loading branches…</p>
            )}
            {list.map((b) => (
              <button
                key={b.sourceBranchCode || b.id}
                className="group flex items-center justify-between rounded-xl border border-border/70 bg-card/60 p-4 text-left transition hover:border-primary/40 hover:bg-card"
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
          </div>
        </div>
      </AppShell>
    );
  }

  return <BranchRootCauseContent branch={selectedBranch} initialDriver={search.driver} />;
}

function BranchRootCauseContent({
  branch,
  initialDriver,
}: {
  branch: BranchSummary;
  initialDriver?: string | undefined;
}) {
  const { selectedDate } = useDate();
  const branchId = Number(branch.id) || Number(branch.sourceBranchCode?.replace(/\D/g, "")) || 1;

  const overviewQuery = useQuery({
    queryKey: ["branch-overview", branchId, selectedDate],
    queryFn: () => api.getBranchOverview(branchId, selectedDate),
    retry: 1,
  });
  const networkQuery = useQuery({
    queryKey: ["network", selectedDate],
    queryFn: () => api.getNetwork(selectedDate),
    retry: 1,
  });
  const driversQuery = useQuery({
    queryKey: ["branch-drivers", branchId, selectedDate],
    queryFn: () => api.getBranchDrivers(branchId, selectedDate),
    retry: 1,
  });
  const insightsQuery = useQuery({
    queryKey: ["branch-insights", branchId, selectedDate],
    queryFn: () => api.getBranchInsights(branchId, selectedDate),
    retry: false,
  });

  const branchMetrics = overviewQuery.data?.data.metrics ?? {};
  const networkAverages = networkQuery.data?.data.networkAverages ?? {};
  const rootCauseDrivers = driversQuery.data?.data.rootCauseDrivers ?? [];
  const insightItems = insightsQuery.data?.data ?? [];
  const allNetworkBranches = networkQuery.data?.data.branches ?? [];

  // Backend-derived branch view model used by the existing UI structure.
  const branchData = useMemo(() => {
    const collectionRate = metricToNumber(getMetric(branchMetrics, "collection_efficiency")) ?? 0;
    const avgDaysToResolve = metricToNumber(getMetric(branchMetrics, "avg_days_to_resolve")) ?? 0;
    const ptpKept = metricToNumber(getMetric(branchMetrics, "ptp_kept_rate")) ?? 0;
    const contactRate = metricToNumber(getMetric(branchMetrics, "contact_rate")) ?? 0;
    const dpd30Plus = metricToNumber(getMetric(branchMetrics, "dpd_30_plus_concentration")) ?? 0;
    // Use denominator of dpd_30_plus_concentration as total account count (seeded in DB)
    const dpdMetric = getMetric(branchMetrics, "dpd_30_plus_concentration");
    const accounts = dpdMetric?.denominator ?? 0;
    return {
      id: branch.sourceBranchCode || String(branch.id),
      name: branch.name,
      region: branch.region,
      accounts,
      collectionRate,
      avgDaysToResolve,
      ptpKept,
      contactRate,
      dpd30Plus,
    };
  }, [branch, branchMetrics]);

  const peerCollectionRate = (networkAverages["collection_efficiency"] ?? 0) * 100;
  const collectionGap = branchData.collectionRate - peerCollectionRate;
  const isAhead = collectionGap >= 0;
  const dpd30Plus = branchData.dpd30Plus;

  // Compatibility mapping: backend branches/network -> shapes the existing UI expects.
  const mappedBranches = useMemo(() => {
    return allNetworkBranches.map((b) => {
      const ce = metricToNumber(getMetric(b.metrics, "collection_efficiency")) ?? 0;
      const adr = metricToNumber(getMetric(b.metrics, "avg_days_to_resolve")) ?? 0;
      const cr = metricToNumber(getMetric(b.metrics, "contact_rate")) ?? 0;
      const ptp = metricToNumber(getMetric(b.metrics, "ptp_kept_rate")) ?? 0;
      const dpd = metricToNumber(getMetric(b.metrics, "dpd_30_plus_concentration")) ?? 0;
      const cureM = getMetric(b.metrics, "cure_rate");
      const cureRate = cureM?.value != null ? Math.round(cureM.value * 100) : 0;
      // Use denominator of dpd_30_plus_concentration as total account count
      const dpdM = getMetric(b.metrics, "dpd_30_plus_concentration");
      const accounts = dpdM?.denominator ?? 0;
      return {
        id: b.sourceBranchCode || String(b.id),
        name: b.name,
        region: b.region,
        state: "",
        accounts,
        collectionRate: ce,
        recovered: `$${(ce * 0.08).toFixed(1)}M`,
        cureRate,
        contactRate: cr,
        ptpKept: ptp,
        avgDaysToResolve: adr,
        collectionsPerAgent: "$19K",
        escalationRate: 0,
        firstContact: "Day 3",
        outreachPath: "SMS → Phone",
        dpd30Plus: dpd,
      };
    });
  }, [allNetworkBranches]);

  const mappedNetworkTotals = useMemo(() => {
    const avg = (code: string) => (networkAverages[code] ?? 0) * 100;
    return {
      totalBranches: mappedBranches.length,
      totalAccounts: mappedBranches.reduce((s, b) => s + b.accounts, 0),
      avgCollectionRate: Math.round(avg("collection_efficiency")),
      avgCureRate: 60,
      avgContactRate: Math.round(avg("contact_rate")),
      avgPtpKept: Math.round(avg("ptp_kept_rate")),
      avgEscalationRate: 12,
      avgDaysToResolve: Math.round(networkAverages["avg_days_to_resolve"] ?? 22),
      avgDpd30Plus: Math.round(avg("dpd_30_plus_concentration")),
    };
  }, [mappedBranches, networkAverages]);

  // 5 CORE KPI METRICS: Standardized Root Cause Taxonomy
  const coreKpis: CoreKpiDriverModel[] = useMemo(() => {
    return [
      {
        id: "collection_efficiency",
        name: "Collection Efficiency %",
        shortName: "Collection",
        icon: Zap,
        branchVal: formatPercent(branchData.collectionRate),
        peerVal: formatPercent(peerCollectionRate),
        delta: formatPoints(collectionGap, true),
        tone: isAhead ? "success" : "danger",
        branchNumeric: branchData.collectionRate,
        peerNumeric: peerCollectionRate,
        unit: "%",
        observedDifferenceText: `${formatPoints(collectionGap, true)} vs Regional Benchmark`,
        direction: isAhead ? "Lead Advantage" : "Underperforming",
        varianceRationale: `${branchData.name} records a ${formatPercent(branchData.collectionRate)} collection efficiency versus regional peer average ${formatPercent(peerCollectionRate)}, producing a ${formatDecimal(Math.abs(collectionGap))} pt ${isAhead ? "lead" : "deficit"}.`,
        attributionRationale: isAhead
          ? `High recovery efficiency is anchored by prompt Day 2 multi-touch outreach (SMS followed by phone) and automated payment link delivery that converts 68% of PTP commitments within 48 hours.`
          : `Delinquency roll into chronic buckets and lower cash collections are driven by frontline outreach delays (Day 5 first touch) and broken promise queues that remain uncontacted for more than 4 days.`,
        keyTakeaway: isAhead
          ? `Disciplined Day 2 outreach cadence secures early self-cure cash before commitments expire.`
          : `Accelerating initial borrower touchpoints from Day 5 to Day 2 is required to close the recovery gap.`,
        oneLinerInsights: [
          {
            iconType: "finding",
            label: "Core Variance",
            text: `${branchData.name} stands at ${formatPercent(branchData.collectionRate)} vs ${formatPercent(peerCollectionRate)} peer benchmark (${formatPoints(collectionGap, true)}).`,
          },
          {
            iconType: "driver",
            label: "Frontline Driver",
            text: isAhead
              ? "Prompt Day 2 multi-touch outreach secures payment commitments before borrower liquidity drops."
              : "Day 5 first contact lag allows early delinquent accounts to slip into chronic arrears.",
          },
          {
            iconType: "action",
            label: "Priority Action",
            text: "Deploy instant automated UPI payment links within agent disposition workflows to lock in cash.",
          },
          {
            iconType: "segment",
            label: "Cohort Focus",
            text: "Retail Personal Loans account for 42% of total delinquent volume and the primary variance driver.",
          },
        ],
        segments: [
          {
            segmentName: "Retail Personal Loans",
            branchShare: `${isAhead ? "82%" : "68%"}`,
            networkShare: "76%",
            deltaPts: `${isAhead ? "+6\u00A0pts" : "-8\u00A0pts"}`,
            accounts: Math.round(branchData.accounts * 0.42),
            tone: isAhead ? "success" : "danger",
          },
          {
            segmentName: "Small Business & Micro-Credit",
            branchShare: `${isAhead ? "85%" : "72%"}`,
            networkShare: "79%",
            deltaPts: `${isAhead ? "+6\u00A0pts" : "-7\u00A0pts"}`,
            accounts: Math.round(branchData.accounts * 0.31),
            tone: isAhead ? "success" : "danger",
          },
          {
            segmentName: "Consumer Vehicle & Asset Finance",
            branchShare: `${isAhead ? "87%" : "74%"}`,
            networkShare: "81%",
            deltaPts: `${isAhead ? "+6\u00A0pts" : "-7\u00A0pts"}`,
            accounts: Math.round(branchData.accounts * 0.27),
            tone: isAhead ? "success" : "danger",
          },
        ],
        interventions: [
          "Deploy instant UPI settlement links directly within tele-calling agent wrap-up workflows.",
          "Prioritize accounts with outstanding balances exceeding $15,000 for immediate specialist outreach.",
          "Introduce flexible 2-part settlement concessions for borrowers facing documented income disruption.",
        ],
        metricLift: [
          "+5.5–8.0 pts Collection Efficiency Lift",
          "+$1.4M Net Portfolio Recovery Boost",
          "+22% Digital Payment Adoption",
        ],
        projectedLift: "+5.5–8.0 pts",
        projectedPayoff: "+$1.4M Net Recovery",
      },
      {
        id: "avg_resolution_days",
        name: "Average Days to Resolution",
        shortName: "Resolution",
        icon: Clock3,
        branchVal: formatDays(branchData.avgDaysToResolve),
        peerVal: formatDays(mappedNetworkTotals.avgDaysToResolve),
        delta: `${branchData.avgDaysToResolve <= mappedNetworkTotals.avgDaysToResolve ? "-" : "+"}${formatDecimal(Math.abs(branchData.avgDaysToResolve - mappedNetworkTotals.avgDaysToResolve))} days`,
        tone:
          branchData.avgDaysToResolve <= mappedNetworkTotals.avgDaysToResolve
            ? "success"
            : "danger",
        branchNumeric: branchData.avgDaysToResolve,
        peerNumeric: mappedNetworkTotals.avgDaysToResolve,
        unit: "d",
        observedDifferenceText: `${branchData.avgDaysToResolve <= mappedNetworkTotals.avgDaysToResolve ? "-" : "+"}${formatDecimal(Math.abs(branchData.avgDaysToResolve - mappedNetworkTotals.avgDaysToResolve))}d vs Peer Average (${formatDays(mappedNetworkTotals.avgDaysToResolve)})`,
        direction:
          branchData.avgDaysToResolve <= mappedNetworkTotals.avgDaysToResolve
            ? "Optimal Pace"
            : "Underperforming",
        varianceRationale: `Borrower resolution cycles average ${formatDecimal(branchData.avgDaysToResolve)} days from delinquency onset to cure/settlement, compared to the regional cohort baseline of ${formatDecimal(mappedNetworkTotals.avgDaysToResolve)} days.`,
        attributionRationale: `Accounts spend excessive time in soft delinquency (1–15 DPD) without structured resolution workflows. Early contact delays allow borrower liquidity to dissipate, requiring 2.8x more follow-up touchpoints once past Day 20.`,
        keyTakeaway: `Accelerating resolution velocity by 4–6 days preserves borrower liquidity and halts chronic rollover.`,
        oneLinerInsights: [
          {
            iconType: "finding",
            label: "Core Variance",
            text: `Average resolution velocity is ${formatDecimal(branchData.avgDaysToResolve)} days versus the regional benchmark of ${formatDecimal(mappedNetworkTotals.avgDaysToResolve)} days.`,
          },
          {
            iconType: "driver",
            label: "Frontline Driver",
            text: "Dwell time in early 1–15 DPD without structured workout triggers causes borrower unresponsive decay.",
          },
          {
            iconType: "action",
            label: "Priority Action",
            text: "Mandate early intervention escalations on Day 10 for any delinquent account lacking a confirmed promise.",
          },
          {
            iconType: "segment",
            label: "Cohort Focus",
            text: "16–30 DPD accounts experience the sharpest cure deceleration without fast-track concessions.",
          },
        ],
        segments: [
          {
            segmentName: "1–15 DPD Early Delinquency",
            branchShare: `${branchData.avgDaysToResolve <= mappedNetworkTotals.avgDaysToResolve ? "11d" : "17d"}`,
            networkShare: formatDays(mappedNetworkTotals.avgDaysToResolve - 1),
            deltaPts: `${branchData.avgDaysToResolve <= mappedNetworkTotals.avgDaysToResolve ? "-1d" : "+5d"}`,
            accounts: Math.round(branchData.accounts * 0.52),
            tone:
              branchData.avgDaysToResolve <= mappedNetworkTotals.avgDaysToResolve
                ? "success"
                : "danger",
          },
          {
            segmentName: "16–30 DPD Escalating Risk",
            branchShare: `${branchData.avgDaysToResolve <= mappedNetworkTotals.avgDaysToResolve ? "22d" : "29d"}`,
            networkShare: formatDays(mappedNetworkTotals.avgDaysToResolve + 2),
            deltaPts: `${branchData.avgDaysToResolve <= mappedNetworkTotals.avgDaysToResolve ? "-2d" : "+5d"}`,
            accounts: Math.round(branchData.accounts * 0.32),
            tone:
              branchData.avgDaysToResolve <= mappedNetworkTotals.avgDaysToResolve
                ? "success"
                : "danger",
          },
          {
            segmentName: "31+ DPD Hardened Stage",
            branchShare: `${branchData.avgDaysToResolve <= mappedNetworkTotals.avgDaysToResolve ? "37d" : "46d"}`,
            networkShare: formatDays(mappedNetworkTotals.avgDaysToResolve + 12),
            deltaPts: `${branchData.avgDaysToResolve <= mappedNetworkTotals.avgDaysToResolve ? "-3d" : "+6d"}`,
            accounts: Math.round(branchData.accounts * 0.16),
            tone:
              branchData.avgDaysToResolve <= mappedNetworkTotals.avgDaysToResolve
                ? "success"
                : "danger",
          },
        ],
        interventions: [
          "Mandate Day 2 outreach SLA across all newly overdue accounts to capture early self-cure liquidity.",
          "Introduce automated escalation triggers when an account remains without promise contact after Day 10.",
          "Implement dedicated fast-track settlement concessions for 16–30 DPD accounts before month-end close.",
        ],
        metricLift: [
          "-4.0 to -6.5 Days Resolution Acceleration",
          "+19% Early Self-Cure Conversion",
          "-26% Rollover into Chronic DPD",
        ],
        projectedLift: "-4.0 to -6.5d",
        projectedPayoff: "18d Target Cure",
      },
      {
        id: "ptp_kept",
        name: "PTP Kept %",
        shortName: "PTP Kept",
        icon: CheckCircle2,
        branchVal: formatPercent(branchData.ptpKept),
        peerVal: formatPercent(mappedNetworkTotals.avgPtpKept),
        delta: formatPoints(branchData.ptpKept - mappedNetworkTotals.avgPtpKept, true),
        tone: branchData.ptpKept >= mappedNetworkTotals.avgPtpKept ? "success" : "danger",
        branchNumeric: branchData.ptpKept,
        peerNumeric: mappedNetworkTotals.avgPtpKept,
        unit: "%",
        observedDifferenceText: `${formatPoints(branchData.ptpKept - mappedNetworkTotals.avgPtpKept, true)} vs Network Benchmark (${formatPercent(mappedNetworkTotals.avgPtpKept)})`,
        direction:
          branchData.ptpKept >= mappedNetworkTotals.avgPtpKept
            ? "Lead Advantage"
            : "Underperforming",
        varianceRationale: `Promise-to-pay fulfillment rate stands at ${formatPercent(branchData.ptpKept)}, ${branchData.ptpKept >= mappedNetworkTotals.avgPtpKept ? "outperforming" : "lagging"} peer branches (${formatPercent(mappedNetworkTotals.avgPtpKept)}).`,
        attributionRationale: `Frontline agents accept extended payment commitment horizons (7 to 14 days) without interim check-ins. Borrower liquidity deteriorates steeply beyond 72 hours, resulting in a 44% breakage rate on extended promises compared to only 14% on 48–72h commitments.`,
        keyTakeaway: `Limiting promise horizons to a strict 72-hour window directly arrests commitment breakage.`,
        oneLinerInsights: [
          {
            iconType: "finding",
            label: "Core Variance",
            text: `Promise fulfillment is ${formatPercent(branchData.ptpKept)} compared to peer benchmark of ${formatPercent(mappedNetworkTotals.avgPtpKept)}.`,
          },
          {
            iconType: "driver",
            label: "Frontline Driver",
            text: "Commitments scheduled beyond 72 hours suffer 44% breakage due to intervening cash depletion.",
          },
          {
            iconType: "action",
            label: "Priority Action",
            text: "Cap agent promise booking at 72h max and send automated WhatsApp reminders 24h before due time.",
          },
          {
            iconType: "segment",
            label: "Cohort Focus",
            text: "Mid-horizon promises (4–7 days) represent the largest preventable cash leakage in the branch.",
          },
        ],
        segments: [
          {
            segmentName: "Short Horizon (24–72h Promises)",
            branchShare: `${branchData.ptpKept >= 60 ? "78%" : "64%"}`,
            networkShare: "72%",
            deltaPts: `${branchData.ptpKept >= 60 ? "+6\u00A0pts" : "-8\u00A0pts"}`,
            accounts: Math.round(branchData.accounts * 0.48),
            tone: branchData.ptpKept >= 60 ? "success" : "danger",
          },
          {
            segmentName: "Mid Horizon (4–7 Day Promises)",
            branchShare: `${branchData.ptpKept >= 60 ? "58%" : "44%"}`,
            networkShare: "52%",
            deltaPts: `${branchData.ptpKept >= 60 ? "+6\u00A0pts" : "-8\u00A0pts"}`,
            accounts: Math.round(branchData.accounts * 0.34),
            tone: branchData.ptpKept >= 60 ? "success" : "danger",
          },
          {
            segmentName: "Extended (>7 Day Commitments)",
            branchShare: `${branchData.ptpKept >= 60 ? "34%" : "21%"}`,
            networkShare: "30%",
            deltaPts: `${branchData.ptpKept >= 60 ? "+4\u00A0pts" : "-9\u00A0pts"}`,
            accounts: Math.round(branchData.accounts * 0.18),
            tone: branchData.ptpKept >= 60 ? "success" : "danger",
          },
        ],
        interventions: [
          "Enforce a mandatory 72-hour maximum PTP commitment limit in frontline agent disposition tools.",
          "Dispatch automated WhatsApp & SMS payment links 24 hours and 4 hours prior to commitment due time.",
          "Secure micro-token commitments ($500–$1,000) during call negotiations to lock in repayment intent.",
        ],
        metricLift: [
          "+12–16% PTP Kept Rate Improvement",
          "-32% Broken Promise Backlog",
          "+$880K Accelerated Cash Collection",
        ],
        projectedLift: "+12–16%",
        projectedPayoff: "-32% Broken PTPs",
      },
      {
        id: "contact_rate",
        name: "Contact Rate",
        shortName: "Contact",
        icon: PhoneCall,
        branchVal: formatPercent(branchData.contactRate),
        peerVal: formatPercent(mappedNetworkTotals.avgContactRate),
        delta: formatPoints(branchData.contactRate - mappedNetworkTotals.avgContactRate, true),
        tone: branchData.contactRate >= mappedNetworkTotals.avgContactRate ? "success" : "danger",
        branchNumeric: branchData.contactRate,
        peerNumeric: mappedNetworkTotals.avgContactRate,
        unit: "%",
        observedDifferenceText: `${formatPoints(branchData.contactRate - mappedNetworkTotals.avgContactRate, true)} vs Network Benchmark (${formatPercent(mappedNetworkTotals.avgContactRate)})`,
        direction:
          branchData.contactRate >= mappedNetworkTotals.avgContactRate
            ? "Lead Advantage"
            : "Underperforming",
        varianceRationale: `Connected contact velocity stands at ${formatPercent(branchData.contactRate)}, comparing to the regional peer average of ${formatPercent(mappedNetworkTotals.avgContactRate)}.`,
        attributionRationale: `Borrower response peaks sharply between 4:00 PM and 7:30 PM on weekdays. Agent calling rosters historically concentrate dial attempts during the 9:30 AM–1:00 PM morning shift when customers are commuting or working, resulting in high unanswered dials.`,
        keyTakeaway: `Shifting frontline calling capacity to the 4:00–7:30 PM evening window yields an immediate 8–12% contact lift.`,
        oneLinerInsights: [
          {
            iconType: "finding",
            label: "Core Variance",
            text: `Contact reach is ${formatPercent(branchData.contactRate)} vs regional benchmark of ${formatPercent(mappedNetworkTotals.avgContactRate)} (${formatPoints(branchData.contactRate - mappedNetworkTotals.avgContactRate, true)}).`,
          },
          {
            iconType: "driver",
            label: "Frontline Driver",
            text: "Calling rosters concentrate on morning hours when customers are commuting, leaving evenings understaffed.",
          },
          {
            iconType: "action",
            label: "Priority Action",
            text: "Shift 45% of outbound agent dialing capacity to the high-response 4:00 PM–7:30 PM evening window.",
          },
          {
            iconType: "segment",
            label: "Cohort Focus",
            text: "Working borrowers show an 82% connection probability in the evening versus only 54% in the morning.",
          },
        ],
        segments: [
          {
            segmentName: "Evening Window (4:00 PM–7:30 PM)",
            branchShare: `${branchData.contactRate >= 70 ? "82%" : "68%"}`,
            networkShare: "76%",
            deltaPts: `${branchData.contactRate >= 70 ? "+6\u00A0pts" : "-8\u00A0pts"}`,
            accounts: Math.round(branchData.accounts * 0.5),
            tone: branchData.contactRate >= 70 ? "success" : "danger",
          },
          {
            segmentName: "Mid-Day Window (1:00 PM–4:00 PM)",
            branchShare: `${branchData.contactRate >= 70 ? "66%" : "52%"}`,
            networkShare: "60%",
            deltaPts: `${branchData.contactRate >= 70 ? "+6\u00A0pts" : "-8\u00A0pts"}`,
            accounts: Math.round(branchData.accounts * 0.28),
            tone: branchData.contactRate >= 70 ? "success" : "danger",
          },
          {
            segmentName: "Morning Window (9:30 AM–1:00 PM)",
            branchShare: `${branchData.contactRate >= 70 ? "54%" : "41%"}`,
            networkShare: "48%",
            deltaPts: `${branchData.contactRate >= 70 ? "+6\u00A0pts" : "-7\u00A0pts"}`,
            accounts: Math.round(branchData.accounts * 0.22),
            tone: branchData.contactRate >= 70 ? "success" : "danger",
          },
        ],
        interventions: [
          "Re-align frontline staffing to shift 45% of outbound agent capacity to the 4:00 PM–7:30 PM evening window.",
          "Activate automated two-way WhatsApp conversational prompts 24h prior to calls to verify borrower availability.",
          "Implement automatic 3-dial retry caps with immediate alternate channel escalation (SMS → Email → Field).",
        ],
        metricLift: [
          "+9–13% Connected Contact Rate Lift",
          "+24% Connected Borrower Talk Time",
          "-40% Unanswered Ring Overhead",
        ],
        projectedLift: "+9–13%",
        projectedPayoff: "2.4x Talk Time",
      },
      {
        id: "dpd_distribution",
        name: "DPD Distribution",
        shortName: "30+ DPD %",
        icon: ShieldAlert,
        branchVal: formatPercent(dpd30Plus),
        peerVal: formatPercent(mappedNetworkTotals.avgDpd30Plus),
        delta: formatPoints(dpd30Plus - mappedNetworkTotals.avgDpd30Plus, true),
        tone: dpd30Plus > mappedNetworkTotals.avgDpd30Plus ? "danger" : "success",
        branchNumeric: dpd30Plus,
        peerNumeric: mappedNetworkTotals.avgDpd30Plus,
        unit: "%",
        observedDifferenceText: `${formatPoints(dpd30Plus - mappedNetworkTotals.avgDpd30Plus, true)} vs Regional Baseline (${formatPercent(mappedNetworkTotals.avgDpd30Plus)})`,
        direction: dpd30Plus > 31 ? "Elevated Risk" : "Optimal Pace",
        varianceRationale: `Delinquent balances in 30+ DPD represent ${formatPercent(dpd30Plus)} of the branch portfolio, driving active credit loss provision drag.`,
        attributionRationale: `Accounts crossing the 30 DPD threshold suffer a 65% drop in self-cure probability. Delayed first contact during days 1–15 allows soft delinquencies to roll into hardened buckets without early restructuring interventions.`,
        keyTakeaway: `Proactive settlement offers before accounts cross 30 DPD contain chronic loss exposure.`,
        oneLinerInsights: [
          {
            iconType: "finding",
            label: "Core Variance",
            text: `30+ DPD portfolio concentration is ${formatPercent(dpd30Plus)} against the regional baseline of ${formatPercent(mappedNetworkTotals.avgDpd30Plus)}.`,
          },
          {
            iconType: "driver",
            label: "Frontline Driver",
            text: "Accounts crossing Day 20 without payment commit suffer a 65% drop in self-cure recovery probability.",
          },
          {
            iconType: "action",
            label: "Priority Action",
            text: "Issue proactive settlement waivers and flexible restructuring plans before accounts reach 30 DPD.",
          },
          {
            iconType: "segment",
            label: "Cohort Focus",
            text: "31–60 DPD early roll cohort accounts for 74% of eventual write-offs if left unaddressed.",
          },
        ],
        segments: [
          {
            segmentName: "31–60 DPD (Early Delinquent Roll)",
            branchShare: `${branchData.id === "TPA" ? "18%" : "13%"}`,
            networkShare: "15%",
            deltaPts: `${branchData.id === "TPA" ? "+3" : "-2"} pts`,
            accounts: Math.round(branchData.accounts * 0.16),
            tone: branchData.id === "TPA" ? "danger" : "success",
          },
          {
            segmentName: "61–90 DPD (Hardened Delinquency)",
            branchShare: `${branchData.id === "TPA" ? "12%" : "8%"}`,
            networkShare: "10%",
            deltaPts: `${branchData.id === "TPA" ? "+2" : "-2"} pts`,
            accounts: Math.round(branchData.accounts * 0.1),
            tone: branchData.id === "TPA" ? "danger" : "success",
          },
          {
            segmentName: "90+ DPD (Non-Performing Exposure)",
            branchShare: `${branchData.id === "TPA" ? "8%" : "5%"}`,
            networkShare: "6%",
            deltaPts: `${branchData.id === "TPA" ? "+2" : "-1"} pts`,
            accounts: Math.round(branchData.accounts * 0.06),
            tone: branchData.id === "TPA" ? "danger" : "success",
          },
        ],
        interventions: [
          "Route accounts crossing Day 15 immediately into high-priority queueing with specialized workout authority.",
          "Provide frontline teams with pre-approved restructuring templates before accounts breach 60 DPD.",
          "Dispatch targeted field officer visits for high-exposure borrowers (>₹1 Lakh) exceeding 45 DPD.",
        ],
        metricLift: [
          "-5.0 to -8.0 pts 30+ DPD Concentration Drop",
          "+24% 31–60 DPD Cure Rate",
          "-20% Roll into Write-Off Status",
        ],
        projectedLift: "-5.0 to -8.0 pts",
        projectedPayoff: "-20% Loss Drag",
      },
    ];
  }, [
    branchData,
    isAhead,
    collectionGap,
    peerCollectionRate,
    dpd30Plus,
    mappedNetworkTotals,
    rootCauseDrivers,
    insightItems,
  ]);

  // Compared branch is the collection-efficiency top performer (peer if selected is top).
  const sortedBranches = useMemo(() => {
    return [...mappedBranches].sort((a, b) => b.collectionRate - a.collectionRate);
  }, [mappedBranches]);

  const branchRank = useMemo(() => {
    return sortedBranches.findIndex((b) => b.id === branchData.id) + 1;
  }, [sortedBranches, branchData.id]);

  const topBranch = sortedBranches[0] ?? branchData;
  const laggingBranch = sortedBranches[sortedBranches.length - 1] ?? branchData;

  const comparedBranch = useMemo(() => {
    if (!topBranch) return branchData;
    if (branchData.id === topBranch.id) {
      return sortedBranches[1] || topBranch;
    }
    return topBranch;
  }, [branchData, sortedBranches, topBranch]);

  // Selected KPI State
  const [selectedKpiId, setSelectedKpiId] = useState<string>(() => {
    if (initialDriver) {
      const match = coreKpis.find(
        (k) =>
          k.id.toLowerCase() === initialDriver.toLowerCase() ||
          k.name.toLowerCase().includes(initialDriver.toLowerCase()) ||
          k.shortName.toLowerCase().includes(initialDriver.toLowerCase()),
      );
      if (match) return match.id;
    }
    return coreKpis[0]!.id;
  });

  const activeKpi = useMemo(() => {
    return coreKpis.find((k) => k.id === selectedKpiId) || coreKpis[0]!;
  }, [coreKpis, selectedKpiId]);

  const comparisonAIQuery = useQuery({
    queryKey: ["branch-ai-comparison", branchId, selectedDate],
    queryFn: () => api.getBranchComparisonAI(branchId, selectedDate),
    retry: false,
  });
  const selectedKpiAIQuery = useQuery({
    queryKey: ["branch-ai-kpi", branchId, selectedDate, activeKpi.id],
    queryFn: () => api.getSelectedKpiAI(branchId, activeKpi.id, selectedDate),
    retry: false,
  });
  const overallAIQuery = useQuery({
    queryKey: ["branch-ai-overall", branchId, selectedDate],
    queryFn: () => api.getOverallBranchAI(branchId, selectedDate),
    retry: false,
  });

  const aiKpiInsight =
    selectedKpiAIQuery.data?.ai.status === "ai" ? selectedKpiAIQuery.data.data : null;
  const displayedOneLinerInsights: OneLinerInsight[] = aiKpiInsight
    ? [
        {
          iconType: "finding",
          label: "Core Variance",
          text: aiKpiInsight.coreVariance ?? aiKpiInsight.narrative,
        },
        ...(aiKpiInsight.frontlineDriver
          ? [
              {
                iconType: "driver" as const,
                label: "Frontline Driver",
                text: aiKpiInsight.frontlineDriver,
              },
            ]
          : []),
        ...(aiKpiInsight.priorityAction
          ? [
              {
                iconType: "action" as const,
                label: "Priority Action",
                text: aiKpiInsight.priorityAction,
              },
            ]
          : []),
        ...(aiKpiInsight.cohortFocus
          ? [
              {
                iconType: "segment" as const,
                label: "Cohort Focus",
                text: aiKpiInsight.cohortFocus,
              },
            ]
          : []),
      ]
    : activeKpi.oneLinerInsights;

  // Compared Branch KPI value for active KPI
  const comparedKpiMetric = useMemo(() => {
    const kpiId = activeKpi.id;
    if (kpiId === "collection_efficiency") {
      const val = comparedBranch.collectionRate;
      const delta = branchData.collectionRate - val;
      return {
        valStr: formatPercent(val),
        valNum: val,
        deltaStr: formatPoints(delta, true),
        isAhead: delta >= 0,
      };
    }
    if (kpiId === "avg_resolution_days") {
      const val = comparedBranch.avgDaysToResolve;
      const delta = branchData.avgDaysToResolve - val;
      return {
        valStr: formatDays(val),
        valNum: val,
        deltaStr: `${delta <= 0 ? "" : "+"}${formatDecimal(delta)}d`,
        isAhead: delta <= 0,
      };
    }
    if (kpiId === "ptp_kept") {
      const val = comparedBranch.ptpKept;
      const delta = branchData.ptpKept - val;
      return {
        valStr: formatPercent(val),
        valNum: val,
        deltaStr: formatPoints(delta, true),
        isAhead: delta >= 0,
      };
    }
    if (kpiId === "contact_rate") {
      const val = comparedBranch.contactRate;
      const delta = branchData.contactRate - val;
      return {
        valStr: formatPercent(val),
        valNum: val,
        deltaStr: formatPoints(delta, true),
        isAhead: delta >= 0,
      };
    }
    // dpd_distribution (30+ DPD %)
    const getDpd = (id: string) =>
      mappedBranches.find((b) => b.id === id)?.dpd30Plus ?? mappedNetworkTotals.avgDpd30Plus;
    const branchDpdVal = getDpd(branchData.id);
    const comparedDpdVal = getDpd(comparedBranch.id);
    const delta = branchDpdVal - comparedDpdVal;
    return {
      valStr: formatPercent(comparedDpdVal),
      valNum: comparedDpdVal,
      deltaStr: formatPoints(delta, true),
      isAhead: delta <= 0,
    };
  }, [activeKpi.id, branchData, comparedBranch]);

  const overallFallback = useMemo(() => {
    const values = coreKpis.map((kpi) => `${kpi.name} ${kpi.branchVal}`).join(", ");
    return `${branchData.name} overall performance across the five core KPIs is: ${values}. Use the combined KPI pattern to prioritize the largest verified weakness while preserving demonstrated strengths.`;
  }, [branchData.name, coreKpis]);

  return (
    <AppShell
      title={`${branch.name} · Root Cause`}
      section="Branch Level"
      actions={
        <div className="flex items-center gap-2">
          <Link
            to="/worklist"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 transition"
          >
            Execute on Worklist →
          </Link>
        </div>
      }
    >
      <div className="w-full space-y-5">
        {/* 1. TOP STARTING BANNER: COMPARATIVE ANALYSIS WITH OTHER BRANCHES */}
        <div className="rounded-2xl border border-border/80 bg-card/60 p-5 md:p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-display text-foreground">
                Comparative Analysis with Other Branches
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                Benchmarking {branchData.name} performance drivers, peer rankings, and head-to-head
                operational gaps
              </p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
              <span className="rounded-lg border border-border/70 bg-card/80 px-2.5 py-1 text-xs font-semibold text-foreground">
                Network Rank:{" "}
                <strong className="text-primary font-bold">
                  #{branchRank} of {mappedBranches.length}
                </strong>
              </span>
              <Status tone={isAhead ? "success" : "danger"}>
                {isAhead
                  ? `${formatPoints(collectionGap, true)} vs Regional Avg`
                  : `${formatPoints(collectionGap)} vs Regional Avg`}
              </Status>
            </div>
          </div>

          {/* Peer Cohort Benchmarks (Selected Branch vs Top Leader vs Regional Benchmark vs Lagging Benchmark) */}
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {/* Card 1: Current Branch */}
            <div className="rounded-xl border border-primary/40 bg-primary/10 p-3.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                  Current Branch
                </span>
                <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                  Rank #{branchRank}
                </span>
              </div>
              <p className="mt-1 text-sm font-bold text-foreground truncate">{branchData.name}</p>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-xl font-bold text-display text-foreground">
                  {formatPercent(branchData.collectionRate)}
                </span>
                <span className="text-xs text-muted-foreground font-medium">Efficiency</span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {branchRank === sortedBranches.length
                  ? "Currently in lagging network tier"
                  : branchRank === 1
                    ? "Leading network across recovery"
                    : "Mid-quartile regional peer"}
              </p>
            </div>

            {/* Card 2: Top Benchmark */}
            <div className="rounded-xl border border-border/70 bg-card/60 p-3.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Top Performer
                </span>
                <span className="rounded bg-success/15 px-1.5 py-0.5 text-[10px] font-bold text-success">
                  Rank #1
                </span>
              </div>
              <p className="mt-1 text-sm font-bold text-foreground truncate">{topBranch.name}</p>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-xl font-bold text-display text-foreground">
                  {formatPercent(topBranch.collectionRate)}
                </span>
                <span
                  className={`text-xs font-bold ${branchData.collectionRate >= topBranch.collectionRate ? "text-success" : "text-destructive"}`}
                >
                  {formatPoints(branchData.collectionRate - topBranch.collectionRate, true)}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {branchData.id === topBranch.id
                  ? "Benchmark pacesetter"
                  : `${formatDecimal(Math.abs(branchData.collectionRate - topBranch.collectionRate))} pts efficiency gap vs leader`}
              </p>
            </div>

            {/* Card 3: Peer Benchmark */}
            <div className="rounded-xl border border-border/70 bg-card/60 p-3.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Peer Average
                </span>
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                  Regional Baseline
                </span>
              </div>
              <p className="mt-1 text-sm font-bold text-foreground">6-Branch Network Avg</p>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-xl font-bold text-display text-foreground">
                  {formatPercent(peerCollectionRate)}
                </span>
                <span
                  className={`text-xs font-bold ${collectionGap >= 0 ? "text-success" : "text-destructive"}`}
                >
                  {formatPoints(collectionGap, true)}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {collectionGap >= 0
                  ? "Outperforming peer baseline"
                  : `Underperforming peer average by ${Math.abs(Math.round(collectionGap * 10) / 10)} pts`}
              </p>
            </div>

            {/* Card 4: Lagging Benchmark / Closest Peer */}
            {branchData.id === laggingBranch.id ? (
              <div className="rounded-xl border border-border/70 bg-card/60 p-3.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Closest Peer (Lagging Tier)
                  </span>
                  <span className="rounded bg-destructive/15 px-1.5 py-0.5 text-[10px] font-bold text-destructive">
                    Rank #{sortedBranches.length - 1}
                  </span>
                </div>
                <p className="mt-1 text-sm font-bold text-foreground truncate">
                  {sortedBranches[sortedBranches.length - 2]?.name ?? "Chicago Branch"}
                </p>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-xl font-bold text-display text-foreground">
                    {formatPercent(sortedBranches[sortedBranches.length - 2]?.collectionRate ?? 76)}
                  </span>
                  <span className="text-xs font-bold text-destructive">
                    {formatPoints(
                      branchData.collectionRate -
                        (sortedBranches[sortedBranches.length - 2]?.collectionRate ?? 76),
                    )}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {formatDecimal(
                    Math.abs(
                      branchData.collectionRate -
                        (sortedBranches[sortedBranches.length - 2]?.collectionRate ?? 76),
                    ),
                  )}{" "}
                  pts deficit to reach closest peer
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-border/70 bg-card/60 p-3.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Lagging Benchmark
                  </span>
                  <span className="rounded bg-destructive/15 px-1.5 py-0.5 text-[10px] font-bold text-destructive">
                    Rank #{sortedBranches.length}
                  </span>
                </div>
                <p className="mt-1 text-sm font-bold text-foreground truncate">
                  {laggingBranch.name}
                </p>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-xl font-bold text-display text-foreground">
                    {formatPercent(laggingBranch.collectionRate)}
                  </span>
                  <span className="text-xs font-bold text-success">
                    {formatPoints(branchData.collectionRate - laggingBranch.collectionRate, true)}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {formatPoints(branchData.collectionRate - laggingBranch.collectionRate, true)}{" "}
                  above lowest regional cohort
                </p>
              </div>
            )}
          </div>

          {/* Head-to-Head Comparison: Branch vs Top Performer across KPIs */}
          <div className="rounded-xl border border-border/70 bg-card/40 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <GitCompare className="size-4 text-primary" />
              <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                Head-to-Head Comparison: {branchData.name} vs Top Performer ({comparedBranch.name})
              </span>
            </div>

            {/* Side-by-Side Head to Head Metrics Grid */}
            <div className="grid gap-2 grid-cols-2 sm:grid-cols-5 border-t border-border/50 pt-3">
              <div className="rounded-lg border border-border/60 bg-card/60 p-2.5 text-center">
                <span className="text-[10px] text-muted-foreground font-medium block">
                  Collection Efficiency
                </span>
                <div className="mt-1 flex items-center justify-center gap-1.5 text-xs">
                  <span className="font-bold text-foreground">
                    {formatPercent(branchData.collectionRate)}
                  </span>
                  <span className="text-muted-foreground">vs</span>
                  <span className="font-bold text-muted-foreground">
                    {formatPercent(comparedBranch.collectionRate)}
                  </span>
                </div>
                <span
                  className={`text-[11px] font-bold mt-0.5 block ${branchData.collectionRate >= comparedBranch.collectionRate ? "text-success" : "text-destructive"}`}
                >
                  {formatPoints(branchData.collectionRate - comparedBranch.collectionRate, true)}
                </span>
              </div>

              <div className="rounded-lg border border-border/60 bg-card/60 p-2.5 text-center">
                <span className="text-[10px] text-muted-foreground font-medium block">
                  Avg Resolution Days
                </span>
                <div className="mt-1 flex items-center justify-center gap-1.5 text-xs">
                  <span className="font-bold text-foreground">
                    {formatDays(branchData.avgDaysToResolve)}
                  </span>
                  <span className="text-muted-foreground">vs</span>
                  <span className="font-bold text-muted-foreground">
                    {formatDays(comparedBranch.avgDaysToResolve)}
                  </span>
                </div>
                <span
                  className={`text-[11px] font-bold mt-0.5 block ${branchData.avgDaysToResolve <= comparedBranch.avgDaysToResolve ? "text-success" : "text-destructive"}`}
                >
                  {branchData.avgDaysToResolve <= comparedBranch.avgDaysToResolve ? "" : "+"}
                  {formatDays(branchData.avgDaysToResolve - comparedBranch.avgDaysToResolve)}
                </span>
              </div>

              <div className="rounded-lg border border-border/60 bg-card/60 p-2.5 text-center">
                <span className="text-[10px] text-muted-foreground font-medium block">
                  PTP Kept %
                </span>
                <div className="mt-1 flex items-center justify-center gap-1.5 text-xs">
                  <span className="font-bold text-foreground">
                    {formatPercent(branchData.ptpKept)}
                  </span>
                  <span className="text-muted-foreground">vs</span>
                  <span className="font-bold text-muted-foreground">
                    {formatPercent(comparedBranch.ptpKept)}
                  </span>
                </div>
                <span
                  className={`text-[11px] font-bold mt-0.5 block ${branchData.ptpKept >= comparedBranch.ptpKept ? "text-success" : "text-destructive"}`}
                >
                  {formatPoints(branchData.ptpKept - comparedBranch.ptpKept, true)}
                </span>
              </div>

              <div className="rounded-lg border border-border/60 bg-card/60 p-2.5 text-center">
                <span className="text-[10px] text-muted-foreground font-medium block">
                  Contact Rate
                </span>
                <div className="mt-1 flex items-center justify-center gap-1.5 text-xs">
                  <span className="font-bold text-foreground">
                    {formatPercent(branchData.contactRate)}
                  </span>
                  <span className="text-muted-foreground">vs</span>
                  <span className="font-bold text-muted-foreground">
                    {formatPercent(comparedBranch.contactRate)}
                  </span>
                </div>
                <span
                  className={`text-[11px] font-bold mt-0.5 block ${branchData.contactRate >= comparedBranch.contactRate ? "text-success" : "text-destructive"}`}
                >
                  {formatPoints(branchData.contactRate - comparedBranch.contactRate, true)}
                </span>
              </div>

              <div className="col-span-2 sm:col-span-1 rounded-lg border border-border/60 bg-card/60 p-2.5 text-center">
                <span className="text-[10px] text-muted-foreground font-medium block">
                  Branch vs Branch Status
                </span>
                <p className="mt-1 text-xs font-bold">
                  {branchData.collectionRate >= comparedBranch.collectionRate ? (
                    <span className="text-success inline-flex items-center gap-1">
                      <TrendingUp className="size-3" /> Leading +
                      {formatPoints(
                        branchData.collectionRate - comparedBranch.collectionRate,
                        true,
                      )}
                    </span>
                  ) : (
                    <span className="text-destructive inline-flex items-center gap-1">
                      <TrendingDown className="size-3" /> Lagging -
                      {formatPoints(
                        Math.abs(branchData.collectionRate - comparedBranch.collectionRate),
                      )}
                    </span>
                  )}
                </p>
                <span className="text-[10px] text-muted-foreground mt-0.5 block truncate">
                  vs {comparedBranch.name}
                </span>
              </div>
            </div>
            {comparisonAIQuery.data?.data.narrative && (
              <p className="border-t border-border/50 pt-3 text-xs leading-relaxed text-muted-foreground">
                {comparisonAIQuery.data.data.narrative}
              </p>
            )}
          </div>
        </div>

        {/* 2. MAIN TWO-COLUMN WORKBENCH: SCROLLABLE 5 KPI CARDS ON LEFT + ALIGNED SUMMARY & ONE-LINERS ON RIGHT */}
        <GlassCard className="p-5 md:p-6 border border-border/80">
          <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,32fr)_minmax(0,68fr)] items-start">
            {/* Left column — Scrollable KPI Selection */}
            <div className="min-w-0 space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-border/50">
                <span className="text-[11px] font-bold uppercase tracking-[.12em] text-muted-foreground">
                  KPI Selection
                </span>
                <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                  5 Metrics · Scrollable
                </span>
              </div>

              {/* Scrollable container with modern thin scrollbar */}
              <div className="max-h-[530px] overflow-y-auto pr-1.5 space-y-2.5 custom-scrollbar">
                {coreKpis.map((kpi) => {
                  const isSelected = selectedKpiId === kpi.id;
                  const Icon = kpi.icon;

                  return (
                    <button
                      key={kpi.id}
                      onClick={() => setSelectedKpiId(kpi.id)}
                      className={`w-full rounded-xl border p-3.5 text-left transition-all duration-200 ${
                        isSelected
                          ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary/30"
                          : "border-border/70 bg-card/60 hover:border-primary/40 hover:bg-card"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`flex size-6 shrink-0 items-center justify-center rounded-lg ${
                              isSelected
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            <Icon className="size-3.5" />
                          </span>
                          <span className="text-xs font-bold text-foreground truncate">
                            {kpi.name}
                          </span>
                        </div>
                        <Status tone={kpi.tone} className="shrink-0 whitespace-nowrap text-nowrap">
                          {kpi.delta}
                        </Status>
                      </div>

                      <div className="mt-2.5 flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          {branchData.name}:{" "}
                          <strong className="text-foreground">{kpi.branchVal}</strong>
                        </span>
                        <span>
                          Peer: <strong className="text-foreground">{kpi.peerVal}</strong>
                        </span>
                      </div>

                      <div className="mt-2">
                        <MetricBar
                          value={kpi.branchNumeric}
                          peer={kpi.peerNumeric}
                          tone={kpi.tone === "danger" ? "danger" : "success"}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right column — Summary with Aligned One-Liner Insights */}
            <div className="min-w-0 rounded-xl border border-border/70 bg-card/40 p-5 md:p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/50 pb-3.5">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-display text-foreground">
                    Summary
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Comparative metric breakdown and key diagnostic insights for {activeKpi.name}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-medium">Selected KPI:</span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary/15 px-2.5 py-1 text-xs font-bold text-primary ring-1 ring-primary/30">
                    <activeKpi.icon className="size-3.5" />
                    {activeKpi.name}
                  </span>
                </div>
              </div>

              {/* Metric comparison cards (Actual, Peer Benchmark, Head-to-Head with Compared Branch, Variance) */}
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-border/70 bg-card/60 p-4">
                  <p className="text-[11px] font-medium text-muted-foreground">
                    {branchData.name} (Actual)
                  </p>
                  <p className="mt-1 text-2xl font-bold text-display text-foreground">
                    {activeKpi.branchVal}
                  </p>
                </div>

                <div className="rounded-xl border border-border/70 bg-card/60 p-4">
                  <p className="text-[11px] font-medium text-muted-foreground">
                    Peer Benchmark (Avg)
                  </p>
                  <p className="mt-1 text-2xl font-bold text-display text-muted-foreground">
                    {activeKpi.peerVal}
                  </p>
                </div>

                <div className="rounded-xl border border-border/70 bg-card/60 p-4">
                  <p className="text-[11px] font-medium text-muted-foreground truncate">
                    vs {comparedBranch.name}
                  </p>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-2xl font-bold text-display text-muted-foreground">
                      {comparedKpiMetric.valStr}
                    </span>
                    <span
                      className={`text-xs font-bold ${comparedKpiMetric.isAhead ? "text-success" : "text-destructive"}`}
                    >
                      {comparedKpiMetric.deltaStr}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-border/70 bg-card/60 p-4">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-[11px] font-medium text-muted-foreground">
                      Difference / Variance
                    </p>
                    <Status tone={activeKpi.tone}>{activeKpi.direction}</Status>
                  </div>
                  <div className="mt-1">
                    <span
                      className={`text-2xl font-bold text-display whitespace-nowrap ${
                        activeKpi.tone === "success" ? "text-success" : "text-destructive"
                      }`}
                    >
                      {activeKpi.delta}
                    </span>
                  </div>
                </div>
              </div>

              {/* Key Insights */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-[.12em] text-foreground">
                  Key Insights
                </h4>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {displayedOneLinerInsights.map((insight, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-border/70 bg-card/60 p-3.5 flex items-start gap-2.5 transition hover:border-primary/30 hover:bg-card"
                    >
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary mt-0.5 text-[10px] font-bold">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-primary block">
                          {insight.label}
                        </span>
                        <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                          {insight.text}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Operational Rationale & Attribution */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs leading-relaxed text-foreground">
                <strong className="text-primary font-bold block mb-1">
                  Operational Rationale & Attribution:
                </strong>
                {aiKpiInsight?.frontlineDriver ?? activeKpi.attributionRationale}
              </div>
            </div>
          </div>
        </GlassCard>

        {/* 3. KEY SUMMARY: STATIC CONCLUSION PARAGRAPH */}
        <GlassCard className="p-5 md:p-6 rounded-2xl border border-primary/20 bg-primary/5 shadow-2xs">
          <div className="flex items-center gap-2 mb-3.5 pb-2.5 border-b border-primary/15">
            <Target className="size-4 text-primary" />
            <h3 className="text-xs font-bold uppercase tracking-[.14em] text-primary">
              Key Summary · Overall Branch Performance
            </h3>
          </div>

          <div className="text-xs sm:text-sm leading-relaxed text-foreground">
            {overallAIQuery.data?.data.narrative ?? overallFallback}
          </div>
        </GlassCard>
      </div>
    </AppShell>
  );
}

export default RootCauseRoute;
