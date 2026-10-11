# Routes Reference

This directory defines the file-based routes for the **RecoveryOps** application using **TanStack Router** and **TanStack Start**.

---

## 1. Routing Architecture

RecoveryOps utilizes TanStack Router's type-safe, file-based routing system:

* **File-Based Discovery**: Every `.tsx` file directly inside `src/routes/` automatically corresponds to an application route.
* **Auto-Generated Route Tree (`src/routeTree.gen.ts`)**: Whenever route files are created, renamed, or modified, the TanStack Router Vite plugin automatically regenerates `src/routeTree.gen.ts`. **Do not edit `routeTree.gen.ts` manually.**
* **Router Initialization (`src/router.tsx`)**: Instantiates the router with `createRouter({ routeTree, context: { queryClient }, scrollRestoration: true })`.
* **Root Application Shell (`src/routes/__root.tsx`)**: Wraps all child routes with global styles, HTML shell, meta tags, `QueryClientProvider`, and `BranchProvider`.

---

## 2. Route Directory Catalog

| Route File | URL Path | Workspace Level | Branch Context Requirement | Key Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `__root.tsx` | N/A (Root Shell) | System | Provides Context | Root HTML shell, providers, and layout outlet. |
| `index.tsx` | `/` | Branch Level | Optional (Dual-State) | Network-wide analytics ranking OR selected branch overview. |
| `performance.tsx` | `/performance` | Branch Level | Required (Gate Fallback) | 6-month historical trend analysis and DPD portfolio mix. |
| `root-cause.tsx` | `/root-cause` | Branch Level | Required (Gate Fallback) | Driver signal exploration, gap analysis, and evidence cards. |
| `peer-comparison.tsx` | `/peer-comparison` | Branch Level | Required (Gate Fallback) | Comparative peer benchmarking and operational practice differences. |
| `customer-analytics.tsx` | `/customer-analytics` | Customer Level | Optional (Filters data) | Customer portfolio resolution funnel, distributions, and activity. |
| `worklist.tsx` | `/worklist` | Customer Level | Optional (Filters data) | Prioritized operational collections worklist with search and filtering. |
| `customers.$customerId.tsx` | `/customers/:customerId` | Customer Level | Informational | 360° collections profile, explainable priority, NBA, and outcome drawer. |

---

## 3. Route Specifications

### `__root.tsx`
* **Route Path**: App-wide wrapper (`createRootRouteWithContext<{ queryClient: QueryClient }>()`).
* **Purpose**: Serves as the top-level application shell, providing global providers, HTML `<head>` metadata, stylesheet injection, and error boundaries.
* **Key Components & Behaviors**:
  * **HTML Shell**: Injects Google Fonts (**Inter** and **Space Grotesk**), favicon, OpenGraph metadata, and viewport configurations.
  * **Provider Hierarchy**:
    ```tsx
    <QueryClientProvider client={queryClient}>
      <BranchProvider>
        <Outlet />
      </BranchProvider>
    </QueryClientProvider>
    ```
  * **Error Handling**: Implements a dedicated `ErrorComponent` and a custom `NotFoundComponent` (404 page).
  * **Outlet**: Renders the active matched route. Removing `<Outlet />` breaks all child rendering.

---

### `index.tsx`
* **Route Path**: `/`
* **Workspace**: Branch Level (`subtitle: "Overview"`).
* **Branch Context**: **Dual-State** (Adapts dynamically based on `hasBranch`).
* **Behavior & States**:
  * **State A: Branch Network Analytics** (`selectedBranch === null`):
    * Displays 4 network-wide aggregate cards: Total branches (6), Average collection rate (79%), Total recovered ($23.5M), and Total accounts (46,390).
    * Provides an interactive, searchable branch ranking table sorted by collection rate.
    * Features regional breakdown cards (Southeast, South Central, Southwest, Midwest) with regional averages.
    * Clicking any branch row invokes `selectBranch(branch)` and immediately toggles to State B.
  * **State B: Selected Branch Overview** (`selectedBranch !== null`):
    * Displays a command hero banner calculating the branch collection rate, peer average, and percentage point gap (`+` or `−`).
    * Surfaces primary management focus directives (e.g., *"Improve early contact"* or *"Maintain lead"*).
    * Presents 4 KPI cards: Amount recovered, Cure rate, Avg. days to resolve, and Contact rate.
    * Features a **"What is different?"** card with `MetricBar` drivers linking directly to `/root-cause`.
    * Features a **"What successful branches do"** card highlighting top peer practices.
    * Provides a **Branch comparison snapshot** linking to `/peer-comparison`.
    * Includes a *"View affected accounts"* button linking directly to `/worklist`.

---

### `performance.tsx`
* **Route Path**: `/performance`
* **Workspace**: Branch Level (`subtitle: "Trend & portfolio quality"`).
* **Branch Context**: **Required**.
* **Behavior**:
  * **Empty State Gate**: If loaded when `hasBranch === false`, renders an interactive prompt: *"Select a branch to explore Performance"* with selectable branch cards.
  * **With Branch Selected**:
    * 4 top KPI cards (Recovered, Cure rate, Resolution days, Contact rate).
    * **6-Month Collection Trend**: Interactive comparative bar chart tracking monthly collection rates against peer benchmarks (Apr–Sep) with dynamic status badge (*"Gap widening"* or *"On track"*).
    * **DPD Distribution**: Portfolio account mix broken down across Current, 1–30, 31–60, 61–90, and 90+ buckets.
    * **Operational Scorecard**: 4-metric grid comparing PTP kept, Collections / agent, Escalation rate, and Contact rate against peer averages with color-coded variances.

---

### `root-cause.tsx`
* **Route Path**: `/root-cause`
* **Workspace**: Branch Level (`subtitle: "Why the gap?"`).
* **Branch Context**: **Required**.
* **Search Parameter Validation**:
  ```typescript
  validateSearch: (s: Record<string, unknown>): { driver?: string } =>
    typeof s["driver"] === "string" ? { driver: s["driver"] } : {}
  ```
* **Behavior & Interactions**:
  * **Empty State Gate**: Prompts user to select a branch if none is currently active.
  * **Diagnostic Flow Banner**: Visual transition card: `Branch Performance → Performance Gap → Management Focus`.
  * **Driver Signal Selector**: Left sidebar listing available operational signals (e.g., Contact rate, PTP kept, 30+ DPD concentration) with their net contribution impact.
  * **Evidence Breakdown**: Displays quantitative metrics (Branch vs. Peer, delta, impact) and qualitative supporting context.
  * **Segment Link**: Displays an *"Affected segment"* card with a direct link navigating to `/worklist?segment=High` to inspect the actual accounts driving the gap.

---

### `peer-comparison.tsx`
* **Route Path**: `/peer-comparison`
* **Workspace**: Branch Level (`subtitle: "Learn from the network"`).
* **Branch Context**: **Required**.
* **Behavior**:
  * **Empty State Gate**: Displays interactive branch selection cards when no branch is active.
  * **Network Comparison Table**: Full benchmarking matrix comparing the selected anchor branch against peers across Collection Rate, Contact Rate, PTP Kept, Cure Rate, First Contact Day, and Outreach Sequence.
  * **Practice Differences Card**: Side-by-side contrast between the anchor branch and the top-performing peer (e.g., Dallas Branch) evaluating timing and channel sequence differences.
  * **Management Focus Card**: Concise strategic summary advising leadership on whether to replicate peer practices or sustain and document operational leads.

---

### `customer-analytics.tsx`
* **Route Path**: `/customer-analytics`
* **Workspace**: Customer Level (`subtitle: "Analytics"`).
* **Branch Context**: **Optional**. Analyzes all network accounts when `selectedBranch === null`, or automatically scopes calculations to the selected branch.
* **Key Visualizations**:
  * **Resolution Funnel**: 4-step card progression: Total Accounts → Eligible → Delinquent → Needs Attention.
  * **Distribution Cards**:
    * Priority Distribution (High, Medium, Low).
    * Risk Distribution (High, Medium, Low).
    * DPD Distribution (0–30, 31–60, 61–90, 90+ days).
    * PTP Status (Broken, Due today, Kept before, None).
  * **Contactability Grid**: Reachability breakdown (High, Medium, Low).
  * **Weekly Activity Scorecard**: Recent operational counts for calls, SMS messages, field visits, and promise conversion rate.
  * **High-Priority Preview**: Cards showcasing up to 6 high-priority customer records with quick links to `/customers/$customerId` and an *"Open worklist"* action linking to `/worklist`.

---

### `worklist.tsx`
* **Route Path**: `/worklist`
* **Workspace**: Customer Level (`subtitle: "Monitor & prioritize"`).
* **Branch Context**: **Optional**. Displays accounts for the selected branch, or all network accounts if in `All Branches` mode.
* **Search Parameter Validation**:
  ```typescript
  validateSearch: (s: Record<string, unknown>): { segment?: string } =>
    typeof s["segment"] === "string" ? { segment: s["segment"] } : {}
  ```
* **Key Interactions**:
  * **Live Search**: Filters customer name, customer ID, or account number in real time.
  * **Priority Filter Tabs**: Quick-switch buttons (`All`, `High`, `Medium`, `Low`).
  * **Segment Banner**: If navigated from root cause (`?segment=High`), displays an active filter banner (*"Showing accounts related to the early-contact gap"*).
  * **Interactive Table**: Shows customer name, ID, account, branch, DPD, balance, risk status, contactability, PTP status, priority, last contact, and next action link.
  * Clicking any customer name or next action link navigates directly to `/customers/$customerId`.

---

### `customers.$customerId.tsx`
* **Route Path**: `/customers/$customerId` (e.g., `/customers/C001`).
* **Workspace**: Customer Level (`subtitle: "Collections profile"`).
* **Branch Context**: **Informational**. Displays the customer's branch without overwriting the global application branch context.
* **Key Sections & Features**:
  * **Profile Header**: Priority, Risk, and Contactability badges, account identifier, current DPD, outstanding balance, and PTP status. Includes a quick back-link to `/worklist`.
  * **4 Multi-Dimensional Context Cards**:
    * **Payment**: Last payment date, installment consistency, PTPs made and fulfilled.
    * **Outreach**: Successful contact ratio, preferred channel, SMS and voice call response rates.
    * **Risk**: Delinquency trajectory and balance at risk relative to branch medians.
    * **Priority**: Urgent operational justification for action today.
  * **Explainable Priority Matrix**: 4-card evidence grid explaining the discrete factors driving priority (Rising DPD, Exposure, Missed commitment, Responsiveness).
  * **Activity Timeline**: Chronological customer history (Payments missed, SMS delivered, Phone connections, Promises broken, Outcomes recorded).
  * **Next Best Action Card**:
    * Channel (*Phone*), Cadence (*Today + 2d*), Content (*PTP-focused*).
    * Visual recommended journey: `Today (Phone) → +2 days (SMS) → Escalate (Field)`.
    * Conversation focus guidance and behavioral justification.
  * **Result Capture Drawer**:
    * Triggered by the **"Take action"** button.
    * Allows logging: Action taken (Phone call), Connection outcome (Connected, No answer, Unavailable, Wrong number), Customer response (PTP created, Will pay, Financial difficulty, Dispute), PTP amount, PTP date, and free-form notes.
    * Clicking **"Save outcome"** updates component state and immediately appends a new commitment event to the customer activity timeline.

---

## 4. Supporting Routing Files

### `router.tsx`
Located at `src/router.tsx`, this module exports `getRouter()`, which binds TanStack Query's `QueryClient` to TanStack Router and passes `routeTree`. It configures scroll restoration and sets `defaultPreloadStaleTime: 0`.

### `routeTree.gen.ts`
Located at `src/routeTree.gen.ts`, this file is strictly auto-generated by the TanStack Router compilation plugin. It binds all imported route instances into the typed route hierarchy, generating TypeScript interfaces for type-safe route navigation (`Link`, `useNavigate`, `useParams`, `useSearch`).
