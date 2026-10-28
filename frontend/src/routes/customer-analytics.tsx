import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppShell } from "@/components/app-shell";
import {
  CUSTOMERS,
  TOUCHPOINT_METHODS,
  TEMPLATES,
  TIMING_CYCLES,
  bestTouchpoint,
  formatCurrency,
} from "@/data/customer-nba-data";

export const Route = createFileRoute("/customer-analytics")({
  head: () => ({
    meta: [
      { title: "Customer Portfolio Analytics — RecoveryOps" },
      {
        name: "description",
        content: "Template recommendations, contact methods, and repayment behavior.",
      },
    ],
  }),
  component: CustomerPortfolioAnalytics,
});

function CustomerPortfolioAnalytics() {
  const customers = CUSTOMERS;
  const hi = customers.filter((c) => c.tier === "High").length;
  const me = customers.filter((c) => c.tier === "Medium").length;
  const lo = customers.filter((c) => c.tier === "Low").length;

  const nb: Record<string, number> = {};
  customers.forEach((c) => {
    const tp = bestTouchpoint(c);
    nb[tp] = (nb[tp] || 0) + 1;
  });

  const avgCov = Math.round(customers.reduce((s, c) => s + c.cov, 0) / customers.length);
  const avgOpen = Math.round(customers.reduce((s, c) => s + c.open, 0) / customers.length);
  const avgClick = Math.round(customers.reduce((s, c) => s + c.click, 0) / customers.length);
  const avgReach = Math.round(customers.reduce((s, c) => s + c.reach, 0) / customers.length);
  const avgDaysToRepay = Math.round(
    customers.reduce((s, c) => s + c.daysToRepay, 0) / customers.length,
  );
  const contactedCustomers = customers.filter((c) => c.touches > 0);
  const zeroOutreachCount = customers.filter((c) => c.touches === 0).length;
  const contactedCount = contactedCustomers.length;
  const avgTouches = Math.round(
    contactedCustomers.reduce((s, c) => s + c.touches, 0) / (contactedCount || 1),
  );
  const avgDaysSinceOutreach = Math.round(
    contactedCustomers.reduce((s, c) => s + c.daysSinceOutreach, 0) / (contactedCount || 1),
  );

  const fullRepayCount = customers.filter((c) => c.repaymentType === "Full Repayment").length;
  const partialRepayCount = customers.filter((c) => c.repaymentType === "Partial Repayment").length;

  const topTouchpointEntry = Object.entries(nb).sort((a, b) => b[1] - a[1])[0];
  const topTouchpoint = topTouchpointEntry ? topTouchpointEntry[0] : "Direct Phone";

  const touchMethods = useMemo(() => {
    return TOUCHPOINT_METHODS.map((n) => {
      const a = customers
        .map((c) => c.ch.find((x) => x[0] === n))
        .filter((x): x is [string, number] => Boolean(x));
      const avgSuccess = Math.round(a.reduce((s, x) => s + x[1], 0) / a.length);
      const totalAttempts = customers.reduce(
        (sum, c) => sum + (c.methodAttempts[n]?.attempts || 0),
        0,
      );
      return { name: n, success: avgSuccess, attempts: totalAttempts };
    });
  }, [customers]);

  const combo = useMemo(() => {
    const map: Record<string, { n: number; High: number; Medium: number; Low: number }> = {};
    customers.forEach((c) => {
      const k = `${c.content[0]} → ${bestTouchpoint(c)} → ${c.cad[0]}`;
      if (!map[k]) map[k] = { n: 0, High: 0, Medium: 0, Low: 0 };
      map[k].n += 1;
      map[k][c.tier as "High" | "Medium" | "Low"] += 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1].n - a[1].n)
      .slice(0, 6);
  }, [customers]);

  // Donut chart calculation
  const totalTier = hi + me + lo;
  const hiDeg = (hi / totalTier) * 360;
  const meDeg = (me / totalTier) * 360;
  const conicGradient = `conic-gradient(var(--color-destructive, #d93a3a) 0deg ${hiDeg}deg, #e8890c ${hiDeg}deg ${hiDeg + meDeg}deg, #12a36b ${hiDeg + meDeg}deg 360deg)`;

  return (
    <AppShell
      title="Customer Portfolio Analytics"
      section="Customer Level"
      subtitle="Next Best Actions"
      actions={
        <div className="flex items-center gap-3">
          <Link
            to="/worklist"
            className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 transition"
          >
            Open Priority Worklist
          </Link>
          <span className="hidden sm:inline-block rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
            Refreshed: Oct 28, 2026
          </span>
        </div>
      }
    >
      <div className="mx-auto max-w-[1280px] space-y-4">
        {/* HERO CARD - CUSTOMER INTELLIGENCE */}
        <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card to-muted/20 p-6 shadow-sm">
          {/* Subtle background glow */}
          <div className="pointer-events-none absolute -top-12 -right-12 h-44 w-44 rounded-full bg-primary/10 blur-3xl" />

          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
              Customer Intelligence
            </h2>
            <p className="mt-1 text-xs text-muted-foreground max-w-2xl leading-relaxed">
              Data driven insights to help prioritize customers ,improve repayment outcomes and guide recovery decisions.
            </p>
          </div>

          {/* METRIC TILES */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-border/70 bg-card/80 p-3.5 backdrop-blur-xs transition hover:border-border">
              <div className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
                Customers in Scope
              </div>
              <div className="mt-1.5 text-3xl font-extrabold text-primary">{customers.length}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">Active borrower queue</div>
            </div>

            <div className="rounded-xl border border-border/70 bg-card/80 p-3.5 backdrop-blur-xs transition hover:border-border">
              <div className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
                High Priority
              </div>
              <div className="mt-1.5 text-3xl font-extrabold text-destructive">{hi}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                {Math.round((hi / customers.length) * 100)}% requiring immediate action
              </div>
            </div>

            <div className="rounded-xl border border-border/70 bg-card/80 p-3.5 backdrop-blur-xs transition hover:border-border">
              <div className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
                Avg Repayment Ratio
              </div>
              <div className="mt-1.5 text-3xl font-extrabold text-foreground">{avgCov}%</div>
              <div className="mt-1 text-[11px] text-muted-foreground">Delinquency recovery coverage</div>
            </div>

            <div className="rounded-xl border border-border/70 bg-card/80 p-3.5 backdrop-blur-xs transition hover:border-border">
              <div className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
                Top Communication Preference
              </div>
              <div className="mt-1.5 text-2xl font-extrabold text-foreground truncate">{topTouchpoint}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">Highest conversion method</div>
            </div>
          </div>
        </div>

        {/* SUGGESTED ACTIONS HERO / PLAYBOOK ROW */}
        <div className="rounded-2xl border-2 border-fuchsia-500/40 bg-card overflow-hidden shadow-xl ring-1 ring-fuchsia-500/20">
          <div
            className="flex flex-wrap items-center justify-between gap-3 text-white p-5 border-b-2 border-fuchsia-300/40 shadow-sm"
            style={{
              background: "linear-gradient(90deg, #7828c8 0%, #8b2fc9 35%, #a832c7 70%, #c432b8 100%)",
            }}
          >
            <div>
              <h3 className="text-xl font-extrabold tracking-tight text-white">Suggested Actions</h3>
              <p className="mt-0.5 text-xs text-fuchsia-100/90 font-medium">
                Suggested Template → Communication Preference → Follow-up Timing
              </p>
            </div>
            <Link
              to="/worklist"
              className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-bold text-[#7828c8] shadow-sm hover:bg-fuchsia-50 active:scale-95 transition"
            >
              Open the priority worklist →
            </Link>
          </div>

          <div className="p-5 space-y-4">
            {/* Priority scoring banner with AI gradient accent */}
            <div className="rounded-xl border-2 border-transparent bg-gradient-to-r from-violet-600/10 via-pink-600/10 to-amber-500/10 p-4 shadow-sm [background-clip:padding-box,border-box]">
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold bg-gradient-to-r from-violet-600 via-pink-600 to-amber-500 bg-clip-text text-transparent">
                    Priority scoring
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  Combined signal from engagement, repayment, and outreach behavior
                </span>
              </div>
              <p className="text-xs text-foreground mb-3">
                <b className="bg-gradient-to-r from-violet-600 to-pink-600 bg-clip-text text-transparent font-bold">
                  {hi} of {customers.length} customers ({Math.round((hi / customers.length) * 100)}%)
                </b>{" "}
                are high priority and should be worked first.
              </p>

              {/* Stacked Priority bar */}
              <div className="flex h-3.5 w-full rounded-full overflow-hidden bg-muted">
                <div style={{ width: `${(hi / customers.length) * 100}%` }} className="bg-destructive" />
                <div style={{ width: `${(me / customers.length) * 100}%` }} className="bg-amber-500" />
                <div style={{ width: `${(lo / customers.length) * 100}%` }} className="bg-emerald-500" />
              </div>

              {/* Legend chips */}
              <div className="mt-3 flex flex-wrap gap-2.5 text-xs">
                <div className="flex items-center gap-2 rounded-lg border border-border/80 bg-card px-3 py-1.5">
                  <span className="inline-flex items-center rounded-full bg-destructive/15 px-2 py-0.5 text-[11px] font-semibold text-destructive">
                    High Priority
                  </span>
                  <b className="text-sm font-bold text-foreground">{hi}</b>
                  <span className="text-muted-foreground text-[11px]">
                    {Math.round((hi / customers.length) * 100)}%
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-border/80 bg-card px-3 py-1.5">
                  <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                    Medium Priority
                  </span>
                  <b className="text-sm font-bold text-foreground">{me}</b>
                  <span className="text-muted-foreground text-[11px]">
                    {Math.round((me / customers.length) * 100)}%
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-border/80 bg-card px-3 py-1.5">
                  <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    Low Priority
                  </span>
                  <b className="text-sm font-bold text-foreground">{lo}</b>
                  <span className="text-muted-foreground text-[11px]">
                    {Math.round((lo / customers.length) * 100)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Play cards */}
            <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {combo.map(([k, o], idx) => {
                const parts = k.split(" → ");
                const t = parts[0] || "";
                const c = parts[1] || "";
                const f = parts[2] || "";
                return (
                  <div
                    key={k}
                    className={`flex items-start gap-3.5 rounded-xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-md ${
                      idx === 0
                        ? "border-[#a832c7]/60 bg-[#a832c7]/5 shadow-xs ring-1 ring-[#a832c7]/20"
                        : "border-border/80 bg-card"
                    }`}
                  >
                    <div
                      className={`shrink-0 min-w-[72px] rounded-xl px-2 py-3 text-center flex flex-col items-center justify-center ${
                        idx === 0
                          ? "text-white shadow-xs"
                          : "bg-fuchsia-50 dark:bg-fuchsia-950/40 text-[#7828c8] dark:text-fuchsia-300 border border-fuchsia-200/50"
                      }`}
                      style={
                        idx === 0
                          ? { background: "linear-gradient(135deg, #7828c8 0%, #c432b8 100%)" }
                          : undefined
                      }
                    >
                      <b className="block text-2xl font-extrabold leading-none">{o.n}</b>
                      <span className="text-[8px] font-bold uppercase tracking-wider opacity-90 mt-1 block whitespace-nowrap">
                        Borrowers
                      </span>
                    </div>

                    <div className="flex-1 min-w-0 space-y-1.5 text-xs">
                      <div className="flex items-start gap-1.5">
                        <span className="flex size-4 shrink-0 items-center justify-center rounded bg-[#7828c8]/10 text-[9px] font-bold text-[#7828c8] mt-0.5">
                          T
                        </span>
                        <div className="flex-1 font-semibold text-foreground leading-snug">
                          {t}
                          {idx === 0 && (
                            <span
                              className="ml-1.5 inline-block rounded-full px-2 py-0.2 text-[9px] font-extrabold text-white"
                              style={{ background: "linear-gradient(90deg, #7828c8, #c432b8)" }}
                            >
                              TOP PLAY
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <span className="flex size-4 shrink-0 items-center justify-center rounded bg-[#7828c8]/10 text-[9px] font-bold text-[#7828c8]">
                          C
                        </span>
                        <span className="font-medium text-foreground/80">{c}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <span className="flex size-4 shrink-0 items-center justify-center rounded bg-[#7828c8]/10 text-[9px] font-bold text-[#7828c8]">
                          F
                        </span>
                        <span>{f}</span>
                      </div>
                      {/* Priority distribution tags */}
                      <div className="flex gap-1.5 pt-1 flex-wrap">
                        {o.High > 0 && (
                          <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">
                            High {o.High}
                          </span>
                        )}
                        {o.Medium > 0 && (
                          <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                            Medium {o.Medium}
                          </span>
                        )}
                        {o.Low > 0 && (
                          <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                            Low {o.Low}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 3 CORE SECTIONS ROW */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          {/* Card 1: Suggested Templates */}
          <div className="rounded-2xl border-t-4 border-t-primary border-x border-b border-border/80 bg-card p-5 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">Suggested Templates</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Recommended messaging template by customer responsiveness
              </p>

              <div className="space-y-3">
                {TEMPLATES.map((name) => {
                  const cnt = customers.filter((c) => c.content[0] === name).length;
                  const pct = Math.round((cnt / customers.length) * 100);
                  return (
                    <div key={name}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground truncate max-w-[210px]">{name}</span>
                        <span className="font-bold text-foreground">{cnt}</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 border-t pt-3 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Template open rate</span>
                <span className="font-bold text-foreground">{avgOpen}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Link interaction rate</span>
                <span className="font-bold text-foreground">{avgClick}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Customer response rate</span>
                <span className="font-bold text-foreground">{avgReach}%</span>
              </div>
            </div>
          </div>

          {/* Card 2: Repayment Behavior */}
          <div className="rounded-2xl border-t-4 border-t-emerald-500 border-x border-b border-border/80 bg-card p-5 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">Repayment Behavior</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Turnaround time & partial vs full settlement breakdown
              </p>

              <div className="space-y-3">
                {TIMING_CYCLES.map((name) => {
                  const cnt = customers.filter((c) => c.cad[0] === name).length;
                  const pct = Math.round((cnt / customers.length) * 100);
                  return (
                    <div key={name}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Follow-up: {name}</span>
                        <span className="font-bold text-foreground">{cnt}</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 border-t pt-3 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Avg time taken to repay</span>
                <span className="font-bold text-foreground">{avgDaysToRepay} days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Full repayment profile</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {fullRepayCount} customers
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Partial repayment profile</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  {partialRepayCount} customers
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Repayment coverage ratio</span>
                <span className="font-bold text-foreground">{avgCov}%</span>
              </div>
            </div>
          </div>

          {/* Card 3: Communication Preferences */}
          <div className="rounded-2xl border-t-4 border-t-amber-500 border-x border-b border-border/80 bg-card p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start gap-2">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Communication Preferences</h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    Post-due date touches & method success rate
                  </p>
                </div>
                {zeroOutreachCount > 0 && (
                  <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                    {zeroOutreachCount} uncontacted
                  </span>
                )}
              </div>

              {/* Bar graph */}
              <div className="flex items-end gap-3 h-28 pt-2 pb-2 border-b">
                {touchMethods.map(({ name, success, attempts }) => (
                  <div key={name} className="flex-1 flex flex-col items-center justify-end h-full gap-1.5 text-[11px]">
                    <div className="w-full flex-1 flex items-end">
                      <div
                        className="w-full rounded-t-md bg-amber-500 transition-all duration-300"
                        style={{ height: `${Math.round((success / 100) * 58)}px` }}
                      />
                    </div>
                    <span className="text-muted-foreground truncate max-w-[80px] text-[10px]">
                      {name}
                    </span>
                    <span className="font-bold text-foreground text-xs leading-none">
                      {success}% <span className="text-[10px] font-normal text-muted-foreground">({attempts})</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-3 space-y-1.5 text-xs">
              <div className="flex justify-between text-muted-foreground pb-1 border-b">
                <span>Avg follow-ups post due-date</span>
                <span className="font-bold text-foreground">{avgTouches} touches</span>
              </div>
              <div className="flex justify-between text-muted-foreground pb-1 border-b">
                <span>Avg days since last outreach</span>
                <span className="font-bold text-foreground">{avgDaysSinceOutreach} days</span>
              </div>
              <div className="flex justify-between text-muted-foreground pb-1 border-b">
                <span>Accounts contacted after due-date</span>
                <span className="font-bold text-foreground">
                  {contactedCount}/{customers.length} ({Math.round((contactedCount / customers.length) * 100)}%)
                </span>
              </div>
              {touchMethods.map(({ name, attempts }) => (
                <div key={name} className="flex justify-between">
                  <span className="text-muted-foreground">{name}</span>
                  <span className="font-bold text-foreground">
                    {nb[name] || 0} top pref · <span className="text-muted-foreground font-normal">{attempts} attempts</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
