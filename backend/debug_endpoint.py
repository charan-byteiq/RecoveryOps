import asyncio
from datetime import date
from typing import Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import AsyncSessionLocal
from app.models import BranchMetricSnapshot, MetricDefinition, IngestionBatch
from app.routers.branches import _get_metric_definitions_map, _to_metric_value, _previous_month_periods, CORE_KPI_METRICS

async def main():
    async with AsyncSessionLocal() as session:
        batch = await session.get(IngestionBatch, 3)
        print(f"Batch: id={batch.id}, as_of_date={batch.as_of_date}")

        comparison_periods = _previous_month_periods(batch.as_of_date)
        print(f"comparison_periods: {comparison_periods}")
        comparison_ends = [date.fromisoformat(period["end"]) for period in comparison_periods]
        print(f"comparison_ends: {comparison_ends}")

        def_map = await _get_metric_definitions_map(session)
        print(f"def_map keys: {list(def_map.keys())[:3]}")

        monthly_stmt = (
            select(BranchMetricSnapshot)
            .where(
                BranchMetricSnapshot.branch_id == 1,
                BranchMetricSnapshot.metric_code.in_(CORE_KPI_METRICS),
                BranchMetricSnapshot.period_end.in_(comparison_ends),
            )
            .order_by(BranchMetricSnapshot.period_end)
        )
        monthly_result = await session.execute(monthly_stmt)
        rows = monthly_result.scalars().all()
        print(f"Found {len(rows)} rows")

        monthly_kpis: dict[str, list[dict[str, Any]]] = {}
        for row in rows:
            print(f"Processing {row.metric_code} {row.period_end}")
            metric_value = _to_metric_value(row, def_map, batch.source, batch.is_demo)
            dumped = metric_value.model_dump(by_alias=True)
            print(f"  dumped keys: {list(dumped.keys())}")
            monthly_kpis.setdefault(row.metric_code, []).append(dumped)

        print(f"\nmonthly_kpis keys: {list(monthly_kpis.keys())}")
        print(f"monthly_kpis: {monthly_kpis}")

asyncio.run(main())
