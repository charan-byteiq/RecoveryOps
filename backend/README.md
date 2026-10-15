# Backend Guide

## Where to look

- `app/main.py`: FastAPI application, middleware, terminal logging, and router registration.
- `app/config.py`: environment configuration.
- `app/database.py`: SQLAlchemy engine, base class, and session dependency.
- `app/models.py`: database entities and constraints.
- `app/schemas.py`: API response contracts and camelCase serialization.
- `app/routers/branches.py`: HTTP endpoints for branch pages. Keep request/response assembly here.
- `app/services/batch_resolution.py`: snapshot-date to ingestion-batch resolution.
- `app/services/metric_service.py`: metric definition lookup, snapshot-to-API mapping, and metric bulk reads.
- `app/services/performance_periods.py`: previous-month and selected-month comparison periods.
- `app/services/kpi_calculations.py`: canonical formulas for all five KPIs.
- `app/services/kpi_catalog.py`: canonical KPI groups used by each API surface.
- `app/services/network_metrics.py`: network averages and collection-efficiency ranking.
- `app/seed.py`: deterministic synthetic database seed.
- `tests/test_api.py`: endpoint, date, ranking, logging, and data-integrity tests.

## Endpoint ownership

- Network Overview: `app/routers/branches.py` functions `list_branches` and `network_analytics`.
- Selected Branch Overview: `app/routers/branches.py` function `branch_overview`.
- Performance: `app/routers/branches.py` function `branch_performance`.
- Peer data: `app/routers/branches.py` function `branch_peers`.
- Root Cause data: `app/routers/branches.py` functions `branch_drivers` and `branch_insights`.

The public API paths are intentionally unchanged so the existing frontend contract remains compatible.
