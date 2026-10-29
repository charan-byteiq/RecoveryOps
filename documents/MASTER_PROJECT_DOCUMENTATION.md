# RecoveryOps — Combined Next Best Actions (NBA) & Outreach Model
## Master Project Documentation & Progress Audit

**Last Updated:** October 29, 2026  
**Document Version:** v1.0  
**Scope:** Architecture • Tech Stack • Requirements • Accomplishments to Date • Live Progress • Future Roadmap

---

## 1. Executive Summary & Objective

### 1.1 Business Objective
The RecoveryOps platform automates and prioritizes delinquent customer accounts for recovery. It determines the optimal operational path across three dedicated models before scoring customer priority:
1. **Engagement Model:** Determines **what to say** (Content / Payment Message recommendation).
2. **Payment Model:** Determines **how often to reach out** (Cadence / Contact frequency recommendation).
3. **Outreach Model:** Determines **how and when to reach out** (Communication channel & permitted contact timing recommendation).
4. **Priority Scoring (Integration Stage):** Synthesizes evidence from all three models and historical account events to assign an authoritative **Risk Bucket** and **Priority Score / Rank**.

### 1.2 Core Implementation Rule
- **Branch Level Protection:** Strict isolation guarantee. All branch-level files (`branches.py`, `index.tsx`, `performance.tsx`, `root-cause.tsx`, `peer-comparison.tsx`) remain 100% untouched.
- **Rule-Based Outreach Engine:** Transparent, auditable heuristic calculations rather than unverified ML black-boxes.
- **Hard Policy Precedence:** Legal consent, Do-Not-Contact (DNC) flags, local contact hours, cooldown periods, and frequency caps take absolute precedence over scoring.

---

## 2. Tech Stack

| Layer | Technologies & Libraries | Version / Details |
|---|---|---|
| **Frontend UI** | React 19, TypeScript, TanStack Router (Start), Vite | `vite ^8.x`, `react ^19.x`, `@tanstack/react-router` |
| **Styling & Design** | TailwindCSS v4, Lucide React Icons, Sonner Toasts | Modern glassmorphism, responsive data cards, dark mode |
| **Backend Framework** | FastAPI (Python 3.11), Uvicorn | `fastapi >= 0.115.0`, `uvicorn[standard]` |
| **Database & ORM** | PostgreSQL 17 (Port 5432), SQLAlchemy 2.0 (AsyncIO), AsyncPG | `sqlalchemy[asyncio] >= 2.0.39`, `asyncpg >= 0.30.0` |
| **Configuration & Validation** | Pydantic v2, Pydantic-Settings, Python-Dotenv | Type-safe environment management |
| **AI Insights Integration** | OpenRouter API (Bearer Auth), HTTPX | Free-tier model `google/gemini-2.0-flash-exp:free` |
| **Testing & Quality** | Pytest, Pytest-AsyncIO, ESLint, TypeScript compiler | 34 automated unit & integration tests |

---

## 3. High-Level Architecture & End-to-End Data Flow

```
+-------------------------------------------------------------------------------+
|                       SHARED DATA FOUNDATION (PostgreSQL)                     |
|  customer • account • account_snapshot • ref_channel • contact_event • ptp    |
+-------------------------------------------------------------------------------+
                                        |
       +--------------------------------+--------------------------------+
       |                                |                                |
       v                                v                                v
+------------------+          +------------------+          +------------------+
| ENGAGEMENT MODEL |          |  PAYMENT MODEL   |          |  OUTREACH MODEL  |
|  (Content/Msg)   |          |  (Cadence Freq)  |          | (Channel & Time) |
| Suggests optimal |          | Suggests contact |          | Hard policy gate |
| message category |          | interval based   |          | + 60/40 scoring  |
| & template goal  |          | on repayment     |          | on success/resp  |
+------------------+          +------------------+          +------------------+
       |                                |                                |
       +--------------------------------+--------------------------------+
                                        |
                                        v
                       +----------------------------------+
                       |     PRIORITY SCORING ENGINE      |
                       | Synthesizes Content + Cadence    |
                       | + Channel + Balance Exposure     |
                       | Output: Priority Rank & Risk Tier|
                       +----------------------------------+
                                        |
                                        v
                       +----------------------------------+
                       |    CUSTOMER 360 WORKSPACE UI     |
                       |  Card 1: Suggested Templates     |
                       |  Card 2: Repayment Behavior      |
                       |  Card 3: Outreach Model (Ours)   |
                       |  Outcome Capture & Audit Drawer  |
                       +----------------------------------+
```

---

## 4. Work Completed to Date (Accomplishments)

### Milestone 1: Environment & Repository Foundation
- [x] Switched workspace cleanly to the `madhurima` branch without modifying upstream.
- [x] Reconfigured `.env` with a valid OpenRouter API key and switched model to free-tier `google/gemini-2.0-flash-exp:free` (0 token cost).
- [x] Created Python virtual environment (`backend\.venv`) and installed all dependencies.
- [x] Detected running local PostgreSQL 17 on port 5432, established `recoveryops` database and role credentials, and initialized base tables.
- [x] Ran backend test suite: **All 34 tests passed with 100% success rate**.

### Milestone 2: Architecture & Specification
- [x] Analyzed the Low-Level Design (LLD) document and 6-page Database Design PDF.
- [x] Created isolated technical specification (`SPEC.md`).
- [x] Created phased task execution breakdown (`TICKETS.md`).
- [x] Established live status dashboard (`PROGRESS_TRACKER.md`).

### Milestone 3: Customer-Level Outreach Model UI Implementation
- [x] Transformed Card 3 in `frontend/src/routes/customers.$customerId.tsx` into the official **Outreach Model Card**:
  - **Rank #1 Primary Channel Hero:** Dynamic channel score calculation displaying formula chip:
    $$\text{channel\_score} = (0.60 \times \text{Success Rate}) + (0.40 \times \text{Response Rate})$$
  - **Supported Contact Timing Badge:** Identifies verified local contact window (`09:00 - 18:00`) with recommended time slot.
  - **Hard Policy Gates Checklist:** Visual verification of 6 hard gates (Account Eligibility, Consent, DNC, Channel Usability, Contact Window, Cooldown, Frequency Cap).
  - **Alternative Ranked Candidates:** Displays runner-up channels with relative scores.
  - **Collector Actions & Controls:** Interactive `[Approve Channel]`, `[Override Recommendation]` dropdown menu, and action status badge (`PENDING`, `APPROVED`, `EDITED`).
  - **Factor Explainability Drawer:** Side panel displaying mathematical score breakdown, factor contribution table, and run audit metadata.
- [x] **Zero Regression Guarantee:** Retained Card 1 (`Suggested Templates` - Engagement Model) and Card 2 (`Repayment Behavior` - Payment Model) completely intact.
- [x] **UI Polish:** Removed extraneous decorative/sparkle logos per user request for a sleek, enterprise aesthetic.
- [x] **Vite Dev Server Live:** Verified HTTP 200 on `http://localhost:8080/customers/C011`.

---

## 5. Live Progress Summary

| Category | Current Status | Notes |
|---|---|---|
| **Overall Progress** | **45% Complete** | UI mock phase 100% finished; awaiting mock dataset for backend |
| **Frontend Workspace UI** | **100% Done** | Card 1, 2, and 3 aligned with LLD & Dinesh's schema |
| **Backend Environment** | **100% Ready** | Python 3.11, venv, FastAPI, and Postgres 17 operational |
| **Database Schema** | **Designed** | 10 Outreach tables fully drafted in specification |
| **Mock Data Seeding** | **Pending** | Awaiting Dinesh's companion SQL / CSV dataset |

---

## 6. Outreach Model Technical Specifications

### 6.1 Scoring Heuristic
$$\text{Channel Score} = (0.600 \times \text{contact\_success\_rate}) + (0.400 \times \text{response\_rate})$$

### 6.2 Hard Policy Gates Precedence
A channel is evaluated through the following sequential gates. If any gate fails, the channel is disqualified regardless of its score:
1. **Account Eligibility:** Account must have active delinquent status (`days_past_due > 0`).
2. **Customer Permission:** Customer `contact_consent == True` AND `do_not_contact_flag == False`.
3. **Channel Availability:** Target channel must be active and have verified contact endpoints.
4. **Contact Window:** Proposed time must fall within approved local hours (`09:00 - 18:00`).
5. **Cooldown Interval:** At least 48 hours must have elapsed since the last contact attempt.
6. **Frequency Cap:** Contact attempts must remain below the rolling 7-day cap (maximum 3 attempts).

### 6.3 Fallback Hierarchy
- **Level 1 (Customer Level):** Used when the account/customer has $\ge 3$ contact attempts in history.
- **Level 2 (Segment Fallback):** Used when customer history $< 3$ attempts; uses aggregate segment performance.
- **Level 3 (Global Fallback):** Used when segment data is unavailable; uses portfolio-wide channel averages.
- **Level 4 (Manual Review / Suppressed):** When no permitted channel survives policy gates.

### 6.4 Output Schema (10 Tables Contract)
1. `ref_channel` (channel codes: `PHONE`, `SMS`, `EMAIL`, `WHATSAPP`, `FIELD`)
2. `outreach_rule_config` (versioned weights: 0.60 / 0.40, lookback: 90d, threshold: 3)
3. `customer` (`customer_id`, `segment`, `contact_consent`, `do_not_contact_flag`)
4. `account` (`account_id`, `customer_id`, `delinquency_stage`, `days_past_due`, `past_due_amount`)
5. `contact_event` (`contact_event_id`, `channel_code`, `contact_ts`, `event_type`, `outcome_code`)
6. `stg_contact_summary` (staging validation table with `is_valid` and `reject_reason`)
7. `customer_channel_engagement` (aggregated attempts, successes, responses, rates)
8. `outreach_engine_run` (run execution audit: `as_of_date`, `status: RUNNING | SUCCESS | FAILED`)
9. `outreach_recommendation` (recommended channel, contact time, score, rank, policy status)
10. `outreach_recommendation_factor` (explainability table: factor name, value, weight, contribution)

---

## 7. What Remains To Be Done & Phased Roadmap

```
                               CURRENT STAGE
                                     │
┌────────────────────────────────────▼───────────────────────────────────┐
│ Phase 1: Customer Workspace Mock UI                       [COMPLETED]  │
│ • Outreach Model recommendation card                                   │
│ • Hard policy gates checklist                                          │
│ • Explainability & run audit drawer                                    │
│ • Collector approval & channel override controls                       │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
┌────────────────────────────────────▼───────────────────────────────────┐
│ Phase 2: Mock Data Ingestion & Profiling                   [UPCOMING]  │
│ • Receive Dinesh's companion SQL / CSV dataset                         │
│ • Map fields to shared customer, account, and contact_event entities   │
│ • Validate data quality (bounds, timestamps, non-negative counts)      │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
┌────────────────────────────────────▼───────────────────────────────────┐
│ Phase 3: Backend Database Tables & Engine Build            [UPCOMING]  │
│ • Implement 10 SQLAlchemy models in backend/app/models_outreach.py     │
│ • Build 6-step Outreach Engine service (Validate → Gate → Score → Time)│
│ • Create REST endpoints (/api/outreach/run, /api/outreach/recommend)   │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
┌────────────────────────────────────▼───────────────────────────────────┐
│ Phase 4: Full Stack Integration & Verification            [FINAL STEP] │
│ • Wire Frontend UI cards to live FastAPI endpoints                     │
│ • End-to-end integration testing                                       │
│ • Prepare git commit strictly on branch p_frontend                     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Git & Branching Strategy
- **Current Active Branch:** `madhurima` (checked out for reading clean baseline).
- **Push Destination:** When instructed to commit/push, all work will be pushed **strictly to `p_frontend`** (the user's designated branch) to ensure zero interference with Madhurima's branch.
