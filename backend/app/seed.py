import asyncio
import random
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import AsyncSessionLocal, engine
from app.models import (
    Branch,
    BranchDpdSnapshot,
    BranchInsight,
    BranchMetricSnapshot,
    BranchRootCauseDriver,
    BranchSegmentSnapshot,
    IngestionBatch,
    MetricDefinition,
)
from app.services.kpi_calculations import (
    average_days_to_resolution,
    collection_efficiency,
    contact_rate,
    dpd_30_plus_concentration,
    ptp_kept_rate,
)

BRANCHES = [
    {"source_branch_code": "B001", "name": "Main Street", "region": "Northeast", "state": "NY"},
    {"source_branch_code": "B002", "name": "Oakwood", "region": "Midwest", "state": "IL"},
    {"source_branch_code": "B003", "name": "Pine Valley", "region": "Southeast", "state": "FL"},
    {"source_branch_code": "B004", "name": "Riverfront", "region": "Southwest", "state": "AZ"},
    {"source_branch_code": "B005", "name": "Hilltop", "region": "West", "state": "CA"},
    {"source_branch_code": "B006", "name": "Lakeside", "region": "Northwest", "state": "WA"},
    {"source_branch_code": "B007", "name": "Downtown", "region": "Northeast", "state": "MA"},
]

CORE_KPI_METRICS = [
    {
        "metric_code": "collection_efficiency",
        "name": "Collection Efficiency",
        "unit": "percent",
        "description": "Percentage of delinquent portfolio amount collected during the period.",
        "has_numerator_denominator": True,
    },
    {
        "metric_code": "avg_days_to_resolve",
        "name": "Average Days to Resolution",
        "unit": "days",
        "description": "Average number of days from delinquency onset to cure or settlement.",
        "has_numerator_denominator": False,
    },
    {
        "metric_code": "contact_rate",
        "name": "Contact Rate",
        "unit": "percent",
        "description": "Percentage of delinquent accounts reached successfully during outreach.",
        "has_numerator_denominator": True,
    },
    {
        "metric_code": "ptp_kept_rate",
        "name": "Promise to Pay Kept Rate",
        "unit": "percent",
        "description": "Percentage of recorded payment promises that were fulfilled.",
        "has_numerator_denominator": True,
    },
    {
        "metric_code": "dpd_30_plus_concentration",
        "name": "30+ DPD Concentration",
        "unit": "percent",
        "description": "Share of portfolio balance in accounts 30 or more days past due.",
        "has_numerator_denominator": True,
    },
]

LEGACY_METRIC_DEFINITIONS = [
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
        "metric_code": "autopay_active_pct",
        "name": "Autopay Active %",
        "unit": "percent",
        "description": "Percentage of accounts enrolled in autopay.",
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

METRIC_DEFINITIONS = CORE_KPI_METRICS + LEGACY_METRIC_DEFINITIONS

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

AS_OF_DATE = date(2026, 9, 30)
PERIOD_START = date(2026, 9, 1)
PERIOD_END = date(2026, 9, 30)


def _d(v: float, scale: str = "0.000001") -> Decimal:
    return Decimal(str(v)).quantize(Decimal(scale), rounding=ROUND_HALF_UP)


def _month_end(year: int, month: int) -> date:
    if month == 12:
        return date(year + 1, 1, 1) - timedelta(days=1)
    return date(year, month + 1, 1) - timedelta(days=1)


def _month_start(year: int, month: int) -> date:
    return date(year, month, 1)


def _clamp(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))


async def seed(session: AsyncSession) -> None:
    random.seed(42)

    # Demo seeding is intentionally destructive. Reset identities as well as
    # rows so stable local IDs continue matching persisted frontend selections.
    await session.execute(
        text(
            "TRUNCATE TABLE "
            "branch_insights, branch_root_cause_drivers, branch_segment_snapshots, "
            "branch_dpd_snapshots, branch_metric_snapshots, ingestion_batches, "
            "metric_definitions, branches RESTART IDENTITY CASCADE"
        )
    )
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
            state=b.get("state"),
            active=True,
            created_at=datetime.now(UTC),
        )
        session.add(branch)
        branches.append(branch)
    await session.flush()

    # Create one ingestion batch per comparison month so date-aware endpoints
    # can resolve the correct snapshot period.
    comparison_months = [
        (2026, 7),
        (2026, 8),
        (2026, 9),
    ]
    batches: dict[tuple[int, int], IngestionBatch] = {}
    for year, month in comparison_months:
        month_start = _month_start(year, month)
        month_end = _month_end(year, month)
        batch = IngestionBatch(
            source="synthetic_demo",
            report_type="branch_summary",
            period_start=month_start,
            period_end=month_end,
            as_of_date=month_end,
            loaded_at=datetime.now(UTC),
            is_demo=True,
            notes="Synthetic demo data seeded from Python backend. Destructive: re-creates tables.",
        )
        session.add(batch)
        batches[(year, month)] = batch
    await session.flush()

    def branch_base(idx: int) -> dict[str, float]:
        # Deterministic per-branch base rates.
        # Collection efficiency decreases with idx so B001 is top and B007 is lagging.
        return {
            "collection_efficiency": 88.0 - idx * 3.0 + random.uniform(-1.0, 1.0),
            "avg_days_to_resolve": 18.0 + idx * 1.4 + random.uniform(-0.5, 0.5),
            "contact_rate": 82.0 - idx * 1.8 + random.uniform(-1.5, 1.5),
            "ptp_kept_rate": 76.0 - idx * 2.0 + random.uniform(-1.5, 1.5),
            "dpd_30_plus_concentration": 8.0 + idx * 1.2 + random.uniform(-0.5, 0.5),
            "delinquency_rate_30_plus": 3.5 + idx * 0.4 + random.uniform(-0.3, 0.3),
            "cure_rate": 55.0 - idx * 1.5 + random.uniform(-2.0, 2.0),
            "roll_rate": 12.0 + idx * 0.5 + random.uniform(-1.0, 1.0),
            "autopay_active_pct": 45.0 + idx * 2.0 + random.uniform(-3.0, 3.0),
            "positive_outcome_rate": 70.0 - idx * 1.2 + random.uniform(-2.0, 2.0),
            "negative_outcome_rate": 15.0 + idx * 0.5 + random.uniform(-1.0, 1.0),
            "charge_off_rate": 1.2 + idx * 0.1 + random.uniform(-0.2, 0.2),
            "payment_total": 500_000 + idx * 50_000 + random.randint(-20_000, 20_000),
            "fpd_count": 20 + idx * 3 + random.randint(-5, 5),
        }

    # Pre-compute monthly KPI values per branch so we can reference them in insights.
    monthly_values: dict[int, dict[tuple[int, int], dict[str, float]]] = {}
    metric_snapshots: dict[tuple[int, int, int, str], BranchMetricSnapshot] = {}
    # Demo branches intentionally have different month-over-month operating
    # stories: some improve, some regress, and some remain nearly flat.
    trend_directions = [1, -1, 1, -1, 1, -1, 1]
    trend_magnitudes = {
        "collection_efficiency": 3.0,
        "avg_days_to_resolve": 1.8,
        "contact_rate": 2.5,
        "ptp_kept_rate": 2.8,
        "dpd_30_plus_concentration": 1.8,
    }
    month_phases = {7: -1.0, 8: 1.0, 9: 0.25}

    for idx, branch in enumerate(branches):
        base = branch_base(idx)
        monthly_values[branch.id] = {}

        for year, month in comparison_months:
            month_start = _month_start(year, month)
            month_end = _month_end(year, month)
            as_of = month_end
            direction = trend_directions[idx]
            phase = month_phases[month]

            month_values: dict[str, float] = {}
            for metric_index, (metric_code, base_value) in enumerate(base.items()):
                unit = metric_defs[metric_code].unit
                metric_magnitude = trend_magnitudes.get(metric_code, 0.0)
                branch_offset = ((idx * 3 + metric_index) % 5 - 2) * 0.35
                trend_component = direction * phase * metric_magnitude
                if metric_code == "avg_days_to_resolve":
                    value = _clamp(
                        base_value + trend_component + branch_offset + random.uniform(-0.2, 0.2),
                        10.0,
                        45.0,
                    )
                elif metric_code == "dpd_30_plus_concentration":
                    value = _clamp(
                        base_value + trend_component + branch_offset + random.uniform(-0.2, 0.2),
                        1.0,
                        30.0,
                    )
                elif metric_code == "ptp_kept_rate":
                    value = _clamp(
                        base_value + trend_component + branch_offset + random.uniform(-0.4, 0.4),
                        30.0,
                        98.0,
                    )
                elif metric_code == "contact_rate":
                    value = _clamp(
                        base_value + trend_component + branch_offset + random.uniform(-0.4, 0.4),
                        40.0,
                        98.0,
                    )
                elif metric_code == "collection_efficiency":
                    value = _clamp(
                        base_value - idx * 0.8 + trend_component + branch_offset + random.uniform(-0.4, 0.4),
                        40.0,
                        98.0,
                    )
                elif metric_code in ["payment_total", "fpd_count"]:
                    value = max(0.0, base_value + random.uniform(-5_000, 5_000) if metric_code == "payment_total" else random.randint(-3, 3))
                else:
                    value = _clamp(base_value + phase * random.uniform(-1.0, 1.0), 0.0, 100.0)

                month_values[metric_code] = value

                if metric_code == "collection_efficiency":
                    calculated_value = collection_efficiency(value * 10, 1000)
                elif metric_code == "avg_days_to_resolve":
                    calculated_value = average_days_to_resolution(value * 100, 100)
                elif metric_code == "contact_rate":
                    calculated_value = contact_rate(int(value * 10), 1000)
                elif metric_code == "ptp_kept_rate":
                    calculated_value = ptp_kept_rate(int(value * 10), 1000)
                elif metric_code == "dpd_30_plus_concentration":
                    calculated_value = dpd_30_plus_concentration(
                        int(value * 6),
                        int(value * 3),
                        int(value),
                        1000,
                    )
                else:
                    calculated_value = value

                final_value = calculated_value if metric_code in ["payment_total", "fpd_count", "avg_days_to_resolve"] else calculated_value / 100.0
                if unit == "percent":
                    final_value = _clamp(calculated_value or 0.0, 0.0, 100.0) / 100.0

                snapshot = BranchMetricSnapshot(
                    branch_id=branch.id,
                    batch_id=batches[(year, month)].id,
                    metric_code=metric_code,
                    value=_d(final_value),
                    unit=unit,
                    availability="available",
                    period_start=month_start,
                    period_end=month_end,
                    as_of_date=as_of,
                )
                if metric_defs[metric_code].has_numerator_denominator:
                    snapshot.denominator = 1000
                    snapshot.numerator = int(value * 10)
                session.add(snapshot)
                metric_snapshots[(branch.id, year, month, metric_code)] = snapshot

            monthly_values[branch.id][(year, month)] = month_values

        # DPD distribution is available for every seeded reporting month so the
        # frontend date selector never falls back to an unrelated snapshot.
        late_share = _clamp(base["dpd_30_plus_concentration"] / 100, 0.01, 0.25)
        shares = [0.75, 1.0 - 0.75 - late_share, late_share * 0.6, late_share * 0.3, late_share * 0.1]
        for year, month in comparison_months:
            month_end = _month_end(year, month)
            total_accounts = 5000 + idx * 200 + (month - 8) * 80 + random.randint(-100, 100)
            late_accounts = 0
            for bucket, share in zip(DPD_BUCKETS, shares):
                account_count = max(0, int(total_accounts * share))
                if bucket in {"31-60", "61-90", "90+"}:
                    late_accounts += account_count
                balance = account_count * (2000 + random.uniform(-500, 500))
                portfolio_share = (account_count / total_accounts) if total_accounts else 0
                session.add(
                    BranchDpdSnapshot(
                        branch_id=branch.id,
                        batch_id=batches[(year, month)].id,
                        bucket=bucket,
                        account_count=account_count,
                        balance=_d(balance, "0.01"),
                        portfolio_share=_d(portfolio_share, "0.000001"),
                        as_of_date=month_end,
                    )
                )

            dpd_metric = metric_snapshots[
                (branch.id, year, month, "dpd_30_plus_concentration")
            ]
            dpd_metric.value = _d(
                dpd_30_plus_concentration(0, 0, late_accounts, total_accounts) / 100,
            )
            dpd_metric.numerator = late_accounts
            dpd_metric.denominator = total_accounts

        # Segment snapshots for selected period.
        for segment_type, values in SEGMENT_DIMENSIONS.items():
            for segment_value in values:
                branch_modifier = random.uniform(0.7, 1.3)
                value = _clamp(base["delinquency_rate_30_plus"] * branch_modifier, 0.0, 100.0) / 100.0
                session.add(
                    BranchSegmentSnapshot(
                        branch_id=branch.id,
                        batch_id=batches[(2026, 9)].id,
                        segment_type=segment_type,
                        segment_value=segment_value,
                        metric_code="delinquency_rate_30_plus",
                        value=_d(value),
                        account_count=random.randint(50, 500),
                        as_of_date=AS_OF_DATE,
                    )
                )

        # Root cause drivers for selected period.
        for metric_code in [m["metric_code"] for m in CORE_KPI_METRICS]:
            value = monthly_values[branch.id][(2026, 9)][metric_code]
            unit = metric_defs[metric_code].unit
            contributing_segments = []
            if metric_code == "contact_rate":
                contributing_segments = [
                    {"segmentType": "collector_experience", "segmentValue": "junior", "impact": -0.04},
                    {"segmentType": "collector_experience", "segmentValue": "senior", "impact": 0.03},
                ]
            elif metric_code == "ptp_kept_rate":
                contributing_segments = [
                    {"segmentType": "tenure", "segmentValue": "new", "impact": -0.05},
                    {"segmentType": "tenure", "segmentValue": "3y+", "impact": 0.04},
                ]
            elif metric_code == "dpd_30_plus_concentration":
                contributing_segments = [
                    {"segmentType": "fico_band", "segmentValue": "<600", "impact": 0.06},
                    {"segmentType": "fico_band", "segmentValue": ">700", "impact": -0.03},
                ]
            elif metric_code == "collection_efficiency":
                contributing_segments = [
                    {"segmentType": "product_type", "segmentValue": "personal", "impact": 0.04},
                    {"segmentType": "product_type", "segmentValue": "mortgage", "impact": -0.02},
                ]
            elif metric_code == "avg_days_to_resolve":
                contributing_segments = [
                    {"segmentType": "loan_size", "segmentValue": "small", "impact": -2.0},
                    {"segmentType": "loan_size", "segmentValue": "large", "impact": 3.0},
                ]

            final_value = value / 100.0 if unit == "percent" else value
            session.add(
                BranchRootCauseDriver(
                    branch_id=branch.id,
                    batch_id=batches[(2026, 9)].id,
                    metric_code=metric_code,
                    value=_d(final_value),
                    unit=unit,
                    availability="available",
                    contributing_segments=contributing_segments,
                    as_of_date=AS_OF_DATE,
                )
            )

        # Insights for selected period.
        sep_values = monthly_values[branch.id][(2026, 9)]
        aug_values = monthly_values[branch.id][(2026, 8)]
        insight_templates = [
            {
                "narrative": f"{branch.name} collection efficiency is {'above' if sep_values['collection_efficiency'] >= 80 else 'below'} network expectations, driven by {'strong Day-2 outreach' if sep_values['collection_efficiency'] >= 80 else 'delayed first contact'}.",
                "evidence": [
                    {"metricCode": "collection_efficiency", "branchValue": sep_values["collection_efficiency"] / 100.0, "networkValue": 0.80, "delta": (sep_values["collection_efficiency"] - 80.0) / 100.0, "unit": "percent"},
                ],
            },
            {
                "narrative": f"{'High' if sep_values['dpd_30_plus_concentration'] > 12 else 'Controlled'} 30+ DPD concentration at {branch.name} is linked to {'vintage and FICO' if sep_values['dpd_30_plus_concentration'] > 12 else 'strong early-intervention'} segments.",
                "evidence": [
                    {"metricCode": "dpd_30_plus_concentration", "branchValue": sep_values["dpd_30_plus_concentration"] / 100.0, "networkValue": 0.12, "delta": (sep_values["dpd_30_plus_concentration"] - 12.0) / 100.0, "unit": "percent"},
                ],
            },
            {
                "narrative": f"Promise-to-pay kept rate at {branch.name} {'improved' if sep_values['ptp_kept_rate'] >= aug_values['ptp_kept_rate'] else 'weakened'} from August to September.",
                "evidence": [
                    {"metricCode": "ptp_kept_rate", "branchValue": sep_values["ptp_kept_rate"] / 100.0, "networkValue": aug_values["ptp_kept_rate"] / 100.0, "delta": (sep_values["ptp_kept_rate"] - aug_values["ptp_kept_rate"]) / 100.0, "unit": "percent"},
                ],
            },
        ]
        for tmpl in insight_templates:
            session.add(
                BranchInsight(
                    branch_id=branch.id,
                    batch_id=batches[(2026, 9)].id,
                    narrative=tmpl["narrative"],
                    evidence=tmpl["evidence"],
                    model_version="demo-v1",
                    generated_at=datetime.now(UTC),
                    as_of_date=AS_OF_DATE,
                )
            )

    await session.commit()
    print(
        f"Seeded {len(branches)} branches across {len(batches)} demo monthly batches "
        f"(latest {AS_OF_DATE})."
    )


async def main() -> None:
    async with engine.begin() as conn:
        from app.models import Base

        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        await seed(session)

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
