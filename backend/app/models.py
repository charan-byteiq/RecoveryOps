from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    Numeric,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Branch(Base):
    __tablename__ = "branches"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    source_branch_code: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    region: Mapped[str] = mapped_column(String, nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, default=datetime.utcnow
    )


class MetricDefinition(Base):
    __tablename__ = "metric_definitions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    metric_code: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    unit: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    has_numerator_denominator: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    effective_from: Mapped[str | None] = mapped_column(Date, nullable=True)


class IngestionBatch(Base):
    __tablename__ = "ingestion_batches"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    source: Mapped[str] = mapped_column(String, nullable=False)
    report_type: Mapped[str | None] = mapped_column(String, nullable=True)
    period_start: Mapped[str | None] = mapped_column(Date, nullable=True)
    period_end: Mapped[str | None] = mapped_column(Date, nullable=True)
    as_of_date: Mapped[str] = mapped_column(Date, nullable=False)
    loaded_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, default=datetime.utcnow
    )
    is_demo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    notes: Mapped[str | None] = mapped_column(String, nullable=True)


class BranchMetricSnapshot(Base):
    __tablename__ = "branch_metric_snapshots"
    __table_args__ = (
        UniqueConstraint(
            "branch_id", "metric_code", "period_end", "as_of_date",
            name="branch_metric_unique",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    branch_id: Mapped[int] = mapped_column(ForeignKey("branches.id"), nullable=False)
    batch_id: Mapped[int] = mapped_column(ForeignKey("ingestion_batches.id"), nullable=False)
    metric_code: Mapped[str] = mapped_column(String, nullable=False)
    value: Mapped[Decimal | None] = mapped_column(Numeric(18, 6), nullable=True)
    numerator: Mapped[int | None] = mapped_column(Integer, nullable=True)
    denominator: Mapped[int | None] = mapped_column(Integer, nullable=True)
    unit: Mapped[str] = mapped_column(String, nullable=False)
    availability: Mapped[str] = mapped_column(String, nullable=False, default="available")
    period_start: Mapped[str | None] = mapped_column(Date, nullable=True)
    period_end: Mapped[str | None] = mapped_column(Date, nullable=True)
    as_of_date: Mapped[str] = mapped_column(Date, nullable=False)
    created_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, default=datetime.utcnow
    )


class BranchDpdSnapshot(Base):
    __tablename__ = "branch_dpd_snapshots"
    __table_args__ = (
        UniqueConstraint(
            "branch_id", "bucket", "as_of_date",
            name="branch_dpd_unique",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    branch_id: Mapped[int] = mapped_column(ForeignKey("branches.id"), nullable=False)
    batch_id: Mapped[int] = mapped_column(ForeignKey("ingestion_batches.id"), nullable=False)
    bucket: Mapped[str] = mapped_column(String, nullable=False)
    account_count: Mapped[int] = mapped_column(Integer, nullable=False)
    balance: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), nullable=True)
    portfolio_share: Mapped[Decimal | None] = mapped_column(Numeric(10, 6), nullable=True)
    as_of_date: Mapped[str] = mapped_column(Date, nullable=False)
    created_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, default=datetime.utcnow
    )


class BranchSegmentSnapshot(Base):
    __tablename__ = "branch_segment_snapshots"
    __table_args__ = (
        UniqueConstraint(
            "branch_id", "segment_type", "segment_value", "metric_code", "as_of_date",
            name="branch_segment_unique",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    branch_id: Mapped[int] = mapped_column(ForeignKey("branches.id"), nullable=False)
    batch_id: Mapped[int] = mapped_column(ForeignKey("ingestion_batches.id"), nullable=False)
    segment_type: Mapped[str] = mapped_column(String, nullable=False)
    segment_value: Mapped[str] = mapped_column(String, nullable=False)
    metric_code: Mapped[str] = mapped_column(String, nullable=False)
    value: Mapped[Decimal | None] = mapped_column(Numeric(18, 6), nullable=True)
    account_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    as_of_date: Mapped[str] = mapped_column(Date, nullable=False)
    created_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, default=datetime.utcnow
    )


class BranchInsight(Base):
    __tablename__ = "branch_insights"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    branch_id: Mapped[int] = mapped_column(ForeignKey("branches.id"), nullable=False)
    batch_id: Mapped[int] = mapped_column(ForeignKey("ingestion_batches.id"), nullable=False)
    narrative: Mapped[str] = mapped_column(String, nullable=False)
    evidence: Mapped[list[dict[str, Any]]] = mapped_column(JSON, nullable=False, default=list)
    model_version: Mapped[str | None] = mapped_column(String, nullable=True)
    generated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, default=datetime.utcnow
    )
    as_of_date: Mapped[str] = mapped_column(Date, nullable=False)
