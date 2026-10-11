# RecoveryOps Branch Backend

Branch-level analytics API for RecoveryOps. It is seeded with synthetic data shaped like the four PDF reports in `../Reports`, and is designed to be replaced with real report extracts later without changing the API contract.

## What is included

- PostgreSQL schema for branches, metric snapshots, DPD buckets, segment snapshots, and evidence-backed insights.
- Synthetic seed data for the 7 branch codes found in the reports (`101`, `104`, `105`, `106`, `201`, `202`, `203`).
- Express API endpoints for the branch-level screens:
  - `GET /api/analytics/network`
  - `GET /api/branches`
  - `GET /api/branches/:id/overview`
  - `GET /api/branches/:id/performance`
  - `GET /api/branches/:id/peers`
  - `GET /api/branches/:id/drivers`
  - `GET /api/branches/:id/insights`
- Docker Compose file for a local Postgres instance.

## Quick start

The easiest way to run the backend is from the repository root using npm workspaces. See `../README.md` for the full stack setup.

### From the repository root

```bash
# 1. Install all dependencies
npm install

# 2. Start Postgres (maps container port 5432 to host port 5433)
cd backend && docker compose up -d && cd ..

# 3. Copy environment files
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env frontend/.env

# 4. Push schema and seed data
npm run db:push
npm run db:seed

# 5. Start everything
npm run dev
```

### From the backend folder only

```bash
cd backend
npm install
docker compose up -d
cp .env.example .env
npm run db:push
npm run db:seed
npm run dev
```

The API will be available at `http://localhost:3001`.

## Connecting the frontend

The frontend expects `VITE_API_URL` to point at this backend. It is already set in `../frontend/.env`:

```
VITE_API_URL=http://localhost:3001/api
```

The backend CORS origin list includes the common Vite dev ports (`8081`, `3000`, `5173`). Adjust `CORS_ORIGIN` in `.env` if your frontend runs on a different host or port.

## Replacing synthetic data with real data

To move from the demo seed to real bank data:

1. Obtain structured exports or query access to the datasets behind the four PDF reports.
2. Map source branch codes to the `branches` table.
3. Load a new `ingestion_batches` row with `isDemo = false`.
4. Insert real values into:
   - `branch_metric_snapshots`
   - `branch_dpd_snapshots`
   - `branch_segment_snapshots`
   - `branch_insights`
5. The frontend will continue to call the same endpoints and receive the same response shapes; only the `source` and `isDemo` metadata will change.

## Notes

- All synthetic seed values carry `source: "synthetic_demo"` and `isDemo: true`.
- Metrics that are not present in the reports (contact rate, escalation rate, first-contact timing, etc.) are explicitly marked `availability: "unavailable"` for the latest period.
- Do not use the synthetic data for production decisions.
