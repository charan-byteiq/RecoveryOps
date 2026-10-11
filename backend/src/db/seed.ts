import "dotenv/config";
import { eq } from "drizzle-orm";
import { db, pool } from "./index.js";
import {
  branches,
  metricDefinitions,
  ingestionBatches,
  branchMetricSnapshots,
  branchDpdSnapshots,
  branchSegmentSnapshots,
  branchInsights,
} from "./schema.js";

const AS_OF_DATE = "2026-08-31";
const PERIOD_START = "2026-08-01";
const PERIOD_END = "2026-08-31";

function numeric(value: number | null | undefined): string | null {
  return value == null ? null : String(value);
}

const branchInputs = [
  { sourceBranchCode: "101", name: "Branch 101", region: "North" },
  { sourceBranchCode: "104", name: "Branch 104", region: "North" },
  { sourceBranchCode: "105", name: "Branch 105", region: "Central" },
  { sourceBranchCode: "106", name: "Branch 106", region: "Central" },
  { sourceBranchCode: "201", name: "Branch 201", region: "South" },
  { sourceBranchCode: "202", name: "Branch 202", region: "South" },
  { sourceBranchCode: "203", name: "Branch 203", region: "West" },
];

const metricDefinitionInputs = [
  { metricCode: "delinquency_rate_30_plus", name: "30+ DPD rate", unit: "percent", hasNumeratorDenominator: true, description: "Share of branch portfolio with 30 or more days past due" },
  { metricCode: "cure_rate", name: "Cure rate", unit: "percent", hasNumeratorDenominator: true, description: "Share of eligible delinquent accounts that cured within the period" },
  { metricCode: "roll_rate", name: "Roll rate", unit: "percent", hasNumeratorDenominator: true, description: "Share of accounts that rolled forward into a later delinquency bucket" },
  { metricCode: "ptp_kept_rate", name: "PTP kept rate", unit: "percent", hasNumeratorDenominator: true, description: "Share of promises to pay that were kept within the reporting window" },
  { metricCode: "autopay_active_pct", name: "Active autopay %", unit: "percent", hasNumeratorDenominator: true, description: "Share of active accounts enrolled in autopay" },
  { metricCode: "fpd_count", name: "First payment default count", unit: "count", hasNumeratorDenominator: false, description: "Number of accounts that defaulted on the first scheduled payment" },
  { metricCode: "fpd_rate", name: "First payment default rate", unit: "percent", hasNumeratorDenominator: true, description: "Share of new originations that defaulted on the first payment" },
  { metricCode: "payment_total", name: "Payment total", unit: "currency", hasNumeratorDenominator: false, description: "Total payments collected during the period" },
  { metricCode: "positive_outcome_rate", name: "Positive outcome rate", unit: "percent", hasNumeratorDenominator: true, description: "Share of delinquent accounts with a positive resolution outcome" },
  { metricCode: "negative_outcome_rate", name: "Negative outcome rate", unit: "percent", hasNumeratorDenominator: true, description: "Share of delinquent accounts with a negative resolution outcome" },
  { metricCode: "high_balance_concentration_top5", name: "Top 5% balance concentration", unit: "percent", hasNumeratorDenominator: true, description: "Share of total delinquent balance held by the top 5% of accounts" },
  { metricCode: "accounts_advanced_by_small_payment", name: "Accounts eligible for small payment advance", unit: "count", hasNumeratorDenominator: false, description: "Accounts that could advance to a lower delinquency bucket with a small payment" },
  { metricCode: "avg_dpd", name: "Average DPD", unit: "days", hasNumeratorDenominator: false, description: "Average days past due across delinquent accounts" },
  { metricCode: "charge_off_rate", name: "Charge-off rate", unit: "percent", hasNumeratorDenominator: true, description: "Share of delinquent balance charged off in the period" },
  { metricCode: "contact_rate", name: "Contact rate", unit: "percent", hasNumeratorDenominator: true, description: "Share of delinquent accounts contacted successfully" },
  { metricCode: "avg_days_to_resolve", name: "Avg. days to resolve", unit: "days", hasNumeratorDenominator: false, description: "Average calendar days to resolve a delinquency" },
  { metricCode: "collections_per_agent", name: "Collections per agent", unit: "currency", hasNumeratorDenominator: false, description: "Average collections attributed per agent" },
  { metricCode: "escalation_rate", name: "Escalation rate", unit: "percent", hasNumeratorDenominator: true, description: "Share of accounts escalated to specialized recovery" },
  { metricCode: "first_contact_timing", name: "First contact timing", unit: "days", hasNumeratorDenominator: false, description: "Average days to first outreach after delinquency" },
];

// Deterministic-ish synthetic values per branch, shaped like the report distributions.
const branchProfiles = [
  { code: "101", totalAccounts: 6520, delinquencyRate: 0.118, cureRate: 0.212, rollRate: 0.34, ptpKept: 0.58, autopay: 0.64, fpdCount: 28, paymentTotal: 284000, positiveOutcome: 0.48, negativeOutcome: 0.18, top5Conc: 0.38, smallPayAdvance: 9, avgDpd: 41, chargeOff: 0.032 },
  { code: "104", totalAccounts: 4890, delinquencyRate: 0.152, cureRate: 0.143, rollRate: 0.42, ptpKept: 0.46, autopay: 0.51, fpdCount: 31, paymentTotal: 196000, positiveOutcome: 0.39, negativeOutcome: 0.24, top5Conc: 0.44, smallPayAdvance: 11, avgDpd: 48, chargeOff: 0.051 },
  { code: "105", totalAccounts: 7150, delinquencyRate: 0.096, cureRate: 0.235, rollRate: 0.28, ptpKept: 0.63, autopay: 0.71, fpdCount: 19, paymentTotal: 342000, positiveOutcome: 0.55, negativeOutcome: 0.12, top5Conc: 0.33, smallPayAdvance: 6, avgDpd: 36, chargeOff: 0.021 },
  { code: "106", totalAccounts: 5340, delinquencyRate: 0.131, cureRate: 0.178, rollRate: 0.37, ptpKept: 0.52, autopay: 0.57, fpdCount: 24, paymentTotal: 231000, positiveOutcome: 0.44, negativeOutcome: 0.21, top5Conc: 0.41, smallPayAdvance: 8, avgDpd: 44, chargeOff: 0.041 },
  { code: "201", totalAccounts: 6110, delinquencyRate: 0.108, cureRate: 0.198, rollRate: 0.32, ptpKept: 0.55, autopay: 0.62, fpdCount: 22, paymentTotal: 268000, positiveOutcome: 0.49, negativeOutcome: 0.15, top5Conc: 0.36, smallPayAdvance: 7, avgDpd: 39, chargeOff: 0.028 },
  { code: "202", totalAccounts: 4720, delinquencyRate: 0.167, cureRate: 0.116, rollRate: 0.48, ptpKept: 0.41, autopay: 0.44, fpdCount: 29, paymentTotal: 174000, positiveOutcome: 0.33, negativeOutcome: 0.29, top5Conc: 0.47, smallPayAdvance: 12, avgDpd: 54, chargeOff: 0.064 },
  { code: "203", totalAccounts: 5830, delinquencyRate: 0.087, cureRate: 0.261, rollRate: 0.23, ptpKept: 0.67, autopay: 0.74, fpdCount: 12, paymentTotal: 312000, positiveOutcome: 0.59, negativeOutcome: 0.09, top5Conc: 0.29, smallPayAdvance: 5, avgDpd: 33, chargeOff: 0.017 },
];

function sum(arr: number[]) {
  return arr.reduce((a, b) => a + b, 0);
}

function fmtMoney(n: number) {
  return `$${(n / 1000).toFixed(1)}K`;
}

function generateDpdBuckets(profile: (typeof branchProfiles)[0]) {
  const totalAccounts = profile.totalAccounts;
  const d30PlusCount = Math.round(totalAccounts * profile.delinquencyRate);
  const currentShare = 0.62 + Math.random() * 0.06;
  const oneTo30Share = 0.18 + Math.random() * 0.04;
  const current = Math.round(totalAccounts * currentShare);
  const oneTo30 = Math.max(0, totalAccounts - current - d30PlusCount);
  const remaining = totalAccounts - current - oneTo30;

  const b30_59 = Math.round(remaining * 0.42);
  const b60_89 = Math.round(remaining * 0.28);
  const b90_119 = Math.round(remaining * 0.18);
  const b120Plus = remaining - b30_59 - b60_89 - b90_119;

  const buckets = [
    { bucket: "Current", accountCount: current },
    { bucket: "1-30", accountCount: oneTo30 },
    { bucket: "30-59", accountCount: b30_59 },
    { bucket: "60-89", accountCount: b60_89 },
    { bucket: "90-119", accountCount: b90_119 },
    { bucket: "120+", accountCount: b120Plus },
  ];

  const avgBalance = 1200 + profile.avgDpd * 45;
  return buckets.map((b) => {
    const share = b.accountCount / totalAccounts;
    const balance = Math.round(b.accountCount * avgBalance * (b.bucket === "Current" ? 0.35 : b.bucket === "1-30" ? 0.55 : b.bucket === "30-59" ? 0.85 : b.bucket === "60-89" ? 1.05 : b.bucket === "90-119" ? 1.25 : 1.55));
    return { ...b, balance, portfolioShare: Number(share.toFixed(6)) };
  });
}

function generateInsights(branchName: string, profile: (typeof branchProfiles)[0], networkAvgDelinquency: number) {
  const isHighDelinquency = profile.delinquencyRate > networkAvgDelinquency;
  const gapPts = Math.round((profile.delinquencyRate - networkAvgDelinquency) * 1000) / 10;
  const narrative = isHighDelinquency
    ? `${branchName} is currently above the network average for 30+ DPD concentration (${(profile.delinquencyRate * 100).toFixed(1)}% vs ${(networkAvgDelinquency * 100).toFixed(1)}% network). The branch's lower PTP kept rate (${(profile.ptpKept * 100).toFixed(0)}%) and higher roll rate (${(profile.rollRate * 100).toFixed(0)}%) suggest that early commitments are not being reinforced with timely follow-up, allowing accounts to migrate into later buckets.`
    : `${branchName} is performing better than the network average for 30+ DPD concentration (${(profile.delinquencyRate * 100).toFixed(1)}% vs ${(networkAvgDelinquency * 100).toFixed(1)}% network). Strong autopay enrollment (${(profile.autopay * 100).toFixed(0)}%) and PTP fulfillment (${(profile.ptpKept * 100).toFixed(0)}%) are supporting this outcome. Sustaining follow-up cadence should protect this advantage.`;

  const evidence = [
    { metricCode: "delinquency_rate_30_plus", branchValue: profile.delinquencyRate, networkValue: networkAvgDelinquency, delta: profile.delinquencyRate - networkAvgDelinquency, unit: "percent" },
    { metricCode: "ptp_kept_rate", branchValue: profile.ptpKept, networkValue: 0.55, delta: profile.ptpKept - 0.55, unit: "percent" },
    { metricCode: "roll_rate", branchValue: profile.rollRate, networkValue: 0.35, delta: profile.rollRate - 0.35, unit: "percent" },
    { metricCode: "autopay_active_pct", branchValue: profile.autopay, networkValue: 0.60, delta: profile.autopay - 0.60, unit: "percent" },
  ];

  return { narrative, evidence, gapPts };
}

async function seed() {
  // Clean slate for demo seeding
  await db.delete(branchInsights);
  await db.delete(branchSegmentSnapshots);
  await db.delete(branchDpdSnapshots);
  await db.delete(branchMetricSnapshots);
  await db.delete(ingestionBatches);
  await db.delete(metricDefinitions);
  await db.delete(branches);

  await db.insert(metricDefinitions).values(metricDefinitionInputs);

  const createdBranches = await db
    .insert(branches)
    .values(branchInputs)
    .returning();

  const branchByCode = new Map(createdBranches.map((b) => [b.sourceBranchCode, b]));

  const [batch] = await db
    .insert(ingestionBatches)
    .values({
      source: "synthetic_demo",
      reportType: "branch_dashboards_aggregate",
      periodStart: PERIOD_START,
      periodEnd: PERIOD_END,
      asOfDate: AS_OF_DATE,
      isDemo: true,
      notes: "Synthetic branch-level data shaped like the four RecoveryOps PDF reports. Do not use for production decisions.",
    })
    .returning();

  const networkAvgDelinquency =
    sum(branchProfiles.map((p) => p.delinquencyRate)) / branchProfiles.length;

  for (const profile of branchProfiles) {
    const branch = branchByCode.get(profile.code)!;
    const d30PlusCount = Math.round(profile.totalAccounts * profile.delinquencyRate);
    const cureNumerator = Math.round(d30PlusCount * profile.cureRate);
    const rollNumerator = Math.round(d30PlusCount * profile.rollRate);
    const ptpNumerator = Math.round(profile.totalAccounts * profile.ptpKept * 0.12);
    const ptpDenominator = Math.round(profile.totalAccounts * 0.18);
    const autopayNumerator = Math.round(profile.totalAccounts * profile.autopay);

    const metricRows = [
      { metricCode: "delinquency_rate_30_plus", value: profile.delinquencyRate, numerator: d30PlusCount, denominator: profile.totalAccounts, unit: "percent" },
      { metricCode: "cure_rate", value: profile.cureRate, numerator: cureNumerator, denominator: d30PlusCount, unit: "percent" },
      { metricCode: "roll_rate", value: profile.rollRate, numerator: rollNumerator, denominator: d30PlusCount, unit: "percent" },
      { metricCode: "ptp_kept_rate", value: ptpNumerator / Math.max(1, ptpDenominator), numerator: ptpNumerator, denominator: ptpDenominator, unit: "percent" },
      { metricCode: "autopay_active_pct", value: profile.autopay, numerator: autopayNumerator, denominator: profile.totalAccounts, unit: "percent" },
      { metricCode: "fpd_count", value: profile.fpdCount, unit: "count" },
      { metricCode: "fpd_rate", value: profile.fpdCount / Math.max(1, profile.totalAccounts * 0.08), numerator: profile.fpdCount, denominator: Math.round(profile.totalAccounts * 0.08), unit: "percent" },
      { metricCode: "payment_total", value: profile.paymentTotal, unit: "currency" },
      { metricCode: "positive_outcome_rate", value: profile.positiveOutcome, numerator: Math.round(d30PlusCount * profile.positiveOutcome), denominator: d30PlusCount, unit: "percent" },
      { metricCode: "negative_outcome_rate", value: profile.negativeOutcome, numerator: Math.round(d30PlusCount * profile.negativeOutcome), denominator: d30PlusCount, unit: "percent" },
      { metricCode: "high_balance_concentration_top5", value: profile.top5Conc, numerator: Math.round(d30PlusCount * 0.05 * profile.top5Conc * 100), denominator: Math.round(d30PlusCount * 0.05), unit: "percent" },
      { metricCode: "accounts_advanced_by_small_payment", value: profile.smallPayAdvance, unit: "count" },
      { metricCode: "avg_dpd", value: profile.avgDpd, unit: "days" },
      { metricCode: "charge_off_rate", value: profile.chargeOff, numerator: Math.round(d30PlusCount * profile.chargeOff), denominator: d30PlusCount, unit: "percent" },
    ];

    await db.insert(branchMetricSnapshots).values(
      metricRows.map((m) => ({
        branchId: branch.id,
        batchId: batch.id,
        metricCode: m.metricCode,
        value: numeric(m.value),
        numerator: m.numerator ?? null,
        denominator: m.denominator ?? null,
        unit: m.unit,
        availability: "available" as const,
        periodStart: PERIOD_START,
        periodEnd: PERIOD_END,
        asOfDate: AS_OF_DATE,
      }))
    );

    // DPD buckets
    const buckets = generateDpdBuckets(profile);
    await db.insert(branchDpdSnapshots).values(
      buckets.map((b) => ({
        branchId: branch.id,
        batchId: batch.id,
        bucket: b.bucket,
        accountCount: b.accountCount,
        balance: numeric(b.balance),
        portfolioShare: numeric(b.portfolioShare),
        asOfDate: AS_OF_DATE,
      }))
    );

    // Segment snapshots
    const loanTypes = ["Auto Loan", "Personal Loan", "Retail Installment"];
    const balanceTiers = ["<$10K", "$10K-$25K", ">$25K"];
    const segmentRows: {
      segmentType: string;
      segmentValue: string;
      metricCode: string;
      value: number;
      accountCount: number;
    }[] = [];

    for (const lt of loanTypes) {
      const lift = lt === "Auto Loan" ? 0.9 : lt === "Personal Loan" ? 1.1 : 1.0;
      segmentRows.push({
        segmentType: "loan_type",
        segmentValue: lt,
        metricCode: "delinquency_rate_30_plus",
        value: Math.min(0.35, profile.delinquencyRate * lift + (Math.random() - 0.5) * 0.02),
        accountCount: Math.round(profile.totalAccounts / loanTypes.length),
      });
    }

    for (const bt of balanceTiers) {
      const lift = bt === "<$10K" ? 0.85 : bt === "$10K-$25K" ? 1.0 : 1.25;
      segmentRows.push({
        segmentType: "balance_tier",
        segmentValue: bt,
        metricCode: "delinquency_rate_30_plus",
        value: Math.min(0.45, profile.delinquencyRate * lift + (Math.random() - 0.5) * 0.02),
        accountCount: Math.round(profile.totalAccounts / balanceTiers.length),
      });
    }

    await db.insert(branchSegmentSnapshots).values(
      segmentRows.map((s) => ({
        branchId: branch.id,
        batchId: batch.id,
        segmentType: s.segmentType,
        segmentValue: s.segmentValue,
        metricCode: s.metricCode,
        value: numeric(s.value),
        accountCount: s.accountCount,
        asOfDate: AS_OF_DATE,
      }))
    );

    // Insights
    const { narrative, evidence } = generateInsights(branch.name, profile, networkAvgDelinquency);
    await db.insert(branchInsights).values({
      branchId: branch.id,
      batchId: batch.id,
      narrative,
      evidence,
      modelVersion: "demo-static-v1",
      asOfDate: AS_OF_DATE,
    });
  }

  // Historical trend snapshots (13 months) for delinquency and cure rate
  const historyStart = new Date("2025-08-31");
  for (let i = 0; i < 13; i++) {
    const d = new Date(historyStart);
    d.setMonth(d.getMonth() + i);
    const asOf = d.toISOString().slice(0, 10);
    if (asOf === AS_OF_DATE) continue; // already seeded as the current period
    const periodStart = `${asOf.slice(0, 7)}-01`;

    for (const profile of branchProfiles) {
      const branch = branchByCode.get(profile.code)!;
      const seasonal = Math.sin((i / 12) * Math.PI * 2) * 0.015;
      const trend = (i - 6) * 0.002;
      const delinquencyValue = Math.max(0.04, Math.min(0.25, profile.delinquencyRate + seasonal + trend));
      const cureValue = Math.max(0.05, Math.min(0.35, profile.cureRate - seasonal * 0.5 + (Math.random() - 0.5) * 0.02));
      const d30Count = Math.round(profile.totalAccounts * delinquencyValue);

      await db.insert(branchMetricSnapshots).values([
        {
          branchId: branch.id,
          batchId: batch.id,
          metricCode: "delinquency_rate_30_plus",
          value: numeric(delinquencyValue),
          numerator: d30Count,
          denominator: profile.totalAccounts,
          unit: "percent",
          availability: "available",
          periodStart,
          periodEnd: asOf,
          asOfDate: asOf,
        },
        {
          branchId: branch.id,
          batchId: batch.id,
          metricCode: "cure_rate",
          value: numeric(cureValue),
          numerator: Math.round(d30Count * cureValue),
          denominator: d30Count,
          unit: "percent",
          availability: "available",
          periodStart,
          periodEnd: asOf,
          asOfDate: asOf,
        },
      ]);
    }
  }

  // Mark unavailable operational metrics for the latest period so the UI can show them honestly
  const unavailableMetrics = ["contact_rate", "avg_days_to_resolve", "collections_per_agent", "escalation_rate", "first_contact_timing"];
  for (const profile of branchProfiles) {
    const branch = branchByCode.get(profile.code)!;
    await db.insert(branchMetricSnapshots).values(
      unavailableMetrics.map((metricCode) => ({
        branchId: branch.id,
        batchId: batch.id,
        metricCode,
        value: null,
        numerator: null,
        denominator: null,
        unit: "percent" as const,
        availability: "unavailable" as const,
        periodStart: PERIOD_START,
        periodEnd: PERIOD_END,
        asOfDate: AS_OF_DATE,
      }))
    );
  }

  console.log("Seeded synthetic branch data.");
  console.log(`Branches: ${createdBranches.length}`);
  console.log(`Batch id: ${batch.id} (demo=${batch.isDemo})`);

  await pool.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
