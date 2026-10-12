from datetime import datetime
from typing import Any, Literal

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
    account_count: int | None


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


class PerformanceData(CamelBase):
    branch: BranchData
    dpd_distribution: list[DpdBucket]
    trends: dict[str, list[dict[str, Any]]]
    outcomes: dict[str, MetricValue]


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


class BranchDriversResponse(CamelBase):
    data: DriversData
    meta: ApiMeta


class BranchInsightsResponse(CamelBase):
    data: list[InsightItem]
    meta: ApiMeta


class BranchesResponse(CamelBase):
    data: list[BranchSummary]
    meta: ApiMeta


class ErrorResponse(BaseModel):
    error: str
