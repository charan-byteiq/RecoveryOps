import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useRef } from "react";
import { AppShell } from "@/components/app-shell";
import {
  Building2,
  Users,
  ArrowRight,
  ListChecks,
} from "lucide-react";
import {
  CUSTOMERS,
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

interface BranchAggregate {
  code: string;
  meta: (typeof BRANCH_METADATA)[string];
  customers: CustomerData[];
  totalExp: number;
  avgCov: number;
  reachedCount: number;
  outreachPct: number;
}

function BranchCard({
  b,
  onSelect,
}: {
  b: BranchAggregate;
  onSelect: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [scrollFactor, setScrollFactor] = useState(0.85);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (!cardRef.current) return;
          const rect = cardRef.current.getBoundingClientRect();
          const winHeight = window.innerHeight || document.documentElement.clientHeight;
          // Dynamically compute viewport scroll progress for live reactive progress bars
          const viewportRatio = (winHeight - rect.top) / (winHeight + rect.height);
          const clamped = Math.max(0.65, Math.min(1, 0.65 + viewportRatio * 0.35));
          setScrollFactor(clamped);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Live dynamic width moving with scroll
  const liveOutreach = Math.round(b.outreachPct * scrollFactor);
  const livePayment = Math.round(b.avgCov * scrollFactor);

  return (
    <div
      ref={cardRef}
      onClick={onSelect}
      className={`cursor-pointer group relative overflow-hidden rounded-2xl border border-border/80 bg-card hover:bg-card/95 hover:shadow-md transition-all duration-300 p-6 flex flex-col justify-between h-full ${b.meta.borderGlow}`}
    >
      {/* Top Accent Strip */}
      <div
        className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${b.meta.gradient} transition-all duration-300 group-hover:h-2`}
      />

      <div className="space-y-4">
        {/* Card Header Row: Branch Code + Region + Active Queue */}
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

        {/* 2 CLEAN DPD METRIC CARDS */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="rounded-xl border border-border/70 bg-muted/40 p-3.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              DPD Amount
            </div>
            <div className="text-lg font-black text-foreground mt-1">
              ${b.totalExp.toLocaleString()}
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-muted/40 p-3.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              DPD Accounts
            </div>
            <div className="text-lg font-black text-foreground mt-1">
              {b.customers.length} Accounts
            </div>
          </div>
        </div>

        {/* 2 LIVE SCROLL-ANIMATED PROGRESS BARS */}
        <div className="space-y-3 pt-1">
          {/* Bar 1: Agent Outreach (Customers Reached) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-semibold">
              <span className="text-muted-foreground">Agent Outreach</span>
              <span className="text-foreground font-bold">
                {b.reachedCount} / {b.customers.length} Reached ({b.outreachPct}%)
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted/80 overflow-hidden relative">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${b.meta.gradient} transition-all duration-500 ease-out relative`}
                style={{ width: `${Math.min(100, liveOutreach)}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse" />
              </div>
            </div>
          </div>

          {/* Bar 2: Payment Fulfillment */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-semibold">
              <span className="text-muted-foreground">Payment Fulfillment</span>
              <span className="text-foreground font-bold">{b.avgCov}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted/80 overflow-hidden relative">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${b.meta.gradient} transition-all duration-500 ease-out relative`}
                style={{ width: `${Math.min(100, livePayment)}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse" />
              </div>
            </div>
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
}

function CustomerBranchOverview() {
  const navigate = useNavigate();
  const customers = CUSTOMERS;

  // Aggregate stats per branch
  const branchAggregates: BranchAggregate[] = useMemo(() => {
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
      const avgCov = bCustomers.length
        ? Math.round(bCustomers.reduce((sum, c) => sum + c.cov, 0) / bCustomers.length)
        : 0;

      // Agent outreach: how many customers reached and done
      const reachedCount = bCustomers.filter((c) => c.touches > 0).length;
      const outreachPct = bCustomers.length
        ? Math.round((reachedCount / bCustomers.length) * 100)
        : 0;

      return {
        code,
        meta,
        customers: bCustomers,
        totalExp,
        avgCov,
        reachedCount,
        outreachPct,
      };
    });
  }, [customers]);

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
        {/* CLEAN HEADER BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-2xl border border-border/80 bg-card shadow-xs">
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

          <Link
            to="/worklist"
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition shadow-xs shrink-0 self-start sm:self-center"
          >
            <ListChecks className="size-3.5" /> Open Full Worklist <ArrowRight className="size-3.5 ml-0.5" />
          </Link>
        </div>

        {/* 6 BRANCHES BALANCED & FILLED GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {branchAggregates.map((b) => (
            <BranchCard
              key={b.code}
              b={b}
              onSelect={() => {
                setStoredCustomerBranch(b.code);
                navigate({ to: "/worklist", search: { branch: b.code } });
              }}
            />
          ))}
        </div>
      </div>
    </AppShell>
  );
}
