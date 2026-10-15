# RecoveryOps — Frontend & Backend Integration Plan

> **Status:** Analysis-only. No code has been modified.
> **Generated:** 2026-10-13
> **Scope:** Complete audit of the existing codebase with an actionable, file-level implementation roadmap.

---

## 1. Executive Summary

RecoveryOps is a collections intelligence prototype with a **working FastAPI backend** (Python 3.12, async SQLAlchemy, PostgreSQL) and a **TanStack Start / React frontend**. The two layers share a TypeScript type contract via `packages/shared`.

**The critical finding:** The Branch-Level pages (Overview, Performance, Root Cause) are **50–80% wired** to the backend but fall back to mock data for most of what they display. The Customer-Level pages (Worklist, Customer Detail) are **100% mock-only** — the backend has no customer, PTP, or contact record layer at all. The backend is structurally sound but the frontend never fully consumes the data it already receives.

**Top 5 gaps, in order of urgency:**

| # | Gap | Impact |
|---|-----|--------|
| 1 | `api.ts` sends wrong query param name (`asOfDate` vs. `as_of_date`) to backend; every API call silently ignores the date picker. | All date-sensitive data is wrong. |
| 2 | `SelectedBranchOverview` and `BranchRootCauseContent` read real branch IDs from the API but then cross-reference against a US-city mock list (TPA/DAL/ATL...) that doesn't match backend branch codes (B001–B007). Mock fallback fires 100% of the time. | Branch-level pages show wrong data. |
| 3 | The Performance page has backend-wiring for DPD distribution but ignores the backend trends and outcomes. Trend charts always show mock data. | Performance analytics are not real. |
| 4 | The Worklist and Customer Detail pages call only mock data helpers. No backend endpoint for customers, PTPs, or contact events exists. | Customer workspace is a demo shell. |
| 5 | The AppShell "Refreshed: Oct 1, 2026" date is hardcoded. The `DateProvider` (which holds the user's selected snapshot date) is not passed to any API call. | The time-travel snapshot picker does nothing. |

---

## 2. Verified Project Architecture

### 2.1 Repository Layout (Verified)

```
RecoveryOps/
├── .env                        # DATABASE_URL, PORT=3001, CORS_ORIGIN, VITE_API_URL
├── package.json                # npm workspaces: packages/*, frontend
├── docker-compose.yml          # Postgres on port 5433
│
├── backend/
│   └── app/
│       ├── main.py             # FastAPI app, CORS middleware, includes branches router
│       ├── config.py           # pydantic-settings, reads .env two levels up
│       ├── database.py         # asyncpg engine, async session factory
│       ├── models.py           # 6 SQLAlchemy ORM models
│       ├── schemas.py          # 15 Pydantic response models (camelCase serialisation)
│       ├── seed.py             # Async seeder: 7 branches, 10 metrics, 7 snapshots each
│       ├── init_db.py          # create_all tables
│       └── routers/
│           └── branches.py     # All 7 API endpoints (565 lines)
│
├── frontend/
│   └── src/
│       ├── routes/             # 8 TanStack Router file-based routes
│       ├── components/         # app-shell.tsx, ui/ (46 shadcn components)
│       ├── features/worklist/  # Worklist.tsx
│       ├── hooks/              # branch-context.tsx, date-context.tsx
│       ├── lib/api.ts          # Fetch wrapper + 7 API functions
│       └── data/mock-data.ts   # 707-line mock dataset (US branches TPA/DAL/ATL/PHX/CLT/CHI)
│
└── packages/shared/src/
    ├── index.ts                # TypeScript interfaces mirroring Pydantic schemas
    └── schemas.ts              # Zod schemas for route params
```

### 2.2 Backend Stack (Verified)

| Layer | Technology |
|-------|-----------|
| Framework | FastAPI 0.x, Python 3.12 |
| Database ORM | SQLAlchemy 2.x (async, mapped_column) |
| DB Driver | asyncpg (PostgreSQL) |
| Validation | Pydantic v2 with CamelBase (alias_generator to_camel) |
| Config | pydantic-settings reading ../../.env (relative to app/config.py) |
| CORS | Configured from settings.cors_origins (comma-separated env var) |
| Port | 3001 (set in .env and hardcoded in package.json scripts) |
| Auth | **None implemented.** |

### 2.3 Frontend Stack (Verified)

| Layer | Technology |
|-------|-----------|
| Framework | TanStack Start (SSR-capable React meta-framework built on TanStack Router) |
| Router | TanStack Router v1 (file-based, type-safe) |
| Data Fetching | TanStack Query v5 (useQuery) |
| UI Components | shadcn/ui (46 components in components/ui/) |
| Styling | Tailwind CSS (configured via components.json) |
| Charts | Recharts (PieChart, LineChart) |
| Build | Vite (config at frontend/vite.config.ts) |
| API Base URL | VITE_API_URL env var, defaults to http://localhost:3001/api |
| Shared types | @recoveryops/shared (workspace package) |

### 2.4 Database Schema (Verified)

Six tables, all created by `init_db.py` / `seed.py`:

```
branches                 id, source_branch_code (unique), name, region, active, created_at
metric_definitions       id, metric_code (unique), name, unit, description, has_num_denom, version, effective_from
ingestion_batches        id, source, report_type, period_start, period_end, as_of_date, loaded_at, is_demo, notes
branch_metric_snapshots  id, branch_id→branches, batch_id→ingestion_batches, metric_code, value,
                         numerator, denominator, unit, availability, period_start, period_end, as_of_date
branch_dpd_snapshots     id, branch_id, batch_id, bucket, account_count, balance, portfolio_share, as_of_date
branch_segment_snapshots id, branch_id, batch_id, segment_type, segment_value, metric_code, value, account_count, as_of_date
branch_insights          id, branch_id, batch_id, narrative, evidence (JSON), model_version, generated_at, as_of_date
```

**No customer-level tables exist.** There is no `customers`, `contacts`, `ptps`, `call_logs`, or `worklist` table.

### 2.5 Seeded Data (Verified from `seed.py`)

- **7 branches:** B001 Main Street (Northeast), B002 Oakwood (Midwest), B003 Pine Valley (Southeast), B004 Riverfront (Southwest), B005 Hilltop (West), B006 Lakeside (Northwest), B007 Downtown (Northeast)
- **1 ingestion batch:** `as_of_date = 2026-08-31`, `period = 2026-08-01 to 2026-08-31`
- **10 metric codes:** `delinquency_rate_30_plus`, `cure_rate`, `roll_rate`, `ptp_kept_rate`, `positive_outcome_rate`, `negative_outcome_rate`, `charge_off_rate`, `autopay_active_pct`, `payment_total`, `fpd_count`
- **DPD buckets:** `current`, `1-30`, `31-60`, `61-90`, `90+` (note: hyphens, not en-dashes — frontend uses en-dashes in some places)
- **Segment dimensions:** vintage, loan_size, fico_band, product_type, tenure, state, collector_experience
- **3 insights per branch**, 21 total

### 2.6 API Endpoints (Verified from `branches.py`)

| Method | Path | Response Model |
|--------|------|---------------|
| GET | /api/health | {"status":"ok","environment":"development"} |
| GET | /api/branches | BranchesResponse |
| GET | /api/analytics/network | NetworkResponse |
| GET | /api/branches/{branch_id}/overview | BranchOverviewResponse |
| GET | /api/branches/{branch_id}/performance | BranchPerformanceResponse |
| GET | /api/branches/{branch_id}/peers | BranchPeersResponse |
| GET | /api/branches/{branch_id}/drivers | BranchDriversResponse |
| GET | /api/branches/{branch_id}/insights | BranchInsightsResponse |

All endpoints accept `as_of_date: str | None` as an optional query param. The performance endpoint additionally accepts `from_date` and `to_date`. All return camelCase JSON.

---

## 3. Frontend Page and Component Inventory

### 3.1 Route: `/` — Branch Overview (`index.tsx`, 766 lines)

**Dual-state component:**

**State A: NetworkLevelOverview**
- Calls `api.getNetwork()` via useQuery(["network"]) — WIRED
- Reads `networkData?.data.branches` and `networkData?.data.networkAverages` — WIRED
- Merges API branches with mock data via name/code matching — PROBLEMATIC (see §6)
- Displays: 5 KPI aggregate cards, Top Performer card, Lagging Branch card, Branch directory table
- Fields used: `collectionRate`, `accounts`, `contactRate`, `ptpKeptRate`, `cureRate`, `recovered`, `avgDaysToResolve`, `dpd30Plus`
- Problem: Most display fields come from mock, not API. `accounts`, `contactRate`, `recovered`, `avgDaysToResolve` are not in `BranchSummary`. Only `delinquency_rate_30_plus`, `cure_rate`, `ptp_kept_rate` are in the API response.

**State B: SelectedBranchOverview**
- Does NOT call any branch-specific API endpoint
- Reads entirely from `mockBranches` using `branchData.id === "TPA"` etc.
- The "What is Different?" signal matrix reads `getMockDrivers(branchData.id)`
- Navigation to /performance and /root-cause works (links)
- **This state is 100% mock.** No API calls.

### 3.2 Route: `/performance` — Performance Analytics (`performance.tsx`, 849 lines)

**With branch selected (BranchPerformanceContent):**
- Calls `api.getBranchPerformance(branch.id)` via useQuery — WIRED
- Reads `perfQuery.data?.data?.dpdDistribution` for DPD pie chart — PARTIAL
- DPD trend chart ignores API response; always uses `getBranchPerformanceTrend(branchData.id)` from mock
- KPI comparison bars read from `branchData` (mock)
- DPD bucket insight panel is 100% hardcoded static text
- `from_date`/`to_date` params never passed from DateContext
- `branch.id` is numeric (from API), but mock matching uses string codes. When backend branch id=1 is selected, `mockBranches.find(mb => mb.id === "1")` returns undefined, falling back to `mockBranches[0]` (Tampa).

### 3.3 Route: `/root-cause` — Root Cause Diagnosis (`root-cause.tsx`, 1204 lines)

**With branch selected (BranchRootCauseContent):**
- Calls `api.getBranchInsights(branchId)` via useQuery — WIRED
- The insights query result is **never used in the render tree.** `insightsQuery` is declared but only the mock `coreKpis` array is displayed.
- All 5 KPI driver models computed from `branchData` (mock)
- Network ranking computed from `mockBranches` sorted by `collectionRate`
- `comparedBranch` is hardcoded to Dallas or Atlanta by mock ID
- **100% mock data for the rendered UI.** API insights response is silently discarded.

### 3.4 Route: `/peer-comparison` — Peer Comparison (`peer-comparison.tsx`)

This route is a **redirect stub** — `beforeLoad: () => { throw redirect({ to: "/root-cause" }) }`. It is not visible in the sidebar.

### 3.5 Route: `/customer-analytics` — Customer Analytics (`customer-analytics.tsx`, 143 lines)

- Calls `api.getBranches()` via useQuery — WIRED
- Uses `estimatedAccounts()` to compute from `delinquency_rate_30_plus.numerator / value` — works only if `has_numerator_denominator=true`; seed currently sets it to `False` for all metrics.
- Branch list rendered from backend — WIRED
- Clicking a branch navigates to `/worklist` — WIRED

### 3.6 Route: `/worklist` — Priority Worklist (`Worklist.tsx`, 383 lines)

- **Zero API calls.** 100% driven by `getCustomerAnalytics()` and `getCustomersForDate()` from mock-data.ts
- All filter/sort operations client-side against mock 16-record customer list
- Links to `/customers/$customerId` use mock IDs (C001–C016)
- DateContext consumed for display, but against mock data only

### 3.7 Route: `/customers/$customerId` — Customer 360 (`customers.$customerId.tsx`, 732 lines)

- **Zero API calls.** All data from `getCustomerDetailContext(customer.id, selectedDate)`
- Outcome capture drawer appends to local React state only (no persistence)
- `handleSaveOutcome` shows a toast but does not POST to any backend

### 3.8 Component: `AppShell` (`app-shell.tsx`, 342 lines)

- Calls `api.getBranches()` for the branch selector dropdown — WIRED
- Sidebar branch context works (select, clear, localStorage persistence) — WIRED
- "Refreshed: Oct 1, 2026" is **hardcoded string** — does not come from API meta or DateContext
- `DateProvider` is a child of `BranchProvider` in root, but the shell's branch selector doesn't pass a date to any API call

### 3.9 Context: `DateContext` (`date-context.tsx`)

- Provides `selectedDate` (default `"2026-09-15"`), 7 preset snapshots (Jul–Sep 2026)
- `selectDate` clamps to Q3 2026 (`2026-07-01` to `2026-09-30`)
- **None of the API calls consume `selectedDate`.** The `asOfDate` param in `api.ts` is never called with it.
- Backend has data only for `as_of_date = 2026-08-31`. Passing `2026-09-15` would return a 404.

### 3.10 API Client: `lib/api.ts` — Critical Bugs

**Bug 1:** The frontend sends `asOfDate` as the query parameter name:

```ts
// Current (WRONG):
fetchJson(`/analytics/network${asOfDate ? `?asOfDate=${asOfDate}` : ""}`)

// Required (CORRECT):
fetchJson(`/analytics/network${asOfDate ? `?as_of_date=${asOfDate}` : ""}`)
```

**Bug 2:** Performance endpoint sends `from`/`to` but backend expects `from_date`/`to_date`:

```ts
// Current (WRONG):
params.set("from", from);
params.set("to", to);

// Required (CORRECT):
params.set("from_date", from);
params.set("to_date", to);
```

FastAPI ignores unrecognised query params by default, so these fail silently.

---

## 4. Backend Architecture and Existing Capabilities

### 4.1 What the Backend Does Well

- Clean async SQLAlchemy with proper session management
- All responses correctly serialized to camelCase via CamelBase
- Batch resolution (`_resolve_batch`) correctly finds the most recent batch when no date provided
- `_get_branch_metrics_map` efficiently bulk-fetches metrics for multiple branches
- CORS configured for dev ports (8080, 8081, 3000, 5173)
- Network averages computed in-memory from all branches

### 4.2 What the Backend is Missing

| Missing Capability | Needed By |
|-------------------|-----------|
| `contact_rate` metric | index.tsx, performance.tsx, root-cause.tsx |
| `avg_days_to_resolve` metric | index.tsx, performance.tsx, root-cause.tsx |
| `collection_efficiency` metric | index.tsx — primary KPI |
| `total_accounts` (account count) | Branch table, DPD analysis |
| Trend data for 5 KPIs (only delinquency/cure have trend rows) | performance.tsx trend charts |
| Customer / account-level tables | Worklist, Customer Detail |
| PTP / contact event tables | Worklist, Customer Detail |
| Outcome capture (POST endpoint) | Customer Detail drawer |
| Historical snapshots for Q3 2026 dates | DateContext presets (Jul–Sep 2026) |
| has_numerator_denominator=True for delinquency rate | customer-analytics.tsx estimatedAccounts() |

---

## 5. End-to-End Business Workflow Analysis

### Workflow 1: Branch Network Overview

```
User opens "/" with no branch selected
→ NetworkLevelOverview renders
→ useQuery(["network"]) → api.getNetwork() → GET /api/analytics/network
→ Backend: resolves most recent batch, fetches all branches + SUMMARY_METRICS
→ Returns: NetworkResponse { data: { branches: BranchSummary[], networkAverages: {} }, meta }
→ Frontend: merges API branches with mock by name/code match
→ Displays: branch table with REAL delinquency_rate, cure_rate, ptp_kept_rate from API
→ OTHER fields (accounts, contactRate, recovered, avgDaysToResolve) come from MOCK
→ User clicks branch → selectBranch(apibranchObject) stored in BranchContext + localStorage
→ Navigates to State B (SelectedBranchOverview) — ALL MOCK, no further API calls

GAP: State B should call api.getBranchOverview(branch.id) and api.getBranchDrivers(branch.id)
```

### Workflow 2: Performance Analytics

```
User navigates to "/performance" with a branch selected
→ BranchPerformanceContent renders
→ useQuery(["branch-performance", branch.id]) → api.getBranchPerformance(branch.id)
→ Backend: resolves batch, fetches DPD snapshots + trend rows for delinquency/cure
→ Returns: BranchPerformanceResponse { dpdDistribution, trends, outcomes }
→ Frontend: reads dpdDistribution for pie chart ✅
→ Frontend: IGNORES trends and outcomes from API
→ Trend charts use getBranchPerformanceTrend(mockBranchId) ← MOCK

GAP: trends and outcomes from the API response are never rendered
```

### Workflow 3: Root Cause Diagnosis

```
User navigates to "/root-cause" with a branch selected
→ BranchRootCauseContent renders
→ useQuery(["branch-insights", branchId]) → api.getBranchInsights(branchId)
→ Backend: returns up to 3 insights with evidence JSON for the branch
→ Frontend: IGNORES the insights response entirely
→ api.getBranchDrivers() is NEVER called
→ All coreKpis[] built from mockBranches[branchData.id]

GAP: insights query result must be rendered; drivers endpoint should be called
```

### Workflow 4: Customer Worklist

```
User navigates to "/worklist"
→ Worklist renders
→ getCustomersForDate(selectedDate, branchCode) from mock-data.ts
→ No API calls — mock 16-record customer list only

GAP: Requires backend customer data layer (tables, endpoints) — not yet built
```

### Workflow 5: Customer 360 / Outcome Capture

```
User navigates to "/customers/C001"
→ CustomerProfile renders
→ getCustomerDetailContext("C001", selectedDate) from mock-data.ts
→ No API calls
→ Outcome drawer → handleSaveOutcome() → appends to React state only — no POST

GAP: Requires backend outcome capture endpoint — not yet built
```

---

## 6. Frontend-to-Backend Mapping Matrix

| ID | Frontend Page | Required Data | Existing API Endpoint | Gap | Priority |
|----|--------------|---------------|----------------------|-----|----------|
| M01 | NetworkLevelOverview | All branch summaries + network averages | GET /api/analytics/network ✅ | Merges with mock by name; `accounts`, `contactRate`, `recovered`, `avgDaysToResolve` not in API | P1 |
| M02 | NetworkLevelOverview | Date-filtered data | GET /api/analytics/network?as_of_date= ⚠️ | `api.ts` sends `asOfDate` (camelCase) but backend expects `as_of_date` | P0 |
| M03 | SelectedBranchOverview | Branch metrics, drivers | GET /api/branches/{id}/overview, /drivers ❌ Not called | These endpoints exist but are never called from State B | P1 |
| M04 | BranchPerformanceContent | DPD distribution, trends, outcomes | GET /api/branches/{id}/performance ✅ (called) | DPD pie ✅; trends and outcomes ignored | P1 |
| M05 | BranchPerformanceContent | Date range trends | GET /api/branches/{id}/performance?from_date=&to_date= ⚠️ | Client sends `from`/`to` but backend expects `from_date`/`to_date` | P0 |
| M06 | BranchRootCauseContent | Insights narrative + evidence | GET /api/branches/{id}/insights ✅ (called) | `insightsQuery` declared but never rendered | P1 |
| M07 | BranchRootCauseContent | Segment-level drivers | GET /api/branches/{id}/drivers ❌ Not called | `coreKpis` built from mock; drivers endpoint ignored | P2 |
| M08 | BranchRootCauseContent | Peers and network averages | GET /api/branches/{id}/peers ❌ Not called | Peer comparison uses `mockBranches` hardcoded to mock IDs | P2 |
| M09 | CustomerAnalytics | Branch list with account counts | GET /api/branches ✅ | `estimatedAccounts()` uses numerator/value but seed sets has_numerator_denominator=False; returns 0 | P2 |
| M10 | Worklist | Customer accounts with DPD/PTP/risk | None — mock-only | **Missing:** No customer backend layer | P3 |
| M11 | CustomerProfile | Customer detail, payment history | None — mock-only | **Missing:** No customer backend layer | P3 |
| M12 | CustomerProfile | Save call outcome / PTP | None — local state only | No POST endpoint | P3 |
| M13 | AppShell header | Refresh date from API meta | None — hardcoded | No API meta propagated to shell | P1 |
| M14 | All pages | DateContext → API date filter | All endpoints accept as_of_date | `selectedDate` never passed to any API call | P1 |
| M15 | All branch pages | Correct mock overlay | Client-side matching | Backend branches B001–B007; mock branches TPA/DAL/ATL; match fails 100% | P0 |

---

## 7. Missing, Partial, and Inconsistent Functionality

| Requirement | Status | Evidence |
|------------|--------|---------|
| List all branches | ✅ Already Supported | GET /api/branches + GET /api/analytics/network |
| Network averages for 7 summary metrics | ✅ Already Supported | networkAverages in NetworkResponse |
| Branch DPD distribution (pie chart) | ✅ Supported + Partial Use | dpdDistribution returned; frontend reads it for pie chart only |
| Branch metric snapshots (delinquency, cure, ptp, autopay) | ✅ Already Supported | In branch_metric_snapshots |
| Branch insights (narrative + evidence) | ✅ Supported + Not Rendered | API returns correctly; frontend discards response |
| Branch drivers (segment comparison) | ✅ Supported + Not Called | GET /api/branches/{id}/drivers exists; never called |
| Branch peers comparison | ✅ Supported + Not Called | GET /api/branches/{id}/peers exists; never called |
| Date-filtered API queries | ⚠️ Inconsistent | Backend ready; frontend sends wrong param name |
| Date-range performance trends | ⚠️ Inconsistent | Backend supports from_date/to_date; frontend sends from/to |
| `contact_rate` metric | ❌ Missing | Not in seed; displayed as a KPI but has no backend value |
| `avg_days_to_resolve` metric | ❌ Missing | Not in seed; displayed as KPI |
| `collection_efficiency` metric | ❌ Missing | Not in seed; primary KPI on overview page |
| Historical snapshots for Q3 2026 dates | ❌ Missing | Seed only populates as_of_date=2026-08-31; date presets go Jul–Sep 2026 |
| Branch account count | ❌ Missing | Not in BranchSummary response; used in UI for account totals |
| Customer records | ❌ Missing | No DB table; no API endpoint |
| PTP / promise records | ❌ Missing | No DB table; no API endpoint |
| Contact/call log records | ❌ Missing | No DB table; no API endpoint |
| Outcome capture (POST) | ❌ Missing | No endpoint; drawer saves to React state only |
| Authentication / authorization | ❌ Missing | No auth layer; all endpoints public |

---

## 8. Proposed API Contracts

### 8.1 Fix Existing Query Params in `api.ts`

**Fix for getNetwork, getBranches, getBranchOverview, getBranchPeers, getBranchDrivers, getBranchInsights:**
```ts
// BEFORE (wrong):
fetchJson(`/analytics/network${asOfDate ? `?asOfDate=${asOfDate}` : ""}`)

// AFTER (correct):
fetchJson(`/analytics/network${asOfDate ? `?as_of_date=${asOfDate}` : ""}`)
```

**Fix for getBranchPerformance:**
```ts
// BEFORE (wrong):
params.set("from", from);
params.set("to", to);

// AFTER (correct):
params.set("from_date", from);
params.set("to_date", to);
```

### 8.2 New Backend Metric Codes to Seed

| Metric Code | Name | Unit | Purpose |
|------------|------|------|---------|
| `contact_rate` | Contact Rate | percent | Overview KPI, Root Cause driver |
| `avg_days_to_resolve` | Avg. Days to Resolution | count (days) | Overview KPI, Root Cause driver |
| `collection_efficiency` | Collection Efficiency % | percent | Primary overview KPI |
| `total_accounts` | Total Active Accounts | count | Branch account count |

### 8.3 BranchSummary Enhancement

Add `accountCount` field to the `BranchSummary` schema (sourced from `total_accounts` metric or a new `account_count` column on the `Branch` model):

```typescript
// In packages/shared/src/index.ts
export interface BranchSummary {
  id: number;
  sourceBranchCode: string;
  name: string;
  region: string;
  accountCount?: number;    // NEW
  metrics: Record<string, MetricValue>;
}
```

### 8.4 Proposed: Customer-Level Endpoints (P3 — Future)

```
GET /api/branches/{branch_id}/customers
  Query params: as_of_date, dpd_min, dpd_max, risk, ptp_status, priority, q (search), page, limit
  Response: { data: CustomerSummary[], meta: { total, page, limit } }

GET /api/customers/{customer_id}
  Response: { data: CustomerDetail, meta: ApiMeta }

POST /api/customers/{customer_id}/outcomes
  Body: { disposition, ptpAmount?, ptpDate?, notes, agentId? }
  Response: { data: OutcomeRecord, meta: ApiMeta }

GET /api/customers/{customer_id}/timeline
  Response: { data: TimelineEvent[], meta: ApiMeta }
```

These require new DB tables. Documented as future scope (P3).

---

## 9. Required Database Changes

### 9.1 Immediate — Seed Data Corrections (No Schema Change)

**Action:** Update `seed.py` to:
1. Add 4 new metric definitions: `contact_rate`, `avg_days_to_resolve`, `collection_efficiency`, `total_accounts`
2. Set `has_numerator_denominator=True` for `delinquency_rate_30_plus` and populate `numerator`/`denominator`
3. Add additional `IngestionBatch` rows for Q3 2026 dates (2026-07-01, 2026-08-01, 2026-09-01, 2026-09-15, 2026-09-20, 2026-09-30) with corresponding metric snapshots
4. Rename branch codes to match mock data (DAL, ATL, TPA, PHX, CLT, CHI)

> **Warning:** Re-seeding deletes all existing data. Acceptable since is_demo=True. Run `npm run db:seed` after changes.

### 9.2 Seed Branch Code Alignment

Rename `BRANCHES` in `seed.py` to match frontend mock-data.ts:

```python
BRANCHES = [
    {"source_branch_code": "DAL", "name": "Dallas Branch", "region": "South Central"},
    {"source_branch_code": "ATL", "name": "Atlanta Branch", "region": "Southeast"},
    {"source_branch_code": "TPA", "name": "Tampa Branch", "region": "Southeast"},
    {"source_branch_code": "PHX", "name": "Phoenix Branch", "region": "Southwest"},
    {"source_branch_code": "CLT", "name": "Charlotte Branch", "region": "Southeast"},
    {"source_branch_code": "CHI", "name": "Chicago Branch", "region": "Midwest"},
]
```

### 9.3 Model Change — Add `account_count` to Branch Table (Optional)

```python
# In models.py
account_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
```

Requires `init_db.py` re-run or an Alembic migration.

### 9.4 Trend Data for All 5 KPI Metrics

Update `trend_months` loop in `seed.py` to generate trend rows for all 5 frontend KPIs:

```python
TREND_METRIC_CODES = [
    "delinquency_rate_30_plus", "cure_rate", "ptp_kept_rate",
    "contact_rate", "collection_efficiency"
]
```

Update `branch_performance` endpoint in `branches.py` to return trends for all these codes.

### 9.5 Future — Customer Tables (P3)

Not recommended until Branch-Level integration is complete. Would require:
- `customers` table
- `contact_events` table
- `ptp_commitments` table
- `call_outcomes` table

---

## 10. File-by-File Modification Plan

### Phase A — Critical Blockers (P0)

---

#### TASK-A1: Fix query parameter names in `api.ts`
- **File:** `frontend/src/lib/api.ts`
- **Lines to change:** Every API function that uses `asOfDate`, `from`, `to`
- **Change:** Replace all instances of `asOfDate=` with `as_of_date=`, `from=` with `from_date=`, `to=` with `to_date=`
- **Dependencies:** None
- **Risk:** Low
- **Effort:** 30 minutes

---

#### TASK-A2: Align branch codes in seed and update frontend matching logic
- **File:** `backend/app/seed.py` (lines 22–30) + `frontend/src/routes/index.tsx` (branch matching logic)
- **Change:**
  1. Rename BRANCHES array in seed.py to use TPA/DAL/ATL/PHX/CLT/CHI codes and US city names
  2. Update branch matching in `index.tsx` to compare `ab.sourceBranchCode` directly instead of name matching
  3. Run `npm run db:seed` to re-seed
- **Dependencies:** None
- **Risk:** Medium (data wipe; re-seeding required)
- **Effort:** 1 hour

---

### Phase B — Branch-Level API Wiring (P1)

---

#### TASK-B1: Wire `SelectedBranchOverview` to real API data
- **File:** `frontend/src/routes/index.tsx`
- **Lines:** ~504–765 (SelectedBranchOverview component)
- **Change:**
  1. Add `useQuery(["branch-overview", branch.id], () => api.getBranchOverview(branch.id))`
  2. Add `useQuery(["branch-drivers", branch.id], () => api.getBranchDrivers(branch.id))`
  3. Map `overviewQuery.data.data.metrics` to the 5 KPI cards (replacing `branchData.collectionRate`, etc.)
  4. Map `driversQuery.data.data.drivers` to the "What is Different?" signal matrix items
  5. Keep mock fallback for fields not yet in API (`accounts`, `contactRate`, `recovered`)
- **Dependencies:** TASK-A1, TASK-A2, TASK-C1
- **Risk:** Medium
- **Effort:** 3 hours

---

#### TASK-B2: Wire `BranchPerformanceContent` trends and outcomes
- **File:** `frontend/src/routes/performance.tsx`
- **Lines:** 104–848
- **Change:**
  1. Derive `trendData` from `perfQuery.data.data.trends` when available:
     - Map `trends.delinquency_rate_30_plus` to the trend chart series (value * 100 for percentage)
  2. Derive KPI values from `perfQuery.data.data.outcomes` for delinquency_rate_30_plus, cure_rate, ptp_kept_rate
  3. Pass `selectedDate` from `useDate()` as the date param
- **Dependencies:** TASK-A1, TASK-A2, TASK-C1, TASK-C4
- **Risk:** Medium
- **Effort:** 2 hours

---

#### TASK-B3: Render backend insights in Root Cause page
- **File:** `frontend/src/routes/root-cause.tsx`
- **Lines:** 161–165 (insightsQuery declared but unused)
- **Change:**
  1. Add a new "AI-Generated Insights" panel in the render tree
  2. Map `insightsQuery.data?.data` (array of InsightItem) to a card list with narrative text and evidence chips
  3. Add `useQuery(["branch-drivers", branch.id], () => api.getBranchDrivers(branchId))` and map to `segments[]` in `coreKpis` from API drivers where available
- **Dependencies:** TASK-A1, TASK-A2
- **Risk:** Medium
- **Effort:** 2 hours

---

#### TASK-B4: Connect DateContext to all API calls
- **Files:** `routes/index.tsx`, `routes/performance.tsx`, `routes/root-cause.tsx`, `routes/customer-analytics.tsx`
- **Change:** In each route that calls an API:
  ```ts
  const { selectedDate } = useDate();
  useQuery(["network", selectedDate], () => api.getNetwork(selectedDate))
  useQuery(["branches", selectedDate], () => api.getBranches(selectedDate))
  useQuery(["branch-performance", branch.id, selectedDate], () => api.getBranchPerformance(branch.id))
  ```
- **Dependencies:** TASK-A1, TASK-C2 (Q3 2026 snapshots must exist)
- **Risk:** Low
- **Effort:** 1 hour

---

#### TASK-B5: Fix hardcoded "Refreshed: Oct 1, 2026" in AppShell
- **File:** `frontend/src/components/app-shell.tsx`
- **Change:** Replace hardcoded string with `networkData?.meta.asOfDate` or `branchesQuery.data?.meta.asOfDate` formatted as a human-readable date
- **Dependencies:** None
- **Risk:** Low
- **Effort:** 15 minutes

---

### Phase C — Backend Data Corrections (P1–P2)

---

#### TASK-C1: Add missing metric codes to seed
- **File:** `backend/app/seed.py` (METRIC_DEFINITIONS, branch_base function)
- **Change:**
  1. Add 4 new metric definitions: contact_rate, avg_days_to_resolve, collection_efficiency, total_accounts
  2. Update `branch_base()` to include plausible values for these metrics
  3. Set `has_numerator_denominator=True` for delinquency_rate_30_plus and populate numerator/denominator
- **Dependencies:** None
- **Risk:** Low (re-seed required)
- **Effort:** 1 hour

---

#### TASK-C2: Seed multiple Q3 2026 snapshot dates
- **File:** `backend/app/seed.py`
- **Change:** Create one IngestionBatch per preset date and seed metric snapshots for each, with slight metric drift to simulate time passing:
  - 2026-07-01 (period: Jul), 2026-08-01 (period: Aug), 2026-09-01, 2026-09-15, 2026-09-20, 2026-09-30 (period: Sep)
- **Dependencies:** TASK-C1
- **Risk:** Medium (increases seeded row count ~6x; acceptable for demo)
- **Effort:** 2 hours

---

#### TASK-C3: Add `account_count` to BranchSummary response
- **Files:** `backend/app/models.py`, `backend/app/schemas.py`, `backend/app/routers/branches.py`, `packages/shared/src/index.ts`
- **Change:** Add `account_count` as a field on Branch model (or compute from total_accounts metric), expose in BranchSummary, and update frontend types
- **Dependencies:** TASK-C1
- **Risk:** Low
- **Effort:** 1 hour

---

#### TASK-C4: Add trend data for all 5 KPI metrics
- **File:** `backend/app/seed.py`, `backend/app/routers/branches.py`
- **Change:**
  1. In seed.py, extend trend generation loop from 2 metrics to 5
  2. In branches.py, update `branch_performance` endpoint to include all 5 trend codes
- **Dependencies:** TASK-C1
- **Risk:** Low
- **Effort:** 1 hour

---

### Phase D — Customer Level (P3 — Future Phase)

These tasks are deferred until Branch-Level integration is complete and verified.

- TASK-D1: Design and implement customer DB tables (High complexity)
- TASK-D2: Implement customer API endpoints (High complexity)
- TASK-D3: Replace mock data in Worklist and Customer Detail (High complexity)

---

## 11. Prioritized Implementation Roadmap

### Sprint 1 — Critical Fixes (P0, estimated 1.5 days)

| Task | File | Change |
|------|------|--------|
| TASK-A1 | `lib/api.ts` | Fix query param names (asOfDate→as_of_date, from→from_date, to→to_date) |
| TASK-A2 | `backend/app/seed.py` + `routes/index.tsx` | Rename branch codes to match mock + re-seed |

### Sprint 2 — Branch-Level Wiring (P1, estimated 3 days)

| Task | File | Change |
|------|------|--------|
| TASK-C1 | `seed.py` | Add 4 new metric codes + fix has_numerator_denominator |
| TASK-C2 | `seed.py` | Seed 6 Q3 2026 snapshot dates |
| TASK-C4 | `seed.py` + `branches.py` | Add trend rows for all 5 metrics |
| TASK-B4 | All route files | Pass `selectedDate` to API calls |
| TASK-B5 | `app-shell.tsx` | Fix hardcoded "Refreshed" date |
| TASK-B1 | `routes/index.tsx` | Wire SelectedBranchOverview to overview + drivers API |
| TASK-B2 | `routes/performance.tsx` | Render API trends and outcomes |
| TASK-B3 | `routes/root-cause.tsx` | Render API insights; call drivers endpoint |

### Sprint 3 — Data Quality Improvements (P2, estimated 2 days)

| Task | File | Change |
|------|------|--------|
| TASK-C3 | models.py, schemas.py, branches.py, index.ts | Add account_count to BranchSummary |
| TASK-M09 | `routes/root-cause.tsx` | Map API drivers to segments[] in coreKpis |
| TASK-M10 | `routes/root-cause.tsx` | Call getBranchPeers() for peer comparison |

### Sprint 4 — Customer Layer (P3, multi-day)

Design and implement customer DB tables, API endpoints, and replace mock data in Worklist and Customer Detail.

**Total estimated effort for Sprint 1+2:** 15–18 hours of focused development.

---

## 12. Dependencies, Risks, and Blockers

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Re-seeding wipes all data | Certain (intended) | Low — demo data | Acceptable; document re-seed steps |
| Branch code rename breaks existing localStorage | Medium | Low | BranchProvider.isValidBranch() validates on load; invalid stored branch is cleared |
| Q3 2026 snapshots don't match frontend metric names | Medium | High | Use exact metric_code strings from backend across seed, API, and frontend |
| Backend returns 404 for as_of_date not in DB | Certain for new dates | Medium | Seed data for all 6 preset dates before wiring DateContext |
| Branch_performance trend query uses batch_id filter, excluding multi-batch trend rows | Medium | Medium | In branch_performance endpoint, remove batch_id from trend query; filter by branch_id + metric_code + date range only |
| perfQuery.data undefined when backend is down | Certain during dev | Low | Existing retry: 1 handles transient errors; mock fallback remains until fully removed |

**Current Blockers:**
1. Backend must be running and database must be seeded before any frontend API calls work.
2. CORS must include frontend's actual running port (8080/8081/5173 — already configured).

---

## 13. Testing and Acceptance Criteria

### 13.1 Backend Verification (curl tests)

| Test | Expected Result |
|------|----------------|
| `curl http://localhost:3001/api/health` | {"status":"ok","environment":"development"} |
| `curl http://localhost:3001/api/branches` | Array of 6 branches (after TASK-A2) with metrics |
| `curl http://localhost:3001/api/analytics/network` | Network response with branches and averages |
| `curl http://localhost:3001/api/branches/1/overview` | Branch 1 overview with metrics |
| `curl http://localhost:3001/api/branches/1/performance` | DPD distribution + trends |
| `curl http://localhost:3001/api/branches/1/peers` | All other branches as peers |
| `curl http://localhost:3001/api/branches/1/drivers` | Up to 8 segment driver items sorted by delta |
| `curl http://localhost:3001/api/branches/1/insights` | 3 insight narratives with evidence |
| `curl "http://localhost:3001/api/branches/1/performance?from_date=2026-05-01&to_date=2026-08-31"` | Filtered trend rows |
| `curl "http://localhost:3001/api/analytics/network?as_of_date=2026-08-31"` | Same as without param |
| `curl "http://localhost:3001/api/analytics/network?as_of_date=2026-09-99"` | 404: "No data available" |

### 13.2 Frontend Tests (After Sprint 1+2 Fixes)

| Test | Expected Result |
|------|----------------|
| Network Overview page loads | Branch list from API |
| Branch directory shows real delinquency_rate | Values match curl /api/analytics/network |
| Clicking a branch → State B | Branch KPI cards show API values after TASK-B1 |
| Performance page DPD chart | Pie chart segments match API dpdDistribution |
| Performance page trend lines | Line chart data matches API trends after TASK-B2 |
| Root Cause page insights panel | Narratives from DB visible after TASK-B3 |
| DateContext preset "Aug 1, 2026" selected | API called with as_of_date=2026-08-01 after TASK-B4 |
| AppShell "Refreshed" date | Shows meta.asOfDate from API after TASK-B5 |

### 13.3 Error State Tests

| Test | Expected Result |
|------|----------------|
| Backend offline | Network page shows loading state then error |
| Non-existent branch ID | API returns 404; frontend shows error boundary |
| as_of_date with no data | API returns 404; frontend falls back gracefully |
| Empty drivers array | Root cause page shows empty state, not crash |
| Empty insights array | Insights panel shows "No insights available" message |

---

## 14. Open Questions

| # | Question | Assumption Made |
|---|----------|----------------|
| Q1 | Should Customer-Level features be backend-wired or remain demo-only? | Treated as demo-only (P3). No customer tables built. |
| Q2 | What is the source of `collection_efficiency`? Is it `positive_outcome_rate` or a custom calculation? | Assumed to be a new `collection_efficiency` metric code added to seed. |
| Q3 | Should the date picker be locked to Q3 2026 (as in DateContext) or made dynamic? | Keeping Q3 clamp as-is. Need to seed all Q3 dates to make it functional. |
| Q4 | Should `avg_days_to_resolve` be a snapshot metric or computed from event history? | Snapshot metric for simplicity (no event tables exist). |
| Q5 | Should the branch_performance trend query remove the batch_id filter to span multiple batches? | Yes — recommend removing batch_id from the trend query in branch_performance and filtering by branch_id + date range only. |
| Q6 | Should `BranchInsight` evidence keys be camelCase or snake_case? | Seed uses camelCase keys (metricCode, branchValue...) but InsightEvidenceItem schema uses snake_case. These currently mismatch — evidence dict keys need to be snake_case in the seed to match CamelBase serialisation. This is a bug to fix in seed.py. |

---

## 15. Recommended Implementation Order

Execute tasks in this exact sequence to minimize rework:

1. **TASK-A1** — Fix api.ts query param names (30 min, zero risk) — Start here
2. **TASK-A2** — Rename seed branches + re-seed (1h)
3. **TASK-C1** — Add missing metric codes to seed (1h)
4. **TASK-C2** — Seed Q3 2026 snapshot dates (2h)
5. **TASK-C4** — Add trend rows for all 5 metrics (1h)
6. **TASK-B4** — Pass selectedDate to API calls (1h)
7. **TASK-B5** — Fix hardcoded refresh date in AppShell (15 min)
8. **TASK-B1** — Wire SelectedBranchOverview to API (3h)
9. **TASK-B2** — Wire Performance page trends + outcomes (2h)
10. **TASK-B3** — Render insights + wire drivers in Root Cause (2h)
11. **TASK-C3** — Add account_count to responses (1h)
12. **TASK-M09/M10** — Wire peers and driver segments (2h)
13. (Future) **TASK-D1–D3** — Customer-Level backend + frontend

---

*This document is based on static code analysis of the full codebase as of 2026-10-13. All file paths, line numbers, API endpoint definitions, schema field names, and seed values are verified against actual source files. Claims marked with (WIRED) are verified working; (PARTIAL) are partially broken; (BROKEN) or (MISSING) are not implemented.*
