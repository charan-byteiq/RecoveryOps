import asyncio
from datetime import date
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import AsyncSessionLocal
from app.models import BranchMetricSnapshot

CORE_KPI_METRICS = [
    "collection_efficiency",
    "avg_days_to_resolve",
    "contact_rate",
    "ptp_kept_rate",
    "dpd_30_plus_concentration",
]

async def main():
    async with AsyncSessionLocal() as session:
        comparison_ends = [date(2026, 7, 31), date(2026, 8, 31)]

        monthly_stmt = (
            select(BranchMetricSnapshot)
            .where(
                BranchMetricSnapshot.branch_id == 1,
                BranchMetricSnapshot.metric_code.in_(CORE_KPI_METRICS),
                BranchMetricSnapshot.period_end.in_(comparison_ends),
            )
            .order_by(BranchMetricSnapshot.period_end)
        )

        print(f"Query: {monthly_stmt}")
        result = await session.execute(monthly_stmt)
        rows = result.scalars().all()
        print(f"Found {len(rows)} rows")
        for row in rows:
            print(f"  {row.metric_code} | {row.period_end} | {row.value} | batch={row.batch_id}")

asyncio.run(main())
