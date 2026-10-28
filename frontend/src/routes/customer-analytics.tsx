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
  const avgTouches = Math.round(customers.reduce((s, c) => s + c.touches, 0) / customers.length);

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
      return { name: n, success: avgSuccess };
    });
  }, [customers]);

  const combo = useMemo(() => {
    const map: Record<string, number> = {};
    customers.forEach((c) => {
      const k = `${c.content[0]} → ${bestTouchpoint(c)} → ${c.cad[0]}`;
      map[k] = (map[k] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
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
        {/* HERO CARD */}
        <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Optimized Template Selection, Contact Method & Follow-up Timing
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Frontline recommendations powered by Customer Engagement, Repayment Behavior, and
            Post-Due Outreach Tracking.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Customers in Scope
              </div>
              <div className="mt-1 text-3xl font-extrabold text-primary">{customers.length}</div>
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                High Priority
              </div>
              <div className="mt-1 text-3xl font-extrabold text-destructive">{hi}</div>
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Avg Repayment Ratio
              </div>
              <div className="mt-1 text-3xl font-extrabold text-foreground">{avgCov}%</div>
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Top Contact Method
              </div>
              <div className="mt-1 text-3xl font-extrabold text-foreground">{topTouchpoint}</div>
            </div>
          </div>
        </div>

        {/* 3 CORE SECTIONS ROW */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          {/* Card 1: Suggested Templates */}
          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs flex flex-col justify-between">
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
          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs flex flex-col justify-between">
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

          {/* Card 3: Contact Method */}
          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">Contact Method</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Post-due date touches & method success rate
              </p>

              {/* Bar graph */}
              <div className="flex items-end gap-4 h-28 my-3 pb-2 border-b">
                {touchMethods.map(({ name, success }) => (
                  <div key={name} className="flex-1 flex flex-col items-center gap-1 text-[11px]">
                    <div
                      className="w-full rounded-t-md bg-primary transition-all duration-300"
                      style={{ height: `${success * 1.05}px` }}
                    />
                    <span className="text-muted-foreground truncate max-w-[70px] text-[10px]">
                      {name}
                    </span>
                    <span className="font-bold text-foreground text-xs">{success}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-muted-foreground pb-1 border-b">
                <span>Avg follow-ups post due-date</span>
                <span className="font-bold text-foreground">{avgTouches} touches</span>
              </div>
              {touchMethods.map(({ name }) => (
                <div key={name} className="flex justify-between">
                  <span className="text-muted-foreground">{name}</span>
                  <span className="font-bold text-foreground">
                    {nb[name] || 0} best recommended
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 2 COLUMN BOTTOM ROW: Priority Scoring & Next Best Action Combinations */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          {/* Card 4: Unified Priority Scoring */}
          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
            <h3 className="text-sm font-bold text-foreground">Unified priority scoring</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Combined signal from engagement, repayment, and outreach behavior
            </p>

            <div className="flex items-center gap-6 flex-wrap">
              <div
                className="size-28 rounded-full shrink-0 shadow-inner"
                style={{
                  background: conicGradient,
                  mask: "radial-gradient(circle 38px, transparent 98%, black)",
                  WebkitMask: "radial-gradient(circle 38px, transparent 98%, black)",
                }}
              />
              <div className="flex-1 min-w-[160px] space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/15 px-2.5 py-0.5 text-xs font-semibold text-destructive">
                    High Priority
                  </span>
                  <span className="font-bold text-foreground text-sm">{hi}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                    Medium Priority
                  </span>
                  <span className="font-bold text-foreground text-sm">{me}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    Low Priority
                  </span>
                  <span className="font-bold text-foreground text-sm">{lo}</span>
                </div>
              </div>
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              <Link to="/worklist" className="font-semibold text-primary hover:underline">
                Open the priority worklist →
              </Link>
            </p>
          </div>

          {/* Card 5: Next best action combinations */}
          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
            <h3 className="text-sm font-bold text-foreground">Next best action combinations</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Suggested Template → Contact Method → Follow-up Timing
            </p>

            <div className="space-y-2.5">
              {combo.map(([k, v]) => (
                <div
                  key={k}
                  className="rounded-xl border border-border/60 bg-muted/20 px-3.5 py-2.5 text-xs"
                >
                  <b className="text-primary font-bold">{v}</b>{" "}
                  <span className="text-muted-foreground">customers ·</span>{" "}
                  <span className="font-medium text-foreground">{k}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
