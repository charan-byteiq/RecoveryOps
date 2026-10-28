import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Check, Phone, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { CUSTOMERS, bestChannel, type CustomerData } from "@/data/customer-nba-data";

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
  const [timelineList, setTimelineList] = useState([
    {
      title: `${bestChannel(c)} outreach`,
      category: "Outreach",
      time: "2d ago",
      status: c.reach > 40 ? "Response received" : "No response",
      tone: "blue",
    },
    {
      title: `Content sent: ${c.content[0]}`,
      category: "Engagement",
      time: "5d ago",
      status: `Opened${c.click > 30 ? " and clicked" : ""}`,
      tone: "green",
    },
    {
      title: "Payment received",
      category: "Payment",
      time: `${c.last}d ago`,
      status: "Applied to account",
      tone: "green",
    },
    {
      title: `Reminder via ${c.aff[1] ? c.aff[1][0] : "SMS"}`,
      category: "Outreach",
      time: `${c.last + 7}d ago`,
      status: "Delivered",
      tone: "blue",
    },
  ]);

  const bCh = bestChannel(c);
  const fallbackCh = c.aff[1] ? c.aff[1][0] : "SMS";

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
        category: "Outreach",
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
                {c.id} · Account {c.acct} · Exposure ${c.exp.toLocaleString()}
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
                  Payment Coverage
                </div>
                <div className="mt-0.5 text-2xl font-bold text-foreground">{c.cov}%</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Best Channel
                </div>
                <div className="mt-0.5 text-xl font-bold text-primary">{bCh}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Cadence
                </div>
                <div className="mt-0.5 text-xl font-bold text-foreground">{c.cad[0]}</div>
              </div>
            </div>
          </div>
        </div>

        {/* 3 MODEL DETAIL CARDS */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          {/* 1. Engagement Model · Content */}
          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">Engagement Model · Content</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Recommended content and message purpose
              </p>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Content category</span>
                  <span className="font-bold text-primary">{c.content[0]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Message purpose</span>
                  <span className="font-semibold text-foreground text-right max-w-[180px]">
                    {c.content[1]}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Open rate</span>
                  <span className="font-semibold text-foreground">{c.open}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Click rate</span>
                  <span className="font-semibold text-foreground">{c.click}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Response rate</span>
                  <span className="font-semibold text-foreground">{c.reach}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Payment Model · Cadence */}
          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">Payment Model · Cadence</h3>
              <p className="text-xs text-muted-foreground mb-4">Payment recency and frequency</p>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Contact attempts</span>
                  <span className="font-semibold text-foreground">{c.touches}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payments in last 30 days</span>
                  <span className="font-semibold text-foreground">{c.pays}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Days since last payment</span>
                  <span className="font-semibold text-foreground">{c.last}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment coverage ratio</span>
                  <span className="font-semibold text-foreground">{c.cov}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Contact frequency</span>
                  <span className="font-semibold text-foreground">{c.cad[1]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Recommended cadence</span>
                  <span className="font-bold text-primary">{c.cad[0]}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Outreach Model · Channel */}
          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">Outreach Model · Channel</h3>
              <p className="text-xs text-muted-foreground mb-4">Channel affinity score</p>

              <div className="space-y-2.5">
                {c.aff.map(([name, score], idx) => {
                  const chObj = c.ch.find((x) => x[0] === name);
                  const successRate = chObj ? chObj[1] : 0;
                  return (
                    <div key={name}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">
                          {name} <small>(success {successRate}%)</small>
                        </span>
                        <span
                          className={`font-bold ${idx === 0 ? "text-primary" : "text-foreground"}`}
                        >
                          {score}
                          {idx === 0 ? " · Best" : ""}
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full ${idx === 0 ? "bg-primary" : "bg-muted-foreground/40"}`}
                          style={{ width: `${Math.min(100, score)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 border-t pt-2.5 flex justify-between text-xs">
              <span className="text-muted-foreground">Best response window</span>
              <span className="font-semibold text-foreground">{c.rsp}</span>
            </div>
          </div>
        </div>

        {/* 2 COLUMN MID ROW: Contacts/Payments chart & Why this action */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          {/* Card 4: Contact attempts and payments */}
          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
            <h3 className="text-sm font-bold text-foreground">Contact attempts and payments</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Last 4 weeks · helps set follow-up timing
            </p>

            <div className="flex items-end gap-4 h-28 my-3 pb-2 border-b">
              {wk.map((v, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 text-[11px]">
                  <div
                    className="w-full rounded-t-md bg-primary transition-all duration-300"
                    style={{ height: `${(v / maxWk) * 80}px` }}
                  />
                  <span className="text-muted-foreground text-[10px]">Week {i + 1}</span>
                  <span className="font-semibold text-foreground text-[11px] text-center">
                    {v} contacts
                    {pw[i] ? " · paid" : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Card 5: Why this action */}
          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
            <h3 className="text-sm font-bold text-foreground">Why this action</h3>
            <p className="text-xs text-muted-foreground mb-4">Signals behind the recommendation</p>

            <div className="space-y-2.5 text-xs">
              <div className="rounded-xl border border-border/60 bg-muted/20 p-3 text-foreground">
                Payment coverage is <b>{c.cov}%</b> and the last payment was <b>{c.last}</b> days
                ago.
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/20 p-3 text-foreground">
                <b>{bCh}</b> has the highest affinity (<b>{c.aff[0]![1]}</b>) for this customer.
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/20 p-3 text-foreground">
                {c.reach < 40
                  ? `Response rate is low (${c.reach}%), so a ${bCh.toLowerCase()} touch is preferred over digital reminders.`
                  : `Responsive customer (${c.reach}%), so ${c.content[0].toLowerCase()} content should land effectively.`}
              </div>
            </div>
          </div>
        </div>

        {/* HERO NBA PRESCRIPTION CARD */}
        <div className="rounded-2xl overflow-hidden border border-primary/40 bg-gradient-to-br from-primary to-blue-800 text-primary-foreground shadow-md">
          {/* Header */}
          <div className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <span className="inline-block rounded-md bg-white/20 px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase">
                Next Best Action · Prescribed
              </span>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">
                {c.content[0]} via {bCh}
              </h2>
              <p className="mt-0.5 text-xs text-white/85">
                {c.cad[0]} · best window {c.rsp}
              </p>
            </div>
            <button
              onClick={() => setDrawerOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-primary shadow-sm hover:bg-white/95 transition shrink-0"
            >
              <Phone className="size-3.5" /> Record Outcome
            </button>
          </div>

          {/* Body Cards */}
          <div className="bg-card text-foreground p-6 grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Content · Engagement
              </div>
              <p className="mt-1 text-xs">
                <b className="text-foreground">{c.content[0]}</b>
                <br />
                <span className="text-muted-foreground">{c.content[1]}</span>
              </p>
            </div>

            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Channel · Outreach
              </div>
              <p className="mt-1 text-xs">
                <b className="text-foreground">{bCh}</b>
                <br />
                <span className="text-muted-foreground">Fallback: {fallbackCh}</span>
              </p>
            </div>

            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Cadence · Payment
              </div>
              <p className="mt-1 text-xs">
                <b className="text-foreground">{c.cad[0]}</b>
                <br />
                <span className="text-muted-foreground">
                  Review again after {c.cad[1].toLowerCase()} contact
                </span>
              </p>
            </div>

            <div className="md:col-span-3 border-t pt-4 flex flex-wrap justify-end gap-3">
              <button
                onClick={() => toast.info("Alternative contact channel flagged for follow-up.")}
                className="rounded-xl border border-border/80 bg-card px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition"
              >
                Change Channel
              </button>
              <button
                onClick={() => toast.success(`Action approved for ${c.name}`)}
                className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition shadow-xs"
              >
                Approve Action
              </button>
            </div>
          </div>
        </div>

        {/* ACTIVITY TIMELINE CARD */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
          <h3 className="text-sm font-bold text-foreground">Activity timeline</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Recent outreach, content and payment events
          </p>

          <div className="border-l-2 border-border/80 ml-3 pl-4 space-y-3">
            {timelineList.map((item, i) => (
              <div key={i} className="rounded-xl border border-border/60 bg-muted/20 p-3 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-foreground">{item.title}</span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    {item.category}
                  </span>
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                    {item.status}
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">{item.time}</div>
              </div>
            ))}
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
                <h3 className="text-lg font-bold text-foreground">Record Call Outcome</h3>
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
                  ${c.exp.toLocaleString()} balance · {c.dpd} DPD
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Action Executed
                </label>
                <div className="rounded-lg border bg-card p-2.5 font-semibold flex items-center gap-2">
                  <Phone className="size-3.5 text-primary" /> {bCh} to Customer
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  Call Disposition
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
                  Agent Call Notes
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
    </AppShell>
  );
}
