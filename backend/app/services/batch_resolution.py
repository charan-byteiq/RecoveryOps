import logging
from datetime import date

from fastapi import HTTPException
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import IngestionBatch

logger = logging.getLogger("recoveryops")


async def resolve_batch(
    session: AsyncSession,
    as_of_date: str | None,
) -> IngestionBatch | None:
    """Resolve the reporting batch for a requested business date."""
    if as_of_date:
        try:
            as_of = date.fromisoformat(as_of_date)
        except ValueError:
            logger.warning("Invalid as_of_date format: %s", as_of_date)
            raise HTTPException(status_code=400, detail="Invalid as_of_date format")

        month_match = (
            select(IngestionBatch)
            .where(
                func.extract("year", IngestionBatch.as_of_date) == as_of.year,
                func.extract("month", IngestionBatch.as_of_date) == as_of.month,
            )
            .order_by(desc(IngestionBatch.as_of_date), desc(IngestionBatch.loaded_at))
        )
        result = await session.execute(month_match.limit(1))
        batch = result.scalar_one_or_none()
        if batch is not None:
            logger.info(
                "Resolved batch id=%s as_of_date=%s for request_date=%s",
                batch.id,
                batch.as_of_date,
                as_of_date,
            )
            return batch

        fallback = (
            select(IngestionBatch)
            .where(IngestionBatch.as_of_date <= as_of)
            .order_by(desc(IngestionBatch.as_of_date), desc(IngestionBatch.loaded_at))
        )
        result = await session.execute(fallback.limit(1))
        batch = result.scalar_one_or_none()
        if batch is not None:
            logger.info(
                "Resolved fallback batch id=%s as_of_date=%s for request_date=%s",
                batch.id,
                batch.as_of_date,
                as_of_date,
            )
            return batch
        logger.warning("No batch available for as_of_date=%s", as_of_date)
        return None

    stmt = select(IngestionBatch).order_by(
        desc(IngestionBatch.as_of_date), desc(IngestionBatch.loaded_at)
    )
    result = await session.execute(stmt.limit(1))
    batch = result.scalar_one_or_none()
    if batch is None:
        logger.warning("No ingestion batch available")
    else:
        logger.info("Resolved latest batch id=%s as_of_date=%s", batch.id, batch.as_of_date)
    return batch
