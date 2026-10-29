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
        {/* COMPACT & ELEGANT HEADER BAR (NO UNWANTED HERO BANNER) */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-5 rounded-2xl border border-border/80 bg-card shadow-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary border border-primary/20">
                <Building2 className="size-3.5" /> 6 Recovery Hubs
              </span>
              <span className="text-xs text-muted-foreground font-medium">
                Customer Delinquency & Next Best Action Queues
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
              Select Branch Priority Worklist
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Click any branch to inspect delinquent borrowers, active outreach cadences, and predictive recovery models.
            </p>
          </div>

          {/* NETWORK-WIDE SUMMARY PILLS */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <div className="rounded-xl border border-border/80 bg-muted/40 px-3.5 py-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Total Exposure
              </div>
              <div className="text-base font-black text-foreground">
                ${(totalDelinquentExposure / 1000).toFixed(0)}k
              </div>
            </div>

            <div className="rounded-xl border border-border/80 bg-muted/40 px-3.5 py-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Active Borrowers
              </div>
              <div className="text-base font-black text-foreground">
                {customers.length} Accounts
              </div>
            </div>

            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                High Priority
              </div>
              <div className="text-base font-black text-rose-600 dark:text-rose-400">
                {totalHighPriority} Immediate
              </div>
            </div>
          </div>
        </div>

        {/* 6 BRANCHES BALANCED & FILLED GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {branchAggregates.map((b) => {
            return (
              <div
                key={b.code}
                onClick={() => {
                  setStoredCustomerBranch(b.code);
                  navigate({ to: "/worklist", search: { branch: b.code } });
                }}
                className={`cursor-pointer group relative overflow-hidden rounded-2xl border border-border/80 bg-card hover:bg-card/95 hover:shadow-md transition-all duration-300 p-6 flex flex-col justify-between h-full ${b.meta.borderGlow}`}
              >
                {/* Gradient Top Accent Strip */}
                <div
                  className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${b.meta.gradient} transition-all duration-300 group-hover:h-2`}
                />

                <div className="space-y-4">
                  {/* Card Header Row: Branch Code + Region + Active Status */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-black px-2.5 py-0.5 rounded-lg bg-foreground text-background">
                        BR-{b.code}
                      </span>
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${b.meta.badgeBg}`}
                      >
                        {b.meta.region}
                      </span>
                    </div>

                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Active Queue
                    </span>
                  </div>

                  {/* Branch Name & Lead */}
                  <div>
                    <h3 className="text-lg font-black text-foreground group-hover:text-primary transition tracking-tight">
                      {b.meta.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                      <Users className="size-3.5 text-muted-foreground/70" />
                      Branch Lead: <span className="font-semibold text-foreground">{b.meta.manager}</span>
                    </p>
                  </div>

                  {/* Structured 2x2 Operational Metrics Grid */}
                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <div className="rounded-xl border border-border/60 bg-muted/30 p-2.5">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Delinquent Exposure
                      </div>
                      <div className="text-sm font-black text-foreground mt-0.5">
                        ${(b.totalExp / 1000).toFixed(0)}k
                      </div>
                    </div>

                    <div className="rounded-xl border border-border/60 bg-muted/30 p-2.5">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Borrowers in Queue
                      </div>
                      <div className="text-sm font-black text-foreground mt-0.5">
                        {b.customers.length} Accounts
                      </div>
                    </div>

                    <div className={`rounded-xl border p-2.5 ${b.highPriorityCount > 0 ? "border-rose-500/20 bg-rose-500/5 text-rose-600 dark:text-rose-400" : "border-border/60 bg-muted/30 text-foreground"}`}>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        High Priority Risk
                      </div>
                      <div className="text-sm font-black mt-0.5">
                        {b.highPriorityCount > 0 ? `${b.highPriorityCount} Urgent` : "0 Urgent"}
                      </div>
                    </div>

                    <div className="rounded-xl border border-border/60 bg-muted/30 p-2.5">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Top Channel
                      </div>
                      <div className="text-xs font-bold text-foreground mt-0.5 flex items-center gap-1.5 truncate">
                        {getChannelIcon(b.topChannel)}
                        <span className="truncate">{b.topChannel}</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Coverage Progress Bar */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[11px] font-semibold">
                      <span className="text-muted-foreground">Avg Payment Coverage</span>
                      <span className="text-foreground font-bold">{b.avgCov}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${b.meta.gradient}`}
                        style={{ width: `${Math.min(100, b.avgCov)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Card Action Footer Button */}
                <div className="mt-5 pt-3.5 border-t border-border/60">
                  <div className="w-full flex items-center justify-between rounded-xl bg-primary/10 group-hover:bg-primary group-hover:text-primary-foreground px-4 py-2.5 text-xs font-bold text-primary transition shadow-2xs">
                    <span>Open Priority Worklist</span>
                    <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
