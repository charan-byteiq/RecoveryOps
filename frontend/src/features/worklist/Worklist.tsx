import { Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { AppShell } from "@/components/app-shell";
import {
  CUSTOMERS,
  TOUCHPOINT_METHODS,
  TEMPLATES,
  bestTouchpoint,
  type CustomerData,
} from "@/data/customer-nba-data";

export function Worklist() {
  const [priorityFilter, setPriorityFilter] = useState<string>("All");
  const [touchpointFilter, setTouchpointFilter] = useState<string>("All");
  const [templateFilter, setTemplateFilter] = useState<string>("All");
  const [outreachStatusFilter, setOutreachStatusFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const customers = CUSTOMERS;

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchP = priorityFilter === "All" || c.tier === priorityFilter;
      const matchC = touchpointFilter === "All" || bestTouchpoint(c) === touchpointFilter;
      const matchM = templateFilter === "All" || c.content[0] === templateFilter;
      const matchO =
        outreachStatusFilter === "All" ||
        (outreachStatusFilter === "Zero Outreach" ? c.touches === 0 : c.touches > 0);
      const matchQ =
        searchQuery === "" ||
        (c.name + c.id + c.acct).toLowerCase().includes(searchQuery.toLowerCase());
      return matchP && matchC && matchM && matchO && matchQ;
    });
  }, [customers, priorityFilter, touchpointFilter, templateFilter, outreachStatusFilter, searchQuery]);

  const hiCount = customers.filter((c) => c.tier === "High").length;
  const lowCovCount = customers.filter((c) => c.cov < 25).length;
  const lowReachCount = customers.filter((c) => c.reach < 40).length;
  const zeroOutreachCount = customers.filter((c) => c.touches === 0).length;

  const getTierBadge = (c: CustomerData) => {
    if (c.tier === "High") {
      return (
        <span className="inline-flex items-center rounded-full bg-destructive/15 px-2.5 py-0.5 text-xs font-semibold text-destructive">
          High · {c.pri}
        </span>
      );
    }
    if (c.tier === "Medium") {
      return (
        <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
          Medium · {c.pri}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
        Low · {c.pri}
      </span>
    );
  };

  return (
    <AppShell
      title="Priority Worklist"
      section="Customer Level"
      subtitle="Next Best Actions"
      actions={
        <span className="rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
          Refreshed: Oct 28, 2026
        </span>
      }
    >
      <div className="mx-auto max-w-[1280px] space-y-4">
        {/* TOP 4 STAT CARDS */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-4 pt-5 shadow-xs before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-gradient-to-r before:from-violet-600 before:to-pink-600">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Active Queue
            </div>
            <div className="mt-1 text-3xl font-extrabold bg-gradient-to-r from-violet-600 to-pink-600 bg-clip-text text-transparent">
              {customers.length}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Customers ranked by priority</p>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-4 pt-5 shadow-xs before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-gradient-to-r before:from-red-500 before:to-orange-500">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              High Priority
            </div>
            <div className="mt-1 text-3xl font-extrabold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
              {hiCount}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Act first</p>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-4 pt-5 shadow-xs before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-gradient-to-r before:from-amber-500 before:to-yellow-400">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Low Payment Coverage
            </div>
            <div className="mt-1 text-3xl font-extrabold bg-gradient-to-r from-amber-600 to-amber-500 bg-clip-text text-transparent">
              {lowCovCount}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Coverage under 25%</p>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-4 pt-5 shadow-xs before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-gradient-to-r before:from-sky-500 before:to-violet-600">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Low Response
            </div>
            <div className="mt-1 text-3xl font-extrabold bg-gradient-to-r from-sky-500 to-violet-600 bg-clip-text text-transparent">
              {lowReachCount}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Response rate under 40%</p>
          </div>
        </div>

        {/* MAIN WORKLIST TABLE CARD */}
        <div className="rounded-2xl border-t-4 border-t-violet-500 border-x border-b border-border/80 bg-card p-5 shadow-xs">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold bg-gradient-to-r from-violet-600 to-pink-600 bg-clip-text text-transparent">
                Prioritised customer list
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Suggested engagement template, communication preference, and follow-up timing for each borrower.
              </p>
            </div>
            <div className="text-xs text-muted-foreground">
              Showing <b className="text-foreground">{filteredCustomers.length}</b> of {customers.length} customers
            </div>
          </div>

          {/* FILTER PANEL */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 rounded-xl border border-border/70 bg-muted/20 p-3.5 text-xs">
            {/* Search Input */}
            <div className="md:col-span-3">
              <label className="block text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Search
              </label>
              <input
                type="text"
                placeholder="Search customer name, ID or account"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-full rounded-xl border border-border/80 bg-card px-3.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 focus:outline-none"
              />
            </div>

            {/* Priority Filter */}
            <div>
              <label className="block text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                1 · Priority
              </label>
              <div className="flex gap-1 rounded-xl border border-border/80 bg-card p-1">
                {[
                  { label: "All", count: customers.length, color: "" },
                  { label: "High", count: hiCount, color: "bg-red-500" },
                  { label: "Medium", count: customers.filter((c) => c.tier === "Medium").length, color: "bg-amber-500" },
                  { label: "Low", count: customers.filter((c) => c.tier === "Low").length, color: "bg-emerald-500" },
                ].map(({ label, count, color }) => (
                  <button
                    key={label}
                    onClick={() => setPriorityFilter(label)}
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition ${
                      priorityFilter === label
                        ? "bg-gradient-to-r from-violet-600 to-pink-600 text-white shadow-xs"
                        : "text-foreground hover:bg-muted/50"
                    }`}
                  >
                    {color && <span className={`size-1.5 rounded-full ${color}`} />}
                    {label}
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                        priorityFilter === label
                          ? "bg-white/25 text-white"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Communication Preferences Filter */}
            <div>
              <label className="block text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                2 · Communication Preferences
              </label>
              <div className="flex gap-1 rounded-xl border border-border/80 bg-card p-1">
                {["All", ...TOUCHPOINT_METHODS].map((c) => (
                  <button
                    key={c}
                    onClick={() => setTouchpointFilter(c)}
                    className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition text-center truncate ${
                      touchpointFilter === c
                        ? "bg-gradient-to-r from-violet-600 to-pink-600 text-white shadow-xs"
                        : "text-foreground hover:bg-muted/50"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Template Selection Filter */}
            <div>
              <label className="block text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                3 · Suggested Template
              </label>
              <select
                value={templateFilter}
                onChange={(e) => setTemplateFilter(e.target.value)}
                className="h-[38px] w-full rounded-xl border border-border/80 bg-card px-3 text-xs font-semibold text-foreground focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 focus:outline-none cursor-pointer"
              >
                <option value="All">All templates</option>
                {TEMPLATES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* Outreach Status Filter */}
            <div className="md:col-span-3">
              <div className="flex items-center gap-2 flex-wrap pt-1 text-xs">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
                  Post-due Outreach:
                </span>
                {[
                  { label: "All", count: customers.length },
                  { label: "Contacted", count: customers.length - zeroOutreachCount },
                  { label: "Zero Outreach", count: zeroOutreachCount },
                ].map(({ label, count }) => (
                  <button
                    key={label}
                    onClick={() => setOutreachStatusFilter(label)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition ${
                      outreachStatusFilter === label
                        ? "bg-primary text-primary-foreground shadow-2xs"
                        : "border border-border/70 bg-card text-muted-foreground hover:bg-muted/50"
                    }`}
                  >
                    {label}
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                        outreachStatusFilter === label
                          ? "bg-white/20 text-white"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* TABLE */}
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border/80 text-[11px] uppercase tracking-wider text-muted-foreground bg-muted/20">
                  <th className="px-4 py-2.5 font-semibold">Rank</th>
                  <th className="px-4 py-2.5 font-semibold">Customer</th>
                  <th className="px-4 py-2.5 font-semibold">Priority</th>
                  <th className="px-4 py-2.5 font-semibold">Suggested Template</th>
                  <th className="px-4 py-2.5 font-semibold">Follow-up Timing</th>
                  <th className="px-4 py-2.5 font-semibold">Communication Preferences</th>
                  <th className="px-4 py-2.5 font-semibold">Repayment Status</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-xs text-muted-foreground">
                      No customers match these filters.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((c, i) => (
                    <tr key={c.id} className="hover:bg-muted/30 transition">
                      <td className="px-4 py-3 font-bold text-foreground">{i + 1}</td>
                      <td className="px-4 py-3">
                        <Link
                          to="/customers/$customerId"
                          params={{ customerId: c.id }}
                          className="font-bold text-foreground hover:text-primary transition"
                        >
                          {c.name}
                        </Link>
                        <div className="text-[11px] text-muted-foreground">
                          {c.id} · Acct {c.acct}
                        </div>
                      </td>
                      <td className="px-4 py-3">{getTierBadge(c)}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{c.content[0]}</div>
                        <div className="text-[11px] text-muted-foreground">
                          Open {c.open}% · Interaction {c.click}%
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{c.cad[0]}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {c.touches === 0 ? (
                            <span className="font-semibold text-amber-600 dark:text-amber-400">
                              No outreach post due-date
                            </span>
                          ) : (
                            `${c.touches} touches · ${c.daysSinceOutreach}d ago`
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-foreground">{bestTouchpoint(c)}</div>
                        <div className="text-[11px] text-muted-foreground">
                          Affinity {c.aff[0]![1]}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div
                          className={`font-semibold ${c.repaymentType === "Full Repayment" ? "text-emerald-600 dark:text-emerald-400" : c.repaymentType === "Partial Repayment" ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}
                        >
                          {c.repaymentType}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {c.last}d ago ({c.cov}% cov)
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to="/customers/$customerId"
                          params={{ customerId: c.id }}
                          className="inline-flex items-center rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition shadow-2xs"
                        >
                          View Profile
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
