import { Router } from "express";
import { and, desc, eq, gte, inArray, lte, ne } from "drizzle-orm";
import {
  asOfDateQuerySchema,
  branchIdParamSchema,
  performanceQuerySchema,
  type MetricValue,
} from "@recoveryops/shared";
import { db } from "../db/index.js";
import {
  branches,
  branchDpdSnapshots,
  branchInsights,
  branchMetricSnapshots,
  branchSegmentSnapshots,
  ingestionBatches,
  metricDefinitions,
} from "../db/schema.js";

const router = Router();

const SUMMARY_METRICS = [
  "delinquency_rate_30_plus",
  "cure_rate",
  "ptp_kept_rate",
  "autopay_active_pct",
  "payment_total",
  "fpd_count",
  "positive_outcome_rate",
];

const PERFORMANCE_METRICS = [
  "delinquency_rate_30_plus",
  "cure_rate",
  "roll_rate",
  "ptp_kept_rate",
  "positive_outcome_rate",
  "negative_outcome_rate",
  "charge_off_rate",
  "autopay_active_pct",
];

function parseParams<T>(schema: { safeParse: (input: unknown) => { success: boolean; data?: T; error?: { issues: { message: string }[] } } }, input: unknown, res: import("express").Response): T | null {
  const result = schema.safeParse(input);
  if (!result.success) {
    res.status(400).json({ error: result.error?.issues.map((i) => i.message).join(", ") ?? "Invalid input" });
    return null;
  }
  return result.data as T;
}

function parseQuery<T>(schema: { safeParse: (input: unknown) => { success: boolean; data?: T; error?: { issues: { message: string }[] } } }, input: unknown, res: import("express").Response): T | null {
  return parseParams(schema, input, res);
}

async function resolveBatch(asOfDate?: string) {
  if (asOfDate) {
    const batch = await db.query.ingestionBatches.findFirst({
      where: eq(ingestionBatches.asOfDate, asOfDate),
      orderBy: desc(ingestionBatches.loadedAt),
    });
    if (batch) return batch;
  }
  return db.query.ingestionBatches.findFirst({
    orderBy: desc(ingestionBatches.asOfDate),
  });
}

async function getMetricDefinitionsMap() {
  const defs = await db.query.metricDefinitions.findMany();
  return new Map(defs.map((d) => [d.metricCode, d]));
}

function toMetricValue(
  snapshot: typeof branchMetricSnapshots.$inferSelect | undefined,
  defMap: Map<string, typeof metricDefinitions.$inferSelect>,
  source: string,
  isDemo: boolean
): MetricValue {
  if (!snapshot) {
    return {
      metricCode: "",
      name: "",
      value: null,
      unit: "percent",
      availability: "unavailable",
      source: isDemo ? "synthetic_demo" : source,
      definitionVersion: 1,
    };
  }
  const def = defMap.get(snapshot.metricCode);
  return {
    metricCode: snapshot.metricCode,
    name: def?.name ?? snapshot.metricCode,
    value: snapshot.value != null ? Number(snapshot.value) : null,
    numerator: snapshot.numerator ?? null,
    denominator: snapshot.denominator ?? null,
    unit: snapshot.unit,
    period: snapshot.periodStart && snapshot.periodEnd
      ? { start: snapshot.periodStart, end: snapshot.periodEnd }
      : null,
    availability: snapshot.availability as MetricValue["availability"],
    source: isDemo ? "synthetic_demo" : source,
    definitionVersion: def?.version ?? 1,
  };
}

async function getBranchMetricsMap(
  branchIds: number[],
  batchId: number,
  metricCodes: string[],
  defMap: Map<string, typeof metricDefinitions.$inferSelect>,
  source: string,
  isDemo: boolean
) {
  const snapshots = await db.query.branchMetricSnapshots.findMany({
    where: and(
      eq(branchMetricSnapshots.batchId, batchId),
      branchIds.length === 1
        ? eq(branchMetricSnapshots.branchId, branchIds[0])
        : inArray(branchMetricSnapshots.branchId, branchIds),
      metricCodes.length === 1
        ? eq(branchMetricSnapshots.metricCode, metricCodes[0])
        : inArray(branchMetricSnapshots.metricCode, metricCodes)
    ),
  });

  const map = new Map<number, Map<string, MetricValue>>();
  for (const s of snapshots) {
    if (!map.has(s.branchId)) map.set(s.branchId, new Map());
    map.get(s.branchId)!.set(s.metricCode, toMetricValue(s, defMap, source, isDemo));
  }
  return map;
}

router.get("/branches", async (req, res, next) => {
  try {
    const query = parseQuery(asOfDateQuerySchema, req.query, res);
    if (!query && res.headersSent) return;
    const asOfDate = query?.asOfDate;
    const batch = await resolveBatch(asOfDate);
    if (!batch) return res.status(404).json({ error: "No data available" });

    const allBranches = await db.query.branches.findMany({
      where: eq(branches.active, true),
      orderBy: branches.sourceBranchCode,
    });

    const defMap = await getMetricDefinitionsMap();
    const metricsMap = await getBranchMetricsMap(
      allBranches.map((b) => b.id),
      batch.id,
      SUMMARY_METRICS,
      defMap,
      batch.source,
      batch.isDemo
    );

    const branchesOut = allBranches.map((b) => ({
      id: b.id,
      sourceBranchCode: b.sourceBranchCode,
      name: b.name,
      region: b.region,
      metrics: Object.fromEntries(metricsMap.get(b.id)?.entries() ?? []),
    }));

    res.json({
      data: branchesOut,
      meta: {
        asOfDate: batch.asOfDate,
        period: { start: batch.periodStart, end: batch.periodEnd },
        source: batch.source,
        isDemo: batch.isDemo,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get("/analytics/network", async (req, res, next) => {
  try {
    const query = parseQuery(asOfDateQuerySchema, req.query, res);
    if (!query && res.headersSent) return;
    const asOfDate = query?.asOfDate;
    const batch = await resolveBatch(asOfDate);
    if (!batch) return res.status(404).json({ error: "No data available" });

    const allBranches = await db.query.branches.findMany({
      where: eq(branches.active, true),
    });

    const defMap = await getMetricDefinitionsMap();
    const metricsMap = await getBranchMetricsMap(
      allBranches.map((b) => b.id),
      batch.id,
      SUMMARY_METRICS,
      defMap,
      batch.source,
      batch.isDemo
    );

    const averages: Record<string, number | null> = {};
    for (const code of SUMMARY_METRICS) {
      const values: number[] = [];
      for (const b of allBranches) {
        const m = metricsMap.get(b.id)?.get(code);
        if (m && m.value != null && m.availability === "available") {
          values.push(m.value);
        }
      }
      averages[code] = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
    }

    const ranked = allBranches
      .map((b) => {
        const m = metricsMap.get(b.id);
        return {
          id: b.id,
          sourceBranchCode: b.sourceBranchCode,
          name: b.name,
          region: b.region,
          primaryMetric: m?.get("delinquency_rate_30_plus")?.value ?? null,
          metrics: Object.fromEntries(m?.entries() ?? []),
        };
      })
      .sort((a, b) => (b.primaryMetric ?? 0) - (a.primaryMetric ?? 0));

    res.json({
      data: {
        branches: ranked,
        networkAverages: averages,
      },
      meta: {
        asOfDate: batch.asOfDate,
        period: { start: batch.periodStart, end: batch.periodEnd },
        source: batch.source,
        isDemo: batch.isDemo,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get("/branches/:branchId/overview", async (req, res, next) => {
  try {
    const params = parseParams(branchIdParamSchema, req.params, res);
    if (!params) return;
    const branchId = params.branchId;

    const query = parseQuery(asOfDateQuerySchema, req.query, res);
    if (!query && res.headersSent) return;
    const asOfDate = query?.asOfDate;

    const batch = await resolveBatch(asOfDate);
    if (!batch) return res.status(404).json({ error: "No data available" });

    const branch = await db.query.branches.findFirst({
      where: eq(branches.id, branchId),
    });
    if (!branch) return res.status(404).json({ error: "Branch not found" });

    const defMap = await getMetricDefinitionsMap();
    const metricsMap = await getBranchMetricsMap(
      [branchId],
      batch.id,
      [...SUMMARY_METRICS, ...PERFORMANCE_METRICS],
      defMap,
      batch.source,
      batch.isDemo
    );

    res.json({
      data: {
        branch: {
          id: branch.id,
          sourceBranchCode: branch.sourceBranchCode,
          name: branch.name,
          region: branch.region,
        },
        metrics: Object.fromEntries(metricsMap.get(branchId)?.entries() ?? []),
      },
      meta: {
        asOfDate: batch.asOfDate,
        period: { start: batch.periodStart, end: batch.periodEnd },
        source: batch.source,
        isDemo: batch.isDemo,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get("/branches/:branchId/performance", async (req, res, next) => {
  try {
    const params = parseParams(branchIdParamSchema, req.params, res);
    if (!params) return;
    const branchId = params.branchId;

    const query = parseQuery(asOfDateQuerySchema, req.query, res);
    if (!query && res.headersSent) return;
    const asOfDate = query?.asOfDate;

    const batch = await resolveBatch(asOfDate);
    if (!batch) return res.status(404).json({ error: "No data available" });

    const branch = await db.query.branches.findFirst({
      where: eq(branches.id, branchId),
    });
    if (!branch) return res.status(404).json({ error: "Branch not found" });

    const perfQuery = parseQuery(performanceQuerySchema, req.query, res);
    if (!perfQuery && res.headersSent) return;
    const fromDate = perfQuery?.from;
    const toDate = perfQuery?.to ?? batch.asOfDate;

    const dpdRows = await db.query.branchDpdSnapshots.findMany({
      where: and(
        eq(branchDpdSnapshots.branchId, branchId),
        eq(branchDpdSnapshots.asOfDate, batch.asOfDate)
      ),
      orderBy: branchDpdSnapshots.bucket,
    });

    const trendRows = await db.query.branchMetricSnapshots.findMany({
      where: and(
        eq(branchMetricSnapshots.branchId, branchId),
        eq(branchMetricSnapshots.batchId, batch.id),
        inArray(branchMetricSnapshots.metricCode, ['delinquency_rate_30_plus','cure_rate']),
        fromDate ? gte(branchMetricSnapshots.asOfDate, fromDate) : undefined,
        toDate ? lte(branchMetricSnapshots.asOfDate, toDate) : undefined
      ),
      orderBy: branchMetricSnapshots.asOfDate,
    });

    const trends: Record<string, { period: string; value: number }[]> = {};
    for (const row of trendRows) {
      if (row.value == null) continue;
      if (!trends[row.metricCode]) trends[row.metricCode] = [];
      trends[row.metricCode]!.push({
        period: row.periodEnd ?? row.asOfDate,
        value: Number(row.value),
      });
    }

    const defMap = await getMetricDefinitionsMap();
    const metricsMap = await getBranchMetricsMap(
      [branchId],
      batch.id,
      PERFORMANCE_METRICS,
      defMap,
      batch.source,
      batch.isDemo
    );

    res.json({
      data: {
        branch: {
          id: branch.id,
          sourceBranchCode: branch.sourceBranchCode,
          name: branch.name,
          region: branch.region,
        },
        dpdDistribution: dpdRows.map((r) => ({
          bucket: r.bucket,
          accountCount: r.accountCount,
          balance: r.balance != null ? Number(r.balance) : null,
          portfolioShare: r.portfolioShare != null ? Number(r.portfolioShare) : null,
        })),
        trends,
        outcomes: Object.fromEntries(metricsMap.get(branchId)?.entries() ?? []),
      },
      meta: {
        asOfDate: batch.asOfDate,
        period: { start: batch.periodStart, end: batch.periodEnd },
        source: batch.source,
        isDemo: batch.isDemo,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get("/branches/:branchId/peers", async (req, res, next) => {
  try {
    const params = parseParams(branchIdParamSchema, req.params, res);
    if (!params) return;
    const branchId = params.branchId;

    const query = parseQuery(asOfDateQuerySchema, req.query, res);
    if (!query && res.headersSent) return;
    const asOfDate = query?.asOfDate;

    const batch = await resolveBatch(asOfDate);
    if (!batch) return res.status(404).json({ error: "No data available" });

    const branch = await db.query.branches.findFirst({
      where: eq(branches.id, branchId),
    });
    if (!branch) return res.status(404).json({ error: "Branch not found" });

    const peers = await db.query.branches.findMany({
      where: and(eq(branches.active, true), ne(branches.id, branchId)),
    });

    const defMap = await getMetricDefinitionsMap();
    const metricsMap = await getBranchMetricsMap(
      peers.map((p) => p.id),
      batch.id,
      SUMMARY_METRICS,
      defMap,
      batch.source,
      batch.isDemo
    );

    const peerData = peers.map((p) => ({
      id: p.id,
      sourceBranchCode: p.sourceBranchCode,
      name: p.name,
      region: p.region,
      metrics: Object.fromEntries(metricsMap.get(p.id)?.entries() ?? []),
    }));

    const averages: Record<string, number | null> = {};
    for (const code of SUMMARY_METRICS) {
      const values: number[] = [];
      for (const p of peers) {
        const m = metricsMap.get(p.id)?.get(code);
        if (m && m.value != null && m.availability === "available") {
          values.push(m.value);
        }
      }
      averages[code] = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
    }

    res.json({
      data: {
        branch: {
          id: branch.id,
          sourceBranchCode: branch.sourceBranchCode,
          name: branch.name,
          region: branch.region,
        },
        peers: peerData,
        networkAverages: averages,
      },
      meta: {
        asOfDate: batch.asOfDate,
        period: { start: batch.periodStart, end: batch.periodEnd },
        source: batch.source,
        isDemo: batch.isDemo,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get("/branches/:branchId/drivers", async (req, res, next) => {
  try {
    const params = parseParams(branchIdParamSchema, req.params, res);
    if (!params) return;
    const branchId = params.branchId;

    const query = parseQuery(asOfDateQuerySchema, req.query, res);
    if (!query && res.headersSent) return;
    const asOfDate = query?.asOfDate;

    const batch = await resolveBatch(asOfDate);
    if (!batch) return res.status(404).json({ error: "No data available" });

    const branch = await db.query.branches.findFirst({
      where: eq(branches.id, branchId),
    });
    if (!branch) return res.status(404).json({ error: "Branch not found" });

    const branchSegments = await db.query.branchSegmentSnapshots.findMany({
      where: and(
        eq(branchSegmentSnapshots.branchId, branchId),
        eq(branchSegmentSnapshots.asOfDate, batch.asOfDate)
      ),
    });

    const allSegments = await db.query.branchSegmentSnapshots.findMany({
      where: and(
        eq(branchSegmentSnapshots.asOfDate, batch.asOfDate),
        eq(branchSegmentSnapshots.metricCode, 'delinquency_rate_30_plus')
      ),
    });

    const networkAvgBySegment = new Map<string, number>();
    const countsBySegment = new Map<string, number>();
    for (const s of allSegments) {
      if (s.value == null) continue;
      const key = `${s.segmentType}::${s.segmentValue}`;
      networkAvgBySegment.set(key, (networkAvgBySegment.get(key) ?? 0) + Number(s.value));
      countsBySegment.set(key, (countsBySegment.get(key) ?? 0) + 1);
    }
    for (const [key, sum] of networkAvgBySegment) {
      networkAvgBySegment.set(key, sum / (countsBySegment.get(key) ?? 1));
    }

    const drivers = branchSegments
      .filter((s) => s.metricCode === "delinquency_rate_30_plus" && s.value != null)
      .map((s) => {
        const key = `${s.segmentType}::${s.segmentValue}`;
        const networkAvg = networkAvgBySegment.get(key) ?? Number(s.value);
        const branchValue = Number(s.value);
        return {
          segmentType: s.segmentType,
          segmentValue: s.segmentValue,
          metricCode: s.metricCode,
          branchValue,
          networkValue: networkAvg,
          delta: branchValue - networkAvg,
          accountCount: s.accountCount,
        };
      })
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 8);

    res.json({
      data: {
        branch: {
          id: branch.id,
          sourceBranchCode: branch.sourceBranchCode,
          name: branch.name,
          region: branch.region,
        },
        drivers,
      },
      meta: {
        asOfDate: batch.asOfDate,
        period: { start: batch.periodStart, end: batch.periodEnd },
        source: batch.source,
        isDemo: batch.isDemo,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get("/branches/:branchId/insights", async (req, res, next) => {
  try {
    const params = parseParams(branchIdParamSchema, req.params, res);
    if (!params) return;
    const branchId = params.branchId;

    const query = parseQuery(asOfDateQuerySchema, req.query, res);
    if (!query && res.headersSent) return;
    const asOfDate = query?.asOfDate;

    const batch = await resolveBatch(asOfDate);
    if (!batch) return res.status(404).json({ error: "No data available" });

    const branch = await db.query.branches.findFirst({
      where: eq(branches.id, branchId),
    });
    if (!branch) return res.status(404).json({ error: "Branch not found" });

    const insights = await db.query.branchInsights.findMany({
      where: and(
        eq(branchInsights.branchId, branchId),
        eq(branchInsights.asOfDate, batch.asOfDate)
      ),
      orderBy: desc(branchInsights.generatedAt),
    });

    res.json({
      data: insights.map((i) => ({
        id: i.id,
        narrative: i.narrative,
        evidence: i.evidence,
        modelVersion: i.modelVersion,
        generatedAt: i.generatedAt,
      })),
      meta: {
        asOfDate: batch.asOfDate,
        source: batch.source,
        isDemo: batch.isDemo,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
