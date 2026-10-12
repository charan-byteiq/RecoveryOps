import { Link, useSearch } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  ChevronRight,
  Clock3,
  Filter,
  RotateCcw,
  Search,
  ShieldAlert,
  Sparkles,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button, GlassCard, Status } from "@/components/ui";
import { useBranch } from "@/hooks/branch-context";
import { useDate } from "@/hooks/date-context";
import { getCustomerAnalytics, getCustomersForDate } from "@/data/mock-data";

export function Worklist() {
  const { segment } = useSearch({ from: "/worklist" });
  const { selectedBranch, hasBranch } = useBranch();
  const { selectedDate, formattedDate } = useDate();

  // Search and multi-dimensional filter state
  const [q, setQ] = useState("");
  const [dpdFilter, setDpdFilter] = useState<"All" | "1-30" | "31-60" | "61+">("All");
  const [riskFilter, setRiskFilter] = useState<"All" | "High" | "Medium" | "Low">("All");
  const [ptpFilter, setPtpFilter] = useState<"All" | "Broken" | "Due today" | "High Priority">("All");

  const analytics = useMemo(
    () => getCustomerAnalytics(hasBranch ? selectedBranch!.sourceBranchCode : null, selectedDate),
    [hasBranch, selectedBranch, selectedDate]
  );

  // Filter by branch context & date snapshot
  const branchFiltered = useMemo(
    () => getCustomersForDate(selectedDate, hasBranch ? selectedBranch!.sourceBranchCode : null),
    [selectedDate, hasBranch, selectedBranch]
  );

  // Apply search & multi-dimensional filters
  const rows = useMemo(() => {
    let result = branchFiltered.filter((c) => {
      // Search matches customer name, account number, customer ID
      const matchesSearch =
        q === "" ||
        `${c.name} ${c.id} ${c.account} ${c.branch}`.toLowerCase().includes(q.toLowerCase());

      // Segment URL query filter
      const matchesSegment = segment === "High" ? c.priority === "High" : true;

      // DPD filter
      const matchesDpd =
        dpdFilter === "All"
          ? true
          : dpdFilter === "1-30"
          ? c.dpd <= 30
          : dpdFilter === "31-60"
          ? c.dpd > 30 && c.dpd <= 60
          : c.dpd > 60;

      // Risk filter
      const matchesRisk = riskFilter === "All" ? true : c.risk === riskFilter;

      // PTP / Urgency filter
      const matchesPtp =
        ptpFilter === "All"
          ? true
          : ptpFilter === "Broken"
          ? c.ptp === "Broken"
          : ptpFilter === "Due today"
          ? c.ptp === "Due today"
          : c.priority === "High";

      return matchesSearch && matchesSegment && matchesDpd && matchesRisk && matchesPtp;
    });

    // Operational queue triage: Order by urgency (High priority first, Broken PTP, highest DPD, largest exposure)
    return result.sort((a, b) => {
      const priorityWeight = (p: string) => (p === "High" ? 3 : p === "Medium" ? 2 : 1);
      const ptpWeight = (p: string) => (p === "Broken" ? 3 : p === "Due today" ? 2 : 1);

      if (priorityWeight(b.priority) !== priorityWeight(a.priority)) {
        return priorityWeight(b.priority) - priorityWeight(a.priority);
      }
      if (ptpWeight(b.ptp) !== ptpWeight(a.ptp)) {
        return ptpWeight(b.ptp) - ptpWeight(a.ptp);
      }
      return b.dpd - a.dpd;
    });
  }, [branchFiltered, q, segment, dpdFilter, riskFilter, ptpFilter]);

  const contextLabel = hasBranch ? selectedBranch!.name : "All Branches Network";
  const hasActiveFilters = q !== "" || dpdFilter !== "All" || riskFilter !== "All" || ptpFilter !== "All";

  const resetFilters = () => {
    setQ("");
    setDpdFilter("All");
    setRiskFilter("All");
    setPtpFilter("All");
  };

  return (
    <AppShell
      title="Frontline Priority Worklist"
      section="Customer Level"
      subtitle={`Operational Queue Triage · ${formattedDate}`}
    >
      <div className="mx-auto max-w-[1320px] space-y-4">
        {/* KPI SUMMARY ROW */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <GlassCard className="p-4">
            <p className="text-[10px] font-bold uppercase tracking-[.1em] text-muted-foreground">Active Queue Size</p>
            <p className="mt-1 text-2xl font-bold text-display text-foreground">{rows.length}</p>
            <p className="text-xs text-muted-foreground">High-attention accounts</p>
          </GlassCard>
          <GlassCard className="p-4 border-destructive/25 bg-destructive/5">
            <p className="text-[10px] font-bold uppercase tracking-[.1em] text-destructive">High Priority Action</p>
            <p className="mt-1 text-2xl font-bold text-display text-destructive">
              {branchFiltered.filter((c) => c.priority === "High").length}
            </p>
            <p className="text-xs text-muted-foreground">Immediate triage required</p>
          </GlassCard>
          <GlassCard className="p-4">
            <p className="text-[10px] font-bold uppercase tracking-[.1em] text-muted-foreground">Broken PTP Backlog</p>
            <p className="mt-1 text-2xl font-bold text-display text-warning-foreground">
              {branchFiltered.filter((c) => c.ptp === "Broken").length}
            </p>
            <p className="text-xs text-muted-foreground">Re-commitment intervention</p>
          </GlassCard>
          <GlassCard className="p-4">
            <p className="text-[10px] font-bold uppercase tracking-[.1em] text-muted-foreground">30+ DPD Hardening</p>
            <p className="mt-1 text-2xl font-bold text-display text-foreground">
              {branchFiltered.filter((c) => c.dpd > 30).length}
            </p>
            <p className="text-xs text-muted-foreground">Delinquency escalation risk</p>
          </GlassCard>
        </div>

        {/* WORKLIST MAIN CARD */}
        <GlassCard className="overflow-hidden">
          {/* HEADER & REAL-TIME SEARCH */}
          <div className="flex flex-col gap-3.5 border-b p-4.5 lg:flex-row lg:items-center">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-display text-base">Operational Queue Triage</h2>
                <Status tone={rows.length > 0 ? "info" : "neutral"}>{rows.length} accounts</Status>
              </div>
              <p className="text-xs text-muted-foreground">
                High-attention accounts ordered by urgency, outstanding exposure, and hardening default risk · {contextLabel}
              </p>
            </div>

            <div className="ml-auto flex flex-wrap items-center gap-2">
              <label className="flex h-9 min-w-[280px] items-center gap-2 rounded-lg border border-border/80 bg-card/70 px-3 shadow-2xs">
                <Search className="size-4 text-muted-foreground" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search customer name, ID, or account..."
                  className="w-full bg-transparent text-xs outline-none"
                />
              </label>

              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="flex items-center gap-1 rounded-lg border bg-card/60 px-2.5 py-1.5 text-xs text-muted-foreground transition hover:bg-accent"
                >
                  <RotateCcw className="size-3" /> Reset
                </button>
              )}
            </div>
          </div>

          {/* MULTI-DIMENSIONAL FILTER TOOLBAR */}
          <div className="flex flex-wrap items-center gap-3 border-b bg-muted/30 px-4.5 py-2.5 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-muted-foreground uppercase text-[10px] tracking-wider">
              <Filter className="size-3 text-primary" /> Filters:
            </div>

            {/* DPD Stage Filter */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-muted-foreground mr-1">DPD:</span>
              {(["All", "1-30", "31-60", "61+"] as const).map((stage) => (
                <button
                  key={stage}
                  onClick={() => setDpdFilter(stage)}
                  className={`rounded-md px-2 py-0.5 text-[11px] font-semibold transition ${
                    dpdFilter === stage
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "bg-card/70 hover:bg-accent text-foreground"
                  }`}
                >
                  {stage}
                </button>
              ))}
            </div>

            <span className="text-border">|</span>

            {/* Risk Tier Filter */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-muted-foreground mr-1">Risk:</span>
              {(["All", "High", "Medium", "Low"] as const).map((tier) => (
                <button
                  key={tier}
                  onClick={() => setRiskFilter(tier)}
                  className={`rounded-md px-2 py-0.5 text-[11px] font-semibold transition ${
                    riskFilter === tier
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "bg-card/70 hover:bg-accent text-foreground"
                  }`}
                >
                  {tier}
                </button>
              ))}
            </div>

            <span className="text-border">|</span>

            {/* Diagnostic / PTP Segment Filter */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-muted-foreground mr-1">Segment:</span>
              {(["All", "Broken", "Due today", "High Priority"] as const).map((seg) => (
                <button
                  key={seg}
                  onClick={() => setPtpFilter(seg)}
                  className={`rounded-md px-2 py-0.5 text-[11px] font-semibold transition ${
                    ptpFilter === seg
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "bg-card/70 hover:bg-accent text-foreground"
                  }`}
                >
                  {seg}
                </button>
              ))}
            </div>
          </div>

          {/* DIAGNOSTIC SEGMENT ACTIVE BANNER */}
          {segment && (
            <div className="flex items-center justify-between border-b bg-primary/5 px-4.5 py-2 text-xs text-primary">
              <span className="flex items-center gap-1.5 font-medium">
                <Sparkles className="size-3.5" /> High-attention accounts filtered by diagnostic gap
              </span>
              <Link to="/worklist" search={{ segment: undefined }} className="font-bold underline hover:opacity-80">
                Clear segment
              </Link>
            </div>
          )}

          {/* TABLE OF ACCOUNTS */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-left text-sm">
              <thead className="bg-muted/50 text-[10px] uppercase tracking-[.1em] text-muted-foreground border-b">
                <tr>
                  <th className="px-5 py-3 font-semibold">Customer / Account</th>
                  <th className="px-5 py-3 font-semibold">DPD Stage</th>
                  <th className="px-5 py-3 font-semibold">Outstanding Exposure</th>
                  <th className="px-5 py-3 font-semibold">Risk Tier</th>
                  <th className="px-5 py-3 font-semibold">Triage Priority</th>
                  <th className="px-5 py-3 font-semibold">PTP Status</th>
                  <th className="px-5 py-3 font-semibold">Last Contact</th>
                  <th className="px-5 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      No customer accounts match the selected filters.
                      <div className="mt-2">
                        <Button variant="secondary" size="sm" onClick={resetFilters}>
                          Reset All Filters
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  rows.map((c) => {
                    const isBrokenPtp = c.ptp === "Broken";
                    const isDueToday = c.ptp === "Due today";

                    return (
                      <tr className="group transition hover:bg-card/70" key={c.id}>
                        {/* Customer */}
                        <td className="px-5 py-3.5">
                          <Link
                            to="/customers/$customerId"
                            params={{ customerId: c.id }}
                            className="font-bold text-foreground group-hover:text-primary transition block"
                          >
                            {c.name}
                          </Link>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {c.id} · Acct {c.account} {!hasBranch && `· ${c.branch}`}
                          </p>
                        </td>

                        {/* DPD */}
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-block rounded-md px-2 py-0.5 text-xs font-bold text-display ${
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

                        {/* Outstanding Exposure */}
                        <td className="px-5 py-3.5 font-bold text-display text-foreground">{c.amount}</td>

                        {/* Risk Tier */}
                        <td className="px-5 py-3.5">
                          <Status tone={c.risk === "High" ? "danger" : c.risk === "Medium" ? "warning" : "success"}>
                            {c.risk}
                          </Status>
                        </td>

                        {/* Priority */}
                        <td className="px-5 py-3.5">
                          <Status tone={c.priority === "High" ? "danger" : c.priority === "Medium" ? "warning" : "success"}>
                            {c.priority}
                          </Status>
                        </td>

                        {/* PTP Status */}
                        <td className="px-5 py-3.5">
                          <span
                            className={`text-xs font-semibold ${
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
                        <td className="px-5 py-3.5 text-xs text-muted-foreground">{c.last}</td>

                        {/* Action: Direct Routing */}
                        <td className="px-5 py-3.5 text-right">
                          <Link
                            to="/customers/$customerId"
                            params={{ customerId: c.id }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary transition hover:bg-primary hover:text-primary-foreground shadow-2xs group-hover:scale-105"
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

          {/* FOOTER */}
          <div className="flex items-center justify-between border-t p-4 text-xs text-muted-foreground">
            <span>
              Showing {rows.length} of {branchFiltered.length} accounts · {contextLabel}
            </span>
            <span className="font-medium text-foreground">Operational Triage: Urgency & Exposure Priority</span>
          </div>
        </GlassCard>
      </div>
    </AppShell>
  );
}
