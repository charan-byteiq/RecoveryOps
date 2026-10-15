"""Metric groups used by the branch endpoints."""

CORE_KPI_METRICS = [
    "collection_efficiency",
    "avg_days_to_resolve",
    "contact_rate",
    "ptp_kept_rate",
    "dpd_30_plus_concentration",
]

SUMMARY_METRICS = CORE_KPI_METRICS + [
    "delinquency_rate_30_plus",
    "cure_rate",
    "autopay_active_pct",
    "payment_total",
    "fpd_count",
    "positive_outcome_rate",
]

PERFORMANCE_METRICS = CORE_KPI_METRICS + [
    "delinquency_rate_30_plus",
    "cure_rate",
    "roll_rate",
    "positive_outcome_rate",
    "negative_outcome_rate",
    "charge_off_rate",
    "autopay_active_pct",
]
