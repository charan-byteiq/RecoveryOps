import asyncio
import random
from datetime import date, datetime
from decimal import Decimal, ROUND_HALF_UP
from typing import Any

from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import AsyncSessionLocal, engine
from app.models import (
    Branch,
    BranchDpdSnapshot,
    BranchInsight,
    BranchMetricSnapshot,
    BranchSegmentSnapshot,
    IngestionBatch,
    MetricDefinition,
)

BRANCHES = [
    {"source_branch_code": "B001", "name": "Main Street", "region": "Northeast"},
    {"source_branch_code": "B002", "name": "Oakwood", "region": "Midwest"},
    {"source_branch_code": "B003", "name": "Pine Valley", "region": "Southeast"},
    {"source_branch_code": "B004", "name": "Riverfront", "region": "Southwest"},
    {"source_branch_code": "B005", "name": "Hilltop", "region": "West"},
    {"source_branch_code": "B006", "name": "Lakeside", "region": "Northwest"},
    {"source_branch_code": "B007", "name": "Downtown", "region": "Northeast"},
]

METRIC_DEFINITIONS = [
    {
        "metric_code": "delinquency_rate_30_plus",
        "name": "Delinquency Rate (30+ DPD)",
        "unit": "percent",
        "description": "Percentage of active accounts 30 or more days past due.",
        "has_numerator_denominator": False,
    },
    {
        "metric_code": "cure_rate",
        "name": "Cure Rate",
        "unit": "percent",
        "description": "Share of delinquent accounts that cured within the period.",
        "has_numerator_denominator": False,
    },
    {
        "metric_code": "roll_rate",
        "name": "Roll Rate",
        "unit": "percent",
        "description": "Share of accounts that rolled forward into a deeper delinquency bucket.",
        "has_numerator_denominator": False,
    },
    {
        "metric_code": "ptp_kept_rate",
        "name": "Promise to Pay Kept Rate",
        "unit": "percent",
        "description": "Share of payment promises that were kept.",
        "has_numerator_denominator": False,
    },
    {
        "metric_code": "positive_outcome_rate",
        "name": "Positive Outcome Rate",
        "unit": "percent",
        "description": "Share of collections contacts with a positive outcome.",
        "has_numerator_denominator": False,
    },
    {
        "metric_code": "negative_outcome_rate",
        "name": "Negative Outcome Rate",
        "unit": "percent",
        "description": "Share of collections contacts with a negative outcome.",
        "has_numerator_denominator": False,
    },
    {
        "metric_code": "charge_off_rate",
        "name": "Charge-Off Rate",
        "unit": "percent",
        "description": "Percentage of balances charged off during the period.",
        "has_numerator_denominator": False,
    },
    {
        "metric_code": "autopay_active_pct",
        "name": "Autopay Active %",
        "unit": "percent",
        "description": "Percentage of accounts enrolled in autopay.",
        "has_numerator_denominator": False,
    },
    {
        "metric_code": "payment_total",
        "name": "Total Payments",
        "unit": "currency",
        "description": "Sum of payments received during the period.",
        "has_numerator_denominator": False,
    },
    {
        "metric_code": "fpd_count",
        "name": "First Payment Defaults",
        "unit": "count",
        "description": "Count of accounts that missed their first payment.",
        "has_numerator_denominator": False,
    },
]

DPD_BUCKETS = [
    "current",
    "1-30",
    "31-60",
    "61-90",
    "90+",
]

SEGMENT_DIMENSIONS = {
    "vintage": ["2023", "2024", "2025", "2026"],
    "loan_size": ["small", "medium", "large"],
    "fico_band": ["<600", "600-700", ">700"],
    "product_type": ["personal", "auto", "mortgage"],
    "tenure": ["new", "1-3y", "3y+"],
    "state": ["NY", "CA", "TX", "FL", "IL"],
    "collector_experience": ["junior", "senior"],
}

AS_OF_DATE = date(2026, 8, 31)
PERIOD_START = date(2026, 8, 1)
PERIOD_END = date(2026, 8, 31)


def _d(v: float, scale: str = "0.000001") -> Decimal:
    return Decimal(str(v)).quantize(Decimal(scale), rounding=ROUND_HALF_UP)


def _month_end(year: int, month: int) -> date:
    if month == 12:
        return date(year + 1, 1, 1) - __import__("datetime").timedelta(days=1)
    return date(year, month + 1, 1) - __import__("datetime").timedelta(days=1)


def _month_start(year: int, month: int) -> date:
    return date(year, month, 1)


async def seed(session: AsyncSession) -> None:
    random.seed(42)

    await session.execute(delete(BranchInsight))
    await session.execute(delete(BranchSegmentSnapshot))
    await session.execute(delete(BranchDpdSnapshot))
    await session.execute(delete(BranchMetricSnapshot))
    await session.execute(delete(IngestionBatch))
    await session.execute(delete(MetricDefinition))
    await session.execute(delete(Branch))
    await session.commit()

    # Metric definitions
    metric_defs: dict[str, MetricDefinition] = {}
    for md in METRIC_DEFINITIONS:
        definition = MetricDefinition(
            metric_code=md["metric_code"],
            name=md["name"],
            unit=md["unit"],
            description=md["description"],
            has_numerator_denominator=md["has_numerator_denominator"],
            version=1,
            effective_from=date(2026, 1, 1),
        )
        session.add(definition)
        metric_defs[md["metric_code"]] = definition
    await session.flush()

    # Branches
    branches: list[Branch] = []
    for b in BRANCHES:
        branch = Branch(
            source_branch_code=b["source_branch_code"],
            name=b["name"],
            region=b["region"],
            active=True,
            created_at=datetime.utcnow(),
        )
        session.add(branch)
        branches.append(branch)
    await session.flush()

    batch = IngestionBatch(
        source="synthetic_demo",
        report_type="branch_summary",
        period_start=PERIOD_START,
        period_end=PERIOD_END,
        as_of_date=AS_OF_DATE,
        loaded_at=datetime.utcnow(),
        is_demo=True,
        notes="Synthetic demo data seeded from Python backend.",
    )
    session.add(batch)
    await session.flush()

    def branch_base(idx: int) -> dict[str, float]:
        # Deterministic per-branch base rates
        return {
            "delinquency_rate_30_plus": 3.5 + idx * 0.4 + random.uniform(-0.3, 0.3),
            "cure_rate": 55.0 - idx * 1.5 + random.uniform(-2.0, 2.0),
            "roll_rate": 12.0 + idx * 0.5 + random.uniform(-1.0, 1.0),
            "ptp_kept_rate": 65.0 - idx * 1.0 + random.uniform(-2.0, 2.0),
            "positive_outcome_rate": 70.0 - idx * 1.2 + random.uniform(-2.0, 2.0),
            "negative_outcome_rate": 15.0 + idx * 0.5 + random.uniform(-1.0, 1.0),
            "charge_off_rate": 1.2 + idx * 0.1 + random.uniform(-0.2, 0.2),
            "autopay_active_pct": 45.0 + idx * 2.0 + random.uniform(-3.0, 3.0),
            "payment_total": 500_000 + idx * 50_000 + random.randint(-20_000, 20_000),
            "fpd_count": 20 + idx * 3 + random.randint(-5, 5),
        }

    # Snapshots: current period for all metrics, plus trend rows for delinquency/cure
    trend_months = [
        (2026, 5),
        (2026, 6),
        (2026, 7),
    ]

    for idx, branch in enumerate(branches):
        base = branch_base(idx)
        for metric_code, value in base.items():
            availability = "available"
            unit = metric_defs[metric_code].unit
            if metric_code in ["payment_total", "fpd_count"]:
                final_value = max(0, value)
            else:
                clamped = max(0.0, min(100.0, value))
                final_value = clamped / 100.0 if unit == "percent" else clamped

            snapshot = BranchMetricSnapshot(
                branch_id=branch.id,
                batch_id=batch.id,
                metric_code=metric_code,
                value=_d(final_value),
                unit=unit,
                availability=availability,
                period_start=PERIOD_START,
                period_end=PERIOD_END,
                as_of_date=AS_OF_DATE,
            )
            if metric_defs[metric_code].has_numerator_denominator:
                snapshot.denominator = 1000
                snapshot.numerator = int(final_value * 10)
            session.add(snapshot)

        # Trend snapshots
        for year, month in trend_months:
            month_start = _month_start(year, month)
            month_end = _month_end(year, month)
            for metric_code in ["delinquency_rate_30_plus", "cure_rate"]:
                base_value = base[metric_code]
                # Add small month-over-month drift
                drift = (month - 5) * random.uniform(-0.4, 0.4)
                value = max(0.0, min(100.0, base_value + drift)) / 100.0
                session.add(
                    BranchMetricSnapshot(
                        branch_id=branch.id,
                        batch_id=batch.id,
                        metric_code=metric_code,
                        value=_d(value),
                        unit="percent",
                        availability="available",
                        period_start=month_start,
                        period_end=month_end,
                        as_of_date=month_end,
                    )
                )

        # DPD distribution
        total_accounts = 5000 + idx * 200 + random.randint(-100, 100)
        shares = [0.75, 0.15, 0.06, 0.03, 0.01]
        for bucket, share in zip(DPD_BUCKETS, shares):
            jitter = random.uniform(-0.01, 0.01)
            account_count = max(0, int(total_accounts * max(0, share + jitter)))
            balance = account_count * (2000 + random.uniform(-500, 500))
            portfolio_share = (account_count / total_accounts) if total_accounts else 0
            session.add(
                BranchDpdSnapshot(
                    branch_id=branch.id,
                    batch_id=batch.id,
                    bucket=bucket,
                    account_count=account_count,
                    balance=_d(balance, "0.01"),
                    portfolio_share=_d(portfolio_share, "0.000001"),
                    as_of_date=AS_OF_DATE,
                )
            )

        # Segment snapshots
        for segment_type, values in SEGMENT_DIMENSIONS.items():
            for segment_value in values:
                branch_modifier = random.uniform(0.7, 1.3)
                value = max(0.0, min(100.0, base["delinquency_rate_30_plus"] * branch_modifier)) / 100.0
                session.add(
                    BranchSegmentSnapshot(
                        branch_id=branch.id,
                        batch_id=batch.id,
                        segment_type=segment_type,
                        segment_value=segment_value,
                        metric_code="delinquency_rate_30_plus",
                        value=_d(value),
                        account_count=random.randint(50, 500),
                        as_of_date=AS_OF_DATE,
                    )
                )

        # Insights
        insight_templates = [
            {
                "narrative": f"{branch.name} delinquency is elevated relative to the network, driven by {random.choice(['vintage', 'fico_band', 'collector_experience'])} segments.",
                "evidence": [
                    {"metricCode": "delinquency_rate_30_plus", "branchValue": float(_d(base["delinquency_rate_30_plus"] / 100.0)), "networkValue": 0.038, "delta": float(_d((base["delinquency_rate_30_plus"] - 3.8) / 100.0)), "unit": "percent"},
                ],
            },
            {
                "narrative": f"Autopay penetration at {branch.name} is {base['autopay_active_pct']:.1f}%, a meaningful lever to improve cure performance.",
                "evidence": [
                    {"metricCode": "autopay_active_pct", "branchValue": float(_d(base["autopay_active_pct"] / 100.0)), "networkValue": 0.52, "delta": float(_d((base["autopay_active_pct"] - 52.0) / 100.0)), "unit": "percent"},
                ],
            },
            {
                "narrative": f"Promise-to-pay kept rate is {base['ptp_kept_rate']:.1f}% for {branch.name}, indicating follow-up capacity constraints.",
                "evidence": [
                    {"metricCode": "ptp_kept_rate", "branchValue": float(_d(base["ptp_kept_rate"] / 100.0)), "networkValue": 0.61, "delta": float(_d((base["ptp_kept_rate"] - 61.0) / 100.0)), "unit": "percent"},
                ],
            },
        ]
        for tmpl in insight_templates:
            session.add(
                BranchInsight(
                    branch_id=branch.id,
                    batch_id=batch.id,
                    narrative=tmpl["narrative"],
                    evidence=tmpl["evidence"],
                    model_version="demo-v1",
                    generated_at=datetime.utcnow(),
                    as_of_date=AS_OF_DATE,
                )
            )

    await session.commit()
    print(f"Seeded {len(branches)} branches with demo data for {AS_OF_DATE}.")


async def main() -> None:
    async with engine.begin() as conn:
        from app.models import Base

        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        await seed(session)

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
