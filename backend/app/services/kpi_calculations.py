"""Canonical formulas for the five Branch-Level KPIs.

All functions are pure calculations so they can be reused by ingestion,
synthetic seeding, validation, and future production pipelines.
"""


def percentage(numerator: int | float, denominator: int | float) -> float | None:
    if denominator <= 0:
        return None
    return (numerator / denominator) * 100


def collection_efficiency(total_collected: float, overdue_balance: float) -> float | None:
    return percentage(total_collected, overdue_balance)


def average_days_to_resolution(total_resolution_days: float, resolved_accounts: int) -> float | None:
    if resolved_accounts <= 0:
        return None
    return total_resolution_days / resolved_accounts


def contact_rate(contacted_delinquent_accounts: int, delinquent_accounts: int) -> float | None:
    return percentage(contacted_delinquent_accounts, delinquent_accounts)


def ptp_kept_rate(kept_promises: int, promises_due: int) -> float | None:
    return percentage(kept_promises, promises_due)


def dpd_30_plus_concentration(
    accounts_31_60: int,
    accounts_61_90: int,
    accounts_90_plus: int,
    total_active_accounts: int,
) -> float | None:
    return percentage(
        accounts_31_60 + accounts_61_90 + accounts_90_plus,
        total_active_accounts,
    )
