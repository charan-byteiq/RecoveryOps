import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppShell } from "@/components/app-shell";
import {
  Building2,
  Users,
  ArrowRight,
  Phone,
  Smartphone,
  Mail,
  MessageSquare,
  TrendingUp,
  ListChecks,
} from "lucide-react";
import {
  CUSTOMERS,
  bestTouchpoint,
  BRANCH_METADATA,
  ALL_BRANCH_CODES,
  setStoredCustomerBranch,
  type CustomerData,
} from "@/data/customer-nba-data";

export const Route = createFileRoute("/customer-analytics")({
  head: () => ({
    meta: [
      { title: "Customer Insights — RecoveryOps" },
      {
        name: "description",
        content: "Branch-level customer delinquency queues, next best actions, and priority worklists.",
      },
    ],
  }),
  component: CustomerBranchOverview,
});

function CustomerBranchOverview() {
  const navigate = useNavigate();
  const customers = CUSTOMERS;

  // Aggregate stats per branch
  const branchAggregates = useMemo(() => {
    return ALL_BRANCH_CODES.map((code) => {
      const meta = BRANCH_METADATA[code] || {
        name: `Branch ${code}`,
        region: "General Division",
        manager: "Assigned Officer",
        gradient: "from-primary to-primary/80",
        badgeBg: "bg-primary/10 text-primary border-primary/20",
        borderGlow: "hover:border-primary",
        accentColor: "#6366f1",
      };

      const bCustomers = customers.filter((c) => c.br === code);
      const totalExp = bCustomers.reduce((sum, c) => sum + c.exp, 0);
      const highPriorityCount = bCustomers.filter((c) => c.tier === "High").length;
      const avgCov = bCustomers.length
        ? Math.round(bCustomers.reduce((sum, c) => sum + c.cov, 0) / bCustomers.length)
        : 0;

      // Determine top recommended channel in this branch
      const channelCounts: Record<string, number> = {};
      bCustomers.forEach((c) => {
        const tp = bestTouchpoint(c);
        channelCounts[tp] = (channelCounts[tp] || 0) + 1;
      });
      const topChannelEntry = Object.entries(channelCounts).sort((a, b) => b[1] - a[1])[0];
      const topChannel = topChannelEntry ? topChannelEntry[0] : "SMS Alert";

      return {
        code,
        meta,
        customers: bCustomers,
        totalExp,
        highPriorityCount,
        avgCov,
        topChannel,
      };
    });
  }, [customers]);

  const totalDelinquentExposure = useMemo(() => {
    return customers.reduce((sum, c) => sum + c.exp, 0);
  }, [customers]);

  const totalHighPriority = useMemo(() => {
    return customers.filter((c) => c.tier === "High").length;
  }, [customers]);

  const getChannelIcon = (name: string) => {
    if (name.includes("Phone")) return <Phone className="size-3.5 text-blue-500" />;
    if (name.includes("SMS")) return <Smartphone className="size-3.5 text-emerald-500" />;
    if (name.includes("Mail")) return <Mail className="size-3.5 text-amber-500" />;
    return <MessageSquare className="size-3.5 text-primary" />;
  };

  return (
    <AppShell
      title="Customer Insights"
      section="Customer Level"
      subtitle="Delinquency Insights & Branch Queues"
      actions={
        <div className="flex items-center gap-3">
          <Link
            to="/worklist"
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition shadow-xs"
          >
            <ListChecks className="size-3.5" /> Full Priority Worklist
          </Link>
          <span className="hidden sm:inline-block rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
            Refreshed: Oct 29, 2026
          </span>
        </div>
      }
    >
      <div className="mx-auto max-w-[1340px] space-y-6">
        {/* EPIC HERO SECTION WITH HEAVY GRADIENT & HIGH CONTRAST */}
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white shadow-2xl">
          {/* Glowing ambient decorative orbs */}
          <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-fuchsia-500/20 blur-3xl" />
          <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-cyan-300 backdrop-blur-md border border-white/10">
                <Building2 className="size-3.5 text-cyan-300" /> 6 Operational Recovery Branches
              </div>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white leading-tight">
                Customer Insights
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed font-medium">
                High-level operational view across all 6 recovery branches. Monitor delinquent customer volume, total exposure, repayment recovery efficiency, and top recommended outreach channels.
              </p>
            </div>

            {/* HIGH-CONTRAST METRIC TILES */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 shrink-0">
              <div className="rounded-2xl border border-white/15 bg-white/5 p-4 backdrop-blur-md shadow-lg">
                <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                  Total Delinquent Exposure
                </div>
                <div className="mt-1 text-2xl font-black text-white">
                  ${(totalDelinquentExposure / 1000).toFixed(0)}k
                </div>
                <div className="mt-0.5 text-[11px] text-cyan-300 flex items-center gap-1 font-semibold">
                  <TrendingUp className="size-3" /> Across All 6 Branches
                </div>
              </div>

              <div className="rounded-2xl border border-white/15 bg-white/5 p-4 backdrop-blur-md shadow-lg">
                <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                  Total Accounts
                </div>
                <div className="mt-1 text-2xl font-black text-white">{customers.length}</div>
                <div className="mt-0.5 text-[11px] text-emerald-400 font-semibold">
                  Active Delinquent Queue
                </div>
              </div>

              <div className="col-span-2 sm:col-span-1 rounded-2xl border border-rose-500/30 bg-rose-950/20 p-4 backdrop-blur-md shadow-lg">
                <div className="text-[10.5px] font-bold uppercase tracking-wider text-rose-300">
                  High Priority Risk
                </div>
                <div className="mt-1 text-2xl font-black text-rose-400">{totalHighPriority}</div>
                <div className="mt-0.5 text-[11px] text-rose-300/80 font-semibold">
                  Immediate Frontline Action
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 6 BRANCHES EPIC GRID */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-extrabold text-foreground tracking-tight flex items-center gap-2">
                <Building2 className="size-5 text-primary" /> Active Branch Population ({branchAggregates.length})
              </h3>
              <p className="text-xs text-muted-foreground">
                Delinquency exposure, recovery efficiency, and top recommended outreach channels by branch
              </p>
            </div>
            <Link
              to="/worklist"
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
            >
              Open Full Priority Worklist <ArrowRight className="size-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {branchAggregates.map((b) => {
              return (
                <div
                  key={b.code}
                  onClick={() => {
                    setStoredCustomerBranch(b.code);
                    navigate({ to: "/worklist", search: { branch: b.code } });
                  }}
                  className={`cursor-pointer group relative overflow-hidden rounded-2xl border border-border/80 bg-card hover:bg-muted/30 transition-all duration-300 shadow-sm ${b.meta.borderGlow} p-6 flex flex-col justify-between`}
                >
                  {/* Heavy Gradient Top Accent Strip */}
                  <div
                    className={`absolute top-0 left-0 right-0 h-2 bg-gradient-to-r ${b.meta.gradient} transition-all duration-300 group-hover:h-2.5`}
                  />

                  <div>
                    {/* Header Row: Branch Code + Status */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-extrabold px-2 py-0.5 rounded-md bg-muted text-foreground border border-border/80">
                            BR-{b.code}
                          </span>
                          <span
                            className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full border ${b.meta.badgeBg}`}
                          >
                            {b.meta.region}
                          </span>
                        </div>
                        <h4 className="text-xl font-black text-foreground mt-3 group-hover:text-primary transition">
                          {b.meta.name}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          Branch Lead: <b className="text-foreground">{b.meta.manager}</b>
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10.5px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          Active
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Action Strip */}
                  <div className="mt-5 pt-3.5 border-t border-border/60 flex items-center justify-between text-xs font-semibold">
                    <span className="text-[11px] text-muted-foreground">
                      Operational Recovery Queue
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-xl bg-primary/10 group-hover:bg-primary group-hover:text-primary-foreground px-3 py-1.5 text-xs font-bold text-primary transition shadow-2xs">
                      Open Worklist <ArrowRight className="size-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
