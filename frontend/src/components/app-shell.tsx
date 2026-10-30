import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Bell,
  Building2,
  Calendar,
  ChartNoAxesCombined,
  LayoutDashboard,
  ListChecks,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  PieChart,
  Search,
  Settings,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { useState, useEffect, type ReactNode } from "react";
import { Button } from "./ui";
import { useBranch } from "@/hooks/branch-context";
import { useDate } from "@/hooks/date-context";
import { useQuery } from "@tanstack/react-query";
import { api, formatMetricValue, getMetric, type BranchSummary } from "@/lib/api";
import {
  BRANCH_METADATA,
  CUSTOMERS,
  getStoredCustomerBranch,
  setStoredCustomerBranch,
} from "@/data/customer-nba-data";

export function AppShell({
  children,
  title,
  section,
  subtitle = "",
  actions,
}: {
  children: ReactNode;
  title: string;
  section: "Branch Level" | "Customer Level";
  subtitle?: string;
  actions?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const searchParams = useRouterState({
    select: (s) => (s.location.search as Record<string, string | undefined>),
  });
  const { selectedBranch, selectBranch, clearBranch, hasBranch } = useBranch();
  const { selectedDate } = useDate();
  const branchesQuery = useQuery({
    queryKey: ["branches", selectedDate],
    queryFn: () => api.getBranches(selectedDate),
  });
  const navigate = useNavigate();

  // Active customer branch resolution
  const urlBranch = searchParams?.["branch"];
  const storedCustomerBranch = typeof window !== "undefined" ? getStoredCustomerBranch() : null;
  let activeCustomerBranchCode = urlBranch || storedCustomerBranch;
  if (!activeCustomerBranchCode && pathname.startsWith("/customers/")) {
    const custId = pathname.split("/customers/")[1];
    const foundCust = CUSTOMERS.find((c) => c.id === custId);
    if (foundCust) activeCustomerBranchCode = foundCust.br;
  }
  const activeCustomerBranch =
    activeCustomerBranchCode && BRANCH_METADATA[activeCustomerBranchCode]
      ? {
          code: activeCustomerBranchCode,
          name: BRANCH_METADATA[activeCustomerBranchCode]!.name,
        }
      : null;

  // Dynamic Blue Scroll Progress Line tracking viewport depth
  useEffect(() => {
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;
      const scrollY = window.scrollY;
      const maxScroll = scrollHeight - clientHeight;
      if (maxScroll > 0) {
        const progress = Math.min(100, Math.max(0, (scrollY / maxScroll) * 100));
        setScrollProgress(progress);
      } else {
        setScrollProgress(0);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Handle branch selection from navigation
  const handleBranchSelect = (branchObj: BranchSummary | null) => {
    if (branchObj === null) {
      clearBranch();
      navigate({ to: "/" });
    } else {
      selectBranch(branchObj);
      if (pathname === "/") {
        // Staying on "/" shows State B (Selected Branch Overview)
      }
    }
  };

  // Breadcrumb with branch context and clickable back navigation
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
    </div>
  ) : (
    <>
      {section}
      {subtitle ? (
        <>
          <span className="mx-1">/</span> {subtitle}
        </>
      ) : null}
    </>
  );

  return (
    <div className="app-surface min-h-screen">
      <div className="flex min-h-screen">
        {open && (
          <button
            aria-label="Close navigation"
            className="fixed inset-0 z-30 bg-foreground/20 backdrop-blur-xs md:hidden"
            onClick={() => setOpen(false)}
          />
        )}
        <aside
          className={`glass-strong fixed inset-y-0 left-0 z-40 flex flex-col border-r transition-all duration-300 md:sticky md:top-0 md:h-screen md:overflow-y-auto shrink-0 ${
            desktopSidebarOpen ? "md:w-[250px]" : "md:w-0 md:overflow-hidden md:border-r-0"
          } ${open ? "w-[250px] translate-x-0" : "-translate-x-full md:translate-x-0"}`}
        >
          <div className="flex items-center gap-3 px-5 pb-5 pt-6">
            <div className="grid size-10 place-items-center rounded-xl bg-foreground text-lg font-bold text-background shadow-lg text-display shrink-0">
              R
            </div>
            <div className="leading-tight truncate">
              <div className="text-[15px] font-bold text-display">RECOVERYOPS</div>
              <div className="text-[9px] font-semibold uppercase tracking-[.16em] text-muted-foreground">
                Collections Intelligence
              </div>
            </div>
            <button
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
              className="ml-auto hidden size-8 place-items-center rounded-lg text-muted-foreground hover:bg-card/80 hover:text-foreground transition md:grid shrink-0"
              onClick={() => setDesktopSidebarOpen(false)}
            >
              <PanelLeftClose className="size-4" />
            </button>
            <button
              aria-label="Close"
              className="ml-auto md:hidden shrink-0"
              onClick={() => setOpen(false)}
            >
              <X className="size-5" />
            </button>
          </div>

          <nav className="px-3 space-y-4">
            <div>
              <div className="px-2 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[.15em] text-muted-foreground">
                Branch Level
              </div>

              {/* Overview link (All Branches / Selected Branch) */}
              <button
                onClick={() => {
                  if (hasBranch && pathname !== "/") {
                    navigate({ to: "/" });
                  } else if (!hasBranch && pathname !== "/") {
                    navigate({ to: "/" });
                  }
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  pathname === "/"
                    ? "bg-primary/10 text-primary ring-1 ring-primary/15 font-semibold"
                    : "text-muted-foreground hover:bg-card/70 hover:text-foreground"
                }`}
              >
                <LayoutDashboard className="size-4" />
                <span>Overview</span>
              </button>

              {/* Sub-views under Active branch */}
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
                      to="/"
                      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                        pathname === "/"
                          ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                          : "text-muted-foreground hover:bg-primary/10 hover:text-foreground"
                      }`}
                      onClick={() => setOpen(false)}
                    >
                      <LayoutDashboard className="size-3.5" />
                      <span>Branch Overview</span>
                    </Link>
                    <Link
                      to="/performance"
                      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
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
                      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
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
              ) : null}
            </div>

            {/* Customer Level Navigation */}
            <div>
              <div className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[.15em] text-muted-foreground">
                Customer Level
              </div>
              <div className="space-y-0.5">
                <Link
                  to="/customer-analytics"
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    pathname === "/customer-analytics"
                      ? "bg-primary/10 text-primary ring-1 ring-primary/15 font-semibold"
                      : "text-muted-foreground hover:bg-card/70 hover:text-foreground"
                  }`}
                  onClick={() => setOpen(false)}
                >
                  <Building2 className="size-4" />
                  <span>Customer Insights</span>
                </Link>

                {/* Sub-views under Active Customer Branch (matching Image 2) */}
                {activeCustomerBranch && (pathname === "/worklist" || pathname.startsWith("/customers/")) ? (
                  <div className="mt-2.5 space-y-1 rounded-xl border border-primary/20 bg-primary/5 p-2">
                    <div className="flex items-center justify-between px-2 py-1 text-[11px] font-bold text-primary">
                      <div className="flex items-center gap-1.5 truncate">
                        <Building2 className="size-3.5 shrink-0" />
                        <span className="truncate">{activeCustomerBranch.name}</span>
                      </div>
                      <button
                        onClick={() => {
                          setStoredCustomerBranch(null);
                          navigate({ to: "/customer-analytics" });
                        }}
                        title="Back to Customer Insights"
                        className="rounded p-1 text-primary/70 hover:bg-primary/20 hover:text-primary transition cursor-pointer"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                    <div className="space-y-0.5 pt-1 border-t border-primary/10">
                      <Link
                        to="/worklist"
                        search={{ branch: activeCustomerBranch.code }}
                        className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                          pathname === "/worklist" || pathname.startsWith("/customers/")
                            ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                            : "text-muted-foreground hover:bg-primary/10 hover:text-foreground"
                        }`}
                        onClick={() => setOpen(false)}
                      >
                        <ListChecks className="size-3.5" />
                        <span>Priority Worklist</span>
                      </Link>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </nav>

          <div className="mt-auto px-3 pb-5">
            <div className="glass rounded-xl p-3">
              <div className="flex items-center gap-3">
                <div className="grid size-9 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  MD
                </div>
                <div>
                  <div className="text-sm font-semibold">M. Davis</div>
                  <div className="text-[11px] text-muted-foreground">Branch Manager</div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="glass-strong sticky top-0 z-20 flex min-h-16 items-center gap-3 border-b px-4 py-3 md:px-6 relative">
            <button
              aria-label="Open navigation"
              className="md:hidden"
              onClick={() => setOpen(true)}
            >
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

              {/* Point-in-time Business Date Snapshot */}
              <div className="flex items-center gap-1.5 rounded-full border border-border/80 bg-card/70 px-3.5 py-1.5 text-xs font-semibold text-foreground shadow-xs">
                <Calendar className="size-3.5 text-primary" />
                <span className="text-muted-foreground font-medium">Refreshed:</span>
                <span>Oct 1, 2026</span>
              </div>

              <Button variant="secondary" className="size-9 px-0" aria-label="Search">
                <Search className="size-4" />
              </Button>
              <Button
                variant="secondary"
                className="relative size-9 px-0"
                aria-label="Notifications"
              >
                <Bell className="size-4" />
                <span className="absolute right-2 top-2 size-1.5 rounded-full bg-destructive" />
              </Button>
            </div>

            {/* Dynamic Blue Scroll Progress Line anchored to the bottom of the sticky header */}
            <div
              className="absolute bottom-0 left-0 h-[2.5px] bg-gradient-to-r from-blue-600 via-primary to-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.6)] transition-[width] duration-100 ease-out z-30 pointer-events-none"
              style={{ width: `${scrollProgress}%` }}
            />
          </header>
          <div className="page-enter p-4 md:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
