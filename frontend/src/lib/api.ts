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
} from "@recoveryops/shared";

const API_BASE = ((import.meta.env as Record<string, unknown>)["VITE_API_URL"] as string | undefined) ?? "http://localhost:3001/api";

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
};

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
    fetchJson<NetworkResponse>(`/analytics/network${asOfDate ? `?asOfDate=${asOfDate}` : ""}`),
  getBranches: (asOfDate?: string) =>
    fetchJson<{ data: BranchSummary[]; meta: ApiMeta }>(`/branches${asOfDate ? `?asOfDate=${asOfDate}` : ""}`),
  getBranchOverview: (branchId: number, asOfDate?: string) =>
    fetchJson<BranchOverviewResponse>(`/branches/${branchId}/overview${asOfDate ? `?asOfDate=${asOfDate}` : ""}`),
  getBranchPerformance: (branchId: number, from?: string, to?: string) => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const qs = params.toString();
    return fetchJson<BranchPerformanceResponse>(`/branches/${branchId}/performance${qs ? `?${qs}` : ""}`);
  },
  getBranchPeers: (branchId: number, asOfDate?: string) =>
    fetchJson<BranchPeersResponse>(`/branches/${branchId}/peers${asOfDate ? `?asOfDate=${asOfDate}` : ""}`),
  getBranchDrivers: (branchId: number, asOfDate?: string) =>
    fetchJson<BranchDriversResponse>(`/branches/${branchId}/drivers${asOfDate ? `?asOfDate=${asOfDate}` : ""}`),
  getBranchInsights: (branchId: number, asOfDate?: string) =>
    fetchJson<BranchInsightsResponse>(`/branches/${branchId}/insights${asOfDate ? `?asOfDate=${asOfDate}` : ""}`),
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
  code: string
): MetricValue | undefined {
  return metrics?.[code];
}

export function getMetricValue(metrics: Record<string, MetricValue> | undefined, code: string): number | null {
  return getMetric(metrics, code)?.value ?? null;
}
