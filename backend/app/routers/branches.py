from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.models import (
    Branch,
    BranchDpdSnapshot,
    BranchInsight,
    BranchMetricSnapshot,
    BranchSegmentSnapshot,
    IngestionBatch,
    MetricDefinition,
)
from app import schemas

router = APIRouter(prefix="/api")

SUMMARY_METRICS = [
    "delinquency_rate_30_plus",
    "cure_rate",
    "ptp_kept_rate",
    "autopay_active_pct",
    "payment_total",
    "fpd_count",
    "positive_outcome_rate",
]

PERFORMANCE_METRICS = [
    "delinquency_rate_30_plus",
    "cure_rate",
    "roll_rate",
    "ptp_kept_rate",
    "positive_outcome_rate",
    "negative_outcome_rate",
    "charge_off_rate",
    "autopay_active_pct",
]


def _meta(batch: IngestionBatch) -> dict[str, Any]:
    return {
        "asOfDate": batch.as_of_date.isoformat() if batch.as_of_date else None,
        "period": {
            "start": batch.period_start.isoformat() if batch.period_start else None,
            "end": batch.period_end.isoformat() if batch.period_end else None,
        },
        "source": batch.source,
        "isDemo": batch.is_demo,
    }


def _to_float(value: Any) -> float | None:
    return float(value) if value is not None else None


async def _resolve_batch(session: AsyncSession, as_of_date: str | None) -> IngestionBatch | None:
    stmt = select(IngestionBatch).order_by(desc(IngestionBatch.loaded_at))
    if as_of_date:
        stmt = stmt.where(IngestionBatch.as_of_date == as_of_date)
    result = await session.execute(stmt.limit(1))
    return result.scalar_one_or_none()


async def _get_metric_definitions_map(session: AsyncSession) -> dict[str, MetricDefinition]:
    result = await session.execute(select(MetricDefinition))
    return {d.metric_code: d for d in result.scalars().all()}


def _to_metric_value(
    snapshot: BranchMetricSnapshot | None,
    def_map: dict[str, MetricDefinition],
    source: str,
    is_demo: bool,
) -> schemas.MetricValue:
    if snapshot is None:
        return schemas.MetricValue(
            metric_code="",
            name="",
            value=None,
            unit="percent",
            availability="unavailable",
            source="synthetic_demo" if is_demo else source,
            definition_version=1,
        )
    definition = def_map.get(snapshot.metric_code)
    return schemas.MetricValue(
        metric_code=snapshot.metric_code,
        name=definition.name if definition else snapshot.metric_code,
        value=_to_float(snapshot.value),
        numerator=snapshot.numerator,
        denominator=snapshot.denominator,
        unit=snapshot.unit,
        availability=snapshot.availability,  # type: ignore[arg-type]
        source="synthetic_demo" if is_demo else source,
        definition_version=definition.version if definition else 1,
        period=(
            {
                "start": snapshot.period_start.isoformat() if snapshot.period_start else None,
                "end": snapshot.period_end.isoformat() if snapshot.period_end else None,
            }
            if snapshot.period_start and snapshot.period_end
            else None
        ),
    )


async def _get_branch_metrics_map(
    session: AsyncSession,
    branch_ids: list[int],
    batch_id: int,
    metric_codes: list[str],
    def_map: dict[str, MetricDefinition],
    source: str,
    is_demo: bool,
    period_end: str | None = None,
) -> dict[int, dict[str, schemas.MetricValue]]:
    if not branch_ids or not metric_codes:
        return {}

    stmt = select(BranchMetricSnapshot).where(
        BranchMetricSnapshot.batch_id == batch_id,
        BranchMetricSnapshot.branch_id.in_(branch_ids),
        BranchMetricSnapshot.metric_code.in_(metric_codes),
    )
    if period_end:
        stmt = stmt.where(BranchMetricSnapshot.period_end == period_end)

    result = await session.execute(stmt)

    metrics_map: dict[int, dict[str, schemas.MetricValue]] = {}
    for snapshot in result.scalars().all():
        metrics_map.setdefault(snapshot.branch_id, {})[
            snapshot.metric_code
        ] = _to_metric_value(snapshot, def_map, source, is_demo)
    return metrics_map


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "environment": "development"}


@router.get("/branches", response_model=schemas.BranchesResponse)
async def list_branches(
    session: AsyncSession = Depends(get_session),
    as_of_date: str | None = Query(None, pattern=r"^\d{4}-\d{2}-\d{2}$"),
) -> dict[str, Any]:
    batch = await _resolve_batch(session, as_of_date)
    if batch is None:
        raise HTTPException(status_code=404, detail="No data available")

    result = await session.execute(
        select(Branch).where(Branch.active.is_(True)).order_by(Branch.source_branch_code)
    )
    all_branches = result.scalars().all()

    def_map = await _get_metric_definitions_map(session)
    metrics_map = await _get_branch_metrics_map(
        session,
        [b.id for b in all_branches],
        batch.id,
        SUMMARY_METRICS,
        def_map,
        batch.source,
        batch.is_demo,
        batch.period_end,
    )

    branches_out = [
        {
            "id": b.id,
            "source_branch_code": b.source_branch_code,
            "name": b.name,
            "region": b.region,
            "metrics": metrics_map.get(b.id, {}),
        }
        for b in all_branches
    ]

    return {
        "data": branches_out,
        "meta": _meta(batch),
    }


@router.get("/analytics/network", response_model=schemas.NetworkResponse)
async def network_analytics(
    session: AsyncSession = Depends(get_session),
    as_of_date: str | None = Query(None, pattern=r"^\d{4}-\d{2}-\d{2}$"),
) -> dict[str, Any]:
    batch = await _resolve_batch(session, as_of_date)
    if batch is None:
        raise HTTPException(status_code=404, detail="No data available")

    result = await session.execute(select(Branch).where(Branch.active.is_(True)))
    all_branches = result.scalars().all()

    def_map = await _get_metric_definitions_map(session)
    metrics_map = await _get_branch_metrics_map(
        session,
        [b.id for b in all_branches],
        batch.id,
        SUMMARY_METRICS,
        def_map,
        batch.source,
        batch.is_demo,
        batch.period_end,
    )

    averages: dict[str, float | None] = {}
    for code in SUMMARY_METRICS:
        values = [
            metrics_map[b.id][code].value
            for b in all_branches
            if b.id in metrics_map
            and code in metrics_map[b.id]
            and metrics_map[b.id][code].value is not None
            and metrics_map[b.id][code].availability == "available"
        ]
        averages[code] = sum(values) / len(values) if values else None

    ranked = sorted(
        [
            {
                "id": b.id,
                "source_branch_code": b.source_branch_code,
                "name": b.name,
                "region": b.region,
                "primaryMetric": (
                    metrics_map.get(b.id, {}).get("delinquency_rate_30_plus").value
                    if b.id in metrics_map and "delinquency_rate_30_plus" in metrics_map[b.id]
                    else None
                ),
                "metrics": metrics_map.get(b.id, {}),
            }
            for b in all_branches
        ],
        key=lambda x: x["primaryMetric"] or 0,
        reverse=True,
    )

    return {
        "data": {"branches": ranked, "networkAverages": averages},
        "meta": _meta(batch),
    }


@router.get("/branches/{branch_id}/overview", response_model=schemas.BranchOverviewResponse)
async def branch_overview(
    branch_id: int,
    session: AsyncSession = Depends(get_session),
    as_of_date: str | None = Query(None, pattern=r"^\d{4}-\d{2}-\d{2}$"),
) -> dict[str, Any]:
    batch = await _resolve_batch(session, as_of_date)
    if batch is None:
        raise HTTPException(status_code=404, detail="No data available")

    result = await session.execute(select(Branch).where(Branch.id == branch_id))
    branch = result.scalar_one_or_none()
    if branch is None:
        raise HTTPException(status_code=404, detail="Branch not found")

    def_map = await _get_metric_definitions_map(session)
    metrics_map = await _get_branch_metrics_map(
        session,
        [branch_id],
        batch.id,
        SUMMARY_METRICS + PERFORMANCE_METRICS,
        def_map,
        batch.source,
        batch.is_demo,
        batch.period_end,
    )

    return {
        "data": {
            "branch": {
                "id": branch.id,
                "source_branch_code": branch.source_branch_code,
                "name": branch.name,
                "region": branch.region,
            },
            "metrics": metrics_map.get(branch_id, {}),
        },
        "meta": _meta(batch),
    }


@router.get("/branches/{branch_id}/performance", response_model=schemas.BranchPerformanceResponse)
async def branch_performance(
    branch_id: int,
    session: AsyncSession = Depends(get_session),
    as_of_date: str | None = Query(None, pattern=r"^\d{4}-\d{2}-\d{2}$"),
    from_date: str | None = Query(None, pattern=r"^\d{4}-\d{2}-\d{2}$"),
    to_date: str | None = Query(None, pattern=r"^\d{4}-\d{2}-\d{2}$"),
) -> dict[str, Any]:
    batch = await _resolve_batch(session, as_of_date)
    if batch is None:
        raise HTTPException(status_code=404, detail="No data available")

    result = await session.execute(select(Branch).where(Branch.id == branch_id))
    branch = result.scalar_one_or_none()
    if branch is None:
        raise HTTPException(status_code=404, detail="Branch not found")

    to_date = to_date or batch.as_of_date

    dpd_result = await session.execute(
        select(BranchDpdSnapshot)
        .where(
            BranchDpdSnapshot.branch_id == branch_id,
            BranchDpdSnapshot.as_of_date == batch.as_of_date,
        )
        .order_by(BranchDpdSnapshot.bucket)
    )
    dpd_rows = dpd_result.scalars().all()

    trend_stmt = (
        select(BranchMetricSnapshot)
        .where(
            BranchMetricSnapshot.branch_id == branch_id,
            BranchMetricSnapshot.batch_id == batch.id,
            BranchMetricSnapshot.metric_code.in_(["delinquency_rate_30_plus", "cure_rate"]),
        )
        .order_by(BranchMetricSnapshot.as_of_date)
    )
    if from_date:
        trend_stmt = trend_stmt.where(BranchMetricSnapshot.as_of_date >= from_date)
    if to_date:
        trend_stmt = trend_stmt.where(BranchMetricSnapshot.as_of_date <= to_date)
    trend_result = await session.execute(trend_stmt)

    trends: dict[str, list[dict[str, Any]]] = {}
    for row in trend_result.scalars().all():
        if row.value is None:
            continue
        trends.setdefault(row.metric_code, []).append(
            {"period": row.period_end or row.as_of_date, "value": _to_float(row.value)}
        )

    def_map = await _get_metric_definitions_map(session)
    metrics_map = await _get_branch_metrics_map(
        session,
        [branch_id],
        batch.id,
        PERFORMANCE_METRICS,
        def_map,
        batch.source,
        batch.is_demo,
        batch.period_end,
    )

    return {
        "data": {
            "branch": {
                "id": branch.id,
                "source_branch_code": branch.source_branch_code,
                "name": branch.name,
                "region": branch.region,
            },
            "dpdDistribution": [
                {
                    "bucket": r.bucket,
                    "accountCount": r.account_count,
                    "balance": _to_float(r.balance),
                    "portfolioShare": _to_float(r.portfolio_share),
                }
                for r in dpd_rows
            ],
            "trends": trends,
            "outcomes": metrics_map.get(branch_id, {}),
        },
        "meta": _meta(batch),
    }


@router.get("/branches/{branch_id}/peers", response_model=schemas.BranchPeersResponse)
async def branch_peers(
    branch_id: int,
    session: AsyncSession = Depends(get_session),
    as_of_date: str | None = Query(None, pattern=r"^\d{4}-\d{2}-\d{2}$"),
) -> dict[str, Any]:
    batch = await _resolve_batch(session, as_of_date)
    if batch is None:
        raise HTTPException(status_code=404, detail="No data available")

    result = await session.execute(select(Branch).where(Branch.id == branch_id))
    branch = result.scalar_one_or_none()
    if branch is None:
        raise HTTPException(status_code=404, detail="Branch not found")

    peers_result = await session.execute(
        select(Branch).where(Branch.active.is_(True), Branch.id != branch_id)
    )
    peers = peers_result.scalars().all()

    def_map = await _get_metric_definitions_map(session)
    metrics_map = await _get_branch_metrics_map(
        session,
        [p.id for p in peers],
        batch.id,
        SUMMARY_METRICS,
        def_map,
        batch.source,
        batch.is_demo,
        batch.period_end,
    )

    peer_data = [
        {
            "id": p.id,
            "source_branch_code": p.source_branch_code,
            "name": p.name,
            "region": p.region,
            "metrics": metrics_map.get(p.id, {}),
        }
        for p in peers
    ]

    averages: dict[str, float | None] = {}
    for code in SUMMARY_METRICS:
        values = [
            metrics_map[p.id][code].value
            for p in peers
            if p.id in metrics_map
            and code in metrics_map[p.id]
            and metrics_map[p.id][code].value is not None
            and metrics_map[p.id][code].availability == "available"
        ]
        averages[code] = sum(values) / len(values) if values else None

    return {
        "data": {
            "branch": {
                "id": branch.id,
                "source_branch_code": branch.source_branch_code,
                "name": branch.name,
                "region": branch.region,
            },
            "peers": peer_data,
            "networkAverages": averages,
        },
        "meta": _meta(batch),
    }


@router.get("/branches/{branch_id}/drivers", response_model=schemas.BranchDriversResponse)
async def branch_drivers(
    branch_id: int,
    session: AsyncSession = Depends(get_session),
    as_of_date: str | None = Query(None, pattern=r"^\d{4}-\d{2}-\d{2}$"),
) -> dict[str, Any]:
    batch = await _resolve_batch(session, as_of_date)
    if batch is None:
        raise HTTPException(status_code=404, detail="No data available")

    result = await session.execute(select(Branch).where(Branch.id == branch_id))
    branch = result.scalar_one_or_none()
    if branch is None:
        raise HTTPException(status_code=404, detail="Branch not found")

    branch_segments_result = await session.execute(
        select(BranchSegmentSnapshot).where(
            BranchSegmentSnapshot.branch_id == branch_id,
            BranchSegmentSnapshot.as_of_date == batch.as_of_date,
        )
    )
    branch_segments = branch_segments_result.scalars().all()

    all_segments_result = await session.execute(
        select(BranchSegmentSnapshot).where(
            BranchSegmentSnapshot.as_of_date == batch.as_of_date,
            BranchSegmentSnapshot.metric_code == "delinquency_rate_30_plus",
        )
    )
    all_segments = all_segments_result.scalars().all()

    network_avg_by_segment: dict[str, float] = {}
    counts_by_segment: dict[str, int] = {}
    for s in all_segments:
        if s.value is None:
            continue
        key = f"{s.segment_type}::{s.segment_value}"
        network_avg_by_segment[key] = network_avg_by_segment.get(key, 0) + float(s.value)
        counts_by_segment[key] = counts_by_segment.get(key, 0) + 1
    for key in network_avg_by_segment:
        network_avg_by_segment[key] /= counts_by_segment.get(key, 1)

    drivers = []
    for s in branch_segments:
        if s.metric_code != "delinquency_rate_30_plus" or s.value is None:
            continue
        key = f"{s.segment_type}::{s.segment_value}"
        network_value = network_avg_by_segment.get(key, float(s.value))
        branch_value = float(s.value)
        drivers.append(
            {
                "segmentType": s.segment_type,
                "segmentValue": s.segment_value,
                "metricCode": s.metric_code,
                "branchValue": branch_value,
                "networkValue": network_value,
                "delta": branch_value - network_value,
                "accountCount": s.account_count,
            }
        )

    drivers.sort(key=lambda d: abs(d["delta"]), reverse=True)

    return {
        "data": {
            "branch": {
                "id": branch.id,
                "source_branch_code": branch.source_branch_code,
                "name": branch.name,
                "region": branch.region,
            },
            "drivers": drivers[:8],
        },
        "meta": _meta(batch),
    }


@router.get("/branches/{branch_id}/insights", response_model=schemas.BranchInsightsResponse)
async def branch_insights(
    branch_id: int,
    session: AsyncSession = Depends(get_session),
    as_of_date: str | None = Query(None, pattern=r"^\d{4}-\d{2}-\d{2}$"),
) -> dict[str, Any]:
    batch = await _resolve_batch(session, as_of_date)
    if batch is None:
        raise HTTPException(status_code=404, detail="No data available")

    result = await session.execute(select(Branch).where(Branch.id == branch_id))
    branch = result.scalar_one_or_none()
    if branch is None:
        raise HTTPException(status_code=404, detail="Branch not found")

    insights_result = await session.execute(
        select(BranchInsight)
        .where(
            BranchInsight.branch_id == branch_id,
            BranchInsight.as_of_date == batch.as_of_date,
        )
        .order_by(desc(BranchInsight.generated_at))
    )
    insights = insights_result.scalars().all()

    return {
        "data": [
            {
                "id": i.id,
                "narrative": i.narrative,
                "evidence": i.evidence,
                "modelVersion": i.model_version,
                "generatedAt": i.generated_at,
            }
            for i in insights
        ],
        "meta": _meta(batch),
    }
