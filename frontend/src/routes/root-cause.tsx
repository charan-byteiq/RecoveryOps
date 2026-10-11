import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowDown, ArrowRight, CheckCircle2, Lightbulb, Sparkles, Target, AlertTriangle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { GlassCard, Status } from "@/components/ui";
import { useBranch } from "@/hooks/branch-context";
import { api, formatMetricValue, getMetric, getMetricValue, type BranchSummary, type DriverItem } from "@/lib/api";

export const Route = createFileRoute("/root-cause")({
  validateSearch: (s: Record<string, unknown>): { driver?: string | undefined } =>
    typeof s["driver"] === "string" ? { driver: s["driver"] } : {},
  head: () => ({
    meta: [
      { title: "Root Cause Analysis — RecoveryOps" },
      { name: "description", content: "Investigate contributing signals behind the branch performance gap." },
      { property: "og:title", content: "Root Cause Analysis — RecoveryOps" },
      { property: "og:description", content: "Investigate contributing signals behind the branch performance gap." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RootCause,
});

const HERO_METRIC = "delinquency_rate_30_plus";

function RootCause() {
  const { selectedBranch, hasBranch, selectBranch } = useBranch();
  const branchesQuery = useQuery({ queryKey: ["branches"], queryFn: () => api.getBranches(), enabled: !hasBranch });

  if (!hasBranch) {
    return (
      <AppShell title="Root Cause Analysis" section="Branch Level" subtitle="Why the gap?">
        <div className="mx-auto max-w-[600px] py-16 text-center">
          <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary/10">
            <Sparkles className="size-7 text-primary" />
          </div>
          <h2 className="mt-5 text-xl font-bold text-display">Select a branch to explore Root Cause</h2>
          <p className="mt-2 text-sm text-muted-foreground">Root cause diagnosis identifies performance drivers for a specific branch. Select a branch from the network to begin.</p>
          <div className="mt-8 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {branchesQuery.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {branchesQuery.data?.data.map((b: BranchSummary) => (
              <button
                key={b.id}
                className="rounded-xl border bg-card/50 p-4 text-left transition hover:bg-primary/5 hover:border-primary/20"
                onClick={() => selectBranch(b)}
              >
                <p className="text-sm font-semibold">{b.name}</p>
                <p className="text-xs text-muted-foreground">{b.region} · {formatMetricValue(getMetric(b.metrics, HERO_METRIC))}</p>
              </button>
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  return <BranchRootCause branch={selectedBranch!} />;
}

function BranchRootCause({ branch }: { branch: BranchSummary }) {
  const networkQuery = useQuery({ queryKey: ["network"], queryFn: () => api.getNetwork() });
  const overviewQuery = useQuery({ queryKey: ["branch", branch.id, "overview"], queryFn: () => api.getBranchOverview(branch.id) });
  const driversQuery = useQuery({ queryKey: ["branch", branch.id, "drivers"], queryFn: () => api.getBranchDrivers(branch.id) });
  const insightsQuery = useQuery({ queryKey: ["branch", branch.id, "insights"], queryFn: () => api.getBranchInsights(branch.id) });

  const search = Route.useSearch();
  const isDemo = overviewQuery.data?.meta.isDemo ?? networkQuery.data?.meta.isDemo ?? false;

  const metrics = overviewQuery.data?.data.metrics ?? branch.metrics;
  const networkAvg = networkQuery.data?.data.networkAverages[HERO_METRIC] ?? null;
  const heroValue = getMetricValue(metrics, HERO_METRIC) ?? 0;
  const gap = networkAvg != null ? heroValue - networkAvg : null;

  const drivers = driversQuery.data?.data.drivers ?? [];
  const [active, setActive] = useState(search.driver ?? `${drivers[0]?.segmentType}:${drivers[0]?.segmentValue}`);
  const selectedDriver = drivers.find((d) => `${d.segmentType}:${d.segmentValue}` === active) ?? drivers[0];

  return (
    <AppShell title="Root Cause Analysis" section="Branch Level" subtitle="Why the gap?">
      <div className="mx-auto max-w-[1200px] space-y-4">
        {isDemo && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-medium text-amber-700 dark:text-amber-400">
            <AlertTriangle className="size-4" />
            Demo data — insights are generated from synthetic evidence and must not be used for production decisions.
          </div>
        )}

        {/* Performance Flow */}
        <GlassCard className="p-5">
          <div className="flex flex-col items-center gap-3 md:flex-row">
            <div className="flex-1 rounded-xl bg-card/70 p-4">
              <p className="text-xs text-muted-foreground">Branch 30+ DPD</p>
              <p className="text-xl font-bold text-display">{formatMetricValue(getMetric(metrics, HERO_METRIC))}</p>
            </div>
            <ArrowRight className="hidden size-5 text-muted-foreground md:block" />
            <ArrowDown className="size-5 text-muted-foreground md:hidden" />
            <div className={`flex-1 rounded-xl p-4 ring-1 ${gap != null && gap > 0 ? "bg-destructive/8 ring-destructive/15" : "bg-success/8 ring-success/15"}`}>
              <p className={`text-xs ${gap != null && gap > 0 ? "text-destructive" : "text-success"}`}>Performance gap</p>
              <p className={`text-xl font-bold text-display ${gap != null && gap > 0 ? "text-destructive" : "text-success"}`}>
                {gap == null ? "—" : `${gap > 0 ? "+" : "−"}${Math.abs(gap * 100).toFixed(1)} points vs network`}
              </p>
            </div>
            <ArrowRight className="hidden size-5 text-muted-foreground md:block" />
            <ArrowDown className="size-5 text-muted-foreground md:hidden" />
            <div className="flex-1 rounded-xl bg-primary/8 p-4 ring-1 ring-primary/15">
              <p className="text-xs text-primary">Management focus</p>
              <p className="text-xl font-bold text-display">{gap != null && gap > 0 ? "Reduce roll rate" : "Maintain quality"}</p>
            </div>
          </div>
        </GlassCard>

        {/* Insights Analysis */}
        <GlassCard className="p-5 md:p-6">
          <div className="mb-4">
            <h2 className="text-base font-bold text-display">Insights Analysis</h2>
            <p className="text-xs text-muted-foreground">Evidence-backed narrative for the selected snapshot</p>
          </div>
          {insightsQuery.isLoading && <p className="text-sm text-muted-foreground">Loading insight…</p>}
          {insightsQuery.data?.data[0] && (
            <div className="space-y-4">
              <div className="rounded-xl border bg-card/40 p-4">
                <p className="text-sm leading-relaxed text-foreground">{insightsQuery.data.data[0].narrative}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {insightsQuery.data.data[0].evidence.map((ev) => (
                  <div className="rounded-xl border bg-card/40 p-4" key={ev.metricCode}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-display">{ev.metricCode}</span>
                      <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary shrink-0">
                        {(ev.branchValue * 100).toFixed(1)}%
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      Branch {(ev.branchValue * 100).toFixed(1)}% · Network {(ev.networkValue * 100).toFixed(1)}%
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </GlassCard>

        {/* 2-Column Split */}
        <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
          {/* Left Column: Performance Drivers */}
          <GlassCard className="p-5">
            <h2 className="font-bold text-display">{gap != null && gap > 0 ? "Contributing areas" : "Performance drivers"}</h2>
            <p className="text-xs text-muted-foreground">Select a segment to inspect its evidence</p>
            {driversQuery.isLoading && <p className="mt-4 text-sm text-muted-foreground">Loading drivers…</p>}
            <div className="mt-4 space-y-2">
              {drivers.map((d) => (
                <button
                  key={`${d.segmentType}:${d.segmentValue}`}
                  onClick={() => setActive(`${d.segmentType}:${d.segmentValue}`)}
                  className={`w-full rounded-xl border p-4 text-left transition ${
                    active === `${d.segmentType}:${d.segmentValue}`
                      ? "border-primary/40 bg-primary/10 shadow-sm ring-1 ring-primary/20"
                      : "bg-card/50 hover:bg-accent"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{d.segmentValue}</span>
                    <Status tone={d.delta > 0 ? "danger" : "good"}>
                      {d.delta > 0 ? "+" : "−"}{(Math.abs(d.delta) * 100).toFixed(1)} pts
                    </Status>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {(d.branchValue * 100).toFixed(1)}% branch · {(d.networkValue * 100).toFixed(1)}% network
                  </p>
                </button>
              ))}
            </div>
          </GlassCard>

          {/* Right Column: Selected Driver Details */}
          <GlassCard className="p-5">
            {selectedDriver ? (
              <>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[.14em] text-muted-foreground">Selected driver</p>
                  <h2 className="mt-1 text-2xl font-bold text-display">{selectedDriver.segmentValue}</h2>
                  <p className="text-xs text-muted-foreground capitalize">{selectedDriver.segmentType.replace(/_/g, " ")}</p>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-4">
                  <MetricBox label="Branch" value={`${(selectedDriver.branchValue * 100).toFixed(1)}%`} />
                  <MetricBox label="Network average" value={`${(selectedDriver.networkValue * 100).toFixed(1)}%`} />
                  <MetricBox
                    label="Observed difference"
                    value={`${selectedDriver.delta > 0 ? "+" : "−"}${(Math.abs(selectedDriver.delta) * 100).toFixed(1)} pts`}
                  />
                  <MetricBox
                    label="Direction"
                    value={selectedDriver.delta > 0 ? "Elevated" : "Lower"}
                    tone={selectedDriver.delta > 0 ? "destructive" : "success"}
                  />
                </div>
                <div className="mt-5 rounded-xl bg-accent p-4">
                  <p className="text-xs font-bold uppercase tracking-[.12em] text-muted-foreground">Supporting context</p>
                  <p className="mt-2 text-sm leading-6">
                    The {selectedDriver.segmentValue.toLowerCase()} segment in {branch.name} shows a{" "}
                    {selectedDriver.delta > 0 ? "higher" : "lower"} delinquency rate than the network average.
                    {selectedDriver.accountCount != null && (
                      <> This segment represents approximately {selectedDriver.accountCount.toLocaleString()} accounts.</>
                    )}
                  </p>
                </div>

                <div className="mt-5 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.12em] text-muted-foreground">
                    <Lightbulb className="size-3.5 text-primary" />
                    <span>Key Driver Insights</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <InsightCard
                      title="Segment concentration"
                      metric={`${(selectedDriver.branchValue * 100).toFixed(1)}% delinquent`}
                      desc={`${selectedDriver.segmentValue} is a material contributor to ${branch.name}'s 30+ DPD profile. Prioritise this segment in queue routing and follow-up cadence.`}
                    />
                    <InsightCard
                      title="Network comparison"
                      metric={`${selectedDriver.delta > 0 ? "+" : "−"}${(Math.abs(selectedDriver.delta) * 100).toFixed(1)} pts`}
                      desc={`This segment's delinquency rate is ${selectedDriver.delta > 0 ? "above" : "below"} the network average, indicating ${selectedDriver.delta > 0 ? "localized risk drivers" : "relative strength"}.`}
                    />
                  </div>

                  <div className="flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
                        <Target className="size-3.5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[.1em] text-primary">Strategic Action Lever</p>
                        <p className="mt-0.5 text-xs text-foreground font-medium leading-relaxed">
                          Review underwriting, payment-channel mix, and early-outreach timing for the{" "}
                          {selectedDriver.segmentValue.toLowerCase()} segment. Confirm whether the gap is driven by
                          credit quality, operational follow-up, or seasonal portfolio effects before scaling interventions.
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 rounded-lg bg-primary/15 px-3 py-1.5 text-center sm:text-right">
                      <p className="text-[9px] font-bold uppercase tracking-[.1em] text-primary">Target Impact</p>
                      <p className="text-xs font-bold text-primary">Evidence-driven reduction</p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No driver data available.</p>
            )}
          </GlassCard>
        </div>
      </div>
    </AppShell>
  );
}

function MetricBox({ label, value, tone }: { label: string; value: string; tone?: "success" | "destructive" }) {
  return (
    <div className="rounded-xl border bg-card/50 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-bold text-display ${tone === "success" ? "text-success" : tone === "destructive" ? "text-destructive" : ""}`}>
        {value}
      </p>
    </div>
  );
}

function InsightCard({ title, metric, desc }: { title: string; metric: string; desc: string }) {
  return (
    <div className="rounded-xl border bg-card/40 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-display">{title}</span>
        <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary shrink-0">{metric}</span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{desc}</p>
    </div>
  );
}
