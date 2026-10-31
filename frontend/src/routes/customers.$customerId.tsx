import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
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
  TrendingDown,
  ShieldCheck,
  Sparkles,
  AlertTriangle,
  Copy,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Calendar,
  AlertCircle,
  ClipboardCheck,
  DollarSign,
  Wallet,
  Save,
  Edit3,
  PlusCircle,
  UserCheck,
  BadgeCheck,
  User,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AnimatedKpi } from "@/components/ui/animated-kpi";
import { CUSTOMERS, bestTouchpoint, type CustomerData } from "@/data/customer-nba-data";
import { getCustomerDetailContext } from "@/data/mock-data";

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
  const [collectorStatus, setCollectorStatus] = useState<"PENDING" | "APPROVED" | "EDITED" | "REJECTED">("PENDING");
  const [overrideChannel, setOverrideChannel] = useState<string | null>(null);
  const [showOverrideMenu, setShowOverrideMenu] = useState(false);

  // NBA Modal states
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("Customer Requested Hardship Pause");
  const [rejectionNotes, setRejectionNotes] = useState("");
  const [changeChannelModalOpen, setChangeChannelModalOpen] = useState(false);
  const [selectedChannelChoice, setSelectedChannelChoice] = useState<string>("Phone calls");
  const [selectedTimingWindow, setSelectedTimingWindow] = useState<string>(c.rsp || "10:00 AM – 12:30 PM");


  // Operational Review Drawer selection states
  const [drawerSelectedChannel, setDrawerSelectedChannel] = useState<string>(c.ch[0]?.[0] || "Phone calls");
  const [drawerSelectedTime, setDrawerSelectedTime] = useState<string>(c.rsp || "10:00 AM – 12:30 PM");
  const [drawerObjective, setDrawerObjective] = useState<string>("Immediate Partial Cure");

  // Compute Outreach metrics strictly following LLD & Database Design Document
  // Proposed scoring formula: channel_score = (0.600 * contact_success_rate) + (0.400 * response_rate)
  const phoneSuccess = c.ch.find((x) => x[0] === "Phone calls" || x[0] === "Direct Phone")?.[1] || 68;
  const emailSuccess = c.ch.find((x) => x[0] === "Mails" || x[0] === "Digital Mail")?.[1] || 42;
  const fieldSuccess = c.ch.find((x) => x[0] === "Field Visit")?.[1] || (c.dpd >= 30 ? 85 : 0);

  const rawCandidates = [
    {
      code: "PHONE" as const,
      name: "Phone calls",
      label: "Phone Call",
      actionTitle: "Call Customer",
      icon: Phone,
      successRate: phoneSuccess,
      responseRate: Math.max(15, Math.round(c.reach * 0.9)),
      permitted: true,
      reason: "Available & Verified",
    },
    {
      code: "EMAIL" as const,
      name: "Mails",
      label: "Email",
      actionTitle: "Send Email",
      icon: Mail,
      successRate: emailSuccess,
      responseRate: Math.max(10, Math.round(c.reach * 0.6)),
      permitted: true,
      reason: "Available & Verified",
    },
    {
      code: "FIELD" as const,
      name: "Field Visit",
      label: "Field Visit",
      actionTitle: "Field Visit",
      icon: MapPin,
      successRate: fieldSuccess,
      responseRate: Math.max(25, Math.round(c.reach * 0.95)),
      permitted: c.dpd >= 30,
      reason: c.dpd >= 30 ? "High Priority Field Escalation" : "Requires 30+ DPD escalation policy",
    },
  ];

  const rankedChannels = rawCandidates
    .map((item) => {
      const baseScore = 0.6 * (item.successRate / 100) + 0.4 * (item.responseRate / 100);
      const score = Number((item.permitted ? baseScore : baseScore * 0.5).toFixed(3));
      return { ...item, score };
    })
    .sort((a, b) => b.score - a.score);

  const primaryRecommendation = rankedChannels[0]!;
  const activeChannel = overrideChannel
    ? rankedChannels.find((r) => r.name === overrideChannel || r.label === overrideChannel || r.code === overrideChannel) || primaryRecommendation
    : primaryRecommendation;

  const channelDisplayLabel =
    activeChannel.code === "PHONE"
      ? "Phone Call"
      : activeChannel.code === "EMAIL"
        ? "Email"
        : "Field Visit";

  const actionHeadline =
    activeChannel.code === "PHONE"
      ? "Call Customer"
      : activeChannel.code === "EMAIL"
        ? "Send Email"
        : "Field Visit";

  const totalAssignedTasks = c.touches + 3;
  const respondedTasksCount = c.touches;
  const pendingTasksCount = 3;
  const responseCompletionRate = Math.round((respondedTasksCount / totalAssignedTasks) * 100);

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
  const paymentSuccessRate =
    c.pays > 0
      ? Math.min(100, Math.round(c.cov * 0.7 + c.pays * 10))
      : Math.min(30, Math.round(c.cov * 0.4));
  const riskBucket =
    c.dpd >= 90
      ? "Bucket 4 (90+ DPD)"
      : c.dpd >= 31
        ? "Bucket 3 (30–60 DPD)"
        : c.dpd >= 1
          ? "Bucket 2 (1–30 DPD)"
          : "Bucket 1 (Current)";

  const recoveredAmount = Math.round((c.exp * c.cov) / 100);

  const dpdStatusLabel =
    c.dpd === 0
      ? "Good Standing"
      : c.dpd <= 30
        ? "Early Delinquency"
        : c.dpd <= 60
          ? "Mid-Stage Delinquency"
          : "Late-Stage Default";

  const dpdStageLabel =
    c.dpd === 0
      ? "Current (0 DPD)"
      : c.dpd <= 30
        ? "1–30 DPD Bracket"
        : c.dpd <= 60
          ? "30–60 DPD Bracket"
          : "90+ DPD Charge-off Risk";

  const detailContext = getCustomerDetailContext(c.id);
  const trajectory = detailContext?.riskTrajectory;
  const hasHistoricalDpd = Boolean(trajectory && typeof trajectory.delta30Dpd === "number");
  const delta30Dpd = trajectory?.delta30Dpd ?? 0;
  const d30Dpd = trajectory?.d30Dpd ?? c.dpd;

  const trendBadgeLabel = !hasHistoricalDpd
    ? "Unavailable"
    : delta30Dpd < 0
      ? "Improving"
      : delta30Dpd > 0
        ? "Deteriorating"
        : "Stable";

  const trendDisplayValue = !hasHistoricalDpd
    ? "Unavailable"
    : delta30Dpd < 0
      ? `-${Math.abs(delta30Dpd)} DPD`
      : delta30Dpd > 0
        ? `+${delta30Dpd} DPD`
        : "0 DPD";

  const trendSubtext = !hasHistoricalDpd
    ? "Historical baseline snapshot unavailable"
    : delta30Dpd === 0
      ? `Stable at ${c.dpd} DPD compared to 30d baseline`
      : `${d30Dpd} DPD (30d prior) → ${c.dpd} DPD current`;

  const [animateLiveBars, setAnimateLiveBars] = useState<boolean>(false);
  useEffect(() => {
    setAnimateLiveBars(false);
    const t = setTimeout(() => setAnimateLiveBars(true), 60);
    return () => clearTimeout(t);
  }, [c.id, c.cov, paymentSuccessRate, activeChannel.successRate]);

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
      category: "Suggested Message",
      time: "5d ago",
      status: `Opened${c.click > 30 ? " and clicked" : ""}`,
      tone: "green",
    },
    {
      title: `${c.repaymentType} received`,
      category: "Payment History",
      time: `${c.last}d ago`,
      status: `Applied to account · ${c.cov}% coverage`,
      tone: "green",
    },
    {
      title: `Follow-up via ${c.aff[1] ? c.aff[1][0] : "Mails"}`,
      category: "Outreach History",
      time: `${c.last + 7}d ago`,
      status: "Delivered",
      tone: "blue",
    },
  ]);

  // Action Taken & Frontline Feedback State
  const [actionTaken, setActionTaken] = useState<"YES" | "NO" | null>(null);
  const [activeTimelineStep, setActiveTimelineStep] = useState<number>(0);
  const [feedbackChannel, setFeedbackChannel] = useState<"FIELD" | "PHONE" | "MAIL">(() => {
    if (activeChannel.code === "FIELD") return "FIELD";
    if (activeChannel.code === "PHONE") return "PHONE";
    return "MAIL";
  });

  // Channel-specific response & demeanor states
  const [fieldPresence, setFieldPresence] = useState<string>("Customer Met in Person");
  const [fieldReaction, setFieldReaction] = useState<string>("Cooperative & Willing to Settle");
  const [fieldCommitment, setFieldCommitment] = useState<string>("Immediate Partial Payment Today");

  const [phoneDisposition, setPhoneDisposition] = useState<string>("Connected — Spoke with Customer");
  const [phoneReaction, setPhoneReaction] = useState<string>("Calm & Acknowledged Liability");
  const [phoneNextStep, setPhoneNextStep] = useState<string>("PTP Registered on Call");

  const [mailStatus, setMailStatus] = useState<string>("Delivered & Link Clicked / Viewed");
  const [mailReaction, setMailReaction] = useState<string>("Online Self-Service Pay Initiated");
  const [mailNextStep, setMailNextStep] = useState<string>("Send Urgent Automated Reminder SMS");

  // Financial inputs & balance calculation
  const [amountPaidInput, setAmountPaidInput] = useState<number>(0);
  const [ptpAgreed, setPtpAgreed] = useState<boolean>(true);
  const [ptpAmountInput, setPtpAmountInput] = useState<number>(() => Math.min(1200, c.exp));
  const [ptpDateInput, setPtpDateInput] = useState<string>("2026-11-05");
  const [ptpPaymentMode, setPtpPaymentMode] = useState<string>("UPI / Instant Transfer");
  const [feedbackNotes, setFeedbackNotes] = useState<string>("");
  const [notesOpen, setNotesOpen] = useState<boolean>(true);
  const [responseSectionOpen, setResponseSectionOpen] = useState<boolean>(true);

  // Action Taken: NO states
  const [notTakenReason, setNotTakenReason] = useState<string>("Customer Travel / Out of Station");
  const [rescheduleDate, setRescheduleDate] = useState<string>("2026-11-02");
  const [notTakenNotes, setNotTakenNotes] = useState<string>("");
  const [noActionModalOpen, setNoActionModalOpen] = useState<boolean>(false);

  interface StoredFeedbackRecord {
    id: string;
    actionTaken: "YES" | "NO";
    channelName: string;
    channelCode: "FIELD" | "PHONE" | "MAIL";
    presenceOrDisposition: string;
    reaction: string;
    commitmentOrNextStep: string;
    amountPaid: number;
    totalAmount: number;
    remainingBalance: number;
    currentDpd: number;
    projectedDpdStatus: string;
    ptpAgreed: boolean;
    ptpAmount?: number;
    ptpDate?: string;
    ptpMode?: string;
    notes: string;
    timestamp: string;
    notTakenReason?: string;
    rescheduleDate?: string;
  }

  const [storedFeedback, setStoredFeedback] = useState<StoredFeedbackRecord | null>(null);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<boolean>(false);

  const handleStoreFeedback = () => {
    const paid = Number(amountPaidInput) || 0;
    const remaining = Math.max(0, c.exp - paid);
    const projectedDpd =
      paid >= c.exp
        ? "0 DPD (Fully Cured ✓)"
        : paid > 0
          ? `${c.dpd} DPD (Partially Serviced)`
          : `${c.dpd} DPD (Overdue)`;

    const channelName =
      feedbackChannel === "FIELD"
        ? "Field Visit"
        : feedbackChannel === "PHONE"
          ? "Phone Call"
          : "Mails & Digital";

    const presenceOrDisp =
      feedbackChannel === "FIELD"
        ? fieldPresence
        : feedbackChannel === "PHONE"
          ? phoneDisposition
          : mailStatus;

    const reactionText =
      feedbackChannel === "FIELD"
        ? fieldReaction
        : feedbackChannel === "PHONE"
          ? phoneReaction
          : mailReaction;

    const commitmentOrStep =
      feedbackChannel === "FIELD"
        ? fieldCommitment
        : feedbackChannel === "PHONE"
          ? phoneNextStep
          : mailNextStep;

    const newRecord: StoredFeedbackRecord = {
      id: `fb-${Date.now()}`,
      actionTaken: "YES",
      channelName,
      channelCode: feedbackChannel,
      presenceOrDisposition: presenceOrDisp,
      reaction: reactionText,
      commitmentOrNextStep: commitmentOrStep,
      amountPaid: paid,
      totalAmount: c.exp,
      remainingBalance: remaining,
      currentDpd: c.dpd,
      projectedDpdStatus: projectedDpd,
      ptpAgreed,
      ptpAmount: ptpAgreed ? Number(ptpAmountInput) || 0 : undefined,
      ptpDate: ptpAgreed ? ptpDateInput : undefined,
      ptpMode: ptpAgreed ? ptpPaymentMode : undefined,
      notes: feedbackNotes.trim() || "Frontline outreach feedback recorded.",
      timestamp: "Just now",
    };

    setStoredFeedback(newRecord);
    setActionTaken("YES");
    setFeedbackSubmitted(true);
    setDrawerOpen(false);

    const timelineStatus =
      paid > 0
        ? `$${paid.toLocaleString()} Paid · Rem: $${remaining.toLocaleString()}`
        : ptpAgreed
          ? `PTP: $${(Number(ptpAmountInput) || 0).toLocaleString()} by ${ptpDateInput}`
          : presenceOrDisp;

    setTimelineList((prev) => [
      {
        title: `${channelName} Feedback: ${presenceOrDisp}`,
        category: "Outreach History",
        time: "Just now",
        status: timelineStatus,
        tone: "green",
      },
      ...prev,
    ]);
    setActiveTimelineStep(0);

    toast.success("Recovery outcome stored successfully & timeline updated!");
  };

  const handleStoreNoActionFeedback = () => {
    const newRecord: StoredFeedbackRecord = {
      id: `fb-${Date.now()}`,
      actionTaken: "NO",
      channelName: channelDisplayLabel,
      channelCode: activeChannel.code === "FIELD" ? "FIELD" : activeChannel.code === "PHONE" ? "PHONE" : "MAIL",
      presenceOrDisposition: notTakenReason,
      reaction: "Not Contacted",
      commitmentOrNextStep: `Rescheduled for ${rescheduleDate}`,
      amountPaid: 0,
      totalAmount: c.exp,
      remainingBalance: c.exp,
      currentDpd: c.dpd,
      projectedDpdStatus: `${c.dpd} DPD (Deferred)`,
      ptpAgreed: false,
      notes: notTakenNotes.trim() || `Outreach postponed due to: ${notTakenReason}`,
      timestamp: "Just now",
      notTakenReason,
      rescheduleDate,
    };

    setStoredFeedback(newRecord);
    setActionTaken("NO");
    setFeedbackSubmitted(true);
    setNoActionModalOpen(false);

    setTimelineList((prev) => [
      {
        title: `Outreach Deferred: ${notTakenReason}`,
        category: "Next Best Action",
        time: "Just now",
        status: `Rescheduled for ${rescheduleDate}`,
        tone: "rose",
      },
      ...prev,
    ]);
    setActiveTimelineStep(0);

    toast.info(`Action deferred: ${notTakenReason}. Rescheduled for ${rescheduleDate}.`);
  };

  const bTouch = bestTouchpoint(c);
  const fallbackTouch = c.aff[1] ? c.aff[1][0] : "Mails";

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

  const handleApproveNBA = () => {
    if (hasPolicyBlock) {
      toast.error("Action blocked by policy rules. Manual supervisor review required.");
      return;
    }
    setCollectorStatus("APPROVED");
    toast.success(`Next Best Action approved: ${actionHeadline} via ${channelDisplayLabel}`);
    setTimelineList((prev) => [
      {
        title: `NBA Approved: ${actionHeadline} (${channelDisplayLabel})`,
        category: "Next Best Action",
        time: "Just now",
        status: "Approved for Execution",
        tone: "green",
      },
      ...prev,
    ]);
  };

  const handleRejectNBA = () => {
    setCollectorStatus("REJECTED");
    setRejectionModalOpen(false);
    toast.warning(`Next Best Action declined: ${rejectionReason}`);
    setTimelineList((prev) => [
      {
        title: `NBA Declined: ${actionHeadline} (${channelDisplayLabel})`,
        category: "Next Best Action",
        time: "Just now",
        status: `Declined: ${rejectionReason}`,
        tone: "rose",
      },
      ...prev,
    ]);
  };

  const handleChangeChannelSubmit = (newChannelName: string, newTiming: string) => {
    setOverrideChannel(newChannelName);
    setSelectedTimingWindow(newTiming);
    setCollectorStatus("EDITED");
    setChangeChannelModalOpen(false);
    const targetLabel =
      newChannelName === "Phone calls" ? "Phone Call" : newChannelName === "Mails" ? "Email" : "Field Visit";
    toast.success(`Outreach channel updated to ${targetLabel} (${newTiming})`);
    setTimelineList((prev) => [
      {
        title: `Channel Override: Switched to ${targetLabel} (${newTiming})`,
        category: "Next Best Action",
        time: "Just now",
        status: "Channel Updated",
        tone: "blue",
      },
      ...prev,
    ]);
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
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {c.id} · Account {c.acct} · Total Amount ${c.exp.toLocaleString()}
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
          {/* 1. Suggested Message */}
          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">Engagement Model</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Recommended message template &amp; operational objective
              </p>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Suggested Message Template</span>
                  <span className="font-bold text-primary truncate max-w-[170px] text-right">
                    {c.content[0]}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Message Objective</span>
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

          {/* 2. Contact Frequency & Schedule */}
          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">Payment Model</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Turnaround time, payment recency &amp; scheduled contact frequency
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
                  <span className="text-muted-foreground">Contact Frequency</span>
                  <span className="font-bold text-primary">{c.cad[0]}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Recommended Channel & Time */}
          <div className="rounded-2xl border border-primary/20 bg-card p-5 shadow-xs flex flex-col justify-between relative overflow-hidden">
            {/* Subtle top accent gradient */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/80 via-primary to-emerald-500" />

            <div>
              <div className="flex items-start justify-between gap-2 flex-wrap mb-3">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Outreach Model</h3>
                  <p className="text-[11px] text-muted-foreground">
                    Optimal contact channel &amp; timing recommendation
                  </p>
                </div>
              </div>

              {/* PRIMARY RECOMMENDED CHANNEL HERO CARD */}
              <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 mb-1">
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
                      Suitability Score
                    </div>
                    <div className="text-base font-extrabold text-primary">
                      {activeChannel.score.toFixed(3)}
                    </div>
                  </div>
                </div>

                {/* Score Formula Tag */}
                <div className="mt-2.5 flex items-center justify-between text-[10px] text-muted-foreground border-t border-border/60 pt-2">
                  <span className="text-[9.5px]">
                    60% Contact Success + 40% Customer Response
                  </span>
                  <span className="font-semibold text-foreground/80">
                    {fallbackLevel === "CUSTOMER" ? "Customer History Profile" : "Portfolio Baseline"}
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
                  disabled={collectorStatus === "APPROVED"}
                  onClick={() => {
                    setCollectorStatus("APPROVED");
                    toast.success(`Outreach recommendation approved via ${activeChannel.name}`);
                  }}
                  className={`rounded-lg py-1.5 text-xs font-bold transition shadow-xs flex items-center justify-center gap-1 ${
                    collectorStatus === "APPROVED"
                      ? "bg-emerald-600 text-white cursor-default"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white"
                  }`}
                >
                  <Check className="size-3" /> Approve
                </button>

                <button
                  type="button"
                  disabled={collectorStatus === "REJECTED"}
                  onClick={() => {
                    setCollectorStatus("REJECTED");
                    setRejectionReason("Declined by collector");
                    toast.info("Outreach recommendation declined");
                  }}
                  className="rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 py-1.5 text-xs font-bold text-rose-700 dark:text-rose-300 transition shadow-xs flex items-center justify-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <X className="size-3" /> Reject
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Card 4: Post-due date outreach and repayments (Line Chart) - Hidden / Commented out as requested
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Post-due date outreach and repayments
              </h3>
              <p className="text-xs text-muted-foreground mb-2">
                Weekly touchpoints occurred post due-date up to current date ({c.touches} total)
              </p>

              <div className="relative mt-2 pt-2">
                <div className="relative h-28 w-full">
                  {(() => {
                    const maxY = Math.max(...wk, 4);
                    const xPercents = [12.5, 37.5, 62.5, 87.5];
                    const pts = wk.map((v, i) => {
                      const x = xPercents[i]!;
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

                        <path d={areaD} fill="url(#outreachLineGrad)" />

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
        */}

        {/* Card 5: Business Scorecard */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3.5">
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <BarChart3 className="size-4 text-primary" /> Business Scorecard
              </h3>
            </div>
          </div>

          {/* 4 CORE OPERATIONAL METRICS IN RESPONSIVE GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. Outstanding Balance */}
            <div className="rounded-xl border border-border/70 bg-muted/20 p-3.5 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Outstanding Balance
                </span>
                <div className="mt-1.5 flex items-baseline justify-between">
                  <span className="text-xl font-black text-foreground">
                    <AnimatedKpi value={c.exp} prefix="$" />
                  </span>
                  <span
                    className={`rounded-md px-1.5 py-0.5 text-[9.5px] font-bold ${
                      c.dpd >= 90
                        ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                        : c.dpd >= 31
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                          : c.dpd >= 1
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                            : "bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30"
                    }`}
                  >
                    {c.dpd === 0 ? "Current" : `${c.dpd} DPD`}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Payment Fulfillment */}
            <div className="rounded-xl border border-border/70 bg-muted/20 p-3.5 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Payment Fulfillment
                </span>
                <div className="mt-1.5 flex items-baseline justify-between">
                  <span
                    className={`text-xl font-black ${
                      c.cov >= 70
                        ? "text-emerald-600 dark:text-emerald-400"
                        : c.cov >= 40
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    <AnimatedKpi value={c.cov} suffix="%" />
                  </span>
                  <span
                    className={`text-[10.5px] font-bold ${
                      c.cov >= 70
                        ? "text-emerald-600 dark:text-emerald-400"
                        : c.cov >= 40
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {c.repaymentType}
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${
                      c.cov >= 70 ? "bg-emerald-500" : c.cov >= 40 ? "bg-amber-500" : "bg-rose-500"
                    }`}
                    style={{ width: animateLiveBars ? `${Math.min(100, c.cov)}%` : "0%" }}
                  />
                </div>
              </div>
            </div>

            {/* 3. Payment Success Rate */}
            <div className="rounded-xl border border-border/70 bg-muted/20 p-3.5 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Payment Success Rate
                </span>
                <div className="mt-1.5 flex items-baseline justify-between">
                  <span
                    className={`text-xl font-black ${
                      paymentSuccessRate >= 70
                        ? "text-emerald-600 dark:text-emerald-400"
                        : paymentSuccessRate >= 40
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    <AnimatedKpi value={paymentSuccessRate} suffix="%" />
                  </span>
                  <span className="text-[10.5px] font-semibold text-muted-foreground">
                    {c.pays} of {Math.max(1, c.pays + (c.cov < 100 ? 1 : 0))} fulfilled
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${
                      paymentSuccessRate >= 70
                        ? "bg-emerald-500"
                        : paymentSuccessRate >= 40
                          ? "bg-amber-500"
                          : "bg-rose-500"
                    }`}
                    style={{ width: animateLiveBars ? `${Math.min(100, paymentSuccessRate)}%` : "0%" }}
                  />
                </div>
              </div>
            </div>

            {/* 4. Contact Success Rate */}
            <div className="rounded-xl border border-border/70 bg-muted/20 p-3.5 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Contact Success Rate
                </span>
                <div className="mt-1.5 flex items-baseline justify-between">
                  <span
                    className={`text-xl font-black ${
                      activeChannel.successRate >= 65
                        ? "text-emerald-600 dark:text-emerald-400"
                        : activeChannel.successRate >= 45
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    <AnimatedKpi value={activeChannel.successRate} suffix="%" />
                  </span>
                  <span className="text-[10.5px] font-semibold text-muted-foreground">
                    {activeChannel.name}
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${
                      activeChannel.successRate >= 65
                        ? "bg-emerald-500"
                        : activeChannel.successRate >= 45
                          ? "bg-amber-500"
                          : "bg-rose-500"
                    }`}
                    style={{ width: animateLiveBars ? `${Math.min(100, activeChannel.successRate)}%` : "0%" }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* TWO-COLUMN LAYOUT: Activity Timeline on Left, Next Best Action on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* LEFT: Activity Timeline */}
          <div className="lg:col-span-5 h-full">
            <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs flex flex-col justify-between h-full">
              <div className="flex-1 flex flex-col">
                <div className="flex items-center justify-between gap-2 flex-wrap mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-foreground">Activity timeline</h3>
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 border border-red-500/25 px-2 py-0.5 text-[10px] font-bold text-red-600 dark:text-red-400">
                        <User className="size-2.5 text-red-600 dark:text-red-400" /> Live Journey
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Recent outreach, approvals and repayment events
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setActiveTimelineStep((prev) => (prev + 1) % timelineList.length)
                      }
                      className="inline-flex items-center gap-1 rounded-lg border border-border/80 bg-muted/40 hover:bg-muted px-2 py-1 text-[10.5px] font-bold text-foreground transition cursor-pointer"
                      title="Advance live person marker to next event"
                    >
                      <User className="size-3 text-red-600 dark:text-red-400 animate-pulse" />
                      <span>Step Proceed</span>
                      <ChevronRight className="size-3 text-muted-foreground" />
                    </button>
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                      {timelineList.length} events logged
                    </span>
                  </div>
                </div>

                {/* Vertical timeline distributing events across vertical space */}
                <div className="relative border-l-2 border-border/70 ml-3 pl-4 flex-1 flex flex-col justify-between py-1.5 space-y-3.5">
                  {timelineList.map((item, i) => {
                    const isCurrent = i === activeTimelineStep;
                    const isCompleted = i < activeTimelineStep;

                    return (
                      <div
                        key={i}
                        onClick={() => setActiveTimelineStep(i)}
                        style={
                          isCurrent
                            ? {
                                background: "linear-gradient(135deg, #FF007F 0%, #0B001A 50%, #00F0FF 100%)",
                                color: "#ffffff",
                                boxShadow: "0 0 15px rgba(255, 0, 127, 0.3), 0 0 15px rgba(0, 240, 255, 0.3)",
                                borderColor: "rgba(255, 0, 127, 0.6)",
                              }
                            : undefined
                        }
                        className={`relative rounded-xl border p-3.5 text-xs transition-all duration-300 cursor-pointer ${
                          isCurrent
                            ? "scale-[1.01]"
                            : isCompleted
                              ? "border-emerald-500/35 bg-gradient-to-r from-emerald-500/[0.08] via-teal-500/[0.04] to-card/90 dark:from-emerald-500/[0.14] dark:to-card/80 shadow-xs ring-1 ring-emerald-500/20 hover:border-emerald-500/50"
                              : "border-border/60 bg-gradient-to-r from-muted/25 via-muted/15 to-card/60 hover:bg-muted/40 hover:border-border"
                        }`}
                      >
                        {/* Progress line overlay for completed stages */}
                        {isCompleted && (
                          <span className="absolute -left-[18px] top-3 -bottom-3.5 w-0.5 bg-emerald-500 z-10 transition-all duration-500" />
                        )}

                        {/* Node: Current (Red Person) vs Completed (Green Check) vs Upcoming (Neutral Dot) */}
                        {isCurrent ? (
                          <div
                            className="absolute -left-[28px] top-3 z-20 flex items-center justify-center transition-all duration-500 ease-out"
                            title="Current Active Stage"
                          >
                            <span className="absolute size-7 rounded-full bg-red-500/35 animate-ping" />
                            <div className="size-6 rounded-full bg-red-600 text-white flex items-center justify-center shadow-md ring-2 ring-card scale-110">
                              <User className="size-3.5 stroke-[2.5]" />
                            </div>
                          </div>
                        ) : isCompleted ? (
                          <div
                            className="absolute -left-[28px] top-3 z-20 flex items-center justify-center transition-all duration-500 ease-out"
                            title="Completed Stage"
                          >
                            <div className="size-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-sm ring-2 ring-card hover:scale-110 transition-transform">
                              <Check className="size-3.5 stroke-[3]" />
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveTimelineStep(i);
                            }}
                            title="Click to jump active collector position here"
                            className="absolute -left-[23px] top-4 size-2.5 rounded-full border-2 border-card cursor-pointer hover:scale-150 transition-all bg-slate-400 dark:bg-slate-600 hover:bg-primary"
                          />
                        )}

                        {/* Card Title & Top-Right Live/Status Badge */}
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div
                            className={`font-bold text-xs leading-snug flex-1 ${
                              isCurrent ? "text-white" : "text-foreground"
                            }`}
                          >
                            {item.title}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {/* Live Badge in Red on Top Right for Current Stage */}
                            {isCurrent && (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/20 border border-red-400/40 px-2.5 py-0.5 text-[9.5px] font-black uppercase tracking-wider text-red-200 shadow-xs">
                                <span className="size-1.5 rounded-full bg-red-500 animate-pulse" /> LIVE
                              </span>
                            )}

                            {/* Completed Status Pill for Completed Stages */}
                            {isCompleted && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                                <Check className="size-2.5 stroke-[3]" /> Completed
                              </span>
                            )}

                            <span className={`text-[11px] ${isCurrent ? "text-white/80" : "text-muted-foreground"}`}>
                              {item.time}
                            </span>
                          </div>
                        </div>

                        {/* Original Category & Status Badges */}
                        <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                              isCurrent
                                ? "bg-white/15 text-white border border-white/25 backdrop-blur-xs"
                                : item.category === "Next Best Action"
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                  : "bg-primary/10 text-primary"
                            }`}
                          >
                            {item.category}
                          </span>
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                              isCurrent
                                ? "bg-white/15 text-white border border-white/25 backdrop-blur-xs"
                                : isCompleted
                                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25"
                                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Activity Timeline Actions */}
              <div className="mt-5 border-t border-border/70 pt-4 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-muted-foreground">Action taken?</span>
                  <div className="flex items-center gap-1 p-0.5 rounded-lg bg-muted border border-border/70 shadow-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setActionTaken("YES");
                        setDrawerOpen(true);
                      }}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                        actionTaken === "YES"
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "text-foreground hover:bg-card"
                      }`}
                    >
                      <Check className="size-2.5" /> Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActionTaken("NO");
                        setNoActionModalOpen(true);
                      }}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                        actionTaken === "NO"
                          ? "bg-rose-600 text-white shadow-xs"
                          : "text-foreground hover:bg-card"
                      }`}
                    >
                      <X className="size-2.5" /> No
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setActionTaken("YES");
                    setDrawerOpen(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition cursor-pointer"
                >
                  <Phone className="size-3.5" /> Record Outcome
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT: Next Best Action Card with Customer Recovery Snapshot */}
          <div className="lg:col-span-7 h-full">
            <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs flex flex-col justify-between h-full space-y-4">
              <div className="space-y-4">
                {/* 1. NEXT BEST ACTION HEADER */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3.5 border-b border-border/70">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Sparkles className="size-4 text-primary" />
                      <h3 className="text-sm font-bold uppercase tracking-wider text-primary">
                        Next Best Action
                      </h3>
                    </div>

                    {/* Recommended Action Headline & Metadata */}
                    <div className="flex items-center gap-2.5 pt-0.5 flex-wrap">
                      <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-xs">
                        <activeChannel.icon className="size-4" />
                      </div>
                      <div>
                        <h3 className="text-base sm:text-lg font-black text-foreground tracking-tight flex items-center gap-2 flex-wrap">
                          <span>{actionHeadline}</span>
                          <span className="text-xs font-mono font-bold text-primary">
                            ({activeChannel.score.toFixed(3)})
                          </span>
                        </h3>
                      </div>
                    </div>
                  </div>

                  {/* ACTION BUTTONS: Change Channel, Reject, Accept */}
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedChannelChoice(activeChannel.name);
                        setChangeChannelModalOpen(true);
                      }}
                      className="rounded-xl border border-border/80 bg-card hover:bg-muted px-2.5 py-1.5 text-xs font-semibold text-foreground transition shadow-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Sliders className="size-3 text-primary" /> Change Channel
                    </button>

                    <button
                      type="button"
                      disabled={collectorStatus === "REJECTED"}
                      onClick={() => setRejectionModalOpen(true)}
                      className="rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 px-3 py-1.5 text-xs font-bold transition shadow-xs flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <X className="size-3" /> Reject Action
                    </button>

                    <button
                      type="button"
                      disabled={hasPolicyBlock || collectorStatus === "APPROVED"}
                      onClick={handleApproveNBA}
                      className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition shadow-sm flex items-center gap-1 ${
                        hasPolicyBlock
                          ? "bg-muted text-muted-foreground cursor-not-allowed border"
                          : collectorStatus === "APPROVED"
                            ? "bg-emerald-600 text-white cursor-default shadow-emerald-500/20"
                            : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/20 cursor-pointer"
                      }`}
                    >
                      {collectorStatus === "APPROVED" ? (
                        <>
                          <CheckCircle2 className="size-3" /> Approved
                        </>
                      ) : (
                        <>
                          <Check className="size-3" /> Accept Action
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* 2. COMPACT STATUS BANNER */}
                {collectorStatus === "PENDING" && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                        Review Required — Human Sign-Off Pending
                      </span>
                    </div>
                    <span className="rounded-md bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-800 dark:text-amber-300 shrink-0">
                      Pending Review
                    </span>
                  </div>
                )}

                {collectorStatus === "APPROVED" && (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                        Review Completed — Approved for Execution
                      </span>
                    </div>
                    <span className="rounded-md bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 shrink-0">
                      Approved
                    </span>
                  </div>
                )}

                {collectorStatus === "REJECTED" && (
                  <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <X className="size-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                      <span className="text-xs font-bold text-rose-900 dark:text-rose-200">
                        Recommendation Declined — Reason: {rejectionReason}
                      </span>
                    </div>
                    <span className="rounded-md bg-rose-500/20 border border-rose-500/30 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-rose-800 dark:text-rose-300 shrink-0">
                      Declined
                    </span>
                  </div>
                )}

                {collectorStatus === "EDITED" && (
                  <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-3.5 py-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Sliders className="size-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                      <span className="text-xs font-bold text-blue-900 dark:text-blue-200">
                        Channel Overridden by Collector — {channelDisplayLabel} Active
                      </span>
                    </div>
                    <span className="rounded-md bg-blue-500/20 border border-blue-500/30 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-blue-800 dark:text-blue-300 shrink-0">
                      Overridden
                    </span>
                  </div>
                )}

                {/* 3. CUSTOMER RECOVERY SNAPSHOT (FOUR COMPACT BUSINESS KPI CARDS IN 2x2 GRID) */}
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="size-4 text-primary" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                        Customer Recovery Snapshot
                      </h4>
                    </div>
                    <span className="text-[10px] font-semibold text-muted-foreground">
                      Account Recovery Performance
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Card 1 — Recovery Amount */}
                    <div className="rounded-xl border border-border/80 bg-muted/25 p-3.5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Recovery Amount
                          </span>
                          <span
                            className={`rounded-md px-1.5 py-0.5 text-[9.5px] font-bold ${
                              c.cov >= 60
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                                : c.cov >= 20
                                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                                  : "bg-muted text-muted-foreground border border-border"
                            }`}
                          >
                            {c.repaymentType}
                          </span>
                        </div>
                        <div className="mt-1.5 text-xl font-black text-foreground tracking-tight">
                          <AnimatedKpi value={recoveredAmount} prefix="$" />
                        </div>
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          of <b className="text-foreground">${c.exp.toLocaleString()}</b> balance ({c.cov}% coverage)
                        </div>
                      </div>
                      <div className="mt-2.5 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ease-out ${
                            c.cov >= 60 ? "bg-emerald-500" : c.cov >= 20 ? "bg-amber-500" : "bg-rose-500"
                          }`}
                          style={{ width: animateLiveBars ? `${Math.min(100, c.cov)}%` : "0%" }}
                        />
                      </div>
                    </div>

                    {/* Card 2 — DPD Status */}
                    <div className="rounded-xl border border-border/80 bg-muted/25 p-3.5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            DPD Status
                          </span>
                          <span
                            className={`rounded-md px-1.5 py-0.5 text-[9.5px] font-bold ${
                              c.dpd >= 90
                                ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                                : c.dpd >= 31
                                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                                  : c.dpd >= 1
                                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                                    : "bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30"
                            }`}
                          >
                            {dpdStatusLabel}
                          </span>
                        </div>
                        <div className="mt-1.5 text-xl font-black text-foreground tracking-tight">
                          {c.dpd === 0 ? "Current" : `${c.dpd} DPD`}
                        </div>
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          {riskBucket} · <span className="font-semibold text-foreground">{dpdStageLabel}</span>
                        </div>
                      </div>
                      <div className="mt-2.5 flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
                        <span className="size-1.5 rounded-full bg-primary" />
                        <span>Account Delinquency Status</span>
                      </div>
                    </div>

                    {/* Card 3 — Recovery Success Rate */}
                    <div className="rounded-xl border border-border/80 bg-muted/25 p-3.5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Recovery Success Rate
                          </span>
                          <span
                            className={`rounded-md px-1.5 py-0.5 text-[9.5px] font-bold ${
                              paymentSuccessRate >= 70
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                                : paymentSuccessRate >= 40
                                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                                  : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                            }`}
                          >
                            {c.pays > 0 ? "Commitment Kept" : "Pending Repayment"}
                          </span>
                        </div>
                        <div className="mt-1.5 text-xl font-black text-foreground tracking-tight">
                          <AnimatedKpi value={paymentSuccessRate} suffix="%" />
                        </div>
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          <b className="text-foreground">{c.pays}</b> of {Math.max(1, c.pays + (c.cov < 100 ? 1 : 0))} payments fulfilled
                        </div>
                      </div>
                      <div className="mt-2.5 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ease-out ${
                            paymentSuccessRate >= 70
                              ? "bg-emerald-500"
                              : paymentSuccessRate >= 40
                                ? "bg-amber-500"
                                : "bg-rose-500"
                          }`}
                          style={{ width: animateLiveBars ? `${Math.min(100, paymentSuccessRate)}%` : "0%" }}
                        />
                      </div>
                    </div>

                    {/* Card 4 — DPD Trend */}
                    <div className="rounded-xl border border-border/80 bg-muted/25 p-3.5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            DPD Trend
                          </span>
                          <span
                            className={`rounded-md px-1.5 py-0.5 text-[9.5px] font-bold flex items-center gap-1 ${
                              !hasHistoricalDpd
                                ? "bg-muted text-muted-foreground border border-border"
                                : delta30Dpd < 0
                                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                                  : delta30Dpd > 0
                                    ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                                    : "bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30"
                            }`}
                          >
                            {hasHistoricalDpd && delta30Dpd < 0 ? (
                              <TrendingDown className="size-2.5" />
                            ) : hasHistoricalDpd && delta30Dpd > 0 ? (
                              <TrendingUp className="size-2.5" />
                            ) : (
                              <Activity className="size-2.5" />
                            )}
                            {trendBadgeLabel}
                          </span>
                        </div>
                        <div className="mt-1.5 flex items-baseline gap-2">
                          <span
                            className={`text-xl font-black tracking-tight ${
                              !hasHistoricalDpd
                                ? "text-muted-foreground"
                                : delta30Dpd < 0
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : delta30Dpd > 0
                                    ? "text-rose-600 dark:text-rose-400"
                                    : "text-foreground"
                            }`}
                          >
                            {trendDisplayValue}
                          </span>
                          {hasHistoricalDpd && (
                            <span className="text-[10.5px] font-medium text-muted-foreground">
                              {delta30Dpd < 0 ? "(Improving)" : delta30Dpd > 0 ? "(Worsening)" : "(Unchanged)"}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          {trendSubtext}
                        </div>
                      </div>
                      <div className="mt-2.5 flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
                        <Clock className="size-3 text-muted-foreground/80" />
                        <span>30-Day Historical Comparison Period</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. ACTION TAKEN (YES / NO) SEGMENT */}
                <div className="rounded-xl border border-border/80 bg-muted/20 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2.5">
                    <div className="size-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-xs">
                      <ClipboardCheck className="size-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground">Action Taken?</span>
                        {storedFeedback && (
                          <span className="rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-2 py-0.5 text-[9.5px] font-bold">
                            ✓ {storedFeedback.channelName}: {storedFeedback.amountPaid > 0 ? `$${storedFeedback.amountPaid.toLocaleString()} Collected` : storedFeedback.presenceOrDisposition}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {storedFeedback
                          ? "Feedback recorded & timeline updated · Click Yes to view/edit in sidebar"
                          : "Select Yes to open outcome feedback sidebar, or No to defer"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 p-1 rounded-xl bg-card border border-border/80 shadow-xs shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setActionTaken("YES");
                        setDrawerOpen(true);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        actionTaken === "YES"
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "text-foreground hover:bg-muted"
                      }`}
                    >
                      <Check className="size-3" /> Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActionTaken("NO");
                        setNoActionModalOpen(true);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        actionTaken === "NO"
                          ? "bg-rose-600 text-white shadow-xs"
                          : "text-foreground hover:bg-muted"
                      }`}
                    >
                      <X className="size-3" /> No
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* OUTCOME & RECOVERY FEEDBACK POPUP MODAL (HORIZONTAL SINGLE-SCREEN EXECUTIVE LAYOUT) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          <button
            aria-label="Close outcome popup modal backdrop"
            className="absolute inset-0 bg-foreground/30 backdrop-blur-xs transition"
            onClick={() => setDrawerOpen(false)}
          />

          <div className="relative w-full max-w-4xl lg:max-w-5xl rounded-2xl border border-border/80 bg-white dark:bg-card p-4 sm:p-5 shadow-2xl space-y-3.5 max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/70 pb-2.5">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                  Frontline Outreach Execution
                </span>
                <h3 className="text-base font-bold text-foreground">
                  Record Outreach Outcome &amp; Response
                </h3>
              </div>
              <button
                type="button"
                className="size-8 rounded-lg hover:bg-muted grid place-items-center cursor-pointer text-muted-foreground hover:text-foreground transition"
                onClick={() => setDrawerOpen(false)}
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Account Quick Summary Banner */}
            <div className="rounded-xl border border-border/70 bg-muted/30 p-2.5 sm:p-3 text-xs flex justify-between items-center gap-2">
              <div>
                <span className="font-bold text-foreground">{c.name}</span> ({c.acct})
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Due: ${c.exp.toLocaleString()} · {c.dpd} DPD ({riskBucket})
                </div>
              </div>
              <span className="rounded-md bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary shrink-0">
                Current NBA: {channelDisplayLabel}
              </span>
            </div>

            {/* Horizontal Two-Column Body for Single-Screen Alignment */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 items-start">
              {/* LEFT COLUMN: Communication Channels & Direct Disposition/Response */}
              <div className="space-y-3">
                {/* Step 1: Communication Channel Cards */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-semibold text-muted-foreground">
                    Select Communication Channel (Only Supported Recovery Channels)
                  </label>

                  <div className="space-y-2">
                    {[
                      {
                        code: "PHONE" as const,
                        label: "Phone Call",
                        icon: Phone,
                        successRate: 55,
                        responseRate: 32,
                        isPrescribed:
                          primaryRecommendation.name.toLowerCase().includes("call") ||
                          primaryRecommendation.name.toLowerCase().includes("phone"),
                      },
                      {
                        code: "MAIL" as const,
                        label: "Email",
                        icon: Mail,
                        successRate: 42,
                        responseRate: 22,
                        isPrescribed:
                          primaryRecommendation.name.toLowerCase().includes("mail") ||
                          primaryRecommendation.name.toLowerCase().includes("email"),
                      },
                      {
                        code: "FIELD" as const,
                        label: "Field Visit",
                        icon: MapPin,
                        successRate: 88,
                        responseRate: 34,
                        isPrescribed:
                          primaryRecommendation.name.toLowerCase().includes("field") ||
                          primaryRecommendation.name.toLowerCase().includes("visit"),
                      },
                    ].map((ch) => {
                      const isSelected = feedbackChannel === ch.code;
                      return (
                        <div
                          key={ch.code}
                          onClick={() => setFeedbackChannel(ch.code)}
                          className={`rounded-xl border p-2.5 sm:p-3 cursor-pointer transition flex items-center justify-between gap-2.5 ${
                            isSelected
                              ? "border-primary bg-primary/10 shadow-xs"
                              : "border-border/70 bg-muted/20 hover:bg-muted/40"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`size-8 rounded-lg grid place-items-center ${
                                isSelected
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              <ch.icon className="size-4" />
                            </div>
                            <div>
                              <div className="font-bold text-foreground text-xs flex items-center gap-1.5">
                                {ch.label}
                                {ch.isPrescribed && (
                                  <span className="rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.2 text-[9px] font-bold">
                                    Model Prescribed
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-muted-foreground mt-0.5">
                                Success: <strong>{ch.successRate}%</strong> · Response:{" "}
                                <strong>{ch.responseRate}%</strong>
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                              Permitted
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Step 2: Channel-Specific Response & Demeanor Selectors (Interactive Accordion) */}
                <div className="rounded-xl border border-border/80 bg-muted/20 p-3 space-y-2.5">
                  <button
                    type="button"
                    onClick={() => setResponseSectionOpen((prev) => !prev)}
                    className="w-full flex items-center justify-between border-b border-border/60 pb-2 cursor-pointer text-left"
                  >
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                      <Activity className="size-3" />
                      {feedbackChannel === "FIELD"
                        ? "Field Visit Interaction & Response"
                        : feedbackChannel === "PHONE"
                          ? "Phone Call Disposition & Response"
                          : "Mail & Notice Outreach Response"}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-semibold hover:text-foreground">
                      <span>Parameters</span>
                      {responseSectionOpen ? (
                        <ChevronUp className="size-3.5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="size-3.5 text-muted-foreground" />
                      )}
                    </span>
                  </button>

                  {responseSectionOpen && (
                    <div className="space-y-2 pt-0.5">
                      {/* FIELD VISIT FIELDS */}
                      {feedbackChannel === "FIELD" && (
                        <div className="space-y-2">
                          <div className="space-y-1">
                            <label className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
                              Customer Presence at Premises
                            </label>
                            <select
                              value={fieldPresence}
                              onChange={(e) => setFieldPresence(e.target.value)}
                              className="w-full rounded-lg border border-border bg-card p-2 text-xs font-semibold text-foreground focus:outline-hidden focus:border-primary cursor-pointer"
                            >
                              <option value="Customer Met in Person">Customer Met in Person</option>
                              <option value="Premises Locked / Not Available">Premises Locked / Vacant</option>
                              <option value="Met Family / Third-Party">Met Family / Third-Party</option>
                              <option value="Address Shifted / Untraceable">Address Shifted / Untraceable</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
                              Customer Demeanor &amp; Reaction
                            </label>
                            <select
                              value={fieldReaction}
                              onChange={(e) => setFieldReaction(e.target.value)}
                              className="w-full rounded-lg border border-border bg-card p-2 text-xs font-semibold text-foreground focus:outline-hidden focus:border-primary cursor-pointer"
                            >
                              <option value="Cooperative & Willing to Settle">Cooperative &amp; Willing to Settle</option>
                              <option value="Claimed Financial Hardship / Job Loss">Claimed Hardship / Job Loss</option>
                              <option value="Evasive / Asking for Time">Evasive / Asking for Time</option>
                              <option value="Disputed Balance / Hidden Charges">Disputed Balance / Hidden Charges</option>
                              <option value="Hostile / Refused Discussion">Hostile / Refused Entry</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
                              Commitment Made during Visit
                            </label>
                            <select
                              value={fieldCommitment}
                              onChange={(e) => setFieldCommitment(e.target.value)}
                              className="w-full rounded-lg border border-border bg-card p-2 text-xs font-semibold text-foreground focus:outline-hidden focus:border-primary cursor-pointer"
                            >
                              <option value="Immediate Partial Payment Today">Immediate Partial Payment Today</option>
                              <option value="Promise to Pay (PTP) Agreed">Promise to Pay (PTP) Full Balance</option>
                              <option value="Loan Restructuring Requested">Loan Restructuring / EMI Relief</option>
                              <option value="Refused to Commit / Awaiting Notice">Refused to Commit</option>
                            </select>
                          </div>
                        </div>
                      )}

                      {/* PHONE CALL FIELDS */}
                      {feedbackChannel === "PHONE" && (
                        <div className="space-y-2">
                          <div className="space-y-1">
                            <label className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
                              Did Customer Pick up Call?
                            </label>
                            <select
                              value={phoneDisposition}
                              onChange={(e) => setPhoneDisposition(e.target.value)}
                              className="w-full rounded-lg border border-border bg-card p-2 text-xs font-semibold text-foreground focus:outline-hidden focus:border-primary cursor-pointer"
                            >
                              <option value="Connected — Spoke with Customer">Connected — Spoke with Customer</option>
                              <option value="Answered by Family / Spouse">Answered by Family / Spouse</option>
                              <option value="Ringing / No Answer">Ringing / No Answer</option>
                              <option value="Left Voicemail / IVR Dispatched">Left Voicemail / IVR</option>
                              <option value="Busy / Number Disconnected">Busy / Number Disconnected</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
                              Customer Tone &amp; Reaction
                            </label>
                            <select
                              value={phoneReaction}
                              onChange={(e) => setPhoneReaction(e.target.value)}
                              className="w-full rounded-lg border border-border bg-card p-2 text-xs font-semibold text-foreground focus:outline-hidden focus:border-primary cursor-pointer"
                            >
                              <option value="Calm & Acknowledged Liability">Calm &amp; Acknowledged Liability</option>
                              <option value="Distressed / Cash Flow Problem">Distressed / Cash Flow Issue</option>
                              <option value="Promised Payment via Portal">Promised Payment via Self-Serve</option>
                              <option value="Disputed Interest / Penalties">Disputed Interest / Penalties</option>
                              <option value="Aggressive / Disconnected Call">Aggressive / Disconnected Call</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
                              Agreed Next Proceedings
                            </label>
                            <select
                              value={phoneNextStep}
                              onChange={(e) => setPhoneNextStep(e.target.value)}
                              className="w-full rounded-lg border border-border bg-card p-2 text-xs font-semibold text-foreground focus:outline-hidden focus:border-primary cursor-pointer"
                            >
                              <option value="PTP Registered on Call">PTP Registered on Call</option>
                              <option value="Payment Link Dispatched via SMS">Instant Payment Link SMS Dispatched</option>
                              <option value="Follow-up Call Scheduled (Within 48h)">Follow-up Call Scheduled (48h)</option>
                              <option value="Escalate to In-Person Field Visit">Escalate to In-Person Field Visit</option>
                              <option value="Issue Statutory Legal Notice">Issue Statutory Demand Notice</option>
                            </select>
                          </div>
                        </div>
                      )}

                      {/* MAILS & DIGITAL FIELDS */}
                      {feedbackChannel === "MAIL" && (
                        <div className="space-y-2">
                          <div className="space-y-1">
                            <label className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
                              Mail &amp; Notice Response
                            </label>
                            <select
                              value={mailStatus}
                              onChange={(e) => setMailStatus(e.target.value)}
                              className="w-full rounded-lg border border-border bg-card p-2 text-xs font-semibold text-foreground focus:outline-hidden focus:border-primary cursor-pointer"
                            >
                              <option value="Delivered & Link Clicked / Viewed">Delivered &amp; Link Clicked / Viewed</option>
                              <option value="Delivered — Awaiting Customer Open">Delivered — Awaiting Open</option>
                              <option value="Customer Replied via Email / Portal">Customer Replied via Email / Portal</option>
                              <option value="Returned Unclaimed / Mail Bounce">Returned Unclaimed / Mail Bounce</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
                              Customer Reaction / Action
                            </label>
                            <select
                              value={mailReaction}
                              onChange={(e) => setMailReaction(e.target.value)}
                              className="w-full rounded-lg border border-border bg-card p-2 text-xs font-semibold text-foreground focus:outline-hidden focus:border-primary cursor-pointer"
                            >
                              <option value="Online Self-Service Pay Initiated">Online Self-Service Pay Initiated</option>
                              <option value="Statement of Account Requested">Statement of Account Requested</option>
                              <option value="Grievance / Hardship Letter Submitted">Grievance / Hardship Letter Submitted</option>
                              <option value="No Action Taken / Passive Disregard">No Action Taken / Passive</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
                              Further Operational Proceedings
                            </label>
                            <select
                              value={mailNextStep}
                              onChange={(e) => setMailNextStep(e.target.value)}
                              className="w-full rounded-lg border border-border bg-card p-2 text-xs font-semibold text-foreground focus:outline-hidden focus:border-primary cursor-pointer"
                            >
                              <option value="Send Urgent Automated Reminder SMS">Send Urgent Automated Reminder SMS</option>
                              <option value="Escalate to Outbound Collection Call">Escalate to Outbound Collection Call</option>
                              <option value="Issue Final Statutory Demand Notice">Issue Final Statutory Demand Notice</option>
                              <option value="Refer to Skip-Tracing Agency">Refer to Skip-Tracing Bureau</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN: Repayment Reconciliation, PTP Commitment & Notes */}
              <div className="space-y-3">
                {/* Step 3: Repayment Reconciliation & DPD Metrics */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                    <span>2. Repayment Reconciliation &amp; DPD Impact</span>
                    <span className="text-muted-foreground">Live calculated balance</span>
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    {/* Total Balance */}
                    <div className="rounded-xl border border-border/80 bg-muted/20 p-2.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Total Overdue Exposure
                      </span>
                      <div className="text-base font-black text-foreground mt-0.5">
                        ${c.exp.toLocaleString()}
                      </div>
                      <span className="text-[10px] text-muted-foreground">Total Account Liability</span>
                    </div>

                    {/* Amount Paid Today */}
                    <div className="rounded-xl border-2 border-primary/40 bg-card p-2.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary block">
                        Amount Paid Today ($)
                      </span>
                      <div className="mt-1 space-y-1.5">
                        <div className="relative">
                          <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-primary" />
                          <input
                            type="number"
                            min={0}
                            max={c.exp}
                            value={amountPaidInput === 0 ? "" : amountPaidInput}
                            placeholder="0"
                            onChange={(e) => setAmountPaidInput(Math.max(0, Number(e.target.value) || 0))}
                            className="w-full rounded-lg border border-border bg-muted/40 pl-7 pr-2.5 py-1 text-sm font-black text-foreground focus:outline-hidden focus:border-primary"
                          />
                        </div>
                        {/* Presets */}
                        <div className="flex items-center gap-1 flex-wrap">
                          {[0, 500, 1000].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setAmountPaidInput(preset)}
                              className="rounded-sm bg-muted hover:bg-muted/80 px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground cursor-pointer"
                            >
                              ${preset}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => setAmountPaidInput(c.exp)}
                            className="rounded-sm bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 text-[9px] font-bold cursor-pointer"
                          >
                            Full Cure
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Remaining Balance */}
                    <div className="rounded-xl border border-border/80 bg-muted/20 p-2.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Remaining Balance Left
                      </span>
                      <div
                        className={`text-base font-black mt-0.5 ${
                          c.exp - amountPaidInput <= 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-foreground"
                        }`}
                      >
                        ${Math.max(0, c.exp - amountPaidInput).toLocaleString()}
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {amountPaidInput > 0
                          ? `${Math.round((amountPaidInput / c.exp) * 100)}% Cleared`
                          : "Pending Collection"}
                      </span>
                    </div>

                    {/* DPD Status Impact */}
                    <div className="rounded-xl border border-border/80 bg-muted/20 p-2.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Account DPD Impact
                      </span>
                      <div
                        className={`text-base font-black mt-0.5 ${
                          amountPaidInput >= c.exp
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {amountPaidInput >= c.exp ? "0 DPD (Cured)" : `${c.dpd} DPD`}
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {amountPaidInput >= c.exp
                          ? "Fully Resolved ✓"
                          : amountPaidInput > 0
                            ? "Partially Serviced"
                            : riskBucket}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Step 4: Promise-to-Pay (PTP) Commitment (Collapsible with arrow) */}
                <div className="rounded-xl border border-border/80 bg-card p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setPtpAgreed((prev) => !prev)}
                      className="flex items-center gap-2 text-left cursor-pointer group"
                    >
                      <Calendar className="size-3.5 text-primary" />
                      <span className="text-xs font-bold text-foreground group-hover:text-primary transition">
                        Promise-to-Pay (PTP) Commitment
                      </span>
                      {ptpAgreed ? (
                        <ChevronUp className="size-3.5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="size-3.5 text-muted-foreground" />
                      )}
                    </button>
                    <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer">
                      <span className="text-muted-foreground text-[11px]">PTP Agreed?</span>
                      <input
                        type="checkbox"
                        checked={ptpAgreed}
                        onChange={(e) => setPtpAgreed(e.target.checked)}
                        className="size-4 rounded accent-primary cursor-pointer"
                      />
                    </label>
                  </div>

                  {ptpAgreed && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-border/60">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          PTP Amount ($)
                        </label>
                        <div className="relative">
                          <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
                          <input
                            type="number"
                            value={ptpAmountInput === 0 ? "" : ptpAmountInput}
                            placeholder="Amount"
                            onChange={(e) => setPtpAmountInput(Number(e.target.value) || 0)}
                            className="w-full rounded-lg border border-border bg-muted/30 pl-7 pr-2.5 py-1.5 text-xs font-bold text-foreground focus:outline-hidden focus:border-primary"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          PTP Due Date
                        </label>
                        <input
                          type="date"
                          value={ptpDateInput}
                          onChange={(e) => setPtpDateInput(e.target.value)}
                          className="w-full rounded-lg border border-border bg-muted/30 p-1.5 text-xs font-bold text-foreground focus:outline-hidden focus:border-primary cursor-pointer"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Payment Mode
                        </label>
                        <select
                          value={ptpPaymentMode}
                          onChange={(e) => setPtpPaymentMode(e.target.value)}
                          className="w-full rounded-lg border border-border bg-muted/30 p-1.5 text-xs font-bold text-foreground focus:outline-hidden focus:border-primary cursor-pointer"
                        >
                          <option value="UPI / Instant Transfer">UPI / Instant Transfer</option>
                          <option value="NetBanking / Bank Transfer">NetBanking / NEFT</option>
                          <option value="Branch Cashier Visit">Branch Cashier Visit</option>
                          <option value="Field Agent Cash Pickup">Field Agent Cash Pickup</option>
                          <option value="Post-Dated Cheque (PDC)">Post-Dated Cheque (PDC)</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Step 5: Notes & Remarks (Collapsible with arrow) */}
                <div className="rounded-xl border border-border/80 bg-muted/20 p-3 space-y-2">
                  <button
                    type="button"
                    onClick={() => setNotesOpen((prev) => !prev)}
                    className="w-full flex items-center justify-between cursor-pointer text-left"
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <FileText className="size-3 text-primary" />
                      <span>3. Frontline Interaction Notes</span>
                      <span className="text-[9.5px] font-normal text-muted-foreground/80">(Optional)</span>
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-semibold hover:text-foreground">
                      <span>Remarks</span>
                      {notesOpen ? (
                        <ChevronUp className="size-3.5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="size-3.5 text-muted-foreground" />
                      )}
                    </span>
                  </button>

                  {notesOpen && (
                    <div className="space-y-2 pt-0.5">
                      <textarea
                        rows={2}
                        value={feedbackNotes}
                        onChange={(e) => setFeedbackNotes(e.target.value)}
                        placeholder="Enter frontline remarks, customer statements, or commitments discussed..."
                        className="w-full rounded-xl border border-border bg-card p-2 text-xs text-foreground focus:outline-hidden focus:border-primary"
                      />
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        {[
                          "Salary credited on 5th",
                          "Promised UPI transfer by 6 PM",
                          "Met spouse at premises",
                          "Medical hardship cited",
                        ].map((chip) => (
                          <button
                            key={chip}
                            type="button"
                            onClick={() =>
                              setFeedbackNotes((prev) => (prev ? `${prev} · ${chip}` : chip))
                            }
                            className="rounded-md border border-border bg-card hover:bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground transition cursor-pointer"
                          >
                            + {chip}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/70">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="rounded-xl border border-border/80 px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStoreFeedback}
                className="rounded-xl bg-primary hover:bg-primary/90 px-4 py-2 text-xs font-bold text-primary-foreground transition shadow-sm flex items-center gap-2 cursor-pointer"
              >
                <Save className="size-3.5" />
                <span>Save Outcome &amp; Store Feedback</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NO ACTION DEFERRAL MODAL */}
      {noActionModalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <button
            aria-label="Close no action modal backdrop"
            className="absolute inset-0 bg-foreground/30 backdrop-blur-xs transition"
            onClick={() => setNoActionModalOpen(false)}
          />

          <div className="relative w-full max-w-lg rounded-2xl border border-border/80 bg-card p-6 shadow-2xl space-y-4 text-xs z-10">
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                  Frontline Scheduling &amp; Postponement
                </span>
                <h3 className="text-base font-bold text-foreground">Action Postponed / Not Taken</h3>
              </div>
              <button
                className="size-8 rounded-lg hover:bg-muted grid place-items-center text-muted-foreground hover:text-foreground cursor-pointer"
                onClick={() => setNoActionModalOpen(false)}
              >
                <X className="size-4" />
              </button>
            </div>

            <p className="text-muted-foreground leading-relaxed">
              Record why outreach action was deferred for <strong className="text-foreground">{c.name}</strong> and schedule the next follow-up touchpoint:
            </p>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Primary Reason for Non-Execution
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  "Customer Travel / Out of Station",
                  "Customer Unreachable / Phone Switched Off",
                  "Rescheduled to Alternate Shift",
                  "Awaiting Supervisor Credit Clearance",
                  "Regulatory Cooling-Off Window Active",
                  "Customer Escalated to Legal / Ombudsman",
                ].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setNotTakenReason(reason)}
                    className={`rounded-lg border p-2 text-xs font-bold text-left transition cursor-pointer ${
                      notTakenReason === reason
                        ? "border-rose-500 bg-rose-500/15 text-rose-900 dark:text-rose-200 shadow-xs"
                        : "border-border bg-muted/20 hover:bg-muted/40 text-foreground"
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Next Planned Outreach Date
                </label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full rounded-lg border border-border bg-card p-2 text-xs font-bold text-foreground focus:outline-hidden focus:border-primary cursor-pointer"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Collector Notes
                </label>
                <input
                  type="text"
                  value={notTakenNotes}
                  onChange={(e) => setNotTakenNotes(e.target.value)}
                  placeholder="Optional notes..."
                  className="w-full rounded-lg border border-border bg-card p-2 text-xs text-foreground focus:outline-hidden focus:border-primary"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border/70">
              <button
                type="button"
                onClick={() => setNoActionModalOpen(false)}
                className="px-3.5 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-bold text-foreground transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStoreNoActionFeedback}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Clock className="size-3.5" />
                <span>Save Deferral &amp; Update Timeline</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OPERATIONAL CONFIRMATION & REVIEW DRAWER */}
      {outreachDrawerOpen && (
        <div className="fixed inset-0 z-50">
          <button
            aria-label="Close outreach review drawer"
            className="absolute inset-0 bg-foreground/30 backdrop-blur-xs transition"
            onClick={() => setOutreachDrawerOpen(false)}
          />

          <aside className="absolute inset-y-0 right-0 w-full max-w-xl bg-card border-l p-6 shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                  Operational Decision Panel
                </span>
                <h3 className="text-lg font-bold text-foreground">Next Best Action · Review &amp; Confirmation</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Account AL-{c.acct} · {c.name} ({c.dpd} DPD · ${c.exp.toLocaleString()})
                </p>
              </div>
              <button
                className="size-8 rounded-lg hover:bg-muted grid place-items-center text-muted-foreground hover:text-foreground"
                onClick={() => setOutreachDrawerOpen(false)}
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-5 space-y-4 text-xs">
              {/* 1. CUSTOMER RESPONSE STATUS ("WHAT HE HAS RESPONDED OR NOT") */}
              <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="size-3.5 text-primary" />
                    <span className="font-bold text-foreground text-xs uppercase tracking-wider">
                      Customer Contact &amp; Response History
                    </span>
                  </div>
                  <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                    Last 30 Days
                  </span>
                </div>

                <div className="space-y-2">
                  {/* Phone Calls status */}
                  <div className="rounded-lg border border-border/60 bg-card p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Phone className="size-3.5 text-primary" />
                        <span className="font-bold text-foreground">Phone Outreach</span>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          c.reach >= 40
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                            : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {c.reach >= 40 ? "Connected · Discussion Logged" : "No Answer · Unreachable"}
                      </span>
                    </div>
                    <ul className="list-disc list-inside text-[11px] text-muted-foreground space-y-0.5 pt-0.5">
                      <li>Total outreach attempts: <strong>{c.touches} calls logged</strong>.</li>
                      <li>Last direct call attempt: <strong>{c.daysSinceOutreach}d ago</strong>.</li>
                      <li>
                        {c.reach >= 40
                          ? "Customer acknowledged balance, requested cure options; call completed."
                          : "Call rang out without answer; standard automated voicemail left."}
                      </li>
                    </ul>
                  </div>

                  {/* Email status */}
                  <div className="rounded-lg border border-border/60 bg-card p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Mail className="size-3.5 text-primary" />
                        <span className="font-bold text-foreground">Email &amp; Digital Notices</span>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          c.click > 20
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                            : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {c.click > 20 ? "Delivered · Link Clicked" : "Delivered · Opened"}
                      </span>
                    </div>
                    <ul className="list-disc list-inside text-[11px] text-muted-foreground space-y-0.5 pt-0.5">
                      <li>Dispatched notice: <strong>{c.content[0]}</strong> ({c.daysSinceOutreach + 3}d ago).</li>
                      <li>
                        Customer engagement: <strong>{c.open}% open rate</strong> · <strong>{c.click}% link click-through</strong>.
                      </li>
                      <li>Payment portal visited; self-service transaction pending.</li>
                    </ul>
                  </div>

                  {/* Field Visit status */}
                  <div className="rounded-lg border border-border/60 bg-card p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin className="size-3.5 text-primary" />
                        <span className="font-bold text-foreground">Field Recovery Visit</span>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          c.dpd >= 30
                            ? "bg-purple-500/15 text-purple-600 dark:text-purple-400"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {c.dpd >= 30 ? "Escalation Eligible (30+ DPD)" : "Not Initiated (<30 DPD)"}
                      </span>
                    </div>
                    <ul className="list-disc list-inside text-[11px] text-muted-foreground space-y-0.5 pt-0.5">
                      <li>Prior doorstep visits: <strong>None logged</strong>.</li>
                      <li>
                        {c.dpd >= 30
                          ? "Authorized for doorstep demand letter if phone and email remain unresponsive."
                          : "Policy prioritizes phone and email touchpoints for early-stage accounts."}
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Summary Highlight */}
                <div className="rounded-lg bg-primary/10 border border-primary/20 p-2.5 text-[11px] text-primary flex items-center gap-2">
                  <CheckCircle2 className="size-3.5 shrink-0" />
                  <span>
                    <strong>Response Summary:</strong>{" "}
                    {c.reach < 40
                      ? "Customer actively opens digital notices but has not answered direct telephone calls."
                      : "Customer answered previous telephone contact; pending execution of committed cure."}
                  </span>
                </div>
              </div>

              {/* 2. WHAT THE MANAGER CHOOSES (CHANNEL SELECTOR) */}
              <div className="rounded-xl border border-border/80 bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sliders className="size-3.5 text-primary" />
                    <span className="font-bold text-foreground text-xs uppercase tracking-wider">
                      Manager Channel Selection
                    </span>
                  </div>
                  <span className="text-[10.5px] text-muted-foreground">Select to override recommendation</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {rawCandidates.map((candidate) => {
                    const isSelected = drawerSelectedChannel === candidate.name;
                    const isRecommended = primaryRecommendation.code === candidate.code;

                    return (
                      <button
                        key={candidate.code}
                        type="button"
                        onClick={() => setDrawerSelectedChannel(candidate.name)}
                        className={`rounded-xl border p-3 text-left transition flex flex-col justify-between ${
                          isSelected
                            ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary"
                            : "border-border/70 bg-card hover:bg-muted/30"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <candidate.icon className={`size-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                            {isRecommended && (
                              <span className="rounded-full bg-primary/20 text-primary px-1.5 py-0.2 text-[8.5px] font-bold">
                                Recommended
                              </span>
                            )}
                          </div>
                          <div className="font-bold text-foreground text-xs">{candidate.label}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            Success: <strong className="text-foreground">{candidate.successRate}%</strong>
                          </div>
                        </div>

                        <div className="mt-2 pt-1.5 border-t border-border/60 text-[9.5px] flex items-center justify-between">
                          <span className="text-muted-foreground">Suitability:</span>
                          <span className="font-mono font-bold text-primary">
                            {(0.6 * (candidate.successRate / 100) + 0.4 * (candidate.responseRate / 100)).toFixed(3)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. TIME AND OTHER THINGS TO SELECT SO THAT WE CAN PROCEED */}
              <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="size-3.5 text-primary" />
                    <span className="font-bold text-foreground text-xs uppercase tracking-wider">
                      Contact Timing Window &amp; Objective
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground">09:00–18:00 Window</span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1.5">
                      Select Contact Window (Local Customer Timezone)
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {[
                        { time: "10:00 AM – 12:30 PM", label: "Morning", badge: "Recommended" },
                        { time: "02:00 PM – 04:00 PM", label: "Afternoon", badge: "Standard" },
                        { time: "04:00 PM – 06:00 PM", label: "Late Afternoon", badge: "Secondary" },
                      ].map((slot) => (
                        <button
                          key={slot.time}
                          type="button"
                          onClick={() => setDrawerSelectedTime(slot.time)}
                          className={`rounded-lg border px-3 py-2 text-left transition ${
                            drawerSelectedTime === slot.time
                              ? "border-primary bg-card ring-1 ring-primary shadow-xs"
                              : "border-border/70 bg-card/60 hover:bg-card text-muted-foreground"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                              {slot.label}
                            </span>
                            {slot.badge === "Recommended" && (
                              <span className="rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-1 py-0.2 text-[8px] font-bold">
                                Optimal
                              </span>
                            )}
                          </div>
                          <div className="font-mono font-bold text-foreground text-xs mt-0.5">{slot.time}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1.5">
                      Select Outreach Objective / Resolution Target
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {[
                        { id: "Immediate Partial Cure", label: "Partial Cure", desc: `$${Math.round(c.exp * 0.25).toLocaleString()} (25%)` },
                        { id: "Full Balance Cure", label: "Full Balance", desc: `$${c.exp.toLocaleString()}` },
                        { id: "Promise to Pay (PTP)", label: "Structured PTP", desc: "7-day commitment" },
                      ].map((obj) => (
                        <button
                          key={obj.id}
                          type="button"
                          onClick={() => setDrawerObjective(obj.id)}
                          className={`rounded-lg border p-2.5 text-left transition ${
                            drawerObjective === obj.id
                              ? "border-primary bg-card ring-1 ring-primary shadow-xs"
                              : "border-border/70 bg-card/60 hover:bg-card text-muted-foreground"
                          }`}
                        >
                          <div className="font-bold text-foreground text-xs">{obj.label}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">{obj.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. KEY ACTION POINTS ("GO WITH SOME POINTS !!") */}
              <div className="rounded-xl border border-border/80 bg-card p-4 space-y-2.5">
                <div className="flex items-center gap-2">
                  <FileText className="size-3.5 text-primary" />
                  <span className="font-bold text-foreground text-xs uppercase tracking-wider">
                    Operational Decision Summary Points
                  </span>
                </div>

                <div className="rounded-lg bg-muted/20 border border-border/60 p-3 space-y-2 text-[11px]">
                  <div className="flex items-start gap-2">
                    <span className="text-primary font-bold">•</span>
                    <span className="text-muted-foreground">
                      <strong>Delinquency &amp; Exposure:</strong> Account AL-{c.acct} has an outstanding overdue balance of{" "}
                      <strong className="text-foreground">${c.exp.toLocaleString()}</strong> at{" "}
                      <strong className="text-foreground">{c.dpd} DPD</strong> ({riskBucket}).
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-primary font-bold">•</span>
                    <span className="text-muted-foreground">
                      <strong>Repayment Track:</strong> Customer exhibits <strong>{c.repaymentType.toLowerCase()}</strong> behavior with{" "}
                      <strong className="text-foreground">{c.cov}%</strong> historical coverage ratio; {c.pays} payments in the last 30 days.
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-primary font-bold">•</span>
                    <span className="text-muted-foreground">
                      <strong>Regulatory Clearance:</strong> 48-hour cooldown verified (<strong>{c.daysSinceOutreach}d elapsed</strong>), DNC registry clear, allowed 09:00–18:00 window.
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-primary font-bold">•</span>
                    <span className="text-muted-foreground">
                      <strong>Follow-up Process:</strong> Approving schedules{" "}
                      <strong className="text-foreground">{drawerSelectedChannel}</strong> for{" "}
                      <strong className="text-foreground">{drawerSelectedTime}</strong> targeting{" "}
                      <strong className="text-foreground">{drawerObjective}</strong>, followed by standard {c.cad[0].toLowerCase()} cadence.
                    </span>
                  </div>
                </div>
              </div>

              {/* 5. ACCEPT OR REJECT ACCORDINGLY */}
              <div className="pt-2 border-t border-border/70 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setOutreachDrawerOpen(false);
                    setRejectionModalOpen(true);
                  }}
                  className="flex-1 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 py-2.5 text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5"
                >
                  <X className="size-3.5" /> Reject Action
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setOverrideChannel(drawerSelectedChannel);
                    setSelectedTimingWindow(drawerSelectedTime);
                    setCollectorStatus("APPROVED");
                    setOutreachDrawerOpen(false);
                    const channelLabel =
                      drawerSelectedChannel === "Phone calls"
                        ? "Phone Call"
                        : drawerSelectedChannel === "Mails"
                          ? "Email"
                          : "Field Visit";
                    toast.success(`Action approved: ${channelLabel} scheduled for ${drawerSelectedTime}`);
                    setTimelineList((prev) => [
                      {
                        title: `NBA Approved: ${channelLabel} (${drawerSelectedTime})`,
                        category: "Next Best Action",
                        time: "Just now",
                        status: `Approved · ${drawerObjective}`,
                        tone: "green",
                      },
                      ...prev,
                    ]);
                  }}
                  className="flex-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground py-2.5 text-xs font-bold transition shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Check className="size-3.5" /> Accept &amp; Schedule Action
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}
      {/* REJECTION ACTION MODAL */}
      {rejectionModalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <button
            aria-label="Close rejection modal backdrop"
            className="absolute inset-0 bg-foreground/30 backdrop-blur-xs transition"
            onClick={() => setRejectionModalOpen(false)}
          />

          <div className="relative w-full max-w-lg rounded-2xl border border-border/80 bg-card p-6 shadow-2xl space-y-4 text-xs z-10">
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                  Supervisor &amp; Compliance Audit
                </span>
                <h3 className="text-base font-bold text-foreground">Reject Next Best Action</h3>
              </div>
              <button
                className="size-8 rounded-lg hover:bg-muted grid place-items-center text-muted-foreground hover:text-foreground"
                onClick={() => setRejectionModalOpen(false)}
              >
                <X className="size-4" />
              </button>
            </div>

            <p className="text-muted-foreground leading-relaxed">
              Decline the prescribed <strong className="text-foreground">{actionHeadline}</strong> via{" "}
              <strong className="text-foreground">{channelDisplayLabel}</strong> for {c.name}. Select the verified operational reason to record in the compliance audit trail:
            </p>

            <div className="space-y-2">
              {[
                {
                  id: "Customer Requested Hardship Pause",
                  label: "Customer Requested Hardship Pause",
                  desc: "Customer reported emergency or medical disruption; temporary contact hold requested.",
                },
                {
                  id: "Incorrect / Disputed Contact Details",
                  label: "Incorrect or Disputed Contact Details",
                  desc: "Phone or email endpoint on file bounced or flagged as unverified.",
                },
                {
                  id: "Disputed Balance / Escalated to Disputes",
                  label: "Disputed Balance / Sent to Disputes",
                  desc: "Customer raised formal dispute over invoice or transaction balance.",
                },
                {
                  id: "Collector Judgment Override",
                  label: "Collector Operational Judgment",
                  desc: "Collector evaluated offline account circumstances requiring an alternate approach.",
                },
                {
                  id: "Promise to Pay Already Handled Offline",
                  label: "Promise to Pay Handled Offline",
                  desc: "Payment commitment was received via physical branch or banking app.",
                },
              ].map((reason) => (
                <label
                  key={reason.id}
                  onClick={() => setRejectionReason(reason.id)}
                  className={`block rounded-xl border p-3 cursor-pointer transition ${
                    rejectionReason === reason.id
                      ? "border-rose-500/50 bg-rose-500/10 text-rose-950 dark:text-rose-100"
                      : "border-border/60 bg-muted/20 hover:bg-muted/40 text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="rejectionReason"
                      checked={rejectionReason === reason.id}
                      onChange={() => setRejectionReason(reason.id)}
                      className="text-rose-600 focus:ring-rose-500"
                    />
                    <span className="font-bold text-xs">{reason.label}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 ml-5">{reason.desc}</p>
                </label>
              ))}
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                Additional Compliance Notes (Optional)
              </label>
              <textarea
                rows={2}
                value={rejectionNotes}
                onChange={(e) => setRejectionNotes(e.target.value)}
                placeholder="Enter details for branch supervisor audit log..."
                className="w-full rounded-lg border border-border/80 bg-muted/20 p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/70">
              <button
                type="button"
                onClick={() => setRejectionModalOpen(false)}
                className="rounded-xl border border-border/80 px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectNBA}
                className="rounded-xl bg-rose-600 hover:bg-rose-700 px-4 py-2 text-xs font-bold text-white transition shadow-sm"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHANGE CHANNEL NAVIGATION / MODAL */}
      {changeChannelModalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <button
            aria-label="Close change channel modal backdrop"
            className="absolute inset-0 bg-foreground/30 backdrop-blur-xs transition"
            onClick={() => setChangeChannelModalOpen(false)}
          />

          <div className="relative w-full max-w-lg rounded-2xl border border-border/80 bg-card p-6 shadow-2xl space-y-4 text-xs z-10">
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                  Channel Selection &amp; Navigation
                </span>
                <h3 className="text-base font-bold text-foreground">Change Outreach Channel</h3>
              </div>
              <button
                className="size-8 rounded-lg hover:bg-muted grid place-items-center text-muted-foreground hover:text-foreground"
                onClick={() => setChangeChannelModalOpen(false)}
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="rounded-xl border border-border/70 bg-muted/30 p-3 text-xs flex justify-between items-center">
              <div>
                <span className="font-bold text-foreground">{c.name}</span> ({c.acct})
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Due: ${c.exp.toLocaleString()} · {c.dpd} DPD ({riskBucket})
                </div>
              </div>
              <span className="rounded-md bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">
                Current: {channelDisplayLabel}
              </span>
            </div>

            {/* CHANNEL CHOICES: ONLY Phone Call, Email, Field Visit */}
            <div className="space-y-2">
              <label className="block text-[11px] font-semibold text-muted-foreground">
                Select Communication Channel (Only Supported Recovery Channels)
              </label>

              {rawCandidates.map((cand) => {
                const isSelected = selectedChannelChoice === cand.name || selectedChannelChoice === cand.label;
                return (
                  <div
                    key={cand.code}
                    onClick={() => setSelectedChannelChoice(cand.name)}
                    className={`rounded-xl border p-3.5 cursor-pointer transition flex items-center justify-between gap-3 ${
                      isSelected
                        ? "border-primary bg-primary/10 shadow-xs"
                        : "border-border/70 bg-muted/20 hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`size-9 rounded-lg grid place-items-center ${
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <cand.icon className="size-4" />
                      </div>
                      <div>
                        <div className="font-bold text-foreground text-xs flex items-center gap-1.5">
                          {cand.label}
                          {cand.name === primaryRecommendation.name && (
                            <span className="rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.2 text-[9px] font-bold">
                              Model Prescribed
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          Success: <strong>{cand.successRate}%</strong> · Response: <strong>{cand.responseRate}%</strong>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          cand.permitted
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {cand.permitted ? "Permitted" : "Requires Exception"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* TIMING WINDOW SELECTOR */}
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1.5">
                Preferred Contact Timing Window (09:00–18:00 Approved)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  "10:00 AM – 12:30 PM",
                  "02:00 PM – 04:00 PM",
                  "04:00 PM – 06:00 PM",
                ].map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setSelectedTimingWindow(slot)}
                    className={`rounded-lg border p-2 text-center text-xs font-semibold transition ${
                      selectedTimingWindow === slot
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40"
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>

            {/* COMPLIANCE & ELIGIBILITY VERIFICATION STRIP */}
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5 flex items-center gap-2 text-[11px] text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="size-4 shrink-0" />
              <span>
                Selected channel verified against compliance policy (Consent Active, DNC Clear, Permitted Window).
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/70">
              <button
                type="button"
                onClick={() => setChangeChannelModalOpen(false)}
                className="rounded-xl border border-border/80 px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleChangeChannelSubmit(selectedChannelChoice, selectedTimingWindow)}
                className="rounded-xl bg-primary hover:bg-primary/90 px-4 py-2 text-xs font-bold text-primary-foreground transition shadow-sm"
              >
                Apply Channel Update
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
