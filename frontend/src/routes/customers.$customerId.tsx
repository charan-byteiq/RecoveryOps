import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Check, Phone, X } from "lucide-react";
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

          {/* 3. Communication Preferences */}
          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">Communication Preferences</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Preference affinity & post-due activity
              </p>

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
              <span className="text-muted-foreground">Optimal response window</span>
              <span className="font-semibold text-foreground">{c.rsp}</span>
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
          {/* Card 5: Why this action (Left 5 cols) */}
          <div className="lg:col-span-5 rounded-2xl border border-border/80 bg-card p-5 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">Why this action</h3>
              <p className="text-xs text-muted-foreground mb-3">Signals behind the recommendation</p>

              <div className="space-y-2.5 text-xs">
                <div className="rounded-xl border border-border/60 bg-muted/20 p-3 text-foreground leading-relaxed">
                  Repayment coverage is <b>{c.cov}%</b> ({c.repaymentType.toLowerCase()}), with{" "}
                  <b>{c.daysToRepay} days</b> turnaround time to repay.
                </div>
                <div className="rounded-xl border border-border/60 bg-muted/20 p-3 text-foreground leading-relaxed">
                  <b>{bTouch}</b> demonstrates the highest affinity score (<b>{c.aff[0]![1]}</b>) for
                  this borrower.
                </div>
                <div className="rounded-xl border border-border/60 bg-muted/20 p-3 text-foreground leading-relaxed">
                  {c.reach < 40
                    ? `Response rate is low (${c.reach}%), so a direct ${bTouch.toLowerCase()} approach with the ${c.content[0]} is prioritized over automated reminders.`
                    : `Customer shows responsive engagement (${c.reach}%), making the ${c.content[0]} optimal for fast resolution.`}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t text-[11px] text-muted-foreground flex justify-between items-center">
              <span>Primary Outreach Method:</span>
              <span className="font-bold text-primary">{bTouch}</span>
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
    </AppShell>
  );
}
