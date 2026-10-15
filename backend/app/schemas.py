from datetime import datetime
from typing import Any, Literal

# pyrefly: ignore [missing-import]
from pydantic import BaseModel, ConfigDict


def _to_camel(snake: str) -> str:
    parts = snake.split("_")
    return parts[0] + "".join(part.capitalize() for part in parts[1:])


class CamelBase(BaseModel):
    model_config = ConfigDict(
        alias_generator=_to_camel,
        populate_by_name=True,
        from_attributes=True,
        extra="ignore",
    )


class ApiMeta(CamelBase):
    as_of_date: str
    period: dict[str, str] | None = None
    source: str
    is_demo: bool


class MetricValue(CamelBase):
    metric_code: str
    name: str
    value: float | None
    numerator: int | None = None
    denominator: int | None = None
    unit: str
    availability: Literal["available", "unavailable", "stale"]
    source: str
    definition_version: int
    period: dict[str, str] | None = None


class BranchSummary(CamelBase):
    id: int
    source_branch_code: str
    name: str
    region: str
    metrics: dict[str, MetricValue]
    primary_metric: float | None = None


class BranchData(CamelBase):
    id: int
    source_branch_code: str
    name: str
    region: str


class DpdBucket(CamelBase):
    bucket: str
    account_count: int
    balance: float | None
    portfolio_share: float | None


class DriverItem(CamelBase):
    segment_type: str
    segment_value: str
    metric_code: str
    branch_value: float
    network_value: float
    delta: float
    unit: str
    account_count: int | None


class RootCauseDriverItem(CamelBase):
    metric_code: str
    name: str
    value: float | None
    unit: str
    availability: Literal["available", "unavailable", "stale"]
    contributing_segments: list[dict[str, Any]]


class InsightEvidenceItem(CamelBase):
    metric_code: str
    branch_value: float
    network_value: float
    delta: float
    unit: str


class InsightItem(CamelBase):
    id: int
    narrative: str
    evidence: list[InsightEvidenceItem]
    model_version: str | None
    generated_at: datetime | None


class NetworkData(CamelBase):
    branches: list[BranchSummary]
    network_averages: dict[str, float | None]


class NetworkResponse(CamelBase):
    data: NetworkData
    meta: ApiMeta


class OverviewData(CamelBase):
    branch: BranchData
    metrics: dict[str, MetricValue]


class BranchOverviewResponse(CamelBase):
    data: OverviewData
    meta: ApiMeta


class PerformanceComparisonPeriod(CamelBase):
    label: str
    start: str
    end: str


class PerformanceData(CamelBase):
    branch: BranchData
    dpd_distribution: list[DpdBucket]
    trends: dict[str, list[dict[str, Any]]]
    outcomes: dict[str, MetricValue]
    comparison_periods: list[PerformanceComparisonPeriod]
    monthly_kpis: dict[str, list[MetricValue]]


class BranchPerformanceResponse(CamelBase):
    data: PerformanceData
    meta: ApiMeta


class PeersData(CamelBase):
    branch: BranchData
    peers: list[BranchSummary]
    network_averages: dict[str, float | None]


class BranchPeersResponse(CamelBase):
    data: PeersData
    meta: ApiMeta


class DriversData(CamelBase):
    branch: BranchData
    drivers: list[DriverItem]
    root_cause_drivers: list[RootCauseDriverItem]


class BranchDriversResponse(CamelBase):
    data: DriversData
    meta: ApiMeta


class BranchInsightsResponse(CamelBase):
    data: list[InsightItem]
    meta: ApiMeta


class AIInsightEvidence(CamelBase):
    metric_code: str
    branch_value: float | None
    benchmark_value: float | None = None
    delta: float | None = None
    unit: str
    source: str


class AIInsightMeta(CamelBase):
    insight_type: Literal["branch_comparison", "selected_kpi", "overall_branch"]
    status: Literal["ai", "fallback", "unavailable"]
    model_version: str
    generated_at: datetime
    source_data_version: str


class BranchComparisonInsight(CamelBase):
    narrative: str
    strengths: list[str]
    weaknesses: list[str]
    recommendations: list[str]
    evidence: list[AIInsightEvidence]


class SelectedKpiInsight(CamelBase):
    metric_code: str
    narrative: str
    performance_direction: Literal["favorable", "unfavorable", "neutral", "unavailable"]
    core_variance: str | None = None
    frontline_driver: str | None = None
    priority_action: str | None = None
    cohort_focus: str | None = None
    recommendation: str
    evidence: list[AIInsightEvidence]


class OverallBranchInsight(CamelBase):
    narrative: str
    evidence: list[AIInsightEvidence]


class BranchComparisonAIResponse(CamelBase):
    data: BranchComparisonInsight
    meta: ApiMeta
    ai: AIInsightMeta


class SelectedKpiAIResponse(CamelBase):
    data: SelectedKpiInsight
    meta: ApiMeta
    ai: AIInsightMeta


class OverallBranchAIResponse(CamelBase):
    data: OverallBranchInsight
    meta: ApiMeta
    ai: AIInsightMeta


class BranchesResponse(CamelBase):
    data: list[BranchSummary]
    meta: ApiMeta


class ErrorResponse(BaseModel):
    error: str
