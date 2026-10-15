import asyncio
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import AsyncSessionLocal
from app.models import BranchMetricSnapshot

async def main():
    async with AsyncSessionLocal() as session:
        # Count snapshots by period_end
        result = await session.execute(
            select(BranchMetricSnapshot.period_end, BranchMetricSnapshot.metric_code, BranchMetricSnapshot.batch_id)
            .where(BranchMetricSnapshot.branch_id == 1)
            .where(BranchMetricSnapshot.metric_code == "collection_efficiency")
            .order_by(BranchMetricSnapshot.period_end)
        )
        rows = result.all()
        print(f"Found {len(rows)} collection_efficiency snapshots for branch 1")
        for row in rows:
            print(row)

        # Check period_end data type
        result2 = await session.execute(
            text("""
                SELECT period_end, COUNT(*)
                FROM branch_metric_snapshots
                WHERE branch_id=1 AND metric_code='collection_efficiency'
                GROUP BY period_end ORDER BY period_end
            """)
        )
        print("\nDirect SQL:")
        for row in result2:
            print(row)

asyncio.run(main())
