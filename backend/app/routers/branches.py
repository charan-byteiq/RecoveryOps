import logging
from datetime import date
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.models import (
    Branch,
    BranchDpdSnapshot,
    BranchInsight,
    BranchMetricSnapshot,
    BranchRootCauseDriver,
    BranchSegmentSnapshot,
)
from app import schemas
from app.services.batch_resolution import resolve_batch
from app.services.metric_service import (
    build_meta,
    get_branch_metrics,
    get_metric_definitions,
    to_float,
    to_metric_value,
)
from app.services.performance_periods import comparison_periods
from app.services.kpi_catalog import CORE_KPI_METRICS, PERFORMANCE_METRICS, SUMMARY_METRICS
from app.services.network_metrics import calculate_network_averages, rank_branches_by_collection
from app.services.root_cause_ai import (
    CORE_KPIS,
    build_context,
    make_comparison,
    make_overall,
    make_selected_kpi,
    normalize_kpi,
)

logger = logging.getLogger("recoveryops")

router = APIRouter(prefix="/api")


@router.get("/health")
async def health(session: AsyncSession = Depends(get_session)) -> dict[str, str]:
    await session.execute(text("SELECT 1"))
    logger.info("Database connection verified")
    return {"status": "ok", "environment": "development"}


@router.get("/branches", response_model=schemas.BranchesResponse)
async def list_branches(
    session: AsyncSession = Depends(get_session),
    as_of_date: str | None = Query(None, pattern=r"^\d{4}-\d{2}-\d{2}$"),
) -> dict[str, Any]:
    batch = await resolve_batch(session, as_of_date)
    if batch is None:
        raise HTTPException(status_code=404, detail="No data available")

    result = await session.execute(
        select(Branch).where(Branch.active.is_(True)).order_by(Branch.source_branch_code)
    )
    all_branches = result.scalars().all()

    def_map = await get_metric_definitions(session)
    metrics_map = await get_branch_metrics(
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

    logger.info(
        "Listed %d branches for batch id=%s as_of_date=%s",
        len(branches_out),
        batch.id,
        batch.as_of_date,
    )
    return {
        "data": branches_out,
        "meta": build_meta(batch),
    }


@router.get("/analytics/network", response_model=schemas.NetworkResponse)
async def network_analytics(
    session: AsyncSession = Depends(get_session),
    as_of_date: str | None = Query(None, pattern=r"^\d{4}-\d{2}-\d{2}$"),
) -> dict[str, Any]:
    batch = await resolve_batch(session, as_of_date)
    if batch is None:
        raise HTTPException(status_code=404, detail="No data available")

    result = await session.execute(select(Branch).where(Branch.active.is_(True)))
    all_branches = result.scalars().all()

    def_map = await get_metric_definitions(session)
    metrics_map = await get_branch_metrics(
        session,
        [b.id for b in all_branches],
        batch.id,
        SUMMARY_METRICS,
        def_map,
        batch.source,
        batch.is_demo,
        batch.period_end,
    )

    averages = calculate_network_averages(all_branches, metrics_map, SUMMARY_METRICS)
    ranked = rank_branches_by_collection(all_branches, metrics_map)

    logger.info(
        "Network analytics for batch id=%s as_of_date=%s: %d branches, %d averages computed",
        batch.id,
        batch.as_of_date,
        len(ranked),
        len([v for v in averages.values() if v is not None]),
    )
    return {
        "data": {"branches": ranked, "networkAverages": averages},
        "meta": build_meta(batch),
    }


@router.get("/branches/{branch_id}/overview", response_model=schemas.BranchOverviewResponse)
async def branch_overview(
    branch_id: int,
    session: AsyncSession = Depends(get_session),
    as_of_date: str | None = Query(None, pattern=r"^\d{4}-\d{2}-\d{2}$"),
) -> dict[str, Any]:
    batch = await resolve_batch(session, as_of_date)
    if batch is None:
        raise HTTPException(status_code=404, detail="No data available")

    result = await session.execute(select(Branch).where(Branch.id == branch_id))
    branch = result.scalar_one_or_none()
    if branch is None:
        raise HTTPException(status_code=404, detail="Branch not found")

    def_map = await get_metric_definitions(session)
    metrics_map = await get_branch_metrics(
        session,
        [branch_id],
        batch.id,
        SUMMARY_METRICS + PERFORMANCE_METRICS,
        def_map,
        batch.source,
        batch.is_demo,
        batch.period_end,
    )

    logger.info(
        "Branch overview branch_id=%d (%s) batch id=%s as_of_date=%s: %d metrics",
        branch.id,
        branch.source_branch_code,
        batch.id,
        batch.as_of_date,
        len(metrics_map.get(branch_id, {})),
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
        "meta": build_meta(batch),
    }


@router.get("/branches/{branch_id}/performance", response_model=schemas.BranchPerformanceResponse)
async def branch_performance(
    branch_id: int,
    session: AsyncSession = Depends(get_session),
    as_of_date: str | None = Query(None, pattern=r"^\d{4}-\d{2}-\d{2}$"),
    from_date: str | None = Query(None, pattern=r"^\d{4}-\d{2}-\d{2}$"),
    to_date: str | None = Query(None, pattern=r"^\d{4}-\d{2}-\d{2}$"),
) -> dict[str, Any]:
    batch = await resolve_batch(session, as_of_date)
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
            {"period": row.period_end or row.as_of_date, "value": to_float(row.value)}
        )

    def_map = await get_metric_definitions(session)
    metrics_map = await get_branch_metrics(
        session,
        [branch_id],
        batch.id,
        PERFORMANCE_METRICS,
        def_map,
        batch.source,
        batch.is_demo,
        batch.period_end,
    )

    # Build explicit monthly comparison periods (previous month and previous-to-previous month).
    periods = comparison_periods(batch.as_of_date)
    comparison_ends = [date.fromisoformat(period["end"]) for period in periods]

    monthly_stmt = (
        select(BranchMetricSnapshot)
        .where(
            BranchMetricSnapshot.branch_id == branch_id,
            BranchMetricSnapshot.metric_code.in_(CORE_KPI_METRICS),
            BranchMetricSnapshot.period_end.in_(comparison_ends),
        )
        .order_by(BranchMetricSnapshot.period_end)
    )
    monthly_result = await session.execute(monthly_stmt)

    monthly_kpis: dict[str, list[dict[str, Any]]] = {}
    for row in monthly_result.scalars().all():
        monthly_kpis.setdefault(row.metric_code, []).append(
            to_metric_value(row, def_map, batch.source, batch.is_demo).model_dump(by_alias=True)
        )

    logger.info(
        "Branch performance branch_id=%d (%s) batch id=%s: %d dpd buckets, %d trends, %d monthly kpis",
        branch.id,
        branch.source_branch_code,
        batch.id,
        len(dpd_rows),
        sum(len(v) for v in trends.values()),
        sum(len(v) for v in monthly_kpis.values()),
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
                    "balance": to_float(r.balance),
                    "portfolioShare": to_float(r.portfolio_share),
                }
                for r in dpd_rows
            ],
            "trends": trends,
            "outcomes": metrics_map.get(branch_id, {}),
            "comparisonPeriods": periods,
            "monthlyKpis": monthly_kpis,
        },
        "meta": build_meta(batch),
    }


@router.get("/branches/{branch_id}/peers", response_model=schemas.BranchPeersResponse)
async def branch_peers(
    branch_id: int,
    session: AsyncSession = Depends(get_session),
    as_of_date: str | None = Query(None, pattern=r"^\d{4}-\d{2}-\d{2}$"),
) -> dict[str, Any]:
    batch = await resolve_batch(session, as_of_date)
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

    def_map = await get_metric_definitions(session)
    metrics_map = await get_branch_metrics(
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

    logger.info(
        "Branch peers branch_id=%d (%s) batch id=%s: %d peers",
        branch.id,
        branch.source_branch_code,
        batch.id,
        len(peer_data),
    )
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
        "meta": build_meta(batch),
    }


@router.get("/branches/{branch_id}/drivers", response_model=schemas.BranchDriversResponse)
async def branch_drivers(
    branch_id: int,
    session: AsyncSession = Depends(get_session),
    as_of_date: str | None = Query(None, pattern=r"^\d{4}-\d{2}-\d{2}$"),
) -> dict[str, Any]:
    batch = await resolve_batch(session, as_of_date)
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

    def_map = await get_metric_definitions(session)

    drivers = []
    for s in branch_segments:
        if s.metric_code != "delinquency_rate_30_plus" or s.value is None:
            continue
        key = f"{s.segment_type}::{s.segment_value}"
        network_value = network_avg_by_segment.get(key, float(s.value))
        branch_value = float(s.value)
        definition = def_map.get(s.metric_code)
        drivers.append(
            {
                "segmentType": s.segment_type,
                "segmentValue": s.segment_value,
                "metricCode": s.metric_code,
                "branchValue": branch_value,
                "networkValue": network_value,
                "delta": branch_value - network_value,
                "unit": definition.unit if definition else "percent",
                "accountCount": s.account_count,
            }
        )

    drivers.sort(key=lambda d: abs(d["delta"]), reverse=True)

    # Structured root-cause drivers for the five core KPIs.
    root_cause_result = await session.execute(
        select(BranchRootCauseDriver).where(
            BranchRootCauseDriver.branch_id == branch_id,
            BranchRootCauseDriver.as_of_date == batch.as_of_date,
        )
    )
    root_cause_rows = root_cause_result.scalars().all()

    root_cause_drivers = []
    for r in root_cause_rows:
        definition = def_map.get(r.metric_code)
        root_cause_drivers.append(
            {
                "metricCode": r.metric_code,
                "name": definition.name if definition else r.metric_code,
                "value": to_float(r.value),
                "unit": r.unit,
                "availability": r.availability,
                "contributingSegments": r.contributing_segments,
            }
        )

    logger.info(
        "Branch drivers branch_id=%d (%s) batch id=%s: %d segment drivers, %d root-cause drivers",
        branch.id,
        branch.source_branch_code,
        batch.id,
        len(drivers[:8]),
        len(root_cause_drivers),
    )
    return {
        "data": {
            "branch": {
                "id": branch.id,
                "source_branch_code": branch.source_branch_code,
                "name": branch.name,
                "region": branch.region,
            },
            "drivers": drivers[:8],
            "rootCauseDrivers": root_cause_drivers,
        },
        "meta": build_meta(batch),
    }


@router.get("/branches/{branch_id}/insights", response_model=schemas.BranchInsightsResponse)
async def branch_insights(
    branch_id: int,
    session: AsyncSession = Depends(get_session),
    as_of_date: str | None = Query(None, pattern=r"^\d{4}-\d{2}-\d{2}$"),
) -> dict[str, Any]:
    batch = await resolve_batch(session, as_of_date)
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

    logger.info(
        "Branch insights branch_id=%d (%s) batch id=%s: %d insights",
        branch.id,
        branch.source_branch_code,
        batch.id,
        len(insights),
    )
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
        "meta": build_meta(batch),
    }


async def _root_cause_ai_context(
    branch_id: int,
    session: AsyncSession,
    as_of_date: str | None,
) -> tuple[Any, dict[str, Any], dict[str, Any], str, Any]:
    batch = await resolve_batch(session, as_of_date)
    if batch is None:
        raise HTTPException(status_code=404, detail="No data available")

    branch_result = await session.execute(select(Branch).where(Branch.id == branch_id))
    branch = branch_result.scalar_one_or_none()
    if branch is None:
        raise HTTPException(status_code=404, detail="Branch not found")

    branches_result = await session.execute(select(Branch).where(Branch.active.is_(True)))
    branches = branches_result.scalars().all()
    definitions = await get_metric_definitions(session)
    metrics_map = await get_branch_metrics(
        session,
        [item.id for item in branches],
        batch.id,
        CORE_KPIS,
        definitions,
        batch.source,
        batch.is_demo,
        batch.period_end,
    )
    averages = calculate_network_averages(branches, metrics_map, CORE_KPIS)
    ranked = rank_branches_by_collection(branches, metrics_map)
    selected_ranked = next((item for item in ranked if item["id"] == branch_id), None)
    top = ranked[0] if ranked else selected_ranked
    reference = top
    if top and top["id"] == branch_id:
        reference = ranked[1] if len(ranked) > 1 else top
    reference_context = None
    if reference:
        reference_context = {
            "identity": {
                "id": reference["id"],
                "code": reference["source_branch_code"],
                "name": reference["name"],
                "selection_rule": "collection_efficiency_top_performer; selected leader compares with second-ranked peer",
            },
            "metrics": reference.get("metrics", {}),
        }

    drivers_result = await session.execute(
        select(BranchRootCauseDriver).where(
            BranchRootCauseDriver.branch_id == branch_id,
            BranchRootCauseDriver.as_of_date == batch.as_of_date,
        )
    )
    segment_result = await session.execute(
        select(BranchSegmentSnapshot).where(
            BranchSegmentSnapshot.branch_id == branch_id,
            BranchSegmentSnapshot.as_of_date == batch.as_of_date,
        )
    )
    dpd_result = await session.execute(
        select(BranchDpdSnapshot).where(
            BranchDpdSnapshot.branch_id == branch_id,
            BranchDpdSnapshot.as_of_date == batch.as_of_date,
        )
    )
    context = build_context(
        branch,
        metrics_map.get(branch_id, {}),
        averages,
        list(drivers_result.scalars().all()),
        list(segment_result.scalars().all()),
        list(dpd_result.scalars().all()),
        reference_context,
    )
    return branch, context, reference_context or {}, batch.as_of_date.isoformat(), batch


@router.get(
    "/branches/{branch_id}/ai-insights/comparison",
    response_model=schemas.BranchComparisonAIResponse,
)
async def branch_comparison_ai_insight(
    branch_id: int,
    session: AsyncSession = Depends(get_session),
    as_of_date: str | None = Query(None, pattern=r"^\d{4}-\d{2}-\d{2}$"),
) -> dict[str, Any]:
    branch, context, _, source_version, batch = await _root_cause_ai_context(branch_id, session, as_of_date)
    await session.close()
    data, ai_meta = await make_comparison(context, source_version)
    return {"data": data, "meta": build_meta(batch), "ai": ai_meta}


@router.get(
    "/branches/{branch_id}/ai-insights/kpi",
    response_model=schemas.SelectedKpiAIResponse,
)
async def selected_kpi_ai_insight(
    branch_id: int,
    kpi: str = Query(...),
    session: AsyncSession = Depends(get_session),
    as_of_date: str | None = Query(None, pattern=r"^\d{4}-\d{2}-\d{2}$"),
) -> dict[str, Any]:
    try:
        metric_code = normalize_kpi(kpi)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    branch, context, _, source_version, batch = await _root_cause_ai_context(branch_id, session, as_of_date)
    await session.close()
    data, ai_meta = await make_selected_kpi(context, metric_code, source_version)
    return {"data": data, "meta": build_meta(batch), "ai": ai_meta}


@router.get(
    "/branches/{branch_id}/ai-insights/overall",
    response_model=schemas.OverallBranchAIResponse,
)
async def overall_branch_ai_insight(
    branch_id: int,
    session: AsyncSession = Depends(get_session),
    as_of_date: str | None = Query(None, pattern=r"^\d{4}-\d{2}-\d{2}$"),
) -> dict[str, Any]:
    branch, context, _, source_version, batch = await _root_cause_ai_context(branch_id, session, as_of_date)
    await session.close()
    data, ai_meta = await make_overall(context, source_version)
    return {"data": data, "meta": build_meta(batch), "ai": ai_meta}
