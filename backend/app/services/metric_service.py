from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app import schemas
from app.models import BranchMetricSnapshot, MetricDefinition


def to_float(value: Any) -> float | None:
    return float(value) if value is not None else None


def build_meta(batch: Any) -> dict[str, Any]:
    return {
        "asOfDate": batch.as_of_date.isoformat() if batch.as_of_date else None,
        "period": {
            "start": batch.period_start.isoformat() if batch.period_start else None,
            "end": batch.period_end.isoformat() if batch.period_end else None,
        },
        "source": batch.source,
        "isDemo": batch.is_demo,
    }


async def get_metric_definitions(
    session: AsyncSession,
) -> dict[str, MetricDefinition]:
    result = await session.execute(select(MetricDefinition))
    return {definition.metric_code: definition for definition in result.scalars().all()}


def to_metric_value(
    snapshot: BranchMetricSnapshot | None,
    definitions: dict[str, MetricDefinition],
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

    definition = definitions.get(snapshot.metric_code)
    return schemas.MetricValue(
        metric_code=snapshot.metric_code,
        name=definition.name if definition else snapshot.metric_code,
        value=to_float(snapshot.value),
        numerator=snapshot.numerator,
        denominator=snapshot.denominator,
        unit=snapshot.unit,
        availability=snapshot.availability,  # type: ignore[arg-type]
        source="synthetic_demo" if is_demo else source,
        definition_version=definition.version if definition else 1,
        period=(
            {
                "start": snapshot.period_start.isoformat(),
                "end": snapshot.period_end.isoformat(),
            }
            if snapshot.period_start and snapshot.period_end
            else None
        ),
    )


async def get_branch_metrics(
    session: AsyncSession,
    branch_ids: list[int],
    batch_id: int,
    metric_codes: list[str],
    definitions: dict[str, MetricDefinition],
    source: str,
    is_demo: bool,
    period_end: Any | None = None,
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
    metrics: dict[int, dict[str, schemas.MetricValue]] = {}
    for snapshot in result.scalars().all():
        metrics.setdefault(snapshot.branch_id, {})[snapshot.metric_code] = to_metric_value(
            snapshot, definitions, source, is_demo
        )
    return metrics
