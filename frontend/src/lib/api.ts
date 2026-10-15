import type {
  ApiMeta,
  BranchSummary,
  BranchOverviewResponse,
  BranchPerformanceResponse,
  BranchPeersResponse,
  BranchDriversResponse,
  BranchInsightsResponse,
  MetricValue,
  NetworkResponse,
  DriverItem,
  RootCauseDriverItem,
  InsightItem,
  BranchComparisonAIResponse,
  SelectedKpiAIResponse,
  OverallBranchAIResponse,
} from "@recoveryops/shared";

const API_BASE =
  ((import.meta.env as Record<string, unknown>)["VITE_API_URL"] as string | undefined) ??
  "http://localhost:3001/api";

export type {
  ApiMeta,
  BranchSummary,
  BranchOverviewResponse,
  BranchPerformanceResponse,
  BranchPeersResponse,
  BranchDriversResponse,
  BranchInsightsResponse,
  MetricValue,
  NetworkResponse,
  DriverItem,
  RootCauseDriverItem,
  InsightItem,
  BranchComparisonAIResponse,
  SelectedKpiAIResponse,
  OverallBranchAIResponse,
};

function buildQuery(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { accept: "application/json" },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error");
    throw new Error(`API ${path} failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  getNetwork: (asOfDate?: string) =>
    fetchJson<NetworkResponse>(`/analytics/network${buildQuery({ as_of_date: asOfDate })}`),
  getBranches: (asOfDate?: string) =>
    fetchJson<{ data: BranchSummary[]; meta: ApiMeta }>(
      `/branches${buildQuery({ as_of_date: asOfDate })}`,
    ),
  getBranchOverview: (branchId: number, asOfDate?: string) =>
    fetchJson<BranchOverviewResponse>(
      `/branches/${branchId}/overview${buildQuery({ as_of_date: asOfDate })}`,
    ),
  getBranchPerformance: (branchId: number, asOfDate?: string, fromDate?: string, toDate?: string) =>
    fetchJson<BranchPerformanceResponse>(
      `/branches/${branchId}/performance${buildQuery({ as_of_date: asOfDate, from_date: fromDate, to_date: toDate })}`,
    ),
  getBranchPeers: (branchId: number, asOfDate?: string) =>
    fetchJson<BranchPeersResponse>(
      `/branches/${branchId}/peers${buildQuery({ as_of_date: asOfDate })}`,
    ),
  getBranchDrivers: (branchId: number, asOfDate?: string) =>
    fetchJson<BranchDriversResponse>(
      `/branches/${branchId}/drivers${buildQuery({ as_of_date: asOfDate })}`,
    ),
  getBranchInsights: (branchId: number, asOfDate?: string) =>
    fetchJson<BranchInsightsResponse>(
      `/branches/${branchId}/insights${buildQuery({ as_of_date: asOfDate })}`,
    ),
  getBranchComparisonAI: (branchId: number, asOfDate?: string) =>
    fetchJson<BranchComparisonAIResponse>(
      `/branches/${branchId}/ai-insights/comparison${buildQuery({ as_of_date: asOfDate })}`,
    ),
  getSelectedKpiAI: (branchId: number, kpi: string, asOfDate?: string) =>
    fetchJson<SelectedKpiAIResponse>(
      `/branches/${branchId}/ai-insights/kpi${buildQuery({ kpi, as_of_date: asOfDate })}`,
    ),
  getOverallBranchAI: (branchId: number, asOfDate?: string) =>
    fetchJson<OverallBranchAIResponse>(
      `/branches/${branchId}/ai-insights/overall${buildQuery({ as_of_date: asOfDate })}`,
    ),
};

export function formatMetricValue(m: MetricValue | undefined): string {
  if (!m || m.value == null || m.availability !== "available") return "—";
  switch (m.unit) {
    case "percent":
      return `${(m.value * 100).toFixed(1)}%`;
    case "currency":
      return `$${(m.value / 1000).toFixed(1)}K`;
    case "count":
      return Math.round(m.value).toLocaleString();
    case "days":
      return `${Math.round(m.value)}d`;
    default:
      return `${m.value}`;
  }
}

export function getMetric(
  metrics: Record<string, MetricValue> | undefined,
  code: string,
): MetricValue | undefined {
  return metrics?.[code];
}

export function getMetricValue(
  metrics: Record<string, MetricValue> | undefined,
  code: string,
): number | null {
  return getMetric(metrics, code)?.value ?? null;
}
