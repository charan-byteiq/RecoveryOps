import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  Check,
  ChevronRight,
  Clock3,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  TrendingUp,
  WalletCards,
  X,
} from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip } from "recharts";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button, GlassCard, Status } from "@/components/ui";
import { useDate } from "@/hooks/date-context";
import { customers, getCustomersForDate, getCustomerDetailContext } from "@/data/mock-data";

export const Route = createFileRoute("/customers/$customerId")({
  head: () => ({
    meta: [
      { title: "Customer 360 Workspace — RecoveryOps" },
      { name: "description", content: "Customer priority explanation, next best action and outcome capture." },
      { property: "og:title", content: "Customer 360 Workspace — RecoveryOps" },
      { property: "og:description", content: "Customer priority explanation, next best action and outcome capture." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CustomerProfile,
});

interface TimelineItem {
  id: string;
  type: "ptp" | "phone" | "sms" | "payment" | "visit";
  title: string;
  note: string;
  timestamp: string;
  isGood?: boolean;
  isAlert?: boolean;
}

function CustomerProfile() {
  const { customerId } = Route.useParams();
  const { selectedDate, formattedDate } = useDate();

  // Find customer snapshot as of the selected global business date
  const customerList = getCustomersForDate(selectedDate);
  const customer = customerList.find((c) => c.id === customerId);

  // Fallback if not found
  if (!customer) {
    return (
      <AppShell title="Customer Not Found" section="Customer Level" subtitle="Collections profile">
        <div className="mx-auto max-w-[1280px] p-8 text-center">
          <p className="text-muted-foreground">Customer record not found.</p>
          <Link to="/worklist" className="mt-4 inline-block font-semibold text-primary underline">
            Return to Worklist
          </Link>
        </div>
      </AppShell>
    );
  }

  const detail = getCustomerDetailContext(customer.id, selectedDate);

  // Local state for interactive demo flows
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [humanApproved, setHumanApproved] = useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState("Promise to Pay");
  const [ptpAmountInput, setPtpAmountInput] = useState("$1,200");
  const [ptpDateInput, setPtpDateInput] = useState("2026-09-27");
  const [notesInput, setNotesInput] = useState("Customer confirmed salary credit and agreed to honor partial commitment.");

  // Timeline events initialized from date-filtered snapshot (future events hidden)
  const [timelineEvents, setTimelineEvents] = useState<TimelineItem[]>(detail.timeline);

  // Synchronize timeline with selected business date
  useEffect(() => {
    setTimelineEvents(detail.timeline);
  }, [selectedDate, customerId]);

  const handleSaveOutcome = () => {
    // Append to timeline associated with current working snapshot date
    const newEvent: TimelineItem = {
      id: `ev-${Date.now()}`,
      type: selectedOutcome === "Promise to Pay" ? "ptp" : "phone",
      title: `Outcome Logged: ${selectedOutcome}`,
      note:
        selectedOutcome === "Promise to Pay"
          ? `${ptpAmountInput} committed for ${ptpDateInput} · ${notesInput}`
          : notesInput,
      timestamp: `${formattedDate} · Just now (Frontline Agent)`,
      isGood: selectedOutcome === "Promise to Pay",
    };

    setTimelineEvents([newEvent, ...timelineEvents]);
    setDrawerOpen(false);
    toast.success("Outcome recorded successfully", {
      description: `Logged disposition "${selectedOutcome}" to customer activity timeline for ${formattedDate}.`,
    });
  };

  const isDeteriorating = detail.riskTrajectory.direction === "Deteriorating";

  return (
    <AppShell
      title={`${customer.name} · ${customer.id}`}
      section="Customer Level"
      subtitle="Collections 360 Workspace"
      actions={
        <div className="flex items-center gap-2">
          <Link
            to="/worklist"
            search={{ segment: undefined }}
            className="flex items-center gap-1.5 rounded-lg border bg-card/60 px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-card"
          >
            <ArrowLeft className="size-3.5" /> Back to Worklist
          </Link>
        </div>
      }
    >
      <div className="mx-auto max-w-[1280px] space-y-4">
        {/* 1. EXECUTIVE CUSTOMER HEADER */}
        <GlassCard className="p-5">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-bold text-display">{customer.name}</h2>
                <Status tone="danger">Priority · {customer.priority}</Status>
                <Status tone={customer.risk === "High" ? "danger" : "warn"}>Risk · {customer.risk}</Status>
                <Status tone={customer.contact === "High" ? "good" : "neutral"}>Contact · {customer.contact}</Status>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{customer.id}</span> • Account{" "}
                <span className="font-semibold text-foreground">{customer.account}</span> • {detail.product} •{" "}
                {customer.branch}
              </p>
            </div>

            {/* KPI Badges */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-xl border bg-card/60 px-4 py-2.5 text-center min-w-[90px]">
                <p className="text-[10px] font-bold uppercase tracking-[.1em] text-muted-foreground">Current DPD</p>
                <p className="text-xl font-bold text-destructive">{customer.dpd} DPD</p>
              </div>

              <div className="rounded-xl border bg-card/60 px-4 py-2.5 text-center min-w-[110px]">
                <p className="text-[10px] font-bold uppercase tracking-[.1em] text-muted-foreground">Outstanding</p>
                <p className="text-xl font-bold text-display">{customer.amount}</p>
              </div>

              <div className="rounded-xl border bg-card/60 px-4 py-2.5 text-center min-w-[100px]">
                <p className="text-[10px] font-bold uppercase tracking-[.1em] text-muted-foreground">PTP Status</p>
                <p
                  className={`text-base font-bold ${
                    customer.ptp === "Broken"
                      ? "text-destructive"
                      : customer.ptp === "Due today"
                      ? "text-warning-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {customer.ptp}
                </p>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={() => setDrawerOpen(true)}
                className="h-12 px-4 shadow-sm"
              >
                <Phone className="size-4" /> Record Outcome
              </Button>
            </div>
          </div>
        </GlassCard>

        {/* 2. FOUR-PILLAR CONTEXT CARDS */}
        {/* 2. THREE-PILLAR CONTEXT CARDS (Payment History, Outreach & Risk Trajectory perfectly aligned) */}
        <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
          {/* Pillar 1: Payment History */}
          <GlassCard className="p-4 flex flex-col justify-between h-full border-border/60">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-primary">
                  <WalletCards className="size-4" />
                  <h3 className="text-xs font-bold uppercase tracking-[.1em] text-foreground">1. Payment History</h3>
                </div>
                <span className="text-xs font-semibold text-foreground/80">{detail.paymentBehaviour.consistencyRatio}</span>
              </div>
              <div className="mt-3.5 space-y-2.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-300 font-medium">Consistency:</span>
                  <span className="font-semibold text-foreground">{detail.paymentBehaviour.consistencyRatio} ({detail.paymentBehaviour.consistencyPct}%)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-300 font-medium">Last payment:</span>
                  <span className="font-semibold text-foreground">{detail.paymentBehaviour.lastAmount} ({detail.paymentBehaviour.lastDate})</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-300 font-medium">Prob. of next bracket:</span>
                  <span className={`font-bold ${customer.dpd > 30 ? "text-destructive" : customer.dpd > 15 ? "text-warning-foreground" : "text-emerald-600 dark:text-emerald-400"}`}>
                    {detail.paymentBehaviour.probNextBracket}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-300 font-medium">Prob. of charge-off:</span>
                  <span className={`font-bold ${customer.dpd > 30 ? "text-destructive" : "text-warning-foreground"}`}>
                    {detail.paymentBehaviour.probChargeOff}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-300 font-medium">PTPs fulfilled:</span>
                  <span className="font-semibold text-foreground">
                    {detail.paymentBehaviour.ptpFulfilled} of {detail.paymentBehaviour.ptpMade} ({Math.round((detail.paymentBehaviour.ptpFulfilled / detail.paymentBehaviour.ptpMade) * 100)}%)
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-border/50 bg-muted/30 p-2.5 text-xs text-foreground/90 font-medium">
              <span className={`font-bold ${customer.risk === "High" ? "text-warning-foreground" : "text-emerald-600 dark:text-emerald-400"}`}>
                {customer.risk === "High" ? "Irregular" : "Verified"}
              </span> · {customer.risk === "High" ? "Cash flow volatility noted" : "Repayment history in good standing"}
            </div>
          </GlassCard>

          {/* Pillar 2: Outreach Analysis */}
          <GlassCard className="p-4 flex flex-col justify-between h-full border-border/60">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <Phone className="size-4" />
                  <h3 className="text-xs font-bold uppercase tracking-[.1em] text-foreground">2. Outreach Analysis</h3>
                </div>
                <Status tone="good">{detail.outreach.contactRate}% Reach</Status>
              </div>
              <div className="mt-3.5 space-y-2.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-300 font-medium">Total outreach:</span>
                  <span className="font-semibold text-foreground">{detail.outreach.totalAttempts} touches recorded</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-300 font-medium">Successful contacts:</span>
                  <span className="font-semibold text-foreground">{detail.outreach.successful} of {detail.outreach.totalAttempts} ({detail.outreach.contactRate}%)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-300 font-medium">Preferred channel:</span>
                  <span className="font-bold text-primary">{detail.outreach.preferredChannel}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-300 font-medium">Channel reachability:</span>
                  <span className="font-semibold text-foreground">{detail.outreach.phoneReach}% Voice · {detail.outreach.smsReach}% SMS</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-300 font-medium">Best response window:</span>
                  <span className="font-semibold text-foreground">{detail.outreach.bestWindow}</span>
                </div>
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-border/50 bg-muted/30 p-2.5 text-xs text-foreground/90 font-medium">
              <span className="font-bold text-primary">{customer.contact} reachability</span> · Window {detail.outreach.bestWindow}
            </div>
          </GlassCard>

          {/* Pillar 3: Risk Trajectory */}
          <GlassCard className="p-4 flex flex-col justify-between h-full border-border/60">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-destructive">
                  <ShieldAlert className="size-4" />
                  <h3 className="text-xs font-bold uppercase tracking-[.1em] text-foreground">3. Risk Trajectory</h3>
                </div>
                <Status tone={customer.dpd > 30 ? "danger" : customer.dpd > 15 ? "warn" : "good"}>
                  {customer.dpd > 30 ? "Deteriorating" : customer.dpd > 15 ? "Monitoring" : "Controlled"}
                </Status>
              </div>
              <div className="mt-3.5 space-y-2.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-300 font-medium">30-day progression:</span>
                  <span className={`font-bold ${customer.dpd > 30 ? "text-destructive" : customer.dpd > 15 ? "text-warning-foreground" : "text-emerald-600 dark:text-emerald-400"}`}>
                    {detail.riskTrajectory.dpdChange}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-300 font-medium">15-day velocity:</span>
                  <span className={`font-semibold ${customer.dpd > 30 ? "text-destructive" : customer.dpd > 15 ? "text-warning-foreground" : "text-emerald-600 dark:text-emerald-400"}`}>
                    {detail.riskTrajectory.dpd15Change ?? detail.riskTrajectory.dpdChange}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-300 font-medium">Exposure ratio:</span>
                  <span className="font-semibold text-foreground">{detail.riskTrajectory.exposureRatio}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-300 font-medium">Delinquency bucket:</span>
                  <span className="font-semibold text-foreground">
                    {customer.dpd <= 30 ? "1–30 DPD (Early stage)" : customer.dpd <= 60 ? "31–60 DPD (Mid stage)" : "60+ DPD (Late stage)"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-300 font-medium">Severity tier:</span>
                  <span className={`font-bold ${customer.risk === "High" ? "text-destructive" : customer.risk === "Medium" ? "text-warning-foreground" : "text-emerald-600 dark:text-emerald-400"}`}>
                    {detail.riskTrajectory.severityTier ?? (customer.risk === "High" ? "Elevated Default Risk" : customer.risk === "Medium" ? "Moderate Risk Exposure" : "Low Delinquency Tier")}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-border/50 bg-muted/30 p-2.5 text-xs text-foreground/90 font-medium">
              <span className={`font-bold ${customer.dpd > 30 ? "text-destructive" : customer.dpd > 15 ? "text-warning-foreground" : "text-emerald-600 dark:text-emerald-400"}`}>
                {customer.dpd > 30 ? "Late-stage hardening" : customer.dpd > 15 ? "Pre-30 day window" : "Early-stage window"}
              </span> · {customer.dpd > 30 ? "Immediate supervisor action required" : customer.dpd > 15 ? "Proactive reminder recommended" : "High self-cure probability"}
            </div>
          </GlassCard>
        </div>

        {/* 3. VISUAL ANALYSIS SECTION: DPD TREND + RESOLUTION INSIGHTS */}
        <div className="grid gap-4 lg:grid-cols-12">
          {/* DPD TREND LINE CHART */}
          <GlassCard className="p-5 lg:col-span-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-display">DPD Progression Trajectory</h3>
                  <p className="text-xs text-muted-foreground">Historical 30-day delinquency progression matching account records</p>
                </div>
                <div className={`flex items-center gap-1 text-xs font-bold ${
                  detail.riskTrajectory.direction === "Improving"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : detail.riskTrajectory.direction === "Deteriorating"
                    ? "text-destructive"
                    : "text-warning-foreground"
                }`}>
                  {detail.riskTrajectory.direction === "Improving" ? (
                    <TrendingDown className="size-4" />
                  ) : detail.riskTrajectory.direction === "Deteriorating" ? (
                    <TrendingUp className="size-4" />
                  ) : (
                    <Clock3 className="size-4" />
                  )}
                  <span>{detail.riskTrajectory.direction}</span>
                </div>
              </div>

              <div className="mt-4 h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={detail.dpdHistory} margin={{ top: 18, right: 30, left: -20, bottom: 0 }}>
                    <XAxis dataKey="period" tick={{ fontSize: 11, fill: "currentColor", opacity: 0.7 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, Math.max(10, customer.dpd + 8)]} tick={{ fontSize: 11, fill: "currentColor", opacity: 0.7 }} axisLine={false} tickLine={false} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: "var(--color-card, #fff)", borderColor: "var(--color-border, #ccc)", borderRadius: "8px", fontSize: "12px" }}
                      formatter={(val: any) => [`${val} DPD`, "Delinquency"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="dpd"
                      name="Days Past Due (DPD)"
                      stroke={
                        detail.riskTrajectory.direction === "Improving"
                          ? "#10b981"
                          : detail.riskTrajectory.direction === "Deteriorating"
                          ? "var(--color-destructive, #ef4444)"
                          : "var(--color-warning-foreground, #f59e0b)"
                      }
                      strokeWidth={3}
                      dot={{
                        r: 5,
                        fill:
                          detail.riskTrajectory.direction === "Improving"
                            ? "#10b981"
                            : detail.riskTrajectory.direction === "Deteriorating"
                            ? "var(--color-destructive, #ef4444)"
                            : "var(--color-warning-foreground, #f59e0b)",
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="mt-3 rounded-lg border border-border/50 bg-muted/20 p-2 text-center text-xs text-muted-foreground font-medium">
              {detail.riskTrajectory.direction === "Improving"
                ? `Account curing: DPD decreased from ${detail.dpdHistory[0]?.dpd} to ${customer.dpd} DPD (${detail.riskTrajectory.dpdChange}) · Positive repayment cadence`
                : customer.dpd <= 10
                ? `Account is in early-stage delinquency (${customer.dpd} DPD) · Frontline contact window active`
                : `DPD moved from ${detail.dpdHistory[0]?.dpd} to ${customer.dpd} DPD (${detail.riskTrajectory.dpdChange}) · Intervention window active`}
            </div>
          </GlassCard>

          {/* CUSTOMER RESOLUTION INSIGHTS */}
          <GlassCard className="p-5 flex flex-col justify-between border-primary/20 bg-primary/5 lg:col-span-6">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-primary">
                  <Sparkles className="size-4" />
                  <h3 className="font-bold text-display text-foreground">Customer Resolution Insights</h3>
                </div>
                <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-[11px] font-bold text-primary">
                  Actionable Intelligence
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Actionable justification, delinquency drivers & behavioral patterns</p>

              <ul className="mt-4 space-y-2.5 text-xs leading-relaxed">
                {detail.priorityJustification.map((reason, i) => (
                  <li key={i} className="flex items-start gap-2.5 rounded-lg border bg-card/60 p-3">
                    <span className="mt-0.5 size-2 rounded-full bg-primary shrink-0" />
                    <span className="font-medium text-foreground">{reason}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-xl border border-primary/20 bg-primary/10 p-3 text-xs">
              <span className="font-semibold text-primary">High operational urgency · Immediate recovery ROI</span>
              <span className="text-[11px] text-muted-foreground">Priority Score: High</span>
            </div>
          </GlassCard>
        </div>

        {/* 4. NEXT BEST ACTION (HERO COMPONENT) */}
        <GlassCard className="overflow-hidden border-primary/30 shadow-md">
          {/* NBA HEADER */}
          <div className="bg-gradient-to-r from-primary via-primary/95 to-primary/85 px-6 py-5 text-primary-foreground">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[.14em] opacity-90">
                    <Sparkles className="size-3.5" /> Next Best Action
                  </span>
                  <span className="rounded-full bg-primary-foreground/20 px-2.5 py-0.5 text-[10px] font-bold">
                    Prescribed
                  </span>
                </div>
                <div className="mt-2.5 flex items-center gap-3">
                  <div className="grid size-11 place-items-center rounded-xl bg-primary-foreground/20 shadow-xs">
                    <Phone className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-display">{detail.nba.action}</h3>
                    <p className="text-xs opacity-90">{detail.nba.timing}</p>
                  </div>
                </div>
              </div>

              {/* Action Trigger */}
              <div className="flex items-center gap-2.5">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setDrawerOpen(true)}
                  className="h-10 bg-primary-foreground text-primary hover:bg-primary-foreground/90 font-bold text-xs px-4 shadow-sm"
                >
                  <Phone className="size-4" /> Open Outcome Drawer
                </Button>
              </div>
            </div>
          </div>

          {/* NBA BODY - 3 BALANCED COLUMNS */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Column 1: Action Rationale & Risk Context */}
              <div className="flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[.1em] text-muted-foreground">
                    <Clock3 className="size-3.5 text-primary" />
                    <span>Action Rationale</span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed font-medium text-foreground">
                    {detail.nba.reason}
                  </p>
                </div>

                <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Delinquency Exposure:</span>
                    <span className="font-bold text-destructive">{customer.dpd} DPD ({customer.amount})</span>
                  </div>
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Target Outcome:</span>
                    <span className="font-semibold text-foreground">Immediate Settlement / PTP</span>
                  </div>
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Contact Channel:</span>
                    <span className="font-semibold text-primary">{detail.outreach.preferredChannel}</span>
                  </div>
                </div>
              </div>

              {/* Column 2: Suggested Talking Points & Script */}
              <div className="space-y-4">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[.1em] text-primary">
                  <Sparkles className="size-3.5" />
                  <span>Suggested Talking Points</span>
                </div>
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs leading-relaxed space-y-2">
                  <p className="font-semibold text-foreground">{detail.nba.approach}</p>
                  <ul className="mt-2 space-y-1.5 text-[11px] text-muted-foreground border-t border-primary/10 pt-2">
                    <li className="flex items-start gap-1.5">
                      <span className="text-primary font-bold">1.</span> Verify identity and confirm recent cash flow status.
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-primary font-bold">2.</span> Propose structured cure or partial payment plan today.
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-primary font-bold">3.</span> Re-confirm commitment date before closing contact.
                    </li>
                  </ul>
                </div>
              </div>

              {/* Column 3: Recommended Journey Sequence */}
              <div className="space-y-4">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[.1em] text-primary">
                  <Clock3 className="size-3.5" />
                  <span>Recommended Journey Sequence</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-border/60 bg-card/60 p-4 text-center text-xs">
                  <div className="flex flex-col items-center">
                    <span className="size-8 rounded-full bg-primary/10 text-primary grid place-items-center font-bold">
                      1
                    </span>
                    <span className="mt-1.5 text-xs font-semibold">Today · Phone</span>
                    <span className="text-[10px] text-muted-foreground">Direct contact</span>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground" />
                  <div className="flex flex-col items-center">
                    <span className="size-8 rounded-full bg-muted text-muted-foreground grid place-items-center font-bold">
                      2
                    </span>
                    <span className="mt-1.5 text-xs font-semibold">+2d · Priority SMS</span>
                    <span className="text-[10px] text-muted-foreground">Payment portal</span>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground" />
                  <div className="flex flex-col items-center">
                    <span className="size-8 rounded-full bg-muted text-muted-foreground grid place-items-center font-bold">
                      3
                    </span>
                    <span className="mt-1.5 text-xs font-semibold">Escalate · Field</span>
                    <span className="text-[10px] text-muted-foreground">Supervisor review</span>
                  </div>
                </div>
              </div>
            </div>

            {/* GOVERNANCE & ACTION CONTROLS */}
            <div className="mt-6 border-t pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-bold rounded-full px-3 py-1 border transition-colors shadow-xs ${
                    humanApproved
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                      : "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30"
                  }`}
                >
                  <span className={`size-2 rounded-full ${humanApproved ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`} />
                  {humanApproved ? "Approved ✓" : "Review Required ?"}
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <Button
                  variant={humanApproved ? "secondary" : "primary"}
                  size="sm"
                  onClick={() => {
                    setHumanApproved(true);
                    toast.success("Action Approved", {
                      description: `Approved ${detail.nba.action} for ${customer.name}.`,
                    });
                  }}
                  className="text-xs font-bold px-4 h-9 shadow-xs"
                >
                  <Check className="size-3.5" />
                  {humanApproved ? "Approved" : "Approve Action"}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setHumanApproved(false);
                    toast.info("Channel Modified", {
                      description: "Alternative contact channel flagged for follow-up.",
                    });
                  }}
                  className="text-xs font-semibold px-4 h-9"
                >
                  Change Channel
                </Button>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* 5. SLIDE-OUT OUTCOME CAPTURE DRAWER */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <button
            aria-label="Close outcome drawer"
            className="absolute inset-0 bg-foreground/30 backdrop-blur-xs transition"
            onClick={() => setDrawerOpen(false)}
          />

          {/* Drawer Panel */}
          <aside className="glass-strong absolute inset-y-0 right-0 w-full max-w-md overflow-y-auto border-l p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.1em] text-primary">Outcome Capture</p>
                <h3 className="text-xl font-bold text-display">Record Call Outcome</h3>
              </div>
              <Button variant="ghost" className="size-8 p-0" onClick={() => setDrawerOpen(false)}>
                <X className="size-5" />
              </Button>
            </div>

            <div className="mt-5 space-y-4">
              {/* Customer context pill */}
              <div className="rounded-lg border bg-muted/40 p-3 text-xs">
                <span className="font-bold text-foreground">{customer.name}</span> ({customer.id}) •{" "}
                <span className="text-muted-foreground">{customer.amount} balance · {customer.dpd} DPD</span>
              </div>

              {/* Action Taken */}
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">Action Executed</label>
                <div className="rounded-lg border bg-card p-2.5 text-xs font-semibold flex items-center gap-2">
                  <Phone className="size-3.5 text-primary" /> Phone Call to Customer
                </div>
              </div>

              {/* Disposition Selection */}
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1.5">Call Disposition</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    "Connected",
                    "Promise to Pay",
                    "No Answer",
                    "Busy",
                    "Financial Hardship",
                    "Dispute Raised",
                    "Wrong Number",
                    "Refusal",
                  ].map((disp) => (
                    <button
                      key={disp}
                      type="button"
                      onClick={() => setSelectedOutcome(disp)}
                      className={`rounded-lg border p-2 text-xs font-medium text-left transition ${
                        selectedOutcome === disp
                          ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                          : "bg-card hover:bg-muted text-foreground"
                      }`}
                    >
                      {disp}
                    </button>
                  ))}
                </div>
              </div>

              {/* Promise-to-Pay Specific Fields */}
              {selectedOutcome === "Promise to Pay" && (
                <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-3.5">
                  <p className="text-xs font-bold text-primary flex items-center gap-1.5">
                    <Check className="size-3.5" /> PTP Commitment Details
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                        Promised Amount
                      </label>
                      <input
                        type="text"
                        value={ptpAmountInput}
                        onChange={(e) => setPtpAmountInput(e.target.value)}
                        className="h-9 w-full rounded-md border bg-card px-2.5 text-xs font-semibold outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                        Promised Date
                      </label>
                      <input
                        type="date"
                        value={ptpDateInput}
                        onChange={(e) => setPtpDateInput(e.target.value)}
                        className="h-9 w-full rounded-md border bg-card px-2.5 text-xs font-semibold outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Agent Notes */}
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">Collector Notes</label>
                <textarea
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border bg-card p-2.5 text-xs outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Record summary of customer commitment or reason for delay..."
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 space-y-2">
                <Button className="w-full h-10 font-bold" onClick={handleSaveOutcome}>
                  <Check className="size-4" /> Save Outcome to Timeline
                </Button>
                <Button variant="secondary" className="w-full text-xs" onClick={() => setDrawerOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </AppShell>
  );
}
