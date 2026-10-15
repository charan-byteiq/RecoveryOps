import asyncio
from datetime import date
from typing import Any
from sqlalchemy import select, desc, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import AsyncSessionLocal
from app.models import Branch, BranchMetricSnapshot, MetricDefinition, IngestionBatch
from app.routers.branches import (
    _resolve_batch,
    _get_branch_metrics_map,
    _get_metric_definitions_map,
    _to_metric_value,
    _previous_month_periods,
    CORE_KPI_METRICS,
    PERFORMANCE_METRICS,
)

async def main():
    async with AsyncSessionLocal() as session:
        as_of_date = "2026-09-30"
        branch_id = 1

        batch = await _resolve_batch(session, as_of_date)
        print(f"Resolved batch: id={batch.id}, as_of_date={batch.as_of_date}, period_end={batch.period_end}")

        result = await session.execute(select(Branch).where(Branch.id == branch_id))
        branch = result.scalar_one_or_none()
        print(f"Branch: {branch.name} id={branch.id}")

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
        print(f"metrics_map keys: {list(metrics_map.get(branch_id, {}).keys())}")

        comparison_periods = _previous_month_periods(batch.as_of_date)
        comparison_ends = [date.fromisoformat(period["end"]) for period in comparison_periods]
        print(f"comparison_ends: {comparison_ends}")

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
        rows = monthly_result.scalars().all()
        print(f"Monthly rows found: {len(rows)}")

        monthly_kpis: dict[str, list[dict[str, Any]]] = {}
        for row in rows:
            monthly_kpis.setdefault(row.metric_code, []).append(
                _to_metric_value(row, def_map, batch.source, batch.is_demo).model_dump(by_alias=True)
            )

        print(f"monthly_kpis keys: {list(monthly_kpis.keys())}")
        print(f"monthly_kpis empty: {not monthly_kpis}")

asyncio.run(main())
