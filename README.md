# RecoveryOps

Branch-level collections intelligence platform — a full-stack analytics application for monitoring and diagnosing branch performance across a regional debt-recovery network.

---

## What This Project Does

RecoveryOps ingests branch-level collections data (sourced from PDF reports) and exposes it through a structured API and interactive dashboard. It lets operations managers:

- **Monitor the full branch network** — ranked by collection efficiency, with peer averages across 5 core KPIs.
- **Drill into a single branch** — review its KPI performance, DPD portfolio distribution, and how it compares against the network.
- **Diagnose root causes** — identify which borrower segments, loan categories, or operational drivers are pulling a branch's performance below network benchmarks.
- **Track KPI trends over time** — month-on-month comparisons for collection efficiency, PTP kept rate, contact rate, average days to resolution, and 30+ DPD concentration.
- **Get AI-generated insights** — branch comparison narratives, KPI-specific root cause analysis, and overall branch health summaries powered by OpenRouter.

---

## Repository Layout

```
RecoveryOps/
├── frontend/              # TanStack Start (React + Vite) web application
│   └── src/
│       ├── routes/        # Page-level route components (index, performance, root-cause, etc.)
│       ├── lib/api.ts     # Typed API client — all backend calls go through here
│       ├── hooks/         # Branch context, date context, scroll animation hooks
│       └── data/          # Local mock data (used only by the customer detail page)
├── backend/               # Python FastAPI + async SQLAlchemy + asyncpg REST API
│   └── app/
│       ├── main.py        # App entry point, logging, CORS, request middleware
│       ├── config.py      # Pydantic settings (reads from root .env)
│       ├── database.py    # Async SQLAlchemy engine and session factory
│       ├── models.py      # SQLAlchemy ORM models (branches, snapshots, insights, etc.)
│       ├── schemas.py     # Pydantic response schemas (mirrors shared/ TypeScript types)
│       ├── routers/
│       │   └── branches.py  # All API endpoints
│       └── services/
│           ├── metric_service.py       # Metric resolution and MetricValue building
│           ├── batch_resolution.py     # Resolves the correct ingestion batch for a date
│           ├── kpi_catalog.py          # KPI code lists (summary, performance, core)
│           ├── network_metrics.py      # Network average and branch ranking calculations
│           ├── performance_periods.py  # Monthly comparison period helpers
│           ├── kpi_calculations.py     # KPI formula helpers
│           ├── root_cause_ai.py        # Context builder + OpenRouter AI prompt logic
│           └── ai_insights.py          # OpenRouter HTTP client (comparison, KPI, overall)
├── packages/shared/       # Shared TypeScript types, Zod schemas, metric constants (frontend)
├── Reports/               # Source PDF reports (synthetic demo data was derived from these)
├── package.json           # npm workspaces root + all dev scripts
├── docker-compose.yml     # PostgreSQL 16 service (port 5433)
└── .env.example           # Environment variable template
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend framework | TanStack Start (React + Vite) |
| Frontend data fetching | TanStack Query (`useQuery`) |
| Frontend routing | TanStack Router (file-based) |
| Styling | Vanilla CSS + custom design tokens |
| Charts | Recharts |
| Backend framework | Python FastAPI |
| Backend server | Uvicorn (with `--reload` in dev) |
| ORM | SQLAlchemy 2.x async |
| Database driver | asyncpg |
| Database | PostgreSQL 16 (Docker) |
| Schema validation | Pydantic v2 (backend) / Zod (frontend shared) |
| Settings management | pydantic-settings (reads `.env`) |
| AI insights | OpenRouter API (configurable model) |
| Shared types | `@recoveryops/shared` npm workspace package |

---

## Prerequisites

- **Node.js** >= 20
- **Python** >= 3.12 (with `pip`)
- **Docker Desktop** (must be running before starting the backend)
- **npm**

---

## First-Time Setup

Run these steps **once** when setting up the project for the first time.

### 1. Install Node dependencies
```bash
npm install
```

### 2. Create the Python virtual environment and install packages
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
cd ..
```

### 3. Copy and configure environment variables
```powershell
copy .env.example .env
```
The `.env` file at the project root is used by **both** the backend (via pydantic-settings) and the frontend (Vite reads `VITE_*` prefixed vars).

Key variables:
| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (default: `localhost:5433`) |
| `CORS_ORIGIN` | Allowed frontend origins |
| `VITE_API_URL` | Backend URL as seen by the browser |
| `OPENROUTER_API_KEY` | API key for AI insight generation |
| `OPENROUTER_MODEL` | Model to use (default: `z-ai/glm-5.3-flash`) |

### 4. Start PostgreSQL (Docker)
```powershell
docker compose up -d
```
Wait a few seconds, then verify it's healthy:
```powershell
docker ps
```
You should see `recovery-ops-postgres` with status `Up (healthy)`.

### 5. Initialise the database and seed demo data
```powershell
npm run db:init
npm run db:seed
```
This creates all SQLAlchemy tables and seeds them with synthetic branch data shaped from the PDF reports in `Reports/`.

---

## Starting the App (Daily Development)

> **⚠️ Critical order:** Always start in this sequence: **Docker → Backend → Frontend**

### Step 1 — Start PostgreSQL
```powershell
docker compose up -d
```

### Step 2 — Start the Backend (in its own terminal)

Open a **dedicated terminal** for the backend so you can see its logs clearly:

```powershell
cd d:\recoveryops\RecoveryOps\backend
..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 3001
```

You should see output like:
```
INFO:  RecoveryOps API starting up (version=0.2.0)
INFO:  Database connection verified
INFO:  Uvicorn running on http://0.0.0.0:3001 (Press CTRL+C to quit)
```

> If you see a database connection error at startup → Docker/PostgreSQL is not ready yet. Wait a moment and retry.

### Step 3 — Start the Frontend (in a separate terminal)

```powershell
cd d:\recoveryops\RecoveryOps
npm run dev:web
```

Frontend is available at: **http://localhost:8080** (may fall back to 8081 or 5173 if port is in use).

### Quick start (both together in one terminal)
If you just want everything running and don't need to see backend logs separately:
```powershell
npm run dev
```
This uses `concurrently` to run both processes. Backend logs and frontend logs will be interleaved.

---

## All Root Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Starts backend + frontend concurrently in one terminal |
| `npm run dev:api` | Starts **only** the Python backend (Uvicorn with `--reload`) |
| `npm run dev:web` | Starts **only** the frontend (Vite dev server) |
| `npm run build` | Builds shared package + frontend for production |
| `npm run db:init` | Creates all SQLAlchemy tables in PostgreSQL |
| `npm run db:seed` | Seeds synthetic branch data into the database |
| `npm run start:api` | Runs the backend in production mode (no reload) |

---

## API Endpoints

All endpoints are prefixed with `/api`. The backend runs on **http://localhost:3001**.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check — verifies DB connectivity |
| `GET` | `/api/branches` | List all active branches with summary KPIs |
| `GET` | `/api/analytics/network` | Network-wide aggregates + per-branch rankings |
| `GET` | `/api/branches/{id}/overview` | Single branch KPIs vs network benchmark |
| `GET` | `/api/branches/{id}/performance` | DPD distribution, trends, monthly KPI comparisons |
| `GET` | `/api/branches/{id}/peers` | Peer branch comparison data |
| `GET` | `/api/branches/{id}/drivers` | Segment-level root cause drivers |
| `GET` | `/api/branches/{id}/insights` | Stored AI-generated insight narratives |
| `GET` | `/api/branches/{id}/ai-insights/comparison` | Live AI: branch vs top peer comparison |
| `GET` | `/api/branches/{id}/ai-insights/kpi` | Live AI: deep-dive on a specific KPI |
| `GET` | `/api/branches/{id}/ai-insights/overall` | Live AI: holistic branch health summary |

All date-filtered endpoints accept an optional `?as_of_date=YYYY-MM-DD` query parameter.

---

## Frontend Pages & What They Call

| Route | Page | Backend calls |
|---|---|---|
| `/` | Branch Network Overview + Single Branch Overview | `getNetwork`, `getBranchOverview`, `getBranchDrivers` |
| `/performance` | Performance Analytics (KPI trends, DPD distribution) | `getBranchPerformance`, `getNetwork`, `getBranches` |
| `/root-cause` | Root Cause Diagnosis + AI Insights | `getBranchDrivers`, `getBranchInsights`, `getBranchComparisonAI`, `getSelectedKpiAI`, `getOverallBranchAI` |
| `/customer-analytics` | Customer-level analytics overview | `getNetwork`, `getBranchOverview` |
| `/customers/:id` | Individual customer detail | **Local mock data only** (no backend call) |

> **If the backend is not running**, all pages except `/customers/:id` will show a loading state and then display an error message. The frontend itself will still start fine — it only needs the backend when fetching data.

---

## Core KPIs

| Metric Code | Label | Unit | Direction |
|---|---|---|---|
| `collection_efficiency` | Collection Efficiency | percent | Higher = better |
| `avg_days_to_resolve` | Average Days to Resolution | days | Lower = better |
| `ptp_kept_rate` | PTP Kept % | percent | Higher = better |
| `contact_rate` | Contact Rate | percent | Higher = better |
| `dpd_30_plus_concentration` | 30+ DPD Concentration | percent | Lower = better |

---

## Data

- All data is seeded from **synthetic demo data** shaped like the four PDF reports in `Reports/`.
- Synthetic data rows are tagged with `source: "synthetic_demo"` and `is_demo: true`.
- The frontend shows an amber **Demo Network Snapshot** banner when displaying demo data.
- To load real data: insert a new `ingestion_batches` row with `is_demo: false` and populate the corresponding snapshot tables. All API endpoints and frontend pages are unchanged.

---

## Notes

- **Do not use synthetic data for production decisions.**
- Metrics not available in the source reports (e.g. contact rate, escalation rate) are returned with `availability: "unavailable"` and display as `—` in the UI.
- The backend performs a live database connectivity check on startup. If PostgreSQL is not running, the backend will **refuse to start** with a clear error message — this is intentional.
- Backend logs every request with method, path, status code, and response time. Run the backend in its own terminal (Step 2 above) to see these clearly.
