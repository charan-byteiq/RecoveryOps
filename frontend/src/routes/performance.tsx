import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip } from "recharts";
import { AppShell } from "@/components/app-shell";
import { GlassCard, MetricBar, Status } from "@/components/ui";
import { useBranch } from "@/hooks/branch-context";
import { api, formatMetricValue, getMetric, getMetricValue, type BranchSummary } from "@/lib/api";
import { ChartNoAxesCombined, DollarSign, TrendingUp, TrendingDown, Clock3, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/performance")({
  head: () => ({
    meta: [
      { title: "Branch Performance — RecoveryOps" },
      { name: "description", content: "Explore branch collections trends and portfolio quality." },
      { property: "og:title", content: "Branch Performance — RecoveryOps" },
      { property: "og:description", content: "Explore branch collections trends and portfolio quality." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Performance,
});

const HERO_METRIC = "delinquency_rate_30_plus";

function Performance() {
  const { selectedBranch, hasBranch, selectBranch } = useBranch();

  const branchesQuery = useQuery({
    queryKey: ["branches"],
    queryFn: () => api.getBranches(),
    enabled: !hasBranch,
  });

  if (!hasBranch) {
    return (
      <AppShell title="Performance" section="Branch Level" subtitle="Trend & portfolio quality">
        <div className="mx-auto max-w-[600px] py-16 text-center">
          <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary/10">
            <ChartNoAxesCombined className="size-7 text-primary" />
          </div>
          <h2 className="mt-5 text-xl font-bold text-display">Select a branch to explore Performance</h2>
          <p className="mt-2 text-sm text-muted-foreground">Performance trends and portfolio quality analytics are available once you select a specific branch from the network.</p>
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

  return <BranchPerformance branch={selectedBranch!} />;
}

function BranchPerformance({ branch }: { branch: BranchSummary }) {
  const networkQuery = useQuery({ queryKey: ["network"], queryFn: () => api.getNetwork() });
  const overviewQuery = useQuery({
    queryKey: ["branch", branch.id, "overview"],
    queryFn: () => api.getBranchOverview(branch.id),
  });
  const performanceQuery = useQuery({
    queryKey: ["branch", branch.id, "performance"],
    queryFn: () => api.getBranchPerformance(branch.id),
  });
  const driversQuery = useQuery({
    queryKey: ["branch", branch.id, "drivers"],
    queryFn: () => api.getBranchDrivers(branch.id),
  });

  const isDemo = overviewQuery.data?.meta.isDemo ?? networkQuery.data?.meta.isDemo ?? false;
  const networkAvg = networkQuery.data?.data.networkAverages[HERO_METRIC] ?? null;
  const metrics = overviewQuery.data?.data.metrics ?? branch.metrics;
  const heroValue = getMetricValue(metrics, HERO_METRIC) ?? 0;
  const heroDelta = networkAvg != null ? heroValue - networkAvg : null;

  const dpd = performanceQuery.data?.data.dpdDistribution ?? [];
  const trends = performanceQuery.data?.data.trends[HERO_METRIC] ?? [];

  const pieData = dpd.map((entry) => ({
    name: entry.bucket,
    value: entry.portfolioShare != null ? Math.round(entry.portfolioShare * 1000) / 10 : 0,
    color:
      entry.bucket === "Current"
        ? "#10b981"
        : entry.bucket === "1-30"
        ? "#3b82f6"
        : entry.bucket === "30-59"
        ? "#f59e0b"
        : entry.bucket === "60-89"
        ? "#ef4444"
        : "#991b1b",
  }));

  return (
    <AppShell title={branch.name} section="Branch Level" subtitle="Performance">
      <div className="mx-auto max-w-[1280px] space-y-4">
        {isDemo && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-medium text-amber-700 dark:text-amber-400">
            <AlertTriangle className="size-4" />
            Demo data — values are synthetic and must not be used for production decisions.
          </div>
        )}

        {/* Branch Hero Summary Banner */}
        <GlassCard className="p-5 md:p-6">
          <div className="flex flex-col justify-between gap-6 xl:flex-row">
            <div>
              <div className="flex flex-wrap gap-2">
                <Status tone={heroDelta != null && heroDelta > 0 ? "danger" : "good"}>
                  {heroDelta != null && heroDelta > 0 ? "Above network 30+ DPD" : "At or below network 30+ DPD"}
                </Status>
                <Status>{branch.region}</Status>
              </div>
              <div className="mt-5 flex flex-wrap items-end gap-7">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[.14em] text-muted-foreground">30+ DPD concentration</p>
                  <p className="mt-1 text-5xl font-bold text-display">{formatMetricValue(getMetric(metrics, HERO_METRIC))}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[.14em] text-muted-foreground">Network average</p>
                  <p className="text-3xl font-bold text-muted-foreground text-display">
                    {networkAvg != null ? `${(networkAvg * 100).toFixed(1)}%` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[.14em] text-muted-foreground">Gap</p>
                  <p className={`text-3xl font-bold text-display ${heroDelta != null && heroDelta > 0 ? "text-destructive" : "text-success"}`}>
                    {heroDelta == null
                      ? "—"
                      : `${heroDelta > 0 ? "+" : "−"}${Math.abs(heroDelta * 100).toFixed(1)} pts`}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border bg-card/55 p-4 xl:w-[390px]">
              <p className="text-[11px] font-bold uppercase tracking-[.14em] text-muted-foreground">Primary focus</p>
              <p className="mt-1 text-xl font-bold text-display">
                {heroDelta != null && heroDelta > 0 ? "Reduce 30+ DPD roll" : "Maintain portfolio quality"}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {driversQuery.data?.data.drivers.slice(0, 3).map((d) => (
                  <Status key={`${d.segmentType}-${d.segmentValue}`} tone={d.delta > 0 ? "danger" : "good"}>
                    {d.segmentValue} {d.delta > 0 ? "↑" : "↓"}
                  </Status>
                ))}
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Metric cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { code: "cure_rate", icon: <TrendingUp className="size-4 text-success" /> },
            { code: "ptp_kept_rate", icon: <Clock3 className="size-4 text-primary" /> },
            { code: "autopay_active_pct", icon: <TrendingUp className="size-4 text-success" /> },
            { code: "payment_total", icon: <DollarSign className="size-4 text-success" /> },
          ].map((item) => {
            const m = getMetric(metrics, item.code);
            return (
              <GlassCard className="p-4" key={item.code}>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-[.12em] text-muted-foreground">{m?.name ?? item.code}</p>
                  {item.icon}
                </div>
                <p className="mt-2 text-2xl font-bold text-display">{formatMetricValue(m)}</p>
                <p className="text-xs text-muted-foreground">
                  {m?.availability === "available" ? "Report-backed" : m?.availability ?? "—"}
                </p>
              </GlassCard>
            );
          })}
        </div>

        {/* What is different? */}
        <GlassCard className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-display">What is different?</h2>
              <p className="text-xs text-muted-foreground">Segments most associated with the delinquency gap</p>
            </div>
            <Link to="/root-cause" className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
              <span>Open diagnosis</span>
              <span>→</span>
            </Link>
          </div>
          {driversQuery.isLoading && <p className="mt-4 text-sm text-muted-foreground">Loading drivers…</p>}
          <div className="mt-5 space-y-4">
            {driversQuery.data?.data.drivers.slice(0, 4).map((d) => (
              <Link
                to="/root-cause"
                search={{ driver: `${d.segmentType}:${d.segmentValue}` }}
                key={`${d.segmentType}-${d.segmentValue}`}
                className="grid items-center gap-2 rounded-lg p-2.5 transition hover:bg-card/70 sm:grid-cols-[200px_1fr_72px]"
              >
                <span className="text-sm font-semibold text-foreground">{d.segmentValue}</span>
                <MetricBar
                  value={Math.round(d.branchValue * 100)}
                  peer={Math.round(d.networkValue * 100)}
                  tone={d.delta > 0 ? "danger" : "success"}
                />
                <span className={`text-right text-sm font-bold ${d.delta > 0 ? "text-destructive" : "text-success"}`}>
                  {d.delta > 0 ? "+" : "−"}{(Math.abs(d.delta) * 100).toFixed(1)} pts
                </span>
              </Link>
            ))}
          </div>
          <div className="mt-4 flex gap-4 border-t pt-3 text-[11px] text-muted-foreground">
            <span>Solid bar · Branch</span>
            <span>Marker · Network average</span>
          </div>
        </GlassCard>

        <div className="grid gap-4 xl:grid-cols-3">
          <GlassCard className="p-5 xl:col-span-2">
            <div className="flex justify-between">
              <div>
                <h2 className="font-bold text-display">30+ DPD trend</h2>
                <p className="text-xs text-muted-foreground">Monthly branch rate against network average</p>
              </div>
            </div>
            <div className="relative mt-7 flex h-56 items-end gap-3 border-b border-l px-4 pb-0">
              <div className="absolute -left-8 bottom-0 text-[10px] text-muted-foreground">0%</div>
              <div className="absolute -left-10 bottom-1/2 text-[10px] text-muted-foreground">10%</div>
              <div className="absolute -left-10 top-0 text-[10px] text-muted-foreground">20%</div>
              <div className="absolute bottom-1/2 left-0 right-0 border-b border-dashed border-border" />
              <div className="absolute top-0 left-0 right-0 border-b border-dashed border-border" />
              {trends.map((x) => (
                <div className="z-10 flex h-full flex-1 items-end justify-center gap-1 group" key={x.period} title={`Branch: ${(x.value * 100).toFixed(1)}%`}>
                  <div className="relative flex h-full w-full items-end justify-center gap-1">
                    <div
                      className="relative w-4 rounded-t bg-primary transition-all hover:bg-primary/80"
                      style={{ height: `${Math.min(100, x.value * 500)}%` }}
                    >
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-bold opacity-0 transition-opacity group-hover:opacity-100 text-primary">
                        {(x.value * 100).toFixed(1)}
                      </span>
                    </div>
                    {networkAvg != null && (
                      <div
                        className="relative w-4 rounded-t bg-muted-foreground/35 transition-all hover:bg-muted-foreground/50"
                        style={{ height: `${Math.min(100, networkAvg * 500)}%` }}
                      >
                        <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-bold opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground">
                          {(networkAvg * 100).toFixed(1)}
                        </span>
                      </div>
                    )}
                    <span className="absolute -bottom-6 text-[10px] text-muted-foreground">{x.period.slice(5)}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 flex gap-4 text-xs text-muted-foreground">
              <span>● Branch</span>
              <span>● Network average</span>
            </div>
          </GlassCard>

          {/* DPD distribution with Pie Chart */}
          <GlassCard className="p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-display">DPD distribution</h2>
                  <p className="text-xs text-muted-foreground">Portfolio account mix</p>
                </div>
                <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">Accounts</span>
              </div>
              <div className="mt-4 flex flex-col items-center justify-center">
                <div className="relative h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <RechartsTooltip
                        formatter={(value: any, name: any) => [`${value}%`, name]}
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          borderColor: "hsl(var(--border))",
                          borderRadius: "0.5rem",
                          fontSize: "12px",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                        }}
                        itemStyle={{ color: "hsl(var(--foreground))" }}
                      />
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-bold text-display">100%</span>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Portfolio</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
              {pieData.map((d) => (
                <div key={d.name} className="flex items-center justify-between rounded-lg border bg-card/60 px-2 py-1.5">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="truncate text-[11px] text-muted-foreground">{d.name}</span>
                  </div>
                  <span className="font-bold text-[11px] text-foreground">{d.value}%</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        <GlassCard className="p-5">
          <h2 className="font-bold text-display">Operational scorecard</h2>
          <div className="mt-4 grid gap-px overflow-hidden rounded-xl border bg-border md:grid-cols-4">
            {["positive_outcome_rate", "negative_outcome_rate", "roll_rate", "charge_off_rate"].map((code) => {
              const m = getMetric(performanceQuery.data?.data.outcomes, code);
              return (
                <div className="bg-card/80 p-4" key={code}>
                  <p className="text-xs text-muted-foreground">{m?.name ?? code}</p>
                  <p className="mt-1 text-xl font-bold text-display">{formatMetricValue(m)}</p>
                  <p className={`text-xs font-semibold ${code === "negative_outcome_rate" || code === "roll_rate" || code === "charge_off_rate" ? "text-destructive" : "text-success"}`}>
                    {m?.availability === "available" ? "Report-backed" : m?.availability ?? "—"}
                  </p>
                </div>
              );
            })}
          </div>
        </GlassCard>

        <PeerComparisonTable branch={branch} />
      </div>
    </AppShell>
  );
}

function PeerComparisonTable({ branch }: { branch: BranchSummary }) {
  const peersQuery = useQuery({
    queryKey: ["branch", branch.id, "peers"],
    queryFn: () => api.getBranchPeers(branch.id),
  });

  const peers = peersQuery.data?.data.peers ?? [];
  const allRows = [branch, ...peers].sort(
    (a, b) =>
      (getMetricValue(b.metrics, HERO_METRIC) ?? 0) - (getMetricValue(a.metrics, HERO_METRIC) ?? 0)
  );

  return (
    <GlassCard className="overflow-hidden p-5">
      <div className="mb-3">
        <h2 className="font-bold text-display">Peer metrics comparison</h2>
        <p className="text-xs text-muted-foreground">Report-backed benchmarks across branches</p>
      </div>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-[10px] uppercase tracking-[.1em] text-muted-foreground">
            <tr>
              {["Branch", "30+ DPD", "Cure rate", "PTP kept", "Autopay"].map((x) => (
                <th className="px-5 py-3" key={x}>{x}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allRows.map((p) => (
              <tr
                className={`border-t transition-colors ${p.id === branch.id ? "bg-primary/5 font-semibold text-primary" : "hover:bg-card/60"}`}
                key={p.id}
              >
                <td className="px-5 py-3.5 font-semibold">
                  {p.name}
                  {p.id === branch.id && <span className="ml-2 rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">SELECTED</span>}
                </td>
                <td className="px-5 py-3.5 font-bold">{formatMetricValue(getMetric(p.metrics, HERO_METRIC))}</td>
                <td className="px-5 py-3.5">{formatMetricValue(getMetric(p.metrics, "cure_rate"))}</td>
                <td className="px-5 py-3.5">{formatMetricValue(getMetric(p.metrics, "ptp_kept_rate"))}</td>
                <td className="px-5 py-3.5">{formatMetricValue(getMetric(p.metrics, "autopay_active_pct"))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}
