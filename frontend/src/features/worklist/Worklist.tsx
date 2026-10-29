import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { AppShell } from "@/components/app-shell";
import {
  CUSTOMERS,
  TOUCHPOINT_METHODS,
  BRANCH_METADATA,
  ALL_BRANCH_CODES,
  bestTouchpoint,
  getStoredCustomerBranch,
  setStoredCustomerBranch,
  type CustomerData,
} from "@/data/customer-nba-data";
import {
  Building2,
  X,
  Phone,
  Smartphone,
  Mail,
  MapPin,
  ArrowRight,
  Search,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

export function Worklist() {
  const navigate = useNavigate();
  const searchParams = useRouterState({
    select: (s) => (s.location.search as Record<string, string | undefined>),
  });

  const urlBranch = searchParams?.["branch"];
  const storedBranch = typeof window !== "undefined" ? getStoredCustomerBranch() : null;
  const initialBranch = urlBranch || storedBranch || "All";

  const [selectedBranchCode, setSelectedBranchCode] = useState<string>(initialBranch);
  const [priorityFilter, setPriorityFilter] = useState<string>("All");
  const [touchpointFilter, setTouchpointFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Sync state if URL changes
  useEffect(() => {
    if (urlBranch && urlBranch !== selectedBranchCode) {
      setSelectedBranchCode(urlBranch);
      setStoredCustomerBranch(urlBranch);
    } else if (!urlBranch && selectedBranchCode !== "All" && !storedBranch) {
      setSelectedBranchCode("All");
    }
  }, [urlBranch]);

  const handleBranchSelect = (code: string) => {
    setSelectedBranchCode(code);
    if (code === "All") {
      setStoredCustomerBranch(null);
      navigate({ to: "/worklist" });
    } else {
      setStoredCustomerBranch(code);
      navigate({ to: "/worklist", search: { branch: code } });
    }
  };

  const branchMeta =
    selectedBranchCode && selectedBranchCode !== "All"
      ? BRANCH_METADATA[selectedBranchCode]
      : null;

  // Base list filtered by active branch
  const baseCustomers = useMemo(() => {
    if (selectedBranchCode && selectedBranchCode !== "All") {
      return CUSTOMERS.filter((c) => c.br === selectedBranchCode);
    }
    return CUSTOMERS;
  }, [selectedBranchCode]);

  // Secondary filters applied on top of branch base list
  const filteredCustomers = useMemo(() => {
    return baseCustomers.filter((c) => {
      const matchP = priorityFilter === "All" || c.tier === priorityFilter;
      const matchC = touchpointFilter === "All" || bestTouchpoint(c) === touchpointFilter;
      const matchQ =
        searchQuery === "" ||
        (c.name + c.id + c.acct).toLowerCase().includes(searchQuery.toLowerCase());
      return matchP && matchC && matchQ;
    });
  }, [
    baseCustomers,
    priorityFilter,
    touchpointFilter,
    searchQuery,
  ]);

  // Dynamic statistics calculated for the active branch population
  const hiCount = baseCustomers.filter((c) => c.tier === "High").length;
  const medCount = baseCustomers.filter((c) => c.tier === "Medium").length;
  const lowCount = baseCustomers.filter((c) => c.tier === "Low").length;
  const lowCovCount = baseCustomers.filter((c) => c.cov < 25).length;
  const lowReachCount = baseCustomers.filter((c) => c.reach < 40).length;
  const zeroOutreachCount = baseCustomers.filter((c) => c.touches === 0).length;

  const getTierBadge = (c: CustomerData) => {
    if (c.tier === "High") {
      return (
        <span className="inline-flex items-center rounded-full bg-rose-500/15 border border-rose-500/30 px-2.5 py-0.5 text-xs font-bold text-rose-600 dark:text-rose-400">
          High · {c.pri}
        </span>
      );
    }
    if (c.tier === "Medium") {
      return (
        <span className="inline-flex items-center rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-xs font-bold text-amber-600 dark:text-amber-400">
          Medium · {c.pri}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
        Low · {c.pri}
      </span>
    );
  };

  const getChannelIcon = (name: string) => {
    if (name.includes("Phone")) return <Phone className="size-3.5 text-blue-500 shrink-0" />;
    if (name.includes("Field")) return <MapPin className="size-3.5 text-cyan-500 shrink-0" />;
    if (name.includes("Mail")) return <Mail className="size-3.5 text-amber-500 shrink-0" />;
    return <Smartphone className="size-3.5 text-emerald-500 shrink-0" />;
  };

  return (
    <AppShell
      title="Priority Worklist"
      section="Customer Level"
      subtitle={branchMeta ? branchMeta.name : "All Operational Branches"}
      actions={
        <div className="flex items-center gap-3">
          {/* Branch Switcher Dropdown */}
          <div className="flex items-center gap-1.5 rounded-xl border border-border/80 bg-card px-2.5 py-1 text-xs font-medium">
            <Building2 className="size-3.5 text-muted-foreground" />
            <select
              value={selectedBranchCode}
              onChange={(e) => handleBranchSelect(e.target.value)}
              className="bg-transparent text-xs font-semibold text-foreground focus:outline-none cursor-pointer"
            >
              <option value="All">All Branches (16 Borrowers)</option>
              {ALL_BRANCH_CODES.map((code) => (
                <option key={code} value={code}>
                  Branch {code} — {BRANCH_METADATA[code]?.name}
                </option>
              ))}
            </select>
          </div>

          <span className="hidden sm:inline-block rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
            Refreshed: Oct 29, 2026
          </span>
        </div>
      }
    >
      <div className="mx-auto max-w-[1340px] space-y-4">
        {/* BRANCH-SPECIFIC HERO BANNER */}
        {branchMeta ? (
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-violet-700 via-fuchsia-600 to-pink-600 p-6 sm:p-7 text-white shadow-2xl">
            {/* Glowing ambient decorative background */}
            <div className="pointer-events-none absolute -top-16 -left-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 -right-16 h-64 w-64 rounded-full bg-purple-900/30 blur-3xl" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
              <div className="space-y-1.5 max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white backdrop-blur-md border border-white/20">
                  <Building2 className="size-3.5" /> Branch {selectedBranchCode} Active Queue
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {branchMeta.name} — Customer Priority Worklist
                </h1>
                <p className="text-xs sm:text-sm text-white/90 font-medium">
                  Prioritized customer list with integrated Next Best Actions across Content, Cadence & Outreach.
                </p>
              </div>

              <div className="flex items-center flex-wrap gap-2 shrink-0">
                <span className="rounded-2xl bg-white/15 px-3.5 py-2 text-xs font-bold text-white backdrop-blur-md border border-white/15">
                  {baseCustomers.length} Borrowers in Queue
                </span>
                <button
                  onClick={() => handleBranchSelect("All")}
                  className="inline-flex items-center gap-1.5 rounded-2xl bg-white/20 hover:bg-white/30 px-3.5 py-2 text-xs font-bold text-white backdrop-blur-md transition cursor-pointer"
                  title="View all branches"
                >
                  <X className="size-3.5" /> View All Branches
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {/* TOP 4 STAT CARDS (Branch-Aware & Real-time) */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-4 pt-5 shadow-xs before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-gradient-to-r before:from-violet-600 before:to-pink-600">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Active Queue
            </div>
            <div className="mt-1 text-3xl font-extrabold bg-gradient-to-r from-violet-600 to-pink-600 bg-clip-text text-transparent">
              {baseCustomers.length}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {branchMeta ? `Ranked in ${branchMeta.name}` : "Customers ranked by priority"}
            </p>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-4 pt-5 shadow-xs before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-gradient-to-r before:from-red-500 before:to-orange-500">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              High Priority
            </div>
            <div className="mt-1 text-3xl font-extrabold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
              {hiCount}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Act first · high priority accounts</p>
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

        {/* MAIN WORKLIST TABLE CARD WITH FULL FILTER SUITE */}
        <div className="rounded-2xl border-t-4 border-t-violet-500 border-x border-b border-border/80 bg-card p-5 shadow-xs space-y-4">
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
              Showing <b className="text-foreground">{filteredCustomers.length}</b> of{" "}
              {baseCustomers.length} borrowers
            </div>
          </div>

          {/* CORE FILTERS + SEARCH PANEL */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 rounded-xl border border-border/70 bg-muted/20 p-3.5 text-xs">
            {/* Search Input */}
            <div className="md:col-span-2">
              <label className="block text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search customer name, ID or account..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 w-full rounded-xl border border-border/80 bg-card pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 focus:outline-none"
                />
              </div>
            </div>

            {/* Filter 1 · Priority (High / Med / Low) */}
            <div>
              <label className="block text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                1 · Priority
              </label>
              <div className="flex gap-1 rounded-xl border border-border/80 bg-card p-1">
                {[
                  { label: "All", count: baseCustomers.length, color: "" },
                  { label: "High", count: hiCount, color: "bg-red-500" },
                  { label: "Medium", count: medCount, color: "bg-amber-500" },
                  { label: "Low", count: lowCount, color: "bg-emerald-500" },
                ].map(({ label, count, color }) => (
                  <button
                    key={label}
                    onClick={() => setPriorityFilter(label)}
                    className={`flex-1 inline-flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-semibold transition cursor-pointer ${
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

            {/* Filter 2 · Communication Preferences (Outreach Channels) */}
            <div>
              <label className="block text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                2 · Communication Preferences
              </label>
              <div className="flex gap-1 rounded-xl border border-border/80 bg-card p-1">
                {["All", ...TOUCHPOINT_METHODS].map((c) => (
                  <button
                    key={c}
                    onClick={() => setTouchpointFilter(c)}
                    className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition text-center truncate cursor-pointer ${
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
          </div>

          {/* TABLE OF BORROWERS WITH ALL 3 MODELS VISIBLE */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1020px] text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/80 text-[10.5px] uppercase tracking-wider text-muted-foreground bg-muted/20">
                  <th className="px-4 py-3 font-bold">Rank</th>
                  <th className="px-4 py-3 font-bold">Customer & Account</th>
                  <th className="px-4 py-3 font-bold">Priority</th>
                  <th className="px-4 py-3 font-bold">1 · Engagement Model (Content)</th>
                  <th className="px-4 py-3 font-bold">2 · Payment Model (Cadence)</th>
                  <th className="px-4 py-3 font-bold">3 · Outreach Model (Channel)</th>
                  <th className="px-4 py-3 font-bold">Exposure & DPD</th>
                  <th className="px-4 py-3 text-right font-bold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-xs text-muted-foreground">
                      No borrowers match the current search or filters.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((c, i) => {
                    const topChannel = bestTouchpoint(c);
                    return (
                      <tr key={c.id} className="hover:bg-muted/30 transition">
                        {/* Rank */}
                        <td className="px-4 py-3.5 font-bold text-foreground text-xs">
                          {i + 1}
                        </td>

                        {/* Customer & Account */}
                        <td className="px-4 py-3.5">
                          <Link
                            to="/customers/$customerId"
                            params={{ customerId: c.id }}
                            className="font-bold text-foreground hover:text-primary transition text-sm block"
                          >
                            {c.name}
                          </Link>
                          <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                            {c.id} · {c.acct}
                          </div>
                        </td>

                        {/* Priority */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            {getTierBadge(c)}
                            <span className="text-xs font-extrabold text-foreground">
                              Score: {c.pri}
                            </span>
                          </div>
                        </td>

                        {/* 1 · Engagement Model (Content) */}
                        <td className="px-4 py-3.5 max-w-[240px]">
                          <div className="font-bold text-foreground text-xs leading-snug">
                            {c.content[0]}
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                            {c.content[1]} · <b className="text-foreground">Open {c.open}%</b>
                          </div>
                        </td>

                        {/* 2 · Payment Model (Cadence) */}
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-primary text-xs">{c.cad[0]}</div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            {c.touches === 0
                              ? "No touches yet"
                              : `${c.touches} touches · ${c.daysSinceOutreach}d ago`}
                          </div>
                        </td>

                        {/* 3 · Outreach Model (Channel) */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5 font-bold text-foreground text-xs">
                            {getChannelIcon(topChannel)}
                            <span>{topChannel}</span>
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                            <Clock className="size-3" /> {c.rsp}
                          </div>
                        </td>

                        {/* Exposure & DPD */}
                        <td className="px-4 py-3.5">
                          <div className="font-extrabold text-foreground text-xs">
                            ${c.exp.toLocaleString()}
                          </div>
                          <div
                            className={`text-[11px] font-bold mt-0.5 ${
                              c.dpd >= 30 ? "text-destructive" : "text-amber-600 dark:text-amber-400"
                            }`}
                          >
                            {c.dpd} Days Past Due
                          </div>
                        </td>

                        {/* Action */}
                        <td className="px-4 py-3.5 text-right">
                          <Link
                            to="/customers/$customerId"
                            params={{ customerId: c.id }}
                            className="inline-flex items-center gap-1 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition shadow-xs"
                          >
                            View Profile <ArrowRight className="size-3" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
