import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Building2, MapPin } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { useBranch, type Branch } from "@/hooks/branch-context";
import { api, formatMetricValue, getMetric, type BranchSummary } from "@/lib/api";

export const Route = createFileRoute("/customer-analytics")({
  head: () => ({
    meta: [
      { title: "Branch Directory — Customer Level — RecoveryOps" },
      { name: "description", content: "Select a branch to view customer portfolios and priority worklists." },
      { property: "og:title", content: "Branch Directory — Customer Level — RecoveryOps" },
      { property: "og:description", content: "Select a branch to view customer portfolios and priority worklists." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CustomerAnalytics,
});

function estimatedAccounts(b: BranchSummary): number {
  const dpd = getMetric(b.metrics, "delinquency_rate_30_plus");
  if (dpd && dpd.numerator != null && dpd.value != null && dpd.value > 0) {
    return Math.round(dpd.numerator / dpd.value);
  }
  return 0;
}

function CustomerAnalytics() {
  const { selectedBranch, selectBranch } = useBranch();
  const navigate = useNavigate();
  const branchesQuery = useQuery({ queryKey: ["branches"], queryFn: () => api.getBranches() });
  const branches = branchesQuery.data?.data ?? [];
  const totalAccounts = branches.reduce((sum, b) => sum + estimatedAccounts(b), 0);

  const handleBranchClick = (branch: Branch) => {
    selectBranch(branch);
    navigate({ to: "/worklist" });
  };

  return (
    <AppShell
      title="Customer Intelligence — Branch Network"
      section="Customer Level"
      subtitle="Select a branch portfolio to view customer accounts and open priority worklist"
    >
      <div className="mx-auto max-w-[1280px] space-y-5">
        {/* Network Header Summary Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-border/60 bg-card/40 p-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Building2 className="size-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-display">Active Regional Branch Portfolios</h2>
              <p className="text-xs text-muted-foreground">
                {branches.length} operational branches • {totalAccounts.toLocaleString()} total customer accounts
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <span className="inline-block size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Select any branch from the list to launch its customer worklist</span>
          </div>
        </div>

        {branchesQuery.isLoading && <p className="text-sm text-muted-foreground">Loading branches…</p>}

        <div className="space-y-2.5">
          {branches.map((branch) => {
            const isSelected = selectedBranch?.id === branch.id;
            const delinquency = getMetric(branch.metrics, "delinquency_rate_30_plus")?.value ?? 0;
            const isTopPerformer = delinquency <= 0.1;
            const isAtRisk = delinquency >= 0.14;

            return (
              <div
                key={branch.id}
                role="button"
                tabIndex={0}
                onClick={() => handleBranchClick(branch)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleBranchClick(branch);
                  }
                }}
                className={`group flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl border p-4 transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md hover:-translate-y-0.5 ${
                  isSelected
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "border-border/60 bg-card/60 hover:border-primary/40 hover:bg-card"
                }`}
              >
                {/* Branch Info */}
                <div className="flex items-center gap-3.5">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-200 shrink-0">
                    <Building2 className="size-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h3 className="font-bold text-display text-base text-foreground group-hover:text-primary transition-colors">
                        {branch.name}
                      </h3>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          isTopPerformer
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : isAtRisk
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                            : "bg-primary/10 text-primary border border-primary/20"
                        }`}
                      >
                        {isTopPerformer ? "Top Tier" : isAtRisk ? "At Risk" : "Stable"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <div className="flex items-center gap-1">
                        <MapPin className="size-3 text-muted-foreground/80" />
                        <span>{branch.region}</span>
                      </div>
                      <span>•</span>
                      <span>30+ DPD {formatMetricValue(getMetric(branch.metrics, "delinquency_rate_30_plus"))}</span>
                    </div>
                  </div>
                </div>

                {/* Right Action */}
                <div className="flex items-center justify-end gap-3 shrink-0">
                  <div className="inline-flex items-center gap-2 rounded-lg bg-primary/10 px-3.5 py-1.5 text-xs font-semibold text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-200">
                    <span>Open Worklist</span>
                    <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-1" />
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
