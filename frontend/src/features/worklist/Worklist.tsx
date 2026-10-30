import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { AppShell } from "@/components/app-shell";
import {
  CUSTOMERS,
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
  Mail,
  MapPin,
  ArrowRight,
  Search,
  Clock,
  ChevronRight,
  Droplets,
  RotateCcw,
  PieChart as PieChartIcon,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";

// Communication Channels (Phone calls, Mails, Field Visit)
const CHANNELS = [
  {
    key: "Phone",
    label: "Phone calls",
    icon: Phone,
    color: "text-blue-500",
    hoverAction: "Direct Call & IVR Dispatch",
    options: ["Call Borrower", "Schedule Callback", "Log IVR Touch"],
  },
  {
    key: "Mails",
    label: "Mails",
    icon: Mail,
    color: "text-amber-500",
    hoverAction: "Official Email Notice & Pay Link",
    options: ["Send Email Notice", "Attach Pay Link", "Send Reminder"],
  },
  {
    key: "Field Visit",
    label: "Field Visit",
    icon: MapPin,
    color: "text-emerald-500",
    hoverAction: "Doorstep Verification & Escalation",
    options: ["Schedule Field Agent", "Log Address Check", "Handover Physical Notice"],
  },
];

// Helper to normalize channels into simple names (Phone calls, Mails, Field Visit)
function getSimpleChannel(rawChannel: string): "Phone" | "Mails" | "Field Visit" {
  if (rawChannel.includes("Phone")) return "Phone";
  if (rawChannel.includes("Field")) return "Field Visit";
  return "Mails";
}

// Helper to determine DPD bucket and priority across 4 buckets: Current, 1-30, 30-60, 90+
function getDpdBucketInfo(dpd: number) {
  if (dpd >= 90) {
    return {
      bucketName: "Bucket 4",
      bucketRange: "90+ DPD",
      tier: "90+",
      badgeClass: "bg-rose-500/15 border border-rose-500/40 text-rose-600 dark:text-rose-400",
      dotColor: "bg-rose-500",
      dotPing: "bg-rose-400",
      tagClass: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30",
      order: 4,
    };
  }
  if (dpd >= 31) {
    return {
      bucketName: "Bucket 3",
      bucketRange: "30–60 DPD",
      tier: "30–60",
      badgeClass: "bg-amber-500/15 border border-amber-500/40 text-amber-600 dark:text-amber-400",
      dotColor: "bg-amber-500",
      dotPing: "bg-amber-400",
      tagClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30",
      order: 3,
    };
  }
  if (dpd >= 1) {
    return {
      bucketName: "Bucket 2",
      bucketRange: "1–30 DPD",
      tier: "1–30",
      badgeClass: "bg-emerald-500/15 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400",
      dotColor: "bg-emerald-500",
      dotPing: "bg-emerald-400",
      tagClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30",
      order: 2,
    };
  }
  return {
    bucketName: "Bucket 1",
    bucketRange: "Current",
    tier: "Current",
    badgeClass: "bg-sky-500/15 border border-sky-500/40 text-sky-600 dark:text-sky-400",
    dotColor: "bg-sky-500",
    dotPing: "bg-sky-400",
    tagClass: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30",
    order: 1,
  };
}

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
  const [channelFilter, setChannelFilter] = useState<string>("All");
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
  // Sorted strictly by DPD Bucket priority (90+ -> 30-60 -> 1-30 -> Current), then highest DPD
  const filteredCustomers = useMemo(() => {
    return baseCustomers
      .filter((c) => {
        const bucket = getDpdBucketInfo(c.dpd);
        const simpleCh = getSimpleChannel(bestTouchpoint(c));

        const matchP = priorityFilter === "All" || bucket.tier === priorityFilter;
        const matchC = channelFilter === "All" || simpleCh === channelFilter;
        const matchQ =
          searchQuery === "" ||
          (c.name + c.id + c.acct).toLowerCase().includes(searchQuery.toLowerCase());
        return matchP && matchC && matchQ;
      })
      .sort((a, b) => {
        const orderA = getDpdBucketInfo(a.dpd).order;
        const orderB = getDpdBucketInfo(b.dpd).order;
        if (orderB !== orderA) return orderB - orderA;
        return b.dpd - a.dpd;
      });
  }, [baseCustomers, priorityFilter, channelFilter, searchQuery]);

  // Priority counts cascading based on active channelFilter
  const priorityCounts = useMemo(() => {
    const subset =
      channelFilter === "All"
        ? baseCustomers
        : baseCustomers.filter((c) => getSimpleChannel(bestTouchpoint(c)) === channelFilter);

    return {
      All: subset.length,
      Current: subset.filter((c) => c.dpd === 0).length,
      "1–30": subset.filter((c) => c.dpd >= 1 && c.dpd <= 30).length,
      "30–60": subset.filter((c) => c.dpd >= 31 && c.dpd <= 60).length,
      "90+": subset.filter((c) => c.dpd >= 90).length,
    };
  }, [baseCustomers, channelFilter]);

  // Communication Preferences dynamic counts cascading based on active priorityFilter
  const channelCounts = useMemo(() => {
    const subset =
      priorityFilter === "All"
        ? baseCustomers
        : baseCustomers.filter((c) => getDpdBucketInfo(c.dpd).tier === priorityFilter);

    let phone = 0;
    let mails = 0;
    let field = 0;
    subset.forEach((c) => {
      const simple = getSimpleChannel(bestTouchpoint(c));
      if (simple === "Phone") phone++;
      else if (simple === "Mails") mails++;
      else if (simple === "Field Visit") field++;
    });
    return {
      All: subset.length,
      Phone: phone,
      Mails: mails,
      "Field Visit": field,
    };
  }, [baseCustomers, priorityFilter]);

  // Subset for Bucket Distribution (cascading with channelFilter)
  const activeForBuckets = useMemo(() => {
    if (channelFilter === "All") return baseCustomers;
    return baseCustomers.filter((c) => getSimpleChannel(bestTouchpoint(c)) === channelFilter);
  }, [baseCustomers, channelFilter]);

  // 4 DPD Bucket Distribution Statistics: Current, 1-30, 30-60, 90+
  const bCurrentCount = activeForBuckets.filter((c) => c.dpd === 0).length; // Current
  const b1Count = activeForBuckets.filter((c) => c.dpd >= 1 && c.dpd <= 30).length; // 1-30 DPD
  const b2Count = activeForBuckets.filter((c) => c.dpd >= 31 && c.dpd <= 60).length; // 30-60 DPD
  const b90Count = activeForBuckets.filter((c) => c.dpd >= 90).length; // 90+ DPD
  const totalInQueue = activeForBuckets.length || 1;

  const bCurrentPct = Math.round((bCurrentCount / totalInQueue) * 100);
  const b1Pct = Math.round((b1Count / totalInQueue) * 100);
  const b2Pct = Math.round((b2Count / totalInQueue) * 100);
  const b90Pct = Math.round((b90Count / totalInQueue) * 100);

  // Pie chart distribution dataset for DPD buckets (scales dynamically for real-time high volume)
  const bucketPieData = useMemo(() => [
    { name: "Current (0 DPD)", count: bCurrentCount, pct: bCurrentPct, color: "#0284c7" },
    { name: "1–30d Early", count: b1Count, pct: b1Pct, color: "#10b981" },
    { name: "30–60d Mid", count: b2Count, pct: b2Pct, color: "#f59e0b" },
    { name: "90+d Late", count: b90Count, pct: b90Pct, color: "#f43f5e" },
  ], [bCurrentCount, bCurrentPct, b1Count, b1Pct, b2Count, b2Pct, b90Count, b90Pct]);

  // Total amount of active queue
  const totalAmount = useMemo(() => {
    return baseCustomers.reduce((acc, c) => acc + c.exp, 0);
  }, [baseCustomers]);

  // Branch Recommendation Adoption Rate (Based on how that branch acted on Next Best Actions)
  const adoptionRate = useMemo(() => {
    if (!baseCustomers.length) return 85;
    const compliant = baseCustomers.filter((c) => c.touches > 0).length;
    const basePct = Math.round((compliant / baseCustomers.length) * 100);
    return Math.min(95, Math.max(72, basePct > 0 ? basePct : 82));
  }, [baseCustomers]);

  return (
    <AppShell
      title="Priority Worklist"
      section="Customer Level"
      subtitle={branchMeta ? branchMeta.name : "All Operational Branches"}
      actions={
        <div className="flex items-center gap-3">
          {/* Branch Switcher Dropdown */}
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-card px-2.5 py-1 text-xs font-medium shadow-2xs">
            <Building2 className="size-3.5 text-muted-foreground" />
            <select
              value={selectedBranchCode}
              onChange={(e) => handleBranchSelect(e.target.value)}
              className="bg-transparent text-xs font-semibold text-foreground focus:outline-none cursor-pointer"
            >
              <option value="All">All Branches ({CUSTOMERS.length} Borrowers)</option>
              {ALL_BRANCH_CODES.map((code) => (
                <option key={code} value={code}>
                  Branch {code} — {BRANCH_METADATA[code]?.name}
                </option>
              ))}
            </select>
          </div>

          <span className="hidden sm:inline-block rounded-full border border-slate-300 dark:border-slate-700 bg-card px-3 py-1 text-xs text-muted-foreground">
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
                  Prioritized customer list with integrated Next Best Actions across Content, Cadence & Channel.
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

        {/* TOP 3 BUSINESS METRIC CARDS WITH REFINED STRONG BORDERS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Nos of Customers (FILLED AND BALANCED WITH BOXED TOTAL AMOUNT) */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-400/80 dark:border-slate-600 bg-card p-4 sm:p-5 shadow-sm before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-gradient-to-r before:from-violet-600 before:to-pink-600 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-1">
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Nos of Customers
                </div>
                <span className="text-[10px] font-extrabold text-foreground bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-md border border-slate-400/80 dark:border-slate-600 shadow-2xs">
                  Active Queue
                </span>
              </div>

              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-violet-600 to-pink-600 bg-clip-text text-transparent">
                  {baseCustomers.length}
                </span>
                <span className="text-xs font-bold text-foreground">
                  Borrowers
                </span>
              </div>
            </div>

            {/* Total Amount in a stylized prominent box with proper aesthetics */}
            <div className="mt-3 rounded-xl border border-border/80 bg-muted/40 p-2.5 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Total Delinquent Exposure
                </div>
                <div className="text-lg sm:text-xl font-black text-foreground tracking-tight">
                  ${totalAmount.toLocaleString()}
                </div>
              </div>
              <span className="text-[10px] font-bold text-violet-700 dark:text-violet-300 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-md">
                Portfolio
              </span>
            </div>
          </div>

          {/* Card 2: Buckets Distribution (INTERACTIVE LIVE DONUT / PIE CHART) */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-400/80 dark:border-slate-600 bg-card p-4 sm:p-5 shadow-sm before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-gradient-to-r before:from-sky-500 via-emerald-500 via-amber-500 to-rose-500 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <PieChartIcon className="size-3.5 text-cyan-500" />
                Buckets Distribution
              </div>
              <span className="text-[10px] font-extrabold text-foreground bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-400/80 dark:border-slate-600 shadow-2xs">
                {totalInQueue} Borrowers
              </span>
            </div>

            {/* Interactive Animated Donut / Pie Chart with Live Hover Effect */}
            <div className="mt-1 flex items-center justify-between gap-3">
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="rounded-lg border border-border/80 bg-popover px-2.5 py-1.5 text-xs shadow-md z-30">
                              <span className="font-bold text-foreground block text-[11px]">{data.name}</span>
                              <span className="text-muted-foreground text-[10.5px]">
                                <b className="text-foreground">{data.count.toLocaleString()}</b> borrowers ({data.pct}%)
                              </span>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Pie
                      data={bucketPieData}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={28}
                      outerRadius={46}
                      paddingAngle={3}
                      isAnimationActive={true}
                      animationDuration={1000}
                      animationEasing="ease-out"
                    >
                      {bucketPieData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                          stroke="transparent"
                          className="transition-transform duration-200 hover:opacity-85 cursor-pointer"
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Badge in Donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xs font-black text-foreground leading-none">{totalInQueue}</span>
                  <span className="text-[8px] font-bold text-muted-foreground uppercase">Total</span>
                </div>
              </div>

              {/* 4 Legend Items with dynamic live percentages & counts */}
              <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 flex-1 text-[10.5px]">
                {bucketPieData.map((item) => (
                  <div key={item.name} className="flex flex-col">
                    <div className="flex items-center gap-1 font-semibold text-foreground">
                      <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="truncate">{item.name.split(" ")[0]}</span>
                    </div>
                    <span className="text-[9.5px] font-mono text-muted-foreground pl-3">
                      {item.count} ({item.pct}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Card 3: Adoption Rate (FILLED AND BALANCED WITH ALIGNED BOX) */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-400/80 dark:border-slate-600 bg-card p-4 sm:p-5 shadow-sm before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-gradient-to-r before:from-emerald-500 before:to-teal-500 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-1">
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Adoption Rate
                </div>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                  Active Execution
                </span>
              </div>

              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-black text-foreground">{adoptionRate}%</span>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  Recommendation Adherence
                </span>
              </div>

              <div className="mt-2.5 h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden shadow-inner">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 transition-all duration-1000 ease-out shadow-sm"
                  style={{ width: `${adoptionRate}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* MAIN WORKLIST TABLE CARD WITH REFINED STRONG BORDERS */}
        <div className="rounded-2xl border-t-4 border-t-violet-500 border-x border-b border-slate-400/80 dark:border-slate-600 bg-card p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold bg-gradient-to-r from-violet-600 to-pink-600 bg-clip-text text-transparent">
                Prioritised Customer List
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Worklist prioritized according to DPD Buckets with integrated Content, Cadence & Channel actions.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-xs text-muted-foreground">
                Showing <b className="text-foreground">{filteredCustomers.length}</b> of{" "}
                {baseCustomers.length} customers
              </div>
              {(priorityFilter !== "All" || channelFilter !== "All" || searchQuery !== "") && (
                <button
                  type="button"
                  onClick={() => {
                    setPriorityFilter("All");
                    setChannelFilter("All");
                    setSearchQuery("");
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-violet-600 dark:text-violet-400 hover:underline cursor-pointer"
                >
                  <RotateCcw className="size-3" /> Reset Filters
                </button>
              )}
            </div>
          </div>

          {/* CORE FILTERS + SEARCH PANEL WITH CRISP DARKER BORDERS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 rounded-xl border border-slate-400/80 dark:border-slate-600 bg-slate-50/80 dark:bg-slate-900/60 p-4 text-xs shadow-xs">
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
                  className="h-9 w-full rounded-xl border border-slate-400 dark:border-slate-600 bg-card pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 focus:outline-none shadow-2xs"
                />
              </div>
            </div>

            {/* Filter 1 · Priority (4 DPD Buckets: Current, 1-30, 30-60, 90+) */}
            <div>
              <label className="block text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                1 · Priority (DPD Bucket)
              </label>
              <div className="flex gap-1 rounded-xl border border-slate-400 dark:border-slate-600 bg-card p-1 shadow-2xs">
                {[
                  { label: "All", count: priorityCounts["All"], color: "", title: "All Accounts" },
                  { label: "Current", count: priorityCounts["Current"], color: "bg-sky-500", title: "Current (0 DPD)" },
                  { label: "1–30", count: priorityCounts["1–30"], color: "bg-emerald-500", title: "1–30 DPD" },
                  { label: "30–60", count: priorityCounts["30–60"], color: "bg-amber-500", title: "30–60 DPD" },
                  { label: "90+", count: priorityCounts["90+"], color: "bg-rose-500", title: "90+ DPD" },
                ].map(({ label, count, color, title }) => (
                  <button
                    key={label}
                    onClick={() => setPriorityFilter(priorityFilter === label ? "All" : label)}
                    title={title}
                    className={`flex-1 inline-flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-semibold transition cursor-pointer ${
                      priorityFilter === label
                        ? "bg-gradient-to-r from-violet-600 to-pink-600 text-white shadow-xs"
                        : "text-foreground hover:bg-muted/60"
                    }`}
                  >
                    {color && <span className={`size-1.5 rounded-full ${color}`} />}
                    {label}
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                        priorityFilter === label
                          ? "bg-white/25 text-white"
                          : "bg-slate-200 dark:bg-slate-700 text-foreground"
                      }`}
                    >
                      {count}
                    </span>
                    {priorityFilter === label && label !== "All" && (
                      <X className="size-3 ml-0.5 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter 2 · Communication Preferences (WITH COUNTS & HOVER OPTIONS) */}
            <div>
              <label className="block text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                2 · Communication Preferences
              </label>
              <div className="flex gap-1 rounded-xl border border-slate-400 dark:border-slate-600 bg-card p-1 shadow-2xs">
                {/* All Option with count */}
                <button
                  onClick={() => setChannelFilter("All")}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition cursor-pointer ${
                    channelFilter === "All"
                      ? "bg-gradient-to-r from-violet-600 to-pink-600 text-white shadow-xs"
                      : "text-foreground hover:bg-muted/60"
                  }`}
                >
                  All
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                      channelFilter === "All"
                        ? "bg-white/25 text-white"
                        : "bg-slate-200 dark:bg-slate-700 text-foreground"
                    }`}
                  >
                    {channelCounts["All"]}
                  </span>
                </button>

                {/* Phone, Mails, Field Visit with Hover Option Tooltips & Number Counts */}
                {CHANNELS.map((ch) => {
                  const Icon = ch.icon;
                  const count = channelCounts[ch.key as keyof typeof channelCounts];
                  const isSelected = channelFilter === ch.key;
                  return (
                    <div key={ch.key} className="relative group/ch flex-1">
                      <button
                        onClick={() => setChannelFilter(isSelected ? "All" : ch.key)}
                        className={`w-full inline-flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition cursor-pointer truncate ${
                          isSelected
                            ? "bg-gradient-to-r from-violet-600 to-pink-600 text-white shadow-xs"
                            : "text-foreground hover:bg-muted/60"
                        }`}
                      >
                        <Icon className="size-3.5 shrink-0" />
                        <span>{ch.label}</span>
                        <span
                          className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                            isSelected
                              ? "bg-white/25 text-white"
                              : "bg-slate-200 dark:bg-slate-700 text-foreground"
                          }`}
                        >
                          {count}
                        </span>
                        {isSelected && <X className="size-3 ml-0.5 shrink-0" />}
                      </button>

                      {/* Interactive Hover Tooltip with Channel Options */}
                      <div className="pointer-events-none opacity-0 group-hover/ch:opacity-100 group-hover/ch:pointer-events-auto transition-all duration-200 absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 z-30 rounded-xl border border-slate-400/80 dark:border-slate-600 bg-popover p-2.5 text-[11px] shadow-xl text-popover-foreground">
                        <div className="font-bold flex items-center gap-1.5 text-foreground border-b border-border/60 pb-1">
                          <Icon className={`size-3 ${ch.color}`} />
                          <span>{ch.label} Options</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1 font-medium">
                          {ch.hoverAction}
                        </p>
                        <div className="mt-1.5 space-y-0.5">
                          {ch.options.map((opt) => (
                            <div key={opt} className="flex items-center gap-1 text-[10.5px] text-foreground font-semibold">
                              <span className="size-1 rounded-full bg-primary" />
                              {opt}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Active Cascading Filters Strip with Cross Icons */}
            {(priorityFilter !== "All" || channelFilter !== "All" || searchQuery) && (
              <div className="md:col-span-2 pt-2.5 border-t border-slate-300 dark:border-slate-700 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
                    Active Filters:
                  </span>

                  {priorityFilter !== "All" && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600/15 to-pink-600/15 border border-violet-500/40 px-2.5 py-1 text-xs font-bold text-foreground shadow-2xs">
                      <span>Priority: <strong className="text-violet-600 dark:text-violet-400">{priorityFilter} DPD</strong></span>
                      <button
                        type="button"
                        onClick={() => setPriorityFilter("All")}
                        className="size-4 rounded-full hover:bg-violet-500/25 grid place-items-center cursor-pointer transition text-foreground"
                        title="Remove Priority filter"
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  )}

                  {channelFilter !== "All" && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600/15 to-pink-600/15 border border-violet-500/40 px-2.5 py-1 text-xs font-bold text-foreground shadow-2xs">
                      <span>Channel: <strong className="text-violet-600 dark:text-violet-400">{channelFilter}</strong></span>
                      <button
                        type="button"
                        onClick={() => setChannelFilter("All")}
                        className="size-4 rounded-full hover:bg-violet-500/25 grid place-items-center cursor-pointer transition text-foreground"
                        title="Remove Channel filter"
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  )}

                  {searchQuery && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted border border-border px-2.5 py-1 text-xs font-bold text-foreground shadow-2xs">
                      <span>Search: <strong className="text-foreground">"{searchQuery}"</strong></span>
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="size-4 rounded-full hover:bg-muted-foreground/25 grid place-items-center cursor-pointer transition text-foreground"
                        title="Clear Search"
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setPriorityFilter("All");
                    setChannelFilter("All");
                    setSearchQuery("");
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-violet-600 dark:text-violet-400 hover:underline cursor-pointer"
                >
                  <RotateCcw className="size-3" /> Reset All Filters
                </button>
              </div>
            )}
          </div>

          {/* TABLE OF BORROWERS (CONTENT · CADENCE · CHANNEL) */}
          <div className="overflow-x-auto rounded-xl border border-slate-300 dark:border-slate-700 shadow-2xs">
            <table className="w-full min-w-[1020px] text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-400/80 dark:border-slate-600 text-[10.5px] uppercase tracking-wider text-muted-foreground bg-muted/40">
                  <th className="px-4 py-3 font-bold align-middle w-12 text-center">Rank</th>
                  <th className="px-4 py-3 font-bold align-middle min-w-[180px]">Customer &amp; Account</th>
                  <th className="px-4 py-3 font-bold align-middle min-w-[160px]">Priority</th>
                  <th className="px-4 py-3 font-bold align-middle min-w-[220px]">Content</th>
                  <th className="px-4 py-3 font-bold align-middle min-w-[110px]">Cadence</th>
                  <th className="px-4 py-3 font-bold align-middle min-w-[130px]">Channel</th>
                  <th className="px-4 py-3 font-bold align-middle min-w-[160px]">Due Amount wrt to days</th>
                  <th className="px-4 py-3 text-right font-bold align-middle w-32">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300/70 dark:divide-slate-700 bg-card">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-xs text-muted-foreground align-middle">
                      No borrowers match the current search or filters.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((c, i) => {
                    const bucket = getDpdBucketInfo(c.dpd);
                    const simpleChannelKey = getSimpleChannel(bestTouchpoint(c));
                    const chConfig = CHANNELS.find((ch) => ch.key === simpleChannelKey) || CHANNELS[0]!;
                    const ChannelIcon = chConfig.icon;

                    return (
                      <tr key={c.id} className="hover:bg-muted/40 transition">
                        {/* Rank */}
                        <td className="px-4 py-3.5 font-bold text-foreground text-xs align-middle text-center">
                          {i + 1}
                        </td>

                        {/* Customer & Account */}
                        <td className="px-4 py-3.5 align-middle">
                          <Link
                            to="/customers/$customerId"
                            params={{ customerId: c.id }}
                            className="font-bold text-foreground hover:text-primary transition text-sm block leading-snug"
                          >
                            {c.name}
                          </Link>
                          <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                            {c.id} · {c.acct}
                          </div>
                        </td>

                        {/* Priority (Modern Executive DPD Bucket Chip) */}
                        <td className="px-4 py-3.5 align-middle">
                          <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 px-2.5 py-1.5 shadow-2xs">
                            <span className="relative flex size-2 shrink-0">
                              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${bucket.dotPing}`} />
                              <span className={`relative inline-flex rounded-full size-2 ${bucket.dotColor}`} />
                            </span>
                            <span className="font-extrabold text-foreground text-xs tracking-tight whitespace-nowrap">
                              {bucket.bucketRange}
                            </span>
                            <span className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded-md whitespace-nowrap ${bucket.tagClass}`}>
                              {bucket.bucketName}
                            </span>
                          </div>
                        </td>

                        {/* Content (ONLY BOLD FOCUS POINT) */}
                        <td className="px-4 py-3.5 align-middle max-w-[280px]">
                          <div className="font-bold text-foreground text-xs leading-snug">
                            {c.content[0]}
                          </div>
                        </td>

                        {/* Cadence (ONLY BOLD FOCUS POINT) */}
                        <td className="px-4 py-3.5 align-middle whitespace-nowrap">
                          <div className="font-bold text-foreground text-xs">{c.cad[0]}</div>
                        </td>

                        {/* Channel (ONLY BOLD CHANNEL PILL WITH HOVER OPTIONS) */}
                        <td className="px-4 py-3.5 align-middle whitespace-nowrap">
                          <div className="relative group/rowch inline-block">
                            <div className="inline-flex items-center gap-1.5 font-bold text-foreground text-xs rounded-lg px-2.5 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-muted cursor-pointer transition shadow-2xs">
                              <ChannelIcon className={`size-3.5 ${chConfig.color} shrink-0`} />
                              <span>{chConfig.label}</span>
                            </div>

                            {/* Hover Options Popover */}
                            <div className="pointer-events-none opacity-0 group-hover/rowch:opacity-100 group-hover/rowch:pointer-events-auto transition-all duration-150 absolute bottom-full left-0 mb-1 w-44 z-30 rounded-xl border border-slate-300 dark:border-slate-700 bg-popover p-2 text-[10.5px] shadow-lg text-popover-foreground">
                              <div className="font-bold text-foreground flex items-center gap-1 mb-1 border-b border-border/50 pb-0.5">
                                <ChannelIcon className={`size-3 ${chConfig.color}`} />
                                {chConfig.label} Actions
                              </div>
                              <div className="space-y-1">
                                {chConfig.options.map((opt) => (
                                   <div
                                    key={opt}
                                    className="px-1.5 py-0.5 rounded-md hover:bg-muted text-foreground font-medium flex items-center justify-between cursor-pointer"
                                  >
                                    <span>{opt}</span>
                                    <ChevronRight className="size-2.5 text-muted-foreground" />
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Due Amount wrt to days */}
                        <td className="px-4 py-3.5 align-middle whitespace-nowrap">
                          <div className="font-extrabold text-foreground text-xs">
                            ${c.exp.toLocaleString()}
                          </div>
                          <div
                            className={`text-[11px] font-bold mt-0.5 ${
                              c.dpd >= 90
                                ? "text-rose-600 dark:text-rose-400"
                                : c.dpd >= 31
                                  ? "text-amber-600 dark:text-amber-400"
                                  : c.dpd >= 1
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-sky-600 dark:text-sky-400"
                            }`}
                          >
                            {c.dpd === 0 ? "Current (0 Days Past Due)" : `${c.dpd} Days Past Due`}
                          </div>
                        </td>

                        {/* Action */}
                        <td className="px-4 py-3.5 text-right align-middle whitespace-nowrap">
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
