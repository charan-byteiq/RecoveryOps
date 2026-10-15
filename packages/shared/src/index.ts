import type { MetricAvailability } from "./schemas.js";

export {
  METRIC_CODES,
  METRIC_UNITS,
  METRIC_AVAILABILITY,
  dateStringSchema,
  branchIdParamSchema,
  asOfDateQuerySchema,
  performanceQuerySchema,
} from "./schemas.js";

export type {
  MetricCode,
  MetricUnit,
  MetricAvailability,
  DateString,
  BranchIdParam,
  AsOfDateQuery,
  PerformanceQuery,
} from "./schemas.js";

export interface ApiMeta {
  asOfDate: string;
  period?: { start: string; end: string };
  source: string;
  isDemo: boolean;
}

export interface MetricValue {
  metricCode: string;
  name: string;
  value: number | null;
  numerator?: number | null;
  denominator?: number | null;
  unit: string;
  availability: MetricAvailability;
  source: string;
  definitionVersion: number;
  period?: { start: string; end: string } | null;
}

export interface BranchSummary {
  id: number;
  sourceBranchCode: string;
  name: string;
  region: string;
  metrics: Record<string, MetricValue>;
}

export interface DpdBucket {
  bucket: string;
  accountCount: number;
  balance: number | null;
  portfolioShare: number | null;
}

export interface DriverItem {
  segmentType: string;
  segmentValue: string;
  metricCode: string;
  branchValue: number;
  networkValue: number;
  delta: number;
  unit: string;
  accountCount: number | null;
}

export interface ContributingSegment {
  segmentType: string;
  segmentValue: string;
  impact: number;
}

export interface RootCauseDriverItem {
  metricCode: string;
  name: string;
  value: number | null;
  unit: string;
  availability: MetricAvailability;
  contributingSegments: ContributingSegment[];
}

export interface InsightEvidenceItem {
  metricCode: string;
  branchValue: number;
  networkValue: number;
  delta: number;
  unit: string;
}

export interface InsightItem {
  id: number;
  narrative: string;
  evidence: InsightEvidenceItem[];
  modelVersion: string | null;
  generatedAt: string | null;
}

export interface NetworkResponse {
  data: {
    branches: BranchSummary[];
    networkAverages: Record<string, number | null>;
  };
  meta: ApiMeta;
}

export interface BranchOverviewResponse {
  data: {
    branch: Omit<BranchSummary, "metrics">;
    metrics: Record<string, MetricValue>;
  };
  meta: ApiMeta;
}

export interface PerformanceComparisonPeriod {
  label: string;
  start: string;
  end: string;
}

export interface BranchPerformanceResponse {
  data: {
    branch: Omit<BranchSummary, "metrics">;
    dpdDistribution: DpdBucket[];
    trends: Record<string, { period: string; value: number }[]>;
    outcomes: Record<string, MetricValue>;
    comparisonPeriods: PerformanceComparisonPeriod[];
    monthlyKpis: Record<string, MetricValue[]>;
  };
  meta: ApiMeta;
}

export interface BranchPeersResponse {
  data: {
    branch: Omit<BranchSummary, "metrics">;
    peers: BranchSummary[];
    networkAverages: Record<string, number | null>;
  };
  meta: ApiMeta;
}

export interface BranchDriversResponse {
  data: {
    branch: Omit<BranchSummary, "metrics">;
    drivers: DriverItem[];
    rootCauseDrivers: RootCauseDriverItem[];
  };
  meta: ApiMeta;
}

export interface BranchInsightsResponse {
  data: InsightItem[];
  meta: ApiMeta;
}

export interface AIInsightEvidence {
  metricCode: string;
  branchValue: number | null;
  benchmarkValue: number | null;
  delta: number | null;
  unit: string;
  source: string;
}

export interface AIInsightMeta {
  insightType: "branch_comparison" | "selected_kpi" | "overall_branch";
  status: "ai" | "fallback" | "unavailable";
  modelVersion: string;
  generatedAt: string;
  sourceDataVersion: string;
}

export interface BranchComparisonAIResponse {
  data: {
    narrative: string;
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
    evidence: AIInsightEvidence[];
  };
  meta: ApiMeta;
  ai: AIInsightMeta;
}

export interface SelectedKpiAIResponse {
  data: {
    metricCode: string;
    narrative: string;
    performanceDirection: "favorable" | "unfavorable" | "neutral" | "unavailable";
    coreVariance: string | null;
    frontlineDriver: string | null;
    priorityAction: string | null;
    cohortFocus: string | null;
    recommendation: string;
    evidence: AIInsightEvidence[];
  };
  meta: ApiMeta;
  ai: AIInsightMeta;
}

export interface OverallBranchAIResponse {
  data: {
    narrative: string;
    evidence: AIInsightEvidence[];
  };
  meta: ApiMeta;
  ai: AIInsightMeta;
}

export const API_ENDPOINTS = {
  health: "/api/health",
  network: "/api/analytics/network",
  branches: "/api/branches",
  branchOverview: (id: number) => `/api/branches/${id}/overview`,
  branchPerformance: (id: number) => `/api/branches/${id}/performance`,
  branchPeers: (id: number) => `/api/branches/${id}/peers`,
  branchDrivers: (id: number) => `/api/branches/${id}/drivers`,
  branchInsights: (id: number) => `/api/branches/${id}/insights`,
  branchComparisonAI: (id: number) => `/api/branches/${id}/ai-insights/comparison`,
  selectedKpiAI: (id: number) => `/api/branches/${id}/ai-insights/kpi`,
  overallBranchAI: (id: number) => `/api/branches/${id}/ai-insights/overall`,
} as const;
