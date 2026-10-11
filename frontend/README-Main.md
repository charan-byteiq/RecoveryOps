# RecoveryOps Intelligence

> **Collections Intelligence** - A context-driven collections intelligence operating model bridging portfolio-wide analytics and individualized frontline execution for retail lending operations.

---

## 1. What is RecoveryOps?

**RecoveryOps** is an enterprise collections intelligence platform designed to transform how lending institutions monitor, diagnose, and execute debt resolution. Rather than treating collections as a disconnected series of phone calls or passive metric dashboards, RecoveryOps unifies operational analytics and frontline actions into an integrated, context-driven workflow.

### The platform is organized around two foundational operational levels:

#### Branch Level
Enables regional and branch managers to monitor portfolio health, detect collection gaps early, uncover the operational and behavioral drivers behind performance differences, and adopt proven practices from top-performing peer branches.

### Customer Level
Enables collections supervisors and frontline agents to identify high-risk accounts requiring urgent attention, evaluate customer payment behavior and contact responsiveness, understand the explicit reasons behind an account's priority, execute a targeted **Next Best Action**, and capture call outcomes directly in the customer journey.

> [!NOTE]
> RecoveryOps is currently implemented as an interactive, high-fidelity frontend prototype. It demonstrates the complete end-to-end product vision, information architecture, and operational workflows using realistic synthetic data.

---

## 2. The Core Idea

Traditional collections management suffers from a fundamental disconnect: **leadership looks at aggregate recovery numbers in monthly reports, while frontline agents work off flat, unprioritized contact lists without operational context.**

RecoveryOps solves this by establishing a continuous, bidirectional operating model that moves from macro network intelligence down to micro customer interventions:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                              BRANCH LEVEL                              │
│                                                                        │
│   Performance  ──►  What is different?  ──►  Why? (Drivers)  ──►       │
│                     Peer Comparison     ──►  Management Focus          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                         Isolate Affected Segment
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                             CUSTOMER LEVEL                             │
│                                                                        │
│   Portfolio Monitoring  ──►  Multi-Dimensional Analysis  ──►           │
│   Prioritization        ──►  Next Best Action            ──►           │
│   Result Capture        ──►  Customer Activity Journey                 │
└────────────────────────────────────────────────────────────────────────┘
```

By connecting these two layers, a branch manager can diagnose why their branch is lagging behind peers (e.g., delayed first contact), immediately drill into the specific delinquent accounts driving that gap, and ensure frontline agents are contacting those customers with the right channel, cadence, and messaging.

---

## 3. Two Primary Workspaces

The RecoveryOps interface is organized into two primary, dedicated workspaces accessible through the application shell:

```text
RECOVERYOPS
├── Branch Level
│   ├── Branch Network Analytics (All Branches)
│   ├── Branch Overview (Selected Branch)
│   ├── Performance (Selected Branch)
│   ├── Root Cause Analysis (Selected Branch)
│   └── Peer Comparison (Selected Branch)
└── Customer Level
    ├── Customer Analytics (Network or Branch-filtered)
    └── Collections Worklist (Network or Branch-filtered)
```

### Branch Level Workspaces

#### Branch Network Analytics
Serves as the executive landing view across the entire branch network (e.g., regional state network). It aggregates network-wide key performance indicators such as average collection rate, total amount recovered, total active accounts, and regional performance distributions, and ranks all branches with search capabilities.

#### Branch Overview
When a specific branch is selected, this command view provides a focused operational snapshot. It highlights the branch's collection rate against the peer average, calculates the performance gap in percentage points, identifies the primary management focus area, and surfaces the top three contributing operational signals.

#### Performance
Delivers a longitudinal view of branch collections trends over time (e.g., a six-month view from April through September). It tracks whether the performance gap against peer averages is widening or closing, visualizes the distribution of accounts across Days Past Due (DPD) buckets, and presents an operational scorecard measuring PTP fulfillment, collections per agent, escalation rate, and contact rate.

#### Root Cause / Performance Drivers
Provides an evidence-based diagnosis of the measurable operational factors associated with the branch's performance gap or lead. Users can inspect specific drivers (such as contact rate, promise-to-pay fulfillment, or 30+ DPD rollover), review quantitative differences between the branch and peer benchmarks, examine qualitative supporting context, and immediately jump to the affected customer segment.

#### Peer Comparison
Benchmarks the selected branch against comparable peer branches across key performance and operational metrics (collection rate, contact rate, PTP kept, cure rate, first contact timing, and outreach path sequence). It highlights concrete differences in operational practices—such as initiating contact on Day 2 versus Day 5 and articulates clear management directives to close the gap or sustain a lead.

---

### Customer Level Workspaces

#### Customer Analytics
Presents portfolio-wide or branch-filtered analytics structured around an operational resolution funnel:
- **Total Accounts** → **Eligible Accounts** → **Delinquent Accounts** → **Needs Attention**
- Multi-metric breakdowns spanning **Priority Distribution** (High / Medium / Low), **Risk Severity** (High / Medium / Low), **DPD Buckets** (0–30, 31–60, 61–90, 90+ days), and **PTP Status** (Broken, Due Today, Kept Before, None).
- Reachability analysis categorizing customer contactability alongside a weekly outreach activity scorecard (calls placed, SMS messages dispatched, field visits performed, and promises secured).

#### Collections Worklist
Transforms raw portfolio data into an operational action queue. Accounts are ranked by operational urgency, financial exposure, and likelihood of effective contact. Users can search by customer name, account number, or customer ID, filter by priority levels (All, High, Medium, Low), or inspect segmented cohorts passed directly from root-cause diagnoses.

#### Customer Collections Profile
A comprehensive 360-degree account dossier consolidating four critical dimensions of the customer relationship:
1. **Payment**: Payment recency, consistency over recent billing cycles, and historical PTP reliability.
2. **Outreach**: Contact success rate, most effective communication channels, and channel-by-channel response profiles.
3. **Risk**: Delinquency trajectory, DPD status, balance at risk, and exposure relative to branch medians.
4. **Priority**: Operational urgency score indicating why immediate action is warranted today.

#### Explainable Priority
Rather than treating priority as an opaque machine score, RecoveryOps articulates the transparent operational factors determining an account's urgency—separating underlying risk severity from immediate contactability and missed commitments.

#### Next Best Action
Replaces vague recommendations with an actionable, structured intervention strategy defined by:
$$\text{Next Best Action} = \text{Channel} \times \text{Cadence} \times \text{Content}$$

#### Result Capture
An interactive slide-out panel allowing collections agents to log the outcome of an intervention (e.g., Connected, No Answer, Unavailable, Wrong Number), specify customer commitments (PTP amount, PTP promised date, hardship, or dispute), record operational notes, and immediately update the customer's chronological activity journey.

#### Customer 360 Workspace & Layout Optimization
The Customer 360 view has been refined into an executive, high-signal layout:
- **3-Pillar Context Row (Single-line grid)**:
  1. **Payment History**: Repayment consistency ratio, last payment amount/recency, and historical PTP reliability.
  2. **Outreach & Reach**: Total contact attempts, contact rate percentage, preferred communication channel, and best response time window.
  3. **Risk Trajectory**: 30-day DPD progression change, exposure-to-median ratio, and qualitative default severity tier.
- **Visual Progression & Operational Urgency**:
  - **DPD Progression Trajectory**: Dynamic Recharts line chart illustrating account delinquency acceleration across the trailing 30 days.
  - **Why Act Today? Card**: Prominently positioned adjacent to the DPD chart, providing explicit operational justification, delinquency trigger drivers, and immediate ROI rationales.

---

### Global Business Date & Portfolio Snapshot Engine

RecoveryOps implements a **Global Business Date & Historical Snapshot Engine** across the Customer Level workspace:

```text
GLOBAL DATE / PERIOD SELECTOR
              ↓
    Selected Business Date (e.g., 15 Sep 2026)
              ↓
  Deterministic Portfolio Snapshot
  ├── Customer Analytics (KPIs, Aging Buckets, Funnel)
  ├── Priority Worklist (Date-aware DPD, Balances, Risk Tiers)
  └── Customer 360 Workspace
        ├── DPD Trend Shift (30d before, 15d before, selected date)
        ├── PTP & Payment State relative to snapshot
        └── Strictly Filtered Activity Journey (Future events suppressed)
```

#### Key Capabilities:
- **Global Date State (`DateProvider` & `useDate()`)**: Manages the application-wide business date snapshot independently of the Branch Filter, preserving context across all customer-level routes without page reloads.
- **Deterministic Historical Snapshots**: Provides realistic portfolio states across Q3 2026 (e.g., 1 Jul, 1 Aug, 1 Sep, 10 Sep, 15 Sep, 20 Sep, 30 Sep). Changing the business date re-evaluates delinquency metrics, broken PTPs, and outstanding balances deterministically.
- **Future Event Suppression**: The **Customer Activity Journey** strictly hides events occurring after the selected business date, accurately simulating a historical collections review.
- **Snapshot-Aware Outcome Capture**: Frontline agent dispositions logged via the Result Capture drawer are automatically tagged with the current active business date.
- **Modular Navbar Date Selector**: Built with a dedicated popover featuring demo presets and month/day calendar controls, with a clean comment wrapper in `app-shell.tsx` allowing instant on-demand activation or deactivation without deleting any code.

---

## 4. Context-Driven Experience

A central design principle of RecoveryOps is **context-driven awareness**. Rather than forcing users to repeatedly configure filters across different screens, selecting a branch establishes an application-wide operational context that dynamically tailors every view:

```text
[Global Context: All Branches]
  │
  ├──► Branch Network Analytics (Macro rankings & regional summaries)
  ├──► Customer Analytics (Network-wide portfolio breakdown)
  └──► Collections Worklist (All 46,000+ network accounts)

[User Selects: "Bhubaneswar Central" (BBSR)]
  │
  ├──► Navigation unlocks deep-dive pages (Performance, Root Cause, Peer Comparison)
  ├──► Branch Overview switches from network ranking to single-branch command view
  ├──► Customer Analytics filters exclusively to BBSR's 12,480 accounts
  └──► Collections Worklist displays only BBSR accounts requiring attention
```

Selecting "All Branches" returns the user to high-level network oversight, automatically redirecting from branch-specific diagnostic pages back to the network overview. This ensures managers and stakeholders always have clear spatial orientation within their portfolio.

---

## 5. Branch Intelligence: Answering the Right Questions

RecoveryOps moves branch analytics beyond static scorecards. Instead of merely presenting numbers, it answers the four fundamental questions every collections manager faces:

| Management Question | How RecoveryOps Answers It | Key Signals & Metrics |
| :--- | :--- | :--- |
| **"Where is the branch performing differently?"** | Compares the branch's current collection rate against the peer benchmark, quantifying the exact performance gap in percentage points. | Collection Rate, Target vs. Actual Recovered, Cure Rate, Avg. Days to Resolve. |
| **"What is associated with the difference?"** | Isolates statistically significant operational variances between the branch and high-performing branches. | Contact Rate, PTP Kept Rate, 30+ DPD Roll Rate, First Contact Timing. |
| **"What are comparable branches doing differently?"** | Benchmarks operational procedures, revealing specific behavioral differences rather than just metric outcomes. | Outreach Sequencing (e.g., SMS → Call vs. Call → SMS → Field), Escalation Window. |
| **"What should management focus on?"** | Translates analytical findings into clear operational directives (e.g., *"Improve early contact"* or *"Maintain lead"*). | Primary Focus Recommendation, Affected Customer Segment Link. |

---

## 6. Customer Intelligence: Multi-Dimensional Evaluation

Individual accounts in RecoveryOps are evaluated across four distinct dimensions to prevent the common pitfall of confusing **balance size** with **operational urgency**:

```text
                 ┌──────────────────────────────────────────┐
                 │          CUSTOMER INTELLIGENCE           │
                 └────────────────────┬─────────────────────┘
                                      │
     ┌──────────────────┬─────────────┴─────────────┬──────────────────┐
     ▼                  ▼                           ▼                  ▼
┌─────────┐       ┌──────────┐                ┌───────────┐      ┌────────────┐
│ PAYMENT │       │ OUTREACH │                │   RISK    │      │  PRIORITY  │
├─────────┤       ├──────────┤                ├───────────┤      ├────────────┤
│ Recency │       │ Success  │                │ Severity  │      │ Urgency    │
│ Pattern │       │ Channel  │                │ Exposure  │      │ Actionable │
│ PTP Hx  │       │ Response │                │ Trajectory│      │ Focus      │
└─────────┘       └──────────┘                └───────────┘      └────────────┘
```

1. **Payment Profile**: Evaluates payment consistency over time (e.g., *3 of last 6 installments kept*), recency of last payment, and historical promise-to-pay reliability.
2. **Outreach Dynamics**: Analyzes contactability channels, past connection rates, and customer responsiveness to different modalities (e.g., *high response to voice calls, low response to SMS*).
3. **Risk Posture**: Gauges the credit risk severity based on Days Past Due (DPD), account balance, recent deterioration, and historical delinquency recurrence.
4. **Operational Priority**: Combines risk severity with immediate actionability. A high-balance account with low contactability might require field investigation, whereas an account with a broken PTP and high phone responsiveness warrants an immediate phone call today.

---

## 7. Next Best Action (NBA)

In many collections systems, recommendations default to generic prompts such as *"Call customer"*. RecoveryOps elevates recommendations into structured, context-sensitive operational prescriptions:

### The Next Best Action Framework

* **Channel**: Determines the most effective outreach mechanism based on historical response data (e.g., Phone Call, SMS, Email, or Field Visit).
* **Cadence**: Defines the optimal timing window and follow-up rhythm (e.g., *Call today between 4:00 PM and 6:00 PM; follow up in +2 days via SMS; escalate to field review after 5 days*).
* **Content**: Guides the collections officer on the precise objective and conversational posture (e.g., *Acknowledge missed payment commitment, confirm recent salary credit, and negotiate a realistic, partial PTP*).

This ensures every customer interaction is intentional, respectful, and optimized for resolution.

---

## 8. End-to-End Product Flow

The following diagram illustrates how a user progresses from network-level diagnosis down to recording an individual customer collection outcome:

```text
                      Branch Network Analytics
                      (Macro rankings & KPIs)
                                 │
                                 ▼
                           Select Branch
                     (e.g., Bhubaneswar Central)
                                 │
                                 ▼
                         Branch Overview
                   (Performance gap & primary focus)
                                 │
                ┌────────────────┴────────────────┐
                ▼                                 ▼
       Root Cause Analysis                 Peer Comparison
     (Inspect drivers & gap)           (Operational practices)
                │                                 │
                └────────────────┬────────────────┘
                                 │
                                 ▼
                     Customer Segment / Filter
                  (e.g., High-Priority Cohort)
                                 │
                                 ▼
                       Collections Worklist
                     (Ranked operational queue)
                                 │
                                 ▼
                    Customer Collections Profile
                  (Payment, outreach, risk context)
                                 │
                                 ▼
                       Explainable Priority
                    (Transparent reasoning cards)
                                 │
                                 ▼
                         Next Best Action
                  (Channel × Cadence × Content)
                                 │
                                 ▼
                          Result Capture
                (Record outcome, PTP details & notes)
```

---

## 9. Key Product Capabilities

| Area | Capability | Description |
| :--- | :--- | :--- |
| **Branch Intelligence** | **Branch Network Analytics** | Macro view across all network branches with regional aggregations and sorting. |
| | **Branch Performance Analytics** | Longitudinal 6-month trend tracking, DPD bucket distribution, and peer variance. |
| | **Performance Gap Analysis** | Real-time calculation of branch performance versus network averages. |
| | **Root Cause Diagnosis** | Quantitative and qualitative drill-down into operational drivers behind gaps. |
| | **Peer Benchmarking** | Comparative practice matrix contrasting outreach timing, channels, and escalation. |
| **Customer Intelligence** | **Customer Portfolio Analytics** | Funnel metrics, multi-metric distribution bars, contactability breakdown, and activity logs. |
| | **Collections Worklist** | Prioritized operational queue with search, priority filtering, and segment links. |
| | **Customer Collections Profile** | Unified 360-degree account dossier covering payment, outreach, risk, and priority. |
| | **Explainable Prioritization** | Transparent 4-pillar breakdown explaining why an account requires action today. |
| | **Next Best Action (NBA)** | Structured guidance across Channel, Cadence, Content, and Recommended Journey. |
| | **Result Capture Drawer** | Interactive slide-out panel to record contact outcomes, PTP amounts/dates, and notes. |
| | **Global Business Date Snapshot** | Deterministic portfolio-wide historical snapshot engine driving Customer Analytics, Worklists, and Customer 360 relative to selected business dates. |
| | **Future Event Suppression** | Chronological timeline auditing that strictly isolates and suppresses future events relative to the active business date snapshot. |
| **Platform Experience** | **Context-Aware Navigation** | Dynamic global branch switcher that coordinates views, routes, and data state. |

---

## 10. What the Prototype Demonstrates

This repository contains an interactive **frontend demonstration prototype**. It demonstrates:

* **Product Architecture**: How an enterprise collections platform should be structured across branch management and frontline collections.
* **User Experience & Interaction Flow**: Smooth transitions between executive portfolio analysis and individual account execution.
* **Decision Frameworks**: How explainable priority and structured Next Best Action recommendations present themselves in a production-style UI.
* **Realistic Business Data**: High-fidelity mock data modeling realistic US retail lending portfolios (amounts in USD, DPD buckets, PTP statuses, and regional branches across the US).

> [!IMPORTANT]
> The current codebase is a frontend prototype. All analytics, driver attributions, customer priorities, and next-best actions are powered by client-side synthetic mock data. Backend microservices, live database connections, machine learning pipelines, and core banking system integrations are not included in this repository.

---

## 11. Product Demo Flow

For client presentations, stakeholder reviews, or evaluators exploring the application, follow this recommended walkthrough:

1. **Start at All Branches**: Open the application on the default route (`/`). Observe the **Branch Network Analytics** dashboard with network KPIs (79% average collection rate, $23.5M total recovered) and the ranked branch table.
2. **Select a Lagging Branch**: Click on **Tampa Branch** (71% collection rate, −8 pts gap). Observe how the view switches to the **Branch Overview**, highlighting the performance gap and the primary focus: *"Improve early contact"*.
3. **Inspect Performance Trends**: Navigate to **Performance** (`/performance`) to see the 6-month Apr–Sep trend showing the widening gap against peers, the DPD mix, and the operational scorecard.
4. **Diagnose Root Cause**: Click on **Root Cause** (`/root-cause`) or follow the *"Open diagnosis"* link. Select **Contact rate** to inspect why Tampa's delayed outreach (Day 5 vs. Day 2) reduces early cures and widens the gap by −4 points.
5. **Review Peer Practices**: Open **Peer Comparison** (`/peer-comparison`). Compare Tampa against **Dallas Branch** (84% collection rate) and review the operational practice differences (First contact on Day 2; sequence: SMS → Phone → Field).
6. **Transition to Customers**: Navigate to **Customer Analytics** (`/customer-analytics`). Review the customer funnel, priority distributions, and contactability breakdown for the selected branch.
7. **Open the Collections Worklist**: Click **Worklist** (`/worklist`). Review the prioritized account list, search for a specific customer (e.g., *"Michael"*), or filter by priority.
8. **Inspect Customer Profile**: Click on customer **Michael Carter** (`/customers/C001`). Review the 4 context cards (Payment, Outreach, Risk, Priority).
9. **Examine Explainable Priority**: Read the *"Why Act Today?"* cards showing rising severity (38 DPD), high exposure ($24,500), broken PTP, and phone responsiveness.
10. **Review Next Best Action**: Review the NBA prescription: Channel (*Phone Call*), Cadence (*Today + 2d*), Content (*PTP-focused*), and conversation guidance.
11. **Capture an Outcome**: Click **Record Outcome** to open the Result Capture drawer. Select **Connected**, choose **Promise to Pay**, input the amount and date, and click **Save outcome to Timeline**. Notice how the timeline immediately records the saved commitment.

---

## 12. Current Scope & Future Direction

### Current Scope
* Comprehensive client-facing frontend prototype built with React 19, TanStack Start & Router, and Tailwind CSS.
* Complete interactive navigation between branch management and customer operations.
* Realistic synthetic datasets representing branches, customers, delinquency buckets, and outreach channels.
* Dynamic global branch state management and responsive enterprise layout.

### Future Direction (Roadmap)
The following capabilities represent natural extensions for production deployment:
* **Core Banking & LMS Integrations**: Bi-directional data pipelines connecting to core lending systems (e.g., Flexcube, Finacle, Mambu) for real-time balance and payment synchronization.
* **Production Predictive Analytics**: Machine learning models for default probability, propensity-to-pay scoring, and optimal contact-timing prediction.
* **Omnichannel Telephony & Messaging Hooks**: Integration with contact center platforms (Twilio, Exotel, Genesys) for click-to-dial, automated SMS delivery, and WhatsApp journeys.
* **Enterprise Authentication & RBAC**: Role-based access control segregating views for Regional Executives, Branch Managers, Team Leads, and Collections Agents.
* **Audit & Compliance Governance**: Comprehensive logging of outreach attempts, regulatory contact hour adherence, and dispute management workflows.

---

## 13. Visual & Product Philosophy

> **"Collections management should not be about monitoring passive numbers. It should be about understanding what is happening, why it is happening, and what should happen next."**

RecoveryOps embodies this philosophy by replacing intuition and uncoordinated effort with explainable intelligence, proactive operational alignment, and respectful customer engagement.
