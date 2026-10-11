# RecoveryOps

Branch-level collections intelligence prototype.

## Repository layout

```
RecoveryOps/
├── frontend/              # TanStack Start web app
├── backend/               # Express + Drizzle + Postgres API
├── packages/shared/       # Shared API types, constants, and Zod schemas
├── Reports/               # Source PDF reports
├── package.json           # npm workspaces + root scripts
└── .env.example
```

## Prerequisites

- Node.js >= 20
- Docker (for Postgres)
- npm

## Quick start

1. Install dependencies from the root:
   ```bash
   npm install
   ```

2. Copy and fill environment variables:
   ```bash
   cp .env.example .env
   cp backend/.env.example backend/.env
   cp frontend/.env frontend/.env   # already present
   ```

3. Start Postgres and prepare the database:
   ```bash
   cd backend
   docker compose up -d
   cd ..
   npm run db:push
   npm run db:seed
   ```

4. Start both apps:
   ```bash
   npm run dev
   ```

   - Frontend: http://localhost:8081 (Vite may pick a different port; check console output)
   - Backend: http://localhost:3001

## Root scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Starts backend and frontend concurrently |
| `npm run dev:api` | Starts only the backend |
| `npm run dev:web` | Starts only the frontend |
| `npm run build` | Builds shared package, frontend, and backend |
| `npm run db:push` | Pushes Drizzle schema to Postgres |
| `npm run db:seed` | Seeds synthetic branch data |
| `npm run db:migrate` | Runs Drizzle migrations |

## Shared package

`packages/shared` contains the API contract:
- TypeScript interfaces for all request/response shapes.
- Metric-code and unit constants.
- Zod schemas for route params and query strings.

Both `frontend` and `backend` depend on `@recoveryops/shared`, so the API contract stays in one place.

## Data source

The backend is currently seeded with synthetic data shaped like the four PDF reports in `Reports/`. To switch to real data, load a new `ingestion_batches` row with `isDemo: false` and insert real snapshots into the same tables. The frontend endpoints and response shapes remain unchanged.

## Notes

- Synthetic data is marked with `source: "synthetic_demo"` and `isDemo: true`.
- Metrics not available in the reports (e.g., contact rate, escalation rate) are explicitly returned as `availability: "unavailable"`.
- Do not use synthetic data for production decisions.
