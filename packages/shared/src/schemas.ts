import { z } from "zod";

export const METRIC_CODES = [
  // Five core Branch-Level KPIs
  "collection_efficiency",
  "avg_days_to_resolve",
  "contact_rate",
  "ptp_kept_rate",
  "dpd_30_plus_concentration",
  // Supporting metrics retained for legacy endpoints
  "delinquency_rate_30_plus",
  "cure_rate",
  "roll_rate",
  "autopay_active_pct",
  "fpd_count",
  "fpd_rate",
  "payment_total",
  "positive_outcome_rate",
  "negative_outcome_rate",
  "high_balance_concentration_top5",
  "accounts_advanced_by_small_payment",
  "avg_dpd",
  "charge_off_rate",
  "collections_per_agent",
  "escalation_rate",
  "first_contact_timing",
] as const;

export type MetricCode = (typeof METRIC_CODES)[number];

export const METRIC_UNITS = ["percent", "currency", "count", "days", "ratio"] as const;
export type MetricUnit = (typeof METRIC_UNITS)[number];

export const METRIC_AVAILABILITY = ["available", "unavailable", "stale"] as const;
export type MetricAvailability = (typeof METRIC_AVAILABILITY)[number];

export const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const branchIdParamSchema = z.object({
  branchId: z.coerce.number().int().positive("branchId must be a positive integer"),
});

export const asOfDateQuerySchema = z.object({
  as_of_date: dateStringSchema.optional(),
});

export const performanceQuerySchema = z.object({
  as_of_date: dateStringSchema.optional(),
  from_date: dateStringSchema.optional(),
  to_date: dateStringSchema.optional(),
});

export type DateString = z.infer<typeof dateStringSchema>;
export type BranchIdParam = z.infer<typeof branchIdParamSchema>;
export type AsOfDateQuery = z.infer<typeof asOfDateQuerySchema>;
export type PerformanceQuery = z.infer<typeof performanceQuerySchema>;
