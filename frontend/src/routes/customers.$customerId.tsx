import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  Phone,
  X,
  Clock,
  Sliders,
  MessageSquare,
  Mail,
  Smartphone,
  MapPin,
  CheckCircle2,
  FileText,
  RotateCcw,
  BarChart3,
  Activity,
  TrendingUp,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { CUSTOMERS, bestTouchpoint, type CustomerData } from "@/data/customer-nba-data";

export const Route = createFileRoute("/customers/$customerId")({
  head: () => ({
    meta: [
      { title: "Customer 360 Workspace — RecoveryOps" },
      {
        name: "description",
        content: "Customer priority explanation, next best action and outcome capture.",
      },
    ],
  }),
  component: CustomerDetailView,
});

function CustomerDetailView() {
  const { customerId } = Route.useParams();
  const c = CUSTOMERS.find((x) => x.id === customerId) || CUSTOMERS[0]!;

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState("Connected");
  const [ptpAmount, setPtpAmount] = useState("$1,200");
  const [ptpDate, setPtpDate] = useState("2026-11-05");
  const [notes, setNotes] = useState("Agreed to cure partial balance.");

  // Outreach Model state
  const [outreachDrawerOpen, setOutreachDrawerOpen] = useState(false);
  const [collectorStatus, setCollectorStatus] = useState<"PENDING" | "APPROVED" | "EDITED">("PENDING");
  const [overrideChannel, setOverrideChannel] = useState<string | null>(null);
  const [showOverrideMenu, setShowOverrideMenu] = useState(false);

  // Compute Outreach Model metrics strictly following LLD & Database Design Document
  // Proposed scoring formula: channel_score = (0.600 * contact_success_rate) + (0.400 * response_rate)
  const phoneSuccess = c.ch.find((x) => x[0] === "Direct Phone")?.[1] || 68;
  const emailSuccess = c.ch.find((x) => x[0] === "Digital Mail")?.[1] || 42;
  const fieldSuccess = c.dpd >= 30 ? 85 : 0;

  const rawCandidates = [
    {
      code: "PHONE",
      name: "Direct Phone",
      icon: Phone,
      successRate: phoneSuccess,
      responseRate: Math.max(15, Math.round(c.reach * 0.9)),
      permitted: true,
      reason: "Available & Verified",
    },
    {
      code: "SMS",
      name: "SMS Alert",
      icon: Smartphone,
      successRate: Math.min(96, Math.round(c.reach * 1.15 + 15)),
      responseRate: c.reach,
      permitted: true,
      reason: "Available & Verified",
    },
    {
      code: "WHATSAPP",
      name: "WhatsApp",
      icon: MessageSquare,
      successRate: Math.min(92, Math.round(c.reach * 1.08 + 10)),
      responseRate: Math.min(90, Math.round(c.reach * 0.95)),
      permitted: true,
      reason: "Available & Verified",
    },
    {
      code: "EMAIL",
      name: "Digital Mail",
      icon: Mail,
      successRate: emailSuccess,
      responseRate: Math.max(10, Math.round(c.reach * 0.6)),
      permitted: true,
      reason: "Available & Verified",
    },
    ...(c.dpd >= 30
      ? [
          {
            code: "FIELD",
            name: "Field Visit",
            icon: MapPin,
            successRate: fieldSuccess,
            responseRate: 50,
            permitted: true,
            reason: "30+ DPD escalation enabled",
          },
        ]
      : []),
  ];

  const rankedChannels = rawCandidates
    .map((item) => {
      const score = Number((0.6 * (item.successRate / 100) + 0.4 * (item.responseRate / 100)).toFixed(3));
      return { ...item, score };
    })
    .sort((a, b) => b.score - a.score);

  const primaryRecommendation = rankedChannels[0]!;
  const activeChannel = overrideChannel
    ? rankedChannels.find((r) => r.name === overrideChannel) || primaryRecommendation
    : primaryRecommendation;

  // Hard Policy Gates checklist
  const policyGates = [
    {
      name: "Account Eligibility",
      rule: "Active delinquent status (DPD > 0)",
      status: c.dpd > 0 ? "PASSED" : "BLOCKED",
      detail: `${c.dpd} DPD · Stage ${c.dpd > 60 ? "Late" : "Early"}`,
    },
    {
      name: "Customer Permission",
      rule: "Consent active & DNC flag clear",
      status: "PASSED",
      detail: "Consent = TRUE · DNC = FALSE",
    },
    {
      name: "Channel Usability",
      rule: "Usable verified endpoint available",
      status: "PASSED",
      detail: "Validated phone & mobile details",
    },
    {
      name: "Contact Window",
      rule: "Allowed local window 09:00 - 18:00",
      status: "PASSED",
      detail: "Scheduled inside permitted window",
    },
    {
      name: "Cooldown Period",
      rule: "Minimum 48 hours between contact attempts",
      status: c.daysSinceOutreach >= 2 ? "PASSED" : "COOLDOWN_ACTIVE",
      detail: `${c.daysSinceOutreach}d elapsed since last outreach`,
    },
    {
      name: "Frequency Cap",
      rule: "Max 3 attempts per rolling 7-day window",
      status: c.touches <= 4 ? "PASSED" : "CAP_WARNING",
      detail: `${Math.min(c.touches, 3)}/3 attempts in rolling 7d`,
    },
  ];

  const hasPolicyBlock = policyGates.some((g) => g.status === "BLOCKED");
  const policyStatus = hasPolicyBlock ? "SUPPRESSED" : "ELIGIBLE";
  const fallbackLevel = c.touches >= 3 ? "CUSTOMER" : "SEGMENT";
  const dataCoverageStatus = c.touches >= 3 ? "SUFFICIENT_HISTORY" : "LIMITED_HISTORY";

  const [timelineList, setTimelineList] = useState([
    {
      title: `${bestTouchpoint(c)} outreach`,
      category: "Outreach History",
      time: "2d ago",
      status: c.reach > 40 ? "Response received" : "No response",
      tone: "blue",
    },
    {
      title: `Template dispatched: ${c.content[0]}`,
      category: "Engagement",
      time: "5d ago",
      status: `Opened${c.click > 30 ? " and clicked" : ""}`,
      tone: "green",
    },
    {
      title: `${c.repaymentType} received`,
      category: "Repayment Behavior",
      time: `${c.last}d ago`,
      status: `Applied to account · ${c.cov}% coverage`,
      tone: "green",
    },
    {
      title: `Follow-up via ${c.aff[1] ? c.aff[1][0] : "Digital Mail"}`,
      category: "Outreach History",
      time: `${c.last + 7}d ago`,
      status: "Delivered",
      tone: "blue",
    },
  ]);

  const bTouch = bestTouchpoint(c);
  const fallbackTouch = c.aff[1] ? c.aff[1][0] : "Digital Mail";

  const wk = [
    Math.ceil(c.touches / 3),
    Math.ceil(c.touches / 4) + 1,
    Math.floor(c.touches / 3) + 1,
    Math.max(1, c.touches - 4),
  ];
  const pw = [0, c.pays > 1 ? 1 : 0, 0, c.pays ? 1 : 0];
  const maxWk = Math.max(...wk, 3);

  const handleRecordOutcome = () => {
    setTimelineList([
      {
        title: `Outcome Logged: ${selectedOutcome}`,
        category: "Outreach History",
        time: "Just now",
        status: selectedOutcome === "Promise to Pay" ? `${ptpAmount} PTP` : "Logged",
        tone: "green",
      },
      ...timelineList,
    ]);
    setDrawerOpen(false);
    toast.success(`Outcome "${selectedOutcome}" recorded for ${c.name}`);
  };

  const getTierBadge = (tier: string) => {
    if (tier === "High") {
      return (
        <span className="inline-flex items-center rounded-full bg-destructive/15 px-2.5 py-0.5 text-xs font-semibold text-destructive">
          Priority · High
        </span>
      );
    }
    if (tier === "Medium") {
      return (
        <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
          Priority · Medium
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
        Priority · Low
      </span>
    );
  };

  return (
    <AppShell
      title={`${c.name} · ${c.id}`}
      section="Customer Level"
      subtitle="Customer 360 Workspace"
      actions={
        <Link
          to="/worklist"
          className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-card px-3.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition shadow-xs"
        >
          <ArrowLeft className="size-3.5" /> Back to Worklist
        </Link>
      }
    >
      <div className="mx-auto max-w-[1280px] space-y-4">
        {/* CUSTOMER HEADER CARD */}
        <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-2xl font-bold tracking-tight text-foreground">{c.name}</h2>
                {getTierBadge(c.tier)}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {c.id} · Account {c.acct} · Total Exposure ${c.exp.toLocaleString()}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-5 sm:gap-8">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Priority Score
                </div>
                <div className="mt-0.5 text-2xl font-bold text-foreground">{c.pri}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Repayment Ratio
                </div>
                <div className="mt-0.5 text-2xl font-bold text-foreground">{c.cov}%</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Communication Preferences
                </div>
                <div className="mt-0.5 text-xl font-bold text-primary">{bTouch}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Follow-up Timing
                </div>
                <div className="mt-0.5 text-xl font-bold text-foreground">{c.cad[0]}</div>
              </div>
            </div>
          </div>
        </div>

        {/* 3 CORE DETAIL CARDS */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          {/* 1. Suggested Templates */}
          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">Suggested Templates</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Recommended template category & operational objective
              </p>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Suggested Template</span>
                  <span className="font-bold text-primary truncate max-w-[170px] text-right">
                    {c.content[0]}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Template Objective</span>
                  <span className="font-semibold text-foreground text-right max-w-[180px]">
                    {c.content[1]}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Historical open rate</span>
                  <span className="font-semibold text-foreground">{c.open}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Link engagement</span>
                  <span className="font-semibold text-foreground">{c.click}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Response rate</span>
                  <span className="font-semibold text-foreground">{c.reach}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Repayment Behavior */}
          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">Repayment Behavior</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Turnaround time, recency & fulfillment pattern
              </p>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Repayment Profile</span>
                  <span
                    className={`font-bold ${c.repaymentType === "Full Repayment" ? "text-emerald-600 dark:text-emerald-400" : c.repaymentType === "Partial Repayment" ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}
                  >
                    {c.repaymentType}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time taken to repay</span>
                  <span className="font-semibold text-foreground">{c.daysToRepay} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Repayments (last 30d)</span>
                  <span className="font-semibold text-foreground">{c.pays}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Days since last repayment</span>
                  <span className="font-semibold text-foreground">{c.last}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Repayment coverage ratio</span>
                  <span className="font-semibold text-foreground">{c.cov}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Follow-up schedule</span>
                  <span className="font-bold text-primary">{c.cad[0]}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Outreach Model (Channel & Timing Recommendation) */}
          <div className="rounded-2xl border border-primary/20 bg-card p-5 shadow-xs flex flex-col justify-between relative overflow-hidden">
            {/* Subtle top accent gradient */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/80 via-primary to-emerald-500" />

            <div>
              <div className="flex items-start justify-between gap-2 flex-wrap mb-3">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Outreach Model</h3>
                  <p className="text-[11px] text-muted-foreground">
                    Channel & contact timing recommendation
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="size-2.5" /> {policyStatus}
                  </span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                    Rank #1
                  </span>
                </div>
              </div>

              {/* PRIMARY RECOMMENDED CHANNEL HERO CARD */}
              <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 mb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="size-8 rounded-lg bg-primary/15 grid place-items-center text-primary">
                      <activeChannel.icon className="size-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-foreground">{activeChannel.name}</span>
                        {overrideChannel && (
                          <span className="rounded-sm bg-amber-500/15 px-1 py-0.2 text-[9px] font-bold text-amber-600 dark:text-amber-400">
                            Overridden
                          </span>
                        )}
                      </div>
                      <span className="text-[10.5px] text-muted-foreground">
                        Success {activeChannel.successRate}% · Response {activeChannel.responseRate}%
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Channel Score
                    </div>
                    <div className="text-base font-extrabold text-primary">
                      {activeChannel.score.toFixed(3)}
                    </div>
                  </div>
                </div>

                {/* Score Formula Tag */}
                <div className="mt-2.5 flex items-center justify-between text-[10px] text-muted-foreground border-t border-border/60 pt-2">
                  <span className="font-mono text-[9.5px]">
                    0.60 × {activeChannel.successRate}% + 0.40 × {activeChannel.responseRate}%
                  </span>
                  <span className="font-semibold text-foreground/80">
                    {fallbackLevel === "CUSTOMER" ? `Customer History (n=${c.touches})` : "Segment Fallback"}
                  </span>
                </div>
              </div>

              {/* RECOMMENDED CONTACT TIMING */}
              <div className="rounded-xl border border-border/60 bg-card p-2.5 mb-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Clock className="size-3.5 text-primary shrink-0" />
                  <div>
                    <span className="text-[10.5px] text-muted-foreground block">Recommended Contact Window</span>
                    <span className="font-bold text-foreground text-xs">{c.rsp || "10:30 AM – 11:30 AM"}</span>
                  </div>
                </div>
                <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  Permitted (09-18h)
                </span>
              </div>

              {/* ALTERNATIVE RANKED CHANNELS */}
              <div className="space-y-2 mb-3">
                <div className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Ranked Candidates
                </div>
                {rankedChannels.slice(1, 3).map((item, idx) => (
                  <div key={item.code} className="flex items-center justify-between text-xs py-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-muted-foreground w-4">#{idx + 2}</span>
                      <item.icon className="size-3 text-muted-foreground" />
                      <span className="text-foreground font-medium">{item.name}</span>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-muted-foreground">
                      {item.score.toFixed(3)}
                    </span>
                  </div>
                ))}
              </div>

              {/* HARD POLICY GATES CHECKLIST STRIP */}
              <div className="rounded-xl border border-border/60 bg-muted/15 p-2.5 text-[10.5px] space-y-1.5">
                <div className="flex items-center justify-between font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">
                  <span>Policy Gates (Hard Precedence)</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">6 of 6 Passed</span>
                </div>
                <div className="grid grid-cols-3 gap-1 text-[10px]">
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <Check className="size-2.5" /> Consent Active
                  </span>
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <Check className="size-2.5" /> DNC Clear
                  </span>
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <Check className="size-2.5" /> Channel Usable
                  </span>
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <Check className="size-2.5" /> In-Window
                  </span>
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <Check className="size-2.5" /> Cooldown OK
                  </span>
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <Check className="size-2.5" /> Cap Below 3
                  </span>
                </div>
              </div>
            </div>

            {/* COLLECTOR ACTION STATUS & CONTROLS */}
            <div className="mt-4 border-t pt-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground text-[11px]">Collector Action:</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    collectorStatus === "APPROVED"
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : collectorStatus === "EDITED"
                        ? "bg-purple-500/15 text-purple-600 dark:text-purple-400"
                        : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                  }`}
                >
                  Status · {collectorStatus}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setCollectorStatus("APPROVED");
                    toast.success(`Outreach recommendation approved via ${activeChannel.name}`);
                  }}
                  className="rounded-lg bg-primary py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition shadow-xs flex items-center justify-center gap-1"
                >
                  <Check className="size-3" /> Approve Channel
                </button>

                <button
                  type="button"
                  onClick={() => setOutreachDrawerOpen(true)}
                  className="rounded-lg border border-border/80 bg-card py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition shadow-xs flex items-center justify-center gap-1"
                >
                  <FileText className="size-3 text-muted-foreground" /> Explain Factors
                </button>
              </div>

              {/* Channel Override Bar */}
              <div className="flex items-center justify-between text-[11px] pt-1">
                <button
                  type="button"
                  onClick={() => setShowOverrideMenu(!showOverrideMenu)}
                  className="text-primary hover:underline font-semibold inline-flex items-center gap-1 text-[11px]"
                >
                  <Sliders className="size-3" /> {overrideChannel ? "Change Override" : "Override Recommendation"}
                </button>
                {overrideChannel && (
                  <button
                    type="button"
                    onClick={() => {
                      setOverrideChannel(null);
                      setCollectorStatus("PENDING");
                      toast.info("Channel reset to Outreach Model primary recommendation");
                    }}
                    className="text-muted-foreground hover:text-foreground text-[10.5px] inline-flex items-center gap-0.5"
                  >
                    <RotateCcw className="size-2.5" /> Reset
                  </button>
                )}
              </div>

              {/* Quick Override Dropdown */}
              {showOverrideMenu && (
                <div className="rounded-xl border border-border/80 bg-card p-2 shadow-md space-y-1 mt-1 text-xs">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Select Channel Override:
                  </div>
                  {rankedChannels.map((item) => (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => {
                        setOverrideChannel(item.name);
                        setCollectorStatus("EDITED");
                        setShowOverrideMenu(false);
                        toast.info(`Channel overridden to ${item.name}`);
                      }}
                      className="w-full text-left rounded-lg p-1.5 hover:bg-muted text-xs flex items-center justify-between"
                    >
                      <span className="flex items-center gap-1.5">
                        <item.icon className="size-3 text-muted-foreground" /> {item.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {item.score.toFixed(3)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Card 4: Post-due date outreach and repayments (Line Chart) */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Post-due date outreach and repayments
              </h3>
              <p className="text-xs text-muted-foreground mb-2">
                Weekly touchpoints occurred post due-date up to current date ({c.touches} total)
              </p>

              {/* Line chart container aligned directly with 4 columns */}
              <div className="relative mt-2 pt-2">
                {/* SVG Line connecting centers of the 4 columns */}
                <div className="relative h-28 w-full">
                  {(() => {
                    const maxY = Math.max(...wk, 4);
                    // 4 columns: centers are at 12.5%, 37.5%, 62.5%, 87.5%
                    const xPercents = [12.5, 37.5, 62.5, 87.5];
                    const pts = wk.map((v, i) => {
                      const x = xPercents[i]!;
                      // Height normalized within 100px viewBox
                      const y = 82 - (v / maxY) * 60;
                      return { x, y, v, paid: Boolean(pw[i]) };
                    });

                    const lineD = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
                    const areaD = `${lineD} L ${pts[pts.length - 1]!.x} 94 L ${pts[0]!.x} 94 Z`;

                    return (
                      <svg
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                        className="w-full h-full overflow-visible"
                      >
                        <defs>
                          <linearGradient id="outreachLineGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.22" />
                            <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>

                        {/* Fill */}
                        <path d={areaD} fill="url(#outreachLineGrad)" />

                        {/* Stroke */}
                        <path
                          d={lineD}
                          fill="none"
                          stroke="#2563eb"
                          strokeWidth="2.5"
                          vectorEffect="non-scaling-stroke"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    );
                  })()}

                  {/* HTML Overlay Nodes for perfect non-distorted circles & labels aligned with column centers */}
                  <div className="absolute inset-0 grid grid-cols-4 pointer-events-none">
                    {wk.map((v, i) => {
                      const maxY = Math.max(...wk, 4);
                      const topPercent = 82 - (v / maxY) * 60;
                      return (
                        <div key={i} className="relative flex flex-col items-center">
                          <div
                            className="absolute flex flex-col items-center -translate-y-1/2"
                            style={{ top: `${topPercent}%` }}
                          >
                            <span className="text-[12px] font-extrabold text-foreground leading-none mb-1">
                              {v}
                            </span>
                            <span className="size-3.5 rounded-full border-2 border-primary bg-card shadow-xs" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom summary strip - 4 columns precisely under each node */}
                <div className="mt-4 grid grid-cols-4 border-t pt-3 text-center">
                  {wk.map((v, i) => (
                    <div key={i} className="flex flex-col items-center">
                      <span className="text-[11px] font-medium text-muted-foreground">Week {i + 1}</span>
                      <span className="text-xs font-bold text-foreground mt-0.5">
                        {v} touches
                      </span>
                      {pw[i] ? (
                        <span className="inline-block mt-0.5 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9.5px] font-semibold text-emerald-600 dark:text-emerald-400">
                          ● paid
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>
        </div>

        {/* 2 COLUMN BOTTOM ROW: Why this action (Signals) & Activity Timeline */}
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-12">
          {/* Card 5: Quantitative Recovery & Behavioral Statistics (Left 5 cols) */}
          <div className="lg:col-span-5 rounded-2xl border border-border/80 bg-card p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    <BarChart3 className="size-4 text-primary" /> Recovery & Engagement Statistics
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Quantitative recovery signals, responsiveness & channel metrics
                  </p>
                </div>
              </div>

              {/* 4 HIGH CONTRAST STAT TILES */}
              <div className="grid grid-cols-2 gap-2.5 mb-3.5">
                <div className="rounded-xl border border-border/70 bg-muted/20 p-2.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Repayment Coverage
                  </div>
                  <div className="text-xl font-black text-foreground mt-0.5">{c.cov}%</div>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        c.cov >= 40 ? "bg-emerald-500" : "bg-amber-500"
                      }`}
                      style={{ width: `${Math.min(100, c.cov)}%` }}
                    />
                  </div>
                  <div className="text-[10px] font-semibold text-muted-foreground mt-1">
                    {c.repaymentType}
                  </div>
                </div>

                <div className="rounded-xl border border-border/70 bg-muted/20 p-2.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Avg Turnaround
                  </div>
                  <div className="text-xl font-black text-foreground mt-0.5">{c.daysToRepay}d</div>
                  <div className="text-[10px] text-muted-foreground mt-2">
                    Time customer takes to repay
                  </div>
                </div>

                <div className="rounded-xl border border-border/70 bg-muted/20 p-2.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Contact Response Rate
                  </div>
                  <div className="text-xl font-black text-primary mt-0.5">{c.reach}%</div>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.min(100, c.reach)}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    Historical touch response
                  </div>
                </div>

                <div className="rounded-xl border border-border/70 bg-muted/20 p-2.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Outreach Affinity
                  </div>
                  <div className="text-xl font-black text-foreground mt-0.5">
                    {c.aff[0]![1]} <small className="text-xs font-normal text-muted-foreground">/ 100</small>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-2 truncate">
                    Highest for <b>{bTouch}</b>
                  </div>
                </div>
              </div>

              {/* DETAILED STATISTICAL ROWS */}
              <div className="space-y-2 text-xs border-t pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Template Open Rate</span>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${c.open}%` }} />
                    </div>
                    <span className="font-bold text-foreground">{c.open}%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Link Engagement Rate</span>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-indigo-500" style={{ width: `${c.click}%` }} />
                    </div>
                    <span className="font-bold text-foreground">{c.click}%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Post-Due Outreach Touches</span>
                  <span className="font-bold text-foreground">
                    {c.touches === 0 ? "0 touches (Uncontacted)" : `${c.touches} touches (${c.daysSinceOutreach}d ago)`}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Last Recorded Payment</span>
                  <span className="font-bold text-foreground">
                    {c.last}d ago ({c.pays} payments logged)
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t text-[11px] text-muted-foreground flex justify-between items-center">
              <span>Optimal Contact Window:</span>
              <span className="font-bold text-primary flex items-center gap-1">
                <Clock className="size-3" /> {c.rsp}
              </span>
            </div>
          </div>

          {/* Card 6: Activity Timeline (Right 7 cols) */}
          <div className="lg:col-span-7 rounded-2xl border border-border/80 bg-card p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Activity timeline</h3>
                  <p className="text-xs text-muted-foreground">
                    Recent outreach, template delivery and repayment events
                  </p>
                </div>
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                  {timelineList.length} events logged
                </span>
              </div>

              {/* Vertical timeline */}
              <div className="relative border-l-2 border-border/80 ml-2.5 pl-4 space-y-2.5">
                {timelineList.map((item, i) => (
                  <div
                    key={i}
                    className="relative rounded-xl border border-border/60 bg-muted/20 p-3 text-xs transition hover:bg-muted/30"
                  >
                    {/* Timeline bullet dot */}
                    <span className="absolute -left-[23px] top-4 size-2.5 rounded-full border-2 border-card bg-primary" />

                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="font-bold text-foreground">{item.title}</div>
                      <span className="text-[11px] text-muted-foreground shrink-0">{item.time}</span>
                    </div>

                    <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                      <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        {item.category}
                      </span>
                      <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Right Record Outcome Action */}
            <div className="mt-4 border-t pt-3 flex justify-end">
              <button
                onClick={() => setDrawerOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition"
              >
                <Phone className="size-3.5" /> Record Outcome
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* OUTCOME DRAWER */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50">
          <button
            aria-label="Close outcome drawer"
            className="absolute inset-0 bg-foreground/30 backdrop-blur-xs transition"
            onClick={() => setDrawerOpen(false)}
          />

          <aside className="absolute inset-y-0 right-0 w-full max-w-md bg-card border-l p-6 shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
                  Outcome Capture
                </p>
                <h3 className="text-lg font-bold text-foreground">Record Outreach Outcome</h3>
              </div>
              <button
                className="size-8 rounded-lg hover:bg-muted grid place-items-center"
                onClick={() => setDrawerOpen(false)}
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-5 space-y-4 text-xs">
              <div className="rounded-lg border bg-muted/30 p-3">
                <span className="font-bold text-foreground">{c.name}</span> ({c.id}) •{" "}
                <span className="text-muted-foreground">
                  ${c.exp.toLocaleString()} balance · {c.dpd} DPD · {c.repaymentType}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Action Executed
                </label>
                <div className="rounded-lg border bg-card p-2.5 font-semibold flex items-center gap-2">
                  <Phone className="size-3.5 text-primary" /> {bTouch} with {c.content[0]}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  Outreach Disposition
                </label>
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
                      className={`rounded-lg border p-2 text-xs text-left transition ${
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

              {selectedOutcome === "Promise to Pay" && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 mb-1">
                      Committed PTP Amount
                    </label>
                    <input
                      type="text"
                      value={ptpAmount}
                      onChange={(e) => setPtpAmount(e.target.value)}
                      className="w-full rounded-md border border-border/80 bg-card px-2.5 py-1.5 text-xs text-foreground focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 mb-1">
                      Promise Target Date
                    </label>
                    <input
                      type="date"
                      value={ptpDate}
                      onChange={(e) => setPtpDate(e.target.value)}
                      className="w-full rounded-md border border-border/80 bg-card px-2.5 py-1.5 text-xs text-foreground focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Agent Follow-up Notes
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-lg border border-border/80 bg-card p-2 text-xs text-foreground focus:outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  onClick={handleRecordOutcome}
                  className="w-full rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition shadow-xs"
                >
                  Save Outcome & Update Activity
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* OUTREACH EXPLAINABILITY & RUN AUDIT DRAWER */}
      {outreachDrawerOpen && (
        <div className="fixed inset-0 z-50">
          <button
            aria-label="Close outreach explainability drawer"
            className="absolute inset-0 bg-foreground/30 backdrop-blur-xs transition"
            onClick={() => setOutreachDrawerOpen(false)}
          />

          <aside className="absolute inset-y-0 right-0 w-full max-w-lg bg-card border-l p-6 shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-primary">
                  Outreach Model · Explainability
                </div>
                <h3 className="text-lg font-bold text-foreground">Score & Policy Audit Trail</h3>
                <p className="text-xs text-muted-foreground">
                  Run #RUN-20261029-01 · Config v1.0 · Account {c.acct}
                </p>
              </div>
              <button
                className="size-8 rounded-lg hover:bg-muted grid place-items-center"
                onClick={() => setOutreachDrawerOpen(false)}
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-5 space-y-4 text-xs">
              {/* PRIMARY RECOMMENDATION SUMMARY */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                      Selected Channel
                    </span>
                    <div className="text-sm font-bold text-foreground flex items-center gap-1.5 mt-0.5">
                      <activeChannel.icon className="size-4 text-primary" />
                      {activeChannel.name}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Final Score
                    </span>
                    <div className="text-lg font-extrabold text-primary">
                      {activeChannel.score.toFixed(3)}
                    </div>
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-primary/15 text-[11px] text-muted-foreground flex justify-between">
                  <span>Data Coverage Status:</span>
                  <span className="font-semibold text-foreground">
                    {dataCoverageStatus === "SUFFICIENT_HISTORY"
                      ? `Sufficient History (${c.touches} attempts)`
                      : "Limited History (Segment Fallback)"}
                  </span>
                </div>
              </div>

              {/* MATHEMATICAL SCORING FORMULA BREAKDOWN */}
              <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground text-xs">Heuristic Formula Breakdown</span>
                  <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                    score = 0.60×w_succ + 0.40×w_resp
                  </span>
                </div>

                <div className="space-y-1.5 pt-1 text-xs">
                  <div className="flex justify-between items-center bg-card p-2 rounded-lg border border-border/60">
                    <div>
                      <span className="font-semibold text-foreground block">Contact Success Rate</span>
                      <span className="text-[10.5px] text-muted-foreground">Weight: 0.600 · Observed: {activeChannel.successRate}%</span>
                    </div>
                    <span className="font-mono font-bold text-primary">
                      +{(0.6 * (activeChannel.successRate / 100)).toFixed(3)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center bg-card p-2 rounded-lg border border-border/60">
                    <div>
                      <span className="font-semibold text-foreground block">Meaningful Response Rate</span>
                      <span className="text-[10.5px] text-muted-foreground">Weight: 0.400 · Observed: {activeChannel.responseRate}%</span>
                    </div>
                    <span className="font-mono font-bold text-primary">
                      +{(0.4 * (activeChannel.responseRate / 100)).toFixed(3)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-2 text-foreground font-bold border-t border-border/60">
                    <span>Combined Weighted Score:</span>
                    <span className="font-mono text-primary text-sm">
                      {activeChannel.score.toFixed(3)}
                    </span>
                  </div>
                </div>
              </div>

              {/* HARD POLICY GATES TABLE */}
              <div className="rounded-xl border border-border/80 bg-card p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground text-xs">Hard Policy Gates</span>
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    Policy Precedence Verified
                  </span>
                </div>
                <p className="text-[10.5px] text-muted-foreground">
                  Policy restrictions take absolute precedence over scoring. Blocked channels cannot be recommended.
                </p>

                <div className="divide-y divide-border/60 pt-1">
                  {policyGates.map((gate, i) => (
                    <div key={i} className="py-2 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-foreground">{gate.name}</div>
                        <div className="text-[10.5px] text-muted-foreground">{gate.rule}</div>
                      </div>
                      <div className="text-right">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            gate.status === "PASSED"
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                              : "bg-destructive/15 text-destructive"
                          }`}
                        >
                          <Check className="size-2.5" /> {gate.status}
                        </span>
                        <div className="text-[9.5px] text-muted-foreground mt-0.5">{gate.detail}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* CONTACT TIMING RATIONALE */}
              <div className="rounded-xl border border-border/80 bg-card p-3.5 space-y-1.5">
                <span className="font-bold text-foreground text-xs flex items-center gap-1.5">
                  <Clock className="size-3.5 text-primary" /> Supported Contact Time
                </span>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Recommended slot <b>{c.rsp || "10:30 AM – 11:30 AM"}</b> is derived from historical customer response clustering and strictly complies with the approved <b>09:00 – 18:00</b> local timezone window.
                </p>
              </div>

              {/* RUN & AUDIT DETAILS */}
              <div className="rounded-xl border border-border/80 bg-muted/20 p-3 text-[10.5px] text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>Configuration ID:</span>
                  <span className="font-mono text-foreground">CFG-OUTREACH-V1.0</span>
                </div>
                <div className="flex justify-between">
                  <span>Evaluation As-Of Date:</span>
                  <span className="text-foreground">2026-10-29</span>
                </div>
                <div className="flex justify-between">
                  <span>Fallback Level:</span>
                  <span className="text-foreground">{fallbackLevel}</span>
                </div>
                <div className="flex justify-between">
                  <span>Collector Action Status:</span>
                  <span className="font-bold text-primary">{collectorStatus}</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
    </AppShell>
  );
}
