import {
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

export const branches = pgTable("branches", {
  id: serial("id").primaryKey(),
  sourceBranchCode: text("source_branch_code").notNull().unique(),
  name: text("name").notNull(),
  region: text("region").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const metricDefinitions = pgTable("metric_definitions", {
  id: serial("id").primaryKey(),
  metricCode: text("metric_code").notNull().unique(),
  name: text("name").notNull(),
  unit: text("unit").notNull(), // percent, currency, count, days, ratio
  description: text("description"),
  hasNumeratorDenominator: boolean("has_numerator_denominator").notNull().default(false),
  version: integer("version").notNull().default(1),
  effectiveFrom: date("effective_from").notNull().default("2026-08-31"),
});

export const ingestionBatches = pgTable("ingestion_batches", {
  id: serial("id").primaryKey(),
  source: text("source").notNull(), // e.g. synthetic_demo
  reportType: text("report_type"),
  periodStart: date("period_start"),
  periodEnd: date("period_end"),
  asOfDate: date("as_of_date").notNull(),
  loadedAt: timestamp("loaded_at", { withTimezone: true }).defaultNow(),
  isDemo: boolean("is_demo").notNull().default(false),
  notes: text("notes"),
});

export const branchMetricSnapshots = pgTable(
  "branch_metric_snapshots",
  {
    id: serial("id").primaryKey(),
    branchId: integer("branch_id")
      .references(() => branches.id)
      .notNull(),
    batchId: integer("batch_id")
      .references(() => ingestionBatches.id)
      .notNull(),
    metricCode: text("metric_code").notNull(),
    value: numeric("value", { precision: 18, scale: 6 }),
    numerator: integer("numerator"),
    denominator: integer("denominator"),
    unit: text("unit").notNull(),
    availability: text("availability").notNull().default("available"), // available, unavailable, stale
    periodStart: date("period_start"),
    periodEnd: date("period_end"),
    asOfDate: date("as_of_date").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    unique("branch_metric_unique").on(t.branchId, t.metricCode, t.periodEnd, t.asOfDate),
  ]
);

export const branchDpdSnapshots = pgTable(
  "branch_dpd_snapshots",
  {
    id: serial("id").primaryKey(),
    branchId: integer("branch_id")
      .references(() => branches.id)
      .notNull(),
    batchId: integer("batch_id")
      .references(() => ingestionBatches.id)
      .notNull(),
    bucket: text("bucket").notNull(), // Current, 1-30, 30-59, 60-89, 90-119, 120+
    accountCount: integer("account_count").notNull(),
    balance: numeric("balance", { precision: 18, scale: 2 }),
    portfolioShare: numeric("portfolio_share", { precision: 10, scale: 6 }),
    asOfDate: date("as_of_date").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    unique("branch_dpd_unique").on(t.branchId, t.bucket, t.asOfDate),
  ]
);

export const branchSegmentSnapshots = pgTable(
  "branch_segment_snapshots",
  {
    id: serial("id").primaryKey(),
    branchId: integer("branch_id")
      .references(() => branches.id)
      .notNull(),
    batchId: integer("batch_id")
      .references(() => ingestionBatches.id)
      .notNull(),
    segmentType: text("segment_type").notNull(), // loan_type, balance_tier, tenure, dti_band, credit_band, funding_method
    segmentValue: text("segment_value").notNull(),
    metricCode: text("metric_code").notNull(),
    value: numeric("value", { precision: 18, scale: 6 }),
    accountCount: integer("account_count"),
    asOfDate: date("as_of_date").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    unique("branch_segment_unique").on(t.branchId, t.segmentType, t.segmentValue, t.metricCode, t.asOfDate),
  ]
);

export const branchInsights = pgTable("branch_insights", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id")
    .references(() => branches.id)
    .notNull(),
  batchId: integer("batch_id")
    .references(() => ingestionBatches.id)
    .notNull(),
  narrative: text("narrative").notNull(),
  evidence: jsonb("evidence").notNull().default("[]"),
  modelVersion: text("model_version").default("demo-static"),
  generatedAt: timestamp("generated_at", { withTimezone: true }).defaultNow(),
  asOfDate: date("as_of_date").notNull(),
});

export type Branch = typeof branches.$inferSelect;
export type MetricDefinition = typeof metricDefinitions.$inferSelect;
export type IngestionBatch = typeof ingestionBatches.$inferSelect;
export type BranchMetricSnapshot = typeof branchMetricSnapshots.$inferSelect;
export type BranchDpdSnapshot = typeof branchDpdSnapshots.$inferSelect;
export type BranchSegmentSnapshot = typeof branchSegmentSnapshots.$inferSelect;
export type BranchInsight = typeof branchInsights.$inferSelect;
