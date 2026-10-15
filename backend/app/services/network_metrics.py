from typing import Any

from app import schemas


def calculate_network_averages(
    branches: list[Any],
    metrics_by_branch: dict[int, dict[str, schemas.MetricValue]],
    metric_codes: list[str],
) -> dict[str, float | None]:
    averages: dict[str, float | None] = {}
    for code in metric_codes:
        values = [
            metrics_by_branch[branch.id][code].value
            for branch in branches
            if branch.id in metrics_by_branch
            and code in metrics_by_branch[branch.id]
            and metrics_by_branch[branch.id][code].value is not None
            and metrics_by_branch[branch.id][code].availability == "available"
        ]
        averages[code] = sum(values) / len(values) if values else None
    return averages


def rank_branches_by_collection(
    branches: list[Any],
    metrics_by_branch: dict[int, dict[str, schemas.MetricValue]],
) -> list[dict[str, Any]]:
    ranked = [
        {
            "id": branch.id,
            "source_branch_code": branch.source_branch_code,
            "name": branch.name,
            "region": branch.region,
            "primaryMetric": (
                metrics_by_branch.get(branch.id, {}).get("collection_efficiency").value
                if branch.id in metrics_by_branch
                and "collection_efficiency" in metrics_by_branch[branch.id]
                else None
            ),
            "metrics": metrics_by_branch.get(branch.id, {}),
        }
        for branch in branches
    ]
    return sorted(
        ranked,
        key=lambda branch: branch["primaryMetric"] or 0,
        reverse=True,
    )
