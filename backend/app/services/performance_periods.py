from datetime import date, timedelta


def comparison_periods(as_of: date) -> list[dict[str, str]]:
    """Return the previous month followed by the selected reporting month."""
    def month_end(year: int, month: int) -> date:
        if month == 12:
            return date(year + 1, 1, 1) - timedelta(days=1)
        return date(year, month + 1, 1) - timedelta(days=1)

    def month_start(year: int, month: int) -> date:
        return date(year, month, 1)

    year, month = as_of.year, as_of.month
    previous_year, previous_month = (year - 1, 12) if month == 1 else (year, month - 1)
    return [
        {
            "label": month_start(previous_year, previous_month).strftime("%B %Y"),
            "start": month_start(previous_year, previous_month).isoformat(),
            "end": month_end(previous_year, previous_month).isoformat(),
        },
        {
            "label": month_start(year, month).strftime("%B %Y"),
            "start": month_start(year, month).isoformat(),
            "end": month_end(year, month).isoformat(),
        },
    ]
