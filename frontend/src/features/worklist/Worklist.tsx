import { Link, useSearch } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight, Filter, RotateCcw, Search } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button, GlassCard, Status } from "@/components/ui";
import { useBranch } from "@/hooks/branch-context";
import { useDate } from "@/hooks/date-context";
import { getCustomerAnalytics, getCustomersForDate } from "@/data/mock-data";

export function Worklist() {
  const { segment } = useSearch({ from: "/worklist" });
  const { selectedBranch, hasBranch } = useBranch();
  const { selectedDate, formattedDate } = useDate();
  const [q, setQ] = useState("");

  const analytics = useMemo(
    () => getCustomerAnalytics(hasBranch ? selectedBranch!.sourceBranchCode : null, selectedDate),
    [hasBranch, selectedBranch, selectedDate]
  );

  // Filter by branch context & date snapshot
  const branchFiltered = useMemo(
    () => getCustomersForDate(selectedDate, hasBranch ? selectedBranch!.sourceBranchCode : null),
    [selectedDate, hasBranch, selectedBranch]
  );

  // Apply search & segment filters
  const rows = useMemo(() => {
    return branchFiltered.filter((c) => {
      const matchesSearch = `${c.name} ${c.id} ${c.account} ${c.branch}`.toLowerCase().includes(q.toLowerCase());
      const matchesSegment = segment === "High" ? c.priority === "High" : true;
      return matchesSearch && matchesSegment;
    });
  }, [branchFiltered, q, segment]);

  const contextLabel = hasBranch ? selectedBranch!.name : "All Branches";
  const hasActiveFilters = q !== "";

  const resetFilters = () => {
    setQ("");
  };

  return (
    <AppShell
      title="Priority Worklist"
      section="Customer Level"
      subtitle={`Portfolio Overview · ${formattedDate}`}
    >
      <div className="mx-auto max-w-[1320px] space-y-4">
        {/* KPI SUMMARY ROW */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <GlassCard className="p-4">
            <p className="text-[10px] font-bold uppercase tracking-[.1em] text-muted-foreground">Queue Size</p>
            <p className="mt-1 text-2xl font-bold text-display">{rows.length}</p>
            <p className="text-xs text-muted-foreground">Filtered accounts</p>
          </GlassCard>
          <GlassCard className="p-4 border-destructive/25 bg-destructive/5">
            <p className="text-[10px] font-bold uppercase tracking-[.1em] text-destructive">High Priority</p>
            <p className="mt-1 text-2xl font-bold text-display text-destructive">
              {branchFiltered.filter((c) => c.priority === "High").length}
            </p>
            <p className="text-xs text-muted-foreground">Immediate action</p>
          </GlassCard>
          <GlassCard className="p-4">
            <p className="text-[10px] font-bold uppercase tracking-[.1em] text-muted-foreground">Broken PTPs</p>
            <p className="mt-1 text-2xl font-bold text-display text-warning-foreground">
              {branchFiltered.filter((c) => c.ptp === "Broken").length}
            </p>
            <p className="text-xs text-muted-foreground">Requires re-commitment</p>
          </GlassCard>
          <GlassCard className="p-4">
            <p className="text-[10px] font-bold uppercase tracking-[.1em] text-muted-foreground">30+ DPD Delinquent</p>
            <p className="mt-1 text-2xl font-bold text-display">
              {branchFiltered.filter((c) => c.dpd > 30).length}
            </p>
            <p className="text-xs text-muted-foreground">Hardening risk</p>
          </GlassCard>
        </div>

        {/* WORKLIST MAIN CARD */}
        <GlassCard className="overflow-hidden">
          {/* HEADER & SEARCH */}
          <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-display">Priority Worklist</h2>
                <Status tone={rows.length > 0 ? "info" : "neutral"}>{rows.length} accounts</Status>
              </div>
              <p className="text-xs text-muted-foreground">
                Accounts requiring immediate collection attention · Ordered by urgency and exposure · {contextLabel}
              </p>
            </div>

            <div className="ml-auto flex flex-wrap items-center gap-2">
              <label className="flex h-9 min-w-[240px] items-center gap-2 rounded-lg border bg-card/70 px-3">
                <Search className="size-4 text-muted-foreground" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search customer, ID or account"
                  className="w-full bg-transparent text-sm outline-none"
                />
              </label>

              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs text-muted-foreground transition hover:bg-muted"
                >
                  <RotateCcw className="size-3" /> Reset
                </button>
              )}
            </div>
          </div>

          {/* DIAGNOSTIC SEGMENT BANNER */}
          {segment && (
            <div className="flex items-center justify-between border-b bg-primary/5 px-4 py-2 text-xs text-primary">
              <span className="flex items-center gap-1.5 font-medium">
                <Filter className="size-3.5" /> Showing high-attention accounts driving the branch performance gap
              </span>
              <Link to="/worklist" search={{ segment: undefined }} className="font-bold underline hover:opacity-80">
                Clear segment
              </Link>
            </div>
          )}

          {/* TABLE OF ACCOUNTS */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-left text-sm">
              <thead className="bg-muted/50 text-[10px] uppercase tracking-[.1em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">DPD</th>
                  <th className="px-4 py-3">Outstanding</th>
                  <th className="px-4 py-3">Risk Tier</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">PTP Status</th>
                  <th className="px-4 py-3">Last Contact</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      No customer accounts match the selected filters.
                      <div className="mt-2">
                        <Button variant="secondary" size="sm" onClick={resetFilters}>
                          Reset Filters
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  rows.map((c) => {
                    const isBrokenPtp = c.ptp === "Broken";
                    const isDueToday = c.ptp === "Due today";

                    return (
                      <tr className="group transition hover:bg-primary/5" key={c.id}>
                        {/* Customer */}
                        <td className="px-4 py-3">
                          <Link
                            to="/customers/$customerId"
                            params={{ customerId: c.id }}
                            className="font-bold text-foreground group-hover:text-primary transition"
                          >
                            {c.name}
                          </Link>
                          <p className="text-[11px] text-muted-foreground">
                            {c.id} · {c.account} {!hasBranch && `· ${c.branch}`}
                          </p>
                        </td>

                        {/* DPD */}
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block rounded-md px-2 py-0.5 text-xs font-bold ${
                              c.dpd > 60
                                ? "bg-destructive/15 text-destructive"
                                : c.dpd > 30
                                ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                                : "bg-primary/10 text-primary"
                            }`}
                          >
                            {c.dpd} DPD
                          </span>
                        </td>

                        {/* Outstanding */}
                        <td className="px-4 py-3 font-semibold">{c.amount}</td>

                        {/* Risk */}
                        <td className="px-4 py-3">
                          <Status tone={c.risk === "High" ? "danger" : c.risk === "Medium" ? "warn" : "good"}>
                            {c.risk}
                          </Status>
                        </td>

                        {/* Priority */}
                        <td className="px-4 py-3">
                          <Status tone={c.priority === "High" ? "danger" : c.priority === "Medium" ? "warn" : "good"}>
                            {c.priority}
                          </Status>
                        </td>

                        {/* PTP Status */}
                        <td className="px-4 py-3">
                          <span
                            className={`text-xs font-medium ${
                              isBrokenPtp
                                ? "font-bold text-destructive"
                                : isDueToday
                                ? "font-bold text-amber-600 dark:text-amber-400"
                                : "text-muted-foreground"
                            }`}
                          >
                            {c.ptp}
                          </span>
                        </td>

                        {/* Last Contact */}
                        <td className="px-4 py-3 text-xs text-muted-foreground">{c.last}</td>

                        {/* Action */}
                        <td className="px-4 py-3 text-right">
                          <Link
                            to="/customers/$customerId"
                            params={{ customerId: c.id }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary transition hover:bg-primary hover:text-primary-foreground"
                          >
                            <span>View Profile</span>
                            <ArrowRight className="size-3" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* FOOTER PAGINATION/COUNT */}
          <div className="flex items-center justify-between border-t p-4 text-xs text-muted-foreground">
            <span>Showing {rows.length} of {branchFiltered.length} accounts · {contextLabel}</span>
            <span>Sorted by Risk & Urgency</span>
          </div>
        </GlassCard>
      </div>
    </AppShell>
  );
}
