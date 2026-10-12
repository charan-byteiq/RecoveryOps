# RecoveryOps

Branch-level collections intelligence prototype.

## Repository layout

```
RecoveryOps/
├── frontend/              # TanStack Start web app
├── backend/               # Python FastAPI + async SQLAlchemy + asyncpg API
├── packages/shared/       # Shared API types, constants, and Zod schemas (frontend)
├── Reports/               # Source PDF reports
├── package.json           # npm workspaces + root scripts
├── docker-compose.yml     # Postgres service
└── .env.example
```

## Prerequisites

- Node.js >= 20
- Python >= 3.12 (with `pip` and `venv`)
- Docker (for Postgres)
- npm

## Quick start

1. Install Node dependencies from the root:
   ```bash
   npm install
   ```

2. Create and activate the Python virtual environment, then install packages:
   ```bash
   cd backend
   python -m venv .venv
   .\.venv\Scripts\python.exe -m pip install -r requirements.txt
   cd ..
   ```

3. Copy environment variables to the root `.env`:
   ```bash
   cp .env.example .env
   ```

4. Start Postgres and prepare the database:
   ```bash
   docker compose up -d
   npm run db:init
   npm run db:seed
   ```

5. Start both apps:
   ```bash
   npm run dev
   ```

   - Frontend: http://localhost:8080 (check console output; may fall back to 8081/5173)
   - Backend: http://localhost:3001

## Root scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Starts backend and frontend concurrently |
| `npm run dev:api` | Starts only the Python backend (Uvicorn with reload) |
| `npm run dev:web` | Starts only the frontend |
| `npm run build` | Builds shared package and frontend |
| `npm run db:init` | Creates SQLAlchemy tables in Postgres |
| `npm run db:seed` | Seeds synthetic branch data |
| `npm run start:api` | Runs the Python backend in production mode |

## Shared package

`packages/shared` contains the API contract used by the frontend:
- TypeScript interfaces for all request/response shapes.
- Metric-code and unit constants.
- Zod schemas for route params and query strings.

The Python backend keeps equivalent Pydantic schemas in `backend/app/schemas.py`.

## Data source

The backend is currently seeded with synthetic data shaped like the four PDF reports in `Reports/`. To switch to real data, load a new `ingestion_batches` row with `isDemo: false` and insert real snapshots into the same tables. The frontend endpoints and response shapes remain unchanged.

## Notes

- Synthetic data is marked with `source: "synthetic_demo"` and `isDemo: true`.
- Metrics not available in the reports (e.g., contact rate, escalation rate) are explicitly returned as `availability: "unavailable"`.
- Do not use synthetic data for production decisions.
