# RecoveryOps Frontend Architecture

This directory contains the client-facing frontend application for **RecoveryOps**, built as a high-performance single-page application with server-side rendering capabilities using **React 19**, **TanStack Start**, **TanStack Router**, and **Tailwind CSS v4**.

---

## 1. Tech Stack & Dependencies

The application leverages a modern TypeScript ecosystem specified in [`package.json`](./package.json):

### Core Framework & Routing

- **React 19** (`react`, `react-dom` `^19.2.0`): Core UI library utilizing modern concurrent features.
- **TanStack Start** (`@tanstack/react-start` `1.168.32`): Full-stack React framework providing SSR integration, routing, and server middleware.
- **TanStack Router** (`@tanstack/react-router` `1.170.18`, `@tanstack/router-plugin` `1.168.23`): Fully type-safe, file-based router with built-in search parameter validation, loader integration, and scroll restoration.
- **TanStack Query** (`@tanstack/react-query` `^5.101.1`): Server state synchronization and asynchronous cache management.

### Build Tooling & Server Runtime

- **Vite 8** (`vite` `8.1.5`): Fast development server and module bundler.
- **Nitro** (`nitro` `3.0.260603-beta`): Unified server engine powering TanStack Start deployments.
- **TypeScript 5.8** (`typescript` `^5.8.3`): Type safety, interfaces, and strict checking across components, contexts, and routes.

### Styling & Design System

- **Tailwind CSS v4** (`tailwindcss` `^4.2.1`, `@tailwindcss/vite` `^4.2.1`): Next-generation engine with inline theme configuration (`@theme inline`), OKLCH color spaces, and direct CSS variable mappings.
- **tw-animate-css** (`tw-animate-css` `^1.3.4`): Smooth animation primitives and keyframe transitions.
- **Radix UI Primitives**: Accessible, unstyled component primitives (`@radix-ui/react-accordion`, `react-dialog`, `react-dropdown-menu`, `react-popover`, `react-tabs`, `react-tooltip`, etc.).
- **Lucide React** (`lucide-react` `^0.575.0`): Enterprise icon library.
- **Recharts** (`recharts` `^2.15.4`): Data visualization and charts.

### Form Handling & Utilities

- **React Hook Form** (`react-hook-form` `^7.71.2`, `@hookform/resolvers` `^5.2.2`): Performant form state management.
- **Zod** (`zod` `^3.25.76`): Schema validation for forms and search parameters.
- **clsx** (`^2.1.1`) & **tailwind-merge** (`^3.5.0`): Dynamic, conflict-free class name composition.
- **date-fns** (`^4.1.0`): Date manipulation and formatting.

---

## 2. Architecture & Design System

### Design Philosophy

The UI follows an enterprise financial-grade design system emphasizing legibility, visual hierarchy, and context-awareness:

- **Color Palette (OKLCH)**: Defined in `src/styles.css` using modern OKLCH color spaces for perceptual uniformity (`--primary: oklch(.55 .23 260)`, `--success: oklch(.56 .15 150)`, `--destructive: oklch(.61 .2 25)`).
- **Typography**: Clean, high-legibility dual-font pairing:
  - Sans: **Inter** (body text, tables, forms, metadata).
  - Display: **Space Grotesk** (key metrics, headers, section titles).
- **Glassmorphism & Surfaces**: Custom CSS utilities (`.app-surface`, `.glass`, `.glass-strong`) deliver layered depth with backdrop filters and subtle borders.
- **Micro-interactions**: Seamless page entrance animations (`.page-enter`) with support for `prefers-reduced-motion`.

### Component Architecture

- **`AppShell` (`src/components/app-shell.tsx`)**: The global layout wrapper providing the collapsible sidebar, top navigation bar, breadcrumb hierarchy, user profile badge, and the persistent global branch selector dropdown.
- **Core Primitives (`src/components/ui.tsx`)**: Lightweight, reusable styling primitives tailored for RecoveryOps:
  - `Button`: Primary, secondary, ghost, and danger button variants.
  - `GlassCard`: Frosted card container with subtle shadow and border styling.
  - `Status`: Contextual status pill tags (`good`, `warn`, `danger`, `info`, `neutral`).
  - `MetricBar`: Proportional progress indicator with optional peer benchmark vertical marker line.
- **Radix UI Suite (`src/components/ui/*`)**: Full library of accessible enterprise UI primitives (dialogs, tooltips, dropdown menus, selects, etc.).

---

## 3. Directory Structure

```text
frontend/
├── public/                 # Static assets (favicons, icons)
├── src/
│   ├── components/         # Reusable application components
│   │   ├── ui/             # Radix-based enterprise UI component library
│   │   ├── app-shell.tsx   # Global navigation shell, sidebar & branch dropdown
│   │   └── ui.tsx          # Core RecoveryOps primitives (Button, GlassCard, Status, MetricBar)
│   ├── data/
│   │   └── mock-data.ts    # Synthetic branch network, customer database, and calculation helpers
│   ├── hooks/
│   │   ├── branch-context.tsx # Global branch context provider and useBranch hook
│   │   └── date-context.tsx   # Global business date snapshot context and useDate hook
│   ├── lib/
│   │   ├── error-capture.ts # SSR and client error handling utilities
│   │   ├── error-page.ts    # Fallback server-rendered error markup
│   │   └── utils.ts         # cn() utility for class name merging
│   ├── routes/             # TanStack Router file-based route definitions
│   │   ├── __root.tsx      # Root document shell, query client provider, and branch context
│   │   ├── index.tsx       # Route '/' (Branch Network ranking OR Selected Branch Overview)
│   │   ├── performance.tsx # Route '/performance' (Historical trends & DPD mix)
│   │   ├── root-cause.tsx  # Route '/root-cause' (Diagnostic driver exploration)
│   │   ├── peer-comparison.tsx # Route '/peer-comparison' (Peer branch benchmarking)
│   │   ├── customer-analytics.tsx # Route '/customer-analytics' (Portfolio analytics)
│   │   ├── worklist.tsx    # Route '/worklist' (Prioritized operational queue)
│   │   ├── customers.$customerId.tsx # Route '/customers/:customerId' (Profile & NBA)
│   │   └── README.md       # Technical route documentation
│   ├── routeTree.gen.ts    # Auto-generated TanStack route tree (do not edit manually)
│   ├── router.tsx          # Router instantiation and QueryClient binding
│   ├── server.ts           # Nitro / TanStack Start SSR entry point
│   ├── start.ts            # Start instance configuration with CSRF & error middleware
│   └── styles.css          # Tailwind CSS v4 directives, OKLCH variables, and utilities
├── package.json            # Project dependencies and npm scripts
├── tsconfig.json           # TypeScript configuration and path aliases
└── vite.config.ts          # Vite build configuration
```

---

## 4. Branch Context & State Management

A cornerstone of the RecoveryOps frontend is the **global branch context**, managed via React Context in `src/hooks/branch-context.tsx`:

```typescript
export interface Branch {
  id: string;
  name: string;
  region: string;
  state: string;
  accounts: number;
  collectionRate: number;
  recovered: string;
  cureRate: number;
  contactRate: number;
  ptpKept: number;
  avgDaysToResolve: number;
  collectionsPerAgent: string;
  escalationRate: number;
  firstContact: string;
  outreachPath: string;
}
```

### Context Value & Semantics

- **`selectedBranch: Branch | null`**: When `null`, the application operates in **All Branches** mode. This is treated as an intentional, first-class analytical state rather than an empty state.
- **`hasBranch: boolean`**: Shorthand boolean (`selectedBranch !== null`) used to condition navigation and data filters.
- **`selectBranch(branch: Branch)`**: Sets active branch context.
- **`clearBranch()`**: Resets context to `All Branches`.

### Persistence & Route Safeguards

1. **Local Storage**: Branch selection persists across page refreshes via the `recoveryops-selected-branch` key in `localStorage`.
2. **Context-Aware Sidebar Navigation**:
   - In `All Branches` mode, the sidebar displays only **Overview** under Branch Level.
   - Selecting a branch automatically expands the sidebar navigation to include **Performance**, **Root Cause**, and **Peer Comparison**.
3. **Route Guarding**: If a user is on a branch-specific page (`/performance`, `/root-cause`, or `/peer-comparison`) and changes the global dropdown to `All Branches`, `AppShell` automatically redirects to `/`.
4. **Standalone Gate**: If a branch-specific route is loaded directly without an active branch, it displays an interactive prompt allowing the user to pick a branch immediately without crashing.

---

## 5. Global Business Date & Portfolio Snapshot Engine

To simulate real-world historical collections reviews, RecoveryOps incorporates a global business date snapshot architecture managed via `src/hooks/date-context.tsx`:

```typescript
export interface DateContextValue {
  selectedDate: string; // ISO format: YYYY-MM-DD (e.g., '2026-09-15')
  formattedDate: string; // '15 Sep 2026'
  formattedButtonLabel: string; // 'Q3 · 15 Sep'
  month: number;
  year: number;
  quarter: string;
  selectDate: (dateStr: string) => void;
  presets: { label: string; date: string; badge: string }[];
}
```

### Key Architectural Behaviors

1. **Independent Dual Context**: Operates concurrently with `BranchProvider` without mutual interference or reset cycles.
2. **Deterministic Time Progression (`getCustomersForDate`)**:
   - Customer DPD values progress or recover deterministically based on elapsed days relative to the selected snapshot.
   - PTP statuses transition dynamically (e.g. pending before due dates, broken after missed grace periods).
   - Outstanding balances, risk categorizations, and priority rankings update in sync.
3. **Future Event Suppression**: In `getCustomerDetailContext`, the `masterTimeline` filters out any activity dated after `selectedDate` (`timeline.filter(e => e.date <= dateStr)`), ensuring frontline agents never see future events when viewing a historical snapshot.
4. **Frontline Outcome Association**: Dispositions logged through the Result Capture drawer automatically adopt the active business date as their timestamp.
5. **Navbar Toggleable UI**: The date picker popover in `src/components/app-shell.tsx` is wrapped in clean JSX comment tags allowing rapid on-demand activation or deactivation without code loss.

---

## 6. Customer 360 Layout Optimization

The individual customer workspace (`/customers/:customerId`) is organized into an executive layout:

- **Single-Row 3-Pillar Context**:
  - `1. Payment History`: Repayment consistency ratio, last payment date/amount, and PTP fulfillment score.
  - `2. Outreach & Reach`: Contact attempt totals, answer rate, preferred channel, and peak response window.
  - `3. Risk Trajectory`: 30-day DPD velocity, exposure-to-median ratio, and severity status pill.
- **Paired Visual Analysis**:
  - **DPD Progression Trajectory**: Interactive Recharts trend chart showing delinquency progression across the last 30 days.
  - **Why Act Today?**: Relocated adjacent to the DPD chart to provide prominent operational justification, trigger drivers, and priority scorecards.

---

## 7. Mock Data Layer

All data across the prototype resides in `src/data/mock-data.ts`. The dataset is designed to be mathematically consistent, realistic, and operationally meaningful:

### Branch Network Dataset

Models 6 regional branches across the US regional network representing distinct performance profiles:

- **Tampa Branch (`TPA`)**: High volume (12,480 accounts), underperforming (71% collection rate, −8 pts gap), late first contact (Day 5), voice/SMS outreach.
- **Dallas Branch (`DAL`)**: Benchmark peer (9,840 accounts, 84% collection rate, +5 pts lead), early contact (Day 2), structured sequence (SMS → Phone → Field).
- **Atlanta Branch (`ATL`)**, **Phoenix Branch (`PHX`)**, **Charlotte Branch (`CLT`)**, **Chicago Branch (`CHI`)**: Mid-tier branches spanning Southeast, South Central, Southwest, and Midwest regions.

### Dynamic Generation Helpers

- **`getBranchMetrics(branchId)`**: Computes recovery amount, cure rate, resolution speed, and contact rate relative to targets.
- **`getBranchDrivers(branchId)`**: Calculates branch vs. peer variances across Contact Rate, PTP Kept, and 30+ DPD Rollover, calculating specific percentage point impact.
- **`getPeerData(anchorBranchId)`**: Returns benchmarking matrices highlighting the active branch as the anchor.
- **`getBranchPerformanceTrend(branchId)`**: Yields 6-month historical monthly points (Apr–Sep) comparing branch actuals against peer benchmarks.
- **`getBranchDPD(branchId)`**: Returns DPD bucket distribution percentages.
- **`getBranchScorecard(branchId)`**: Compares operational KPIs against network averages.

### Proportional Customer Distribution

The `distributeProportionally()` helper scales discrete customer counts across Priority, Risk, DPD, PTP, and Contactability buckets so that aggregate numbers remain mathematically reconciled with total branch account volumes.

### Customer Roster

Includes 16 rich customer records (`C001` through `C016`) capturing diverse collections archetypes:

- High DPD with broken commitments (e.g., Michael Carter, Emily Rodriguez).
- Approaching commitments needing reminders (e.g., David Johnson, James Wilson).
- Low-risk, early-stage monitoring accounts (e.g., Lauren Lewis, Daniel White).

---

## 6. Implementation of Primary Workspaces

### Branch Level Workspaces

1. **Branch Overview (`src/routes/index.tsx`)**:
   - Implements a **dual-state view**:
     - **State A (All Branches)**: Displays network aggregate KPI cards, a searchable branch ranking table, and regional summary cards.
     - **State B (Selected Branch)**: Displays a command hero banner with performance gap calculation, 4 core KPI cards, top operational driver comparisons with `MetricBar`, peer practice cards, and a peer comparison snapshot.
2. **Performance (`src/routes/performance.tsx`)**:
   - Evaluates historical trends using an interactive CSS-based comparative bar chart comparing monthly actuals to peer benchmarks.
   - Visualizes DPD portfolio mix and operational scorecards with colored variance badges.
3. **Root Cause Analysis (`src/routes/root-cause.tsx`)**:
   - Displays an operational flow banner (`Performance → Gap → Management Focus`).
   - Provides a signal selector synchronized with URL search parameters (`?driver=...`).
   - Presents evidence breakdown cards (Branch vs. Peer, delta, and net impact) alongside links to affected customer segments.
4. **Peer Comparison (`src/routes/peer-comparison.tsx`)**:
   - Renders a comparative data table anchoring on the selected branch.
   - Highlights specific operational practice differences (First contact day, sequence, escalation).

### Customer Level Workspaces

1. **Customer Analytics (`src/routes/customer-analytics.tsx`)**:
   - Funnel cards: Total Accounts → Eligible → Delinquent → Needs Attention.
   - Multi-metric distribution visualizations: Priority, Risk, DPD Buckets, and PTP Status.
   - Contactability grid (High, Medium, Low) and weekly outreach activity scorecard.
   - Direct high-priority customer preview cards with deep links to individual profiles.
2. **Collections Worklist (`src/routes/worklist.tsx`)**:
   - Supports search queries across name, ID, and account numbers.
   - Interactive priority filter tabs (`All`, `High`, `Medium`, `Low`).
   - Supports cohort filtering via search parameters (e.g., `?segment=High`).
   - Full data table with customer risk, DPD, contactability, PTP, and quick-action links.
3. **Customer Profile & Action (`src/routes/customers.$customerId.tsx`)**:
   - 4 context cards covering Payment, Outreach, Risk, and Priority.
   - **Explainable Priority**: 4-card matrix detailing why the account requires immediate action.
   - **Next Best Action**: Visual card defining Channel, Cadence, Content, and conversation focus.
   - **Result Capture Drawer**: Slide-out panel allowing the agent to record call connection status, customer commitments, PTP amount, PTP date, and notes. Saving an outcome appends an event to the local activity timeline.

---

## 7. Development Commands

The project uses standard Vite and TanStack scripts defined in `package.json`:

### Starting Local Development Server

```bash
npm run dev
# or using bun
bun run dev
```

Starts the Vite development server with Hot Module Replacement (HMR). Default port is typically `http://localhost:3000` (or `http://localhost:5173`).

### Building for Production

```bash
npm run build
# or using bun
bun run build
```

Generates the optimized production build using Vite and Nitro.

### Previewing Production Build

```bash
npm run preview
# or using bun
bun run preview
```

Spins up a local server to preview the production-built bundle.

### Linting & Formatting

```bash
# Run ESLint across the codebase
npm run lint

# Format files using Prettier
npm run format
```

---

## 8. Development Notes & Best Practices

1. **Do Not Manually Edit `routeTree.gen.ts`**:
   TanStack Router automatically generates and updates `src/routeTree.gen.ts` whenever route files in `src/routes/` are added, renamed, or modified.
2. **File-Based Routing Conventions**:
   - Root layout: `src/routes/__root.tsx`.
   - Static route: `src/routes/performance.tsx` maps to `/performance`.
   - Dynamic route: `src/routes/customers.$customerId.tsx` maps to `/customers/:customerId`.
3. **Preserve `<Outlet />`**:
   The `<Outlet />` component in `src/routes/__root.tsx` is required to render nested routes.
4. **Path Aliasing**:
   The `@/` alias is mapped to `src/*` via `tsconfig.json` and `vite-tsconfig-paths`. Always use `@/...` for clean, consistent internal imports.
5. **Client-Side Prototype Notice**:
   All state updates (such as recording a collection outcome in the Result Capture drawer) are held in component memory or `localStorage`. They do not persist to a backend database.
