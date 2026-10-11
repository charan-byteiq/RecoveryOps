import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Bell, Building2, Calendar, ChartNoAxesCombined, ChevronDown, GitCompareArrows, LayoutDashboard, ListChecks, Menu, PanelLeftClose, PanelLeftOpen, PieChart, Search, Settings, Sparkles, X, Check } from "lucide-react";
import { useState, useRef, useEffect, type ReactNode } from "react";
import { Button } from "./ui";
import { useBranch } from "@/hooks/branch-context";
import { useDate } from "@/hooks/date-context";
import { useQuery } from "@tanstack/react-query";
import { api, formatMetricValue, getMetric, type BranchSummary } from "@/lib/api";

export function AppShell({ children, title, section, subtitle, actions }: { children: ReactNode; title: string; section: "Branch Level" | "Customer Level"; subtitle: string; actions?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { selectedBranch, selectBranch, clearBranch, hasBranch } = useBranch();
  const { selectedDate, formattedDate, formattedButtonLabel, selectDate, presets, selectedMonth } = useDate();
  const branchesQuery = useQuery({ queryKey: ["branches"], queryFn: () => api.getBranches() });
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<number>(selectedMonth);
  const dateDropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    setCalendarMonth(selectedMonth);
  }, [selectedMonth]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dateDropdownRef.current && !dateDropdownRef.current.contains(e.target as Node)) {
        setDateDropdownOpen(false);
      }
    }
    if (dateDropdownOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [dateDropdownOpen]);

  // Handle branch selection from navigation
  const handleBranchSelect = (branchObj: BranchSummary | null) => {
    if (branchObj === null) {
      clearBranch();
      navigate({ to: "/" });
    } else {
      selectBranch(branchObj);
      if (pathname === "/") {
        navigate({ to: "/performance" });
      }
    }
  };

  // Breadcrumb with branch context and clickable backnavigation
  const breadcrumb = hasBranch ? (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => handleBranchSelect(null)}
        className="hover:underline text-muted-foreground hover:text-foreground transition font-medium"
        title="Back to All Branches overview"
      >
        All Branches
      </button>
      <span>/</span>
      <span className="text-foreground font-semibold">{selectedBranch?.name}</span>
      <span>/</span>
      <span>{subtitle}</span>
    </div>
  ) : (
    <>{section} <span className="mx-1">/</span> {subtitle}</>
  );

  return <div className="app-surface min-h-screen"><div className="flex min-h-screen">
    {open && <button aria-label="Close navigation" className="fixed inset-0 z-30 bg-foreground/20 md:hidden" onClick={() => setOpen(false)} />}
    <aside
      className={`glass-strong fixed inset-y-0 left-0 z-40 flex flex-col border-r transition-all duration-300 md:sticky md:top-0 md:h-screen md:overflow-y-auto shrink-0 ${
        desktopSidebarOpen ? "md:w-[250px]" : "md:w-0 md:overflow-hidden md:border-r-0"
      } ${open ? "w-[250px] translate-x-0" : "-translate-x-full md:translate-x-0"}`}
    >
      <div className="flex items-center gap-3 px-5 pb-5 pt-6">
        <div className="grid size-10 place-items-center rounded-xl bg-foreground text-lg font-bold text-background shadow-lg text-display shrink-0">R</div>
        <div className="leading-tight truncate">
          <div className="text-[15px] font-bold text-display">RECOVERYOPS</div>
          <div className="text-[9px] font-semibold uppercase tracking-[.16em] text-muted-foreground">Collections Intelligence</div>
        </div>
        <button
          aria-label="Collapse sidebar"
          title="Collapse sidebar"
          className="ml-auto hidden size-8 place-items-center rounded-lg text-muted-foreground hover:bg-card/80 hover:text-foreground transition md:grid shrink-0"
          onClick={() => setDesktopSidebarOpen(false)}
        >
          <PanelLeftClose className="size-4" />
        </button>
        <button aria-label="Close" className="ml-auto md:hidden shrink-0" onClick={() => setOpen(false)}>
          <X className="size-5" />
        </button>
      </div>

      <nav className="px-3">
        <div className="px-2 pb-2 pt-3 text-[10px] font-bold uppercase tracking-[.15em] text-muted-foreground">
          Branch Level
        </div>

        {/* Overview link (All Branches) */}
        <button
          onClick={() => {
            handleBranchSelect(null);
            setOpen(false);
          }}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
            !hasBranch && pathname === "/"
              ? "bg-primary/10 text-primary ring-1 ring-primary/15 font-semibold"
              : "text-muted-foreground hover:bg-card/70 hover:text-foreground"
          }`}
        >
          <LayoutDashboard className="size-4" />
          <span>Overview</span>
        </button>

        {/* Sub-views under Overview: Active branch views or branch list */}
        {hasBranch ? (
          <div className="mt-2.5 space-y-1 rounded-xl border border-primary/20 bg-primary/5 p-2">
            <div className="flex items-center justify-between px-2 py-1 text-[11px] font-bold text-primary">
              <div className="flex items-center gap-1.5 truncate">
                <Building2 className="size-3.5 shrink-0" />
                <span className="truncate">{selectedBranch!.name}</span>
              </div>
              <button
                onClick={() => handleBranchSelect(null)}
                title="Back to All Branches overview"
                className="rounded p-1 text-primary/70 hover:bg-primary/20 hover:text-primary transition"
              >
                <X className="size-3" />
              </button>
            </div>
            <div className="space-y-0.5 pt-1 border-t border-primary/10">
              <Link
                to="/performance"
                className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium transition ${
                  pathname === "/performance"
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:bg-primary/10 hover:text-foreground"
                }`}
                onClick={() => setOpen(false)}
              >
                <ChartNoAxesCombined className="size-3.5" />
                <span>Performance</span>
              </Link>
              <Link
                to="/root-cause"
                className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium transition ${
                  pathname === "/root-cause"
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:bg-primary/10 hover:text-foreground"
                }`}
                onClick={() => setOpen(false)}
              >
                <Sparkles className="size-3.5" />
                <span>Root Cause</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-3">
            <div className="px-2 pb-1.5 text-[9px] font-bold uppercase tracking-[.15em] text-muted-foreground">
              Branch Workspaces
            </div>
            <div className="space-y-0.5">
              {branchesQuery.isLoading && <p className="px-2 py-1 text-xs text-muted-foreground">Loading branches…</p>}
              {branchesQuery.data?.data.map((b: BranchSummary) => (
                <button
                  key={b.id}
                  onClick={() => {
                    handleBranchSelect(b);
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-card/70 hover:text-foreground transition group"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Building2 className="size-3.5 text-muted-foreground/60 group-hover:text-primary transition" />
                    <span className="truncate">{b.name}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium">{formatMetricValue(getMetric(b.metrics, "delinquency_rate_30_plus"))}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </nav>

      <div className="mt-auto px-3 pb-5">
        <div className="glass rounded-xl p-3">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">MD</div>
            <div>
              <div className="text-sm font-semibold">M. Davis</div>
              <div className="text-[11px] text-muted-foreground">Branch Manager</div>
            </div>
          </div>
        </div>
      </div>
    </aside>

    <main className="min-w-0 flex-1">
      <header className="glass sticky top-0 z-20 flex min-h-16 items-center gap-3 border-b px-4 py-3 md:px-6">
        <button aria-label="Open navigation" className="md:hidden" onClick={() => setOpen(true)}>
          <Menu className="size-5" />
        </button>
        {!desktopSidebarOpen && (
          <button
            aria-label="Open sidebar"
            title="Open sidebar"
            className="hidden size-8 place-items-center rounded-lg border bg-card/60 text-muted-foreground hover:bg-accent hover:text-foreground transition md:grid mr-1 shrink-0"
            onClick={() => setDesktopSidebarOpen(true)}
          >
            <PanelLeftOpen className="size-4" />
          </button>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-muted-foreground">{breadcrumb}</span>
          </div>
          <div className="flex items-center gap-2.5 mt-0.5">
            {hasBranch && (
              <button
                onClick={() => handleBranchSelect(null)}
                className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-card/60 px-2 py-0.5 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-foreground transition shrink-0"
                title="Back to All Branches overview"
              >
                <ArrowLeft className="size-3" />
                <span className="hidden sm:inline">All Branches</span>
              </button>
            )}
            <h1 className="truncate text-lg font-bold text-display">{title}</h1>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {actions}
          {/* Refreshed Date */}
          <div className="flex items-center gap-2 rounded-lg border border-border/80 bg-card/60 px-3 py-1.5 text-xs shadow-xs">
            <Calendar className="size-3.5 text-primary" />
            <span className="text-muted-foreground font-medium">Refreshed:</span>
            <span className="font-semibold text-foreground">{formattedDate}</span>
          </div>

          {/* Global Business Date Snapshot Selector (COMMENTED OUT - remove wrapper comment to reactivate)
          <div className="relative" ref={dateDropdownRef}>
            <button
              className="flex items-center gap-2 rounded-lg border bg-card/70 px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-accent"
              onClick={() => setDateDropdownOpen(!dateDropdownOpen)}
              title="Change Global Business Date Snapshot"
            >
              <Calendar className="size-3.5 text-primary" />
              <span>{formattedButtonLabel}</span>
              <ChevronDown className="size-3 text-muted-foreground" />
            </button>

            {dateDropdownOpen && (
              <div className="absolute right-0 top-full z-50 mt-1 w-80 overflow-hidden rounded-xl border bg-card p-4 shadow-2xl">
                <div className="flex items-center justify-between border-b pb-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[.1em] text-primary">Business Date Snapshot</p>
                    <p className="text-xs font-bold text-foreground">Current: {formattedDate}</p>
                  </div>
                  <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">Q3 2026</span>
                </div>

                <div className="mt-3">
                  <p className="text-[10px] font-bold uppercase tracking-[.1em] text-muted-foreground mb-1.5">
                    Key Demo Snapshots
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {presets.map((p) => {
                      const isSelected = selectedDate === p.date;
                      return (
                        <button
                          key={p.date}
                          type="button"
                          onClick={() => {
                            selectDate(p.date);
                            setDateDropdownOpen(false);
                          }}
                          className={`flex flex-col rounded-lg border p-2 text-left transition ${
                            isSelected
                              ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                              : "bg-muted/40 hover:bg-muted text-foreground"
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span>{p.label}</span>
                            {isSelected && <Check className="size-3 text-primary" />}
                          </div>
                          <span className="text-[9px] text-muted-foreground font-normal truncate">{p.badge}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-3 border-t pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold uppercase tracking-[.1em] text-muted-foreground">
                      Custom Day in Q3
                    </p>
                    <div className="flex gap-1 text-[10px]">
                      {[
                        { m: 7, label: "Jul" },
                        { m: 8, label: "Aug" },
                        { m: 9, label: "Sep" },
                      ].map((mo) => (
                        <button
                          key={mo.m}
                          onClick={() => setCalendarMonth(mo.m)}
                          className={`rounded px-1.5 py-0.5 font-bold transition ${
                            calendarMonth === mo.m ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          {mo.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-1 text-center text-[10px]">
                    {Array.from({ length: calendarMonth === 9 ? 30 : 31 }).map((_, i) => {
                      const dayNum = i + 1;
                      const dayStr = dayNum < 10 ? `0${dayNum}` : `${dayNum}`;
                      const monthStr = calendarMonth < 10 ? `0${calendarMonth}` : `${calendarMonth}`;
                      const iso = `2026-${monthStr}-${dayStr}`;
                      const isSelected = selectedDate === iso;

                      return (
                        <button
                          key={dayNum}
                          onClick={() => {
                            selectDate(iso);
                            setDateDropdownOpen(false);
                          }}
                          className={`size-6 rounded text-[10px] font-medium transition ${
                            isSelected
                              ? "bg-primary text-primary-foreground font-bold shadow-xs"
                              : "hover:bg-accent text-foreground"
                          }`}
                        >
                          {dayNum}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
          */}

          <Button variant="secondary" className="size-9 px-0" aria-label="Search"><Search className="size-4" /></Button>
          <Button variant="secondary" className="relative size-9 px-0" aria-label="Notifications"><Bell className="size-4" /><span className="absolute right-2 top-2 size-1.5 rounded-full bg-destructive" /></Button>
        </div>
      </header>
      <div className="page-enter p-4 md:p-6">{children}</div>
    </main>
  </div></div>;
}

