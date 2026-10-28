import { Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { AppShell } from "@/components/app-shell";
import {
  CUSTOMERS,
  CHANNELS,
  CONTENTS,
  bestChannel,
  type CustomerData,
} from "@/data/customer-nba-data";

export function Worklist() {
  const [priorityFilter, setPriorityFilter] = useState<string>("All");
  const [channelFilter, setChannelFilter] = useState<string>("All");
  const [contentFilter, setContentFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const customers = CUSTOMERS;

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchP = priorityFilter === "All" || c.tier === priorityFilter;
      const matchC = channelFilter === "All" || bestChannel(c) === channelFilter;
      const matchM = contentFilter === "All" || c.content[0] === contentFilter;
      const matchQ =
        searchQuery === "" ||
        (c.name + c.id + c.acct).toLowerCase().includes(searchQuery.toLowerCase());
      return matchP && matchC && matchM && matchQ;
    });
  }, [customers, priorityFilter, channelFilter, contentFilter, searchQuery]);

  const hiCount = customers.filter((c) => c.tier === "High").length;
  const lowCovCount = customers.filter((c) => c.cov < 25).length;
  const lowReachCount = customers.filter((c) => c.reach < 40).length;

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
          <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Active Queue
            </div>
            <div className="mt-1 text-2xl font-bold text-foreground">{customers.length}</div>
            <p className="text-xs text-muted-foreground mt-0.5">Customers ranked by priority</p>
          </div>
          <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              High Priority
            </div>
            <div className="mt-1 text-2xl font-bold text-destructive">{hiCount}</div>
            <p className="text-xs text-muted-foreground mt-0.5">Act first</p>
          </div>
          <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Low Payment Coverage
            </div>
            <div className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">
              {lowCovCount}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Coverage under 25%</p>
          </div>
          <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Low Response
            </div>
            <div className="mt-1 text-2xl font-bold text-foreground">{lowReachCount}</div>
            <p className="text-xs text-muted-foreground mt-0.5">Response rate under 40%</p>
          </div>
        </div>

        {/* MAIN WORKLIST TABLE CARD */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
          <h2 className="text-base font-bold text-foreground">Prioritised customer list</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Each customer gets a priority rank and the right content, channel and cadence.
          </p>

          {/* FILTER BARS */}
          <div className="mt-4 flex flex-wrap items-center gap-3 border-y border-border/60 py-3 text-xs">
            {/* Search Input */}
            <input
              type="text"
              placeholder="Search customer name, ID or account"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-64 rounded-full border border-border/80 bg-muted/30 px-3.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />

            {/* Priority Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground text-xs font-medium">Priority</span>
              {["All", "High", "Medium", "Low"].map((p) => (
                <button
                  key={p}
                  onClick={() => setPriorityFilter(p)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                    priorityFilter === p
                      ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Channel Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground text-xs font-medium">Channel</span>
              {["All", ...CHANNELS].map((c) => (
                <button
                  key={c}
                  onClick={() => setChannelFilter(c)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                    channelFilter === c
                      ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Content Category Filter */}
          <div className="flex flex-wrap items-center gap-1.5 py-2 text-xs">
            <span className="text-muted-foreground text-xs font-medium mr-1">Content</span>
            {["All", ...CONTENTS].map((m) => (
              <button
                key={m}
                onClick={() => setContentFilter(m)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                  contentFilter === m
                    ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {/* TABLE */}
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border/80 text-[11px] uppercase tracking-wider text-muted-foreground bg-muted/20">
                  <th className="px-4 py-2.5 font-semibold">Rank</th>
                  <th className="px-4 py-2.5 font-semibold">Customer</th>
                  <th className="px-4 py-2.5 font-semibold">Priority</th>
                  <th className="px-4 py-2.5 font-semibold">Content</th>
                  <th className="px-4 py-2.5 font-semibold">Cadence</th>
                  <th className="px-4 py-2.5 font-semibold">Channel</th>
                  <th className="px-4 py-2.5 font-semibold">Last Payment</th>
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
                          Open {c.open}% · Click {c.click}%
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{c.cad[0]}</div>
                        <div className="text-[11px] text-muted-foreground">Coverage {c.cov}%</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-foreground">{bestChannel(c)}</div>
                        <div className="text-[11px] text-muted-foreground">
                          Affinity {c.aff[0]![1]}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{c.last}d ago</td>
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
