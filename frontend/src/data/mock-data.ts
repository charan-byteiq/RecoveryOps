export interface MockBranch {
  id: string;
  name: string;
  region: string;
  state: string;
  accounts: number;
  collectionRate: number;
  recovered: string;
  cureRate: number;
  contactRate: number;
  ptpKept: number;
  avgDaysToResolve: number;
  collectionsPerAgent: string;
  escalationRate: number;
  firstContact: string;
  outreachPath: string;
}

/* ─────────────── Branch Network (US Regional Network) ─────────────── */

export const branches: MockBranch[] = [
  {
    id: "TPA",
    name: "Tampa Branch",
    region: "Southeast",
    state: "FL",
    accounts: 12480,
    collectionRate: 71,
    recovered: "$4.8M",
    cureRate: 58,
    contactRate: 61,
    ptpKept: 47,
    avgDaysToResolve: 27,
    collectionsPerAgent: "$18.4K",
    escalationRate: 14,
    firstContact: "Day 5",
    outreachPath: "SMS → Phone",
  },
  {
    id: "DAL",
    name: "Dallas Branch",
    region: "South Central",
    state: "TX",
    accounts: 9840,
    collectionRate: 84,
    recovered: "$6.2M",
    cureRate: 71,
    contactRate: 79,
    ptpKept: 68,
    avgDaysToResolve: 21,
    collectionsPerAgent: "$22.1K",
    escalationRate: 9,
    firstContact: "Day 2",
    outreachPath: "SMS → Phone → Field",
  },
  {
    id: "ATL",
    name: "Atlanta Branch",
    region: "Southeast",
    state: "GA",
    accounts: 7620,
    collectionRate: 82,
    recovered: "$4.1M",
    cureRate: 69,
    contactRate: 76,
    ptpKept: 65,
    avgDaysToResolve: 22,
    collectionsPerAgent: "$20.8K",
    escalationRate: 11,
    firstContact: "Day 2",
    outreachPath: "Phone → SMS → Field",
  },
  {
    id: "PHX",
    name: "Phoenix Branch",
    region: "Southwest",
    state: "AZ",
    accounts: 6350,
    collectionRate: 80,
    recovered: "$3.4M",
    cureRate: 65,
    contactRate: 73,
    ptpKept: 62,
    avgDaysToResolve: 23,
    collectionsPerAgent: "$19.6K",
    escalationRate: 12,
    firstContact: "Day 3",
    outreachPath: "SMS → Phone → Field",
  },
  {
    id: "CLT",
    name: "Charlotte Branch",
    region: "Southeast",
    state: "NC",
    accounts: 5210,
    collectionRate: 78,
    recovered: "$2.7M",
    cureRate: 62,
    contactRate: 70,
    ptpKept: 58,
    avgDaysToResolve: 25,
    collectionsPerAgent: "$17.2K",
    escalationRate: 15,
    firstContact: "Day 4",
    outreachPath: "SMS → Phone",
  },
  {
    id: "CHI",
    name: "Chicago Branch",
    region: "Midwest",
    state: "IL",
    accounts: 4890,
    collectionRate: 76,
    recovered: "$2.3M",
    cureRate: 60,
    contactRate: 67,
    ptpKept: 54,
    avgDaysToResolve: 26,
    collectionsPerAgent: "$16.8K",
    escalationRate: 16,
    firstContact: "Day 4",
    outreachPath: "SMS → Phone",
  },
];

/* ─────────────── Network Aggregate Helpers ─────────────── */

export const networkTotals = {
  totalBranches: branches.length,
  totalAccounts: branches.reduce((s, b) => s + b.accounts, 0),
  avgCollectionRate: Math.round(
    branches.reduce((s, b) => s + b.collectionRate, 0) / branches.length,
  ),
  totalRecovered: "$23.5M",
  avgCureRate: Math.round(branches.reduce((s, b) => s + b.cureRate, 0) / branches.length),
  avgContactRate: Math.round(branches.reduce((s, b) => s + b.contactRate, 0) / branches.length),
  avgPtpKept: Math.round(branches.reduce((s, b) => s + b.ptpKept, 0) / branches.length),
  avgEscalationRate: Math.round(
    branches.reduce((s, b) => s + b.escalationRate, 0) / branches.length,
  ),
};

/* ─────────────── Per-Branch Metrics (for KPI cards) ─────────────── */

export function getBranchMetrics(branchId: string) {
  const b = branches.find((x) => x.id === branchId);
  if (!b) return branchMetricsTampa;
  return [
    {
      label: "Amount recovered",
      value: b.recovered,
      note: `Target ${b.id === "TPA" ? "$5.6M" : b.id === "DAL" ? "$6.8M" : b.id === "ATL" ? "$4.5M" : b.id === "PHX" ? "$3.8M" : b.id === "CLT" ? "$3.1M" : "$2.8M"}`,
      tone: "good" as const,
    },
    {
      label: "Cure rate",
      value: `${b.cureRate}%`,
      note: `Peer ${networkTotals.avgCureRate}%`,
      tone: b.cureRate >= networkTotals.avgCureRate ? ("good" as const) : ("danger" as const),
    },
    {
      label: "Avg. days to resolve",
      value: `${b.avgDaysToResolve}d`,
      note: `Peer 22d`,
      tone: b.avgDaysToResolve <= 22 ? ("good" as const) : ("danger" as const),
    },
    {
      label: "Contact rate",
      value: `${b.contactRate}%`,
      note: `Peer ${networkTotals.avgContactRate}%`,
      tone: b.contactRate >= networkTotals.avgContactRate ? ("good" as const) : ("danger" as const),
    },
  ];
}

const branchMetricsTampa = [
  { label: "Amount recovered", value: "$4.8M", note: "Target $5.6M", tone: "good" as const },
  { label: "Cure rate", value: "58%", note: "Peer 64%", tone: "danger" as const },
  { label: "Avg. days to resolve", value: "27d", note: "Peer 22d", tone: "danger" as const },
  { label: "Contact rate", value: "61%", note: "Peer 71%", tone: "danger" as const },
];

/** @deprecated — use getBranchMetrics for branch-specific data */
export const branchMetrics = branchMetricsTampa;

/* ─────────────── Per-Branch Drivers (for root cause) ─────────────── */

export type Driver = {
  name: string;
  branch: number;
  peer: number;
  delta: string;
  impact: string;
  tone: "danger" | "warn" | "good";
  detail: string;
};

export function getBranchDrivers(branchId: string): Driver[] {
  const b = branches.find((x) => x.id === branchId) ?? branches[0]!;
  const contactPeer = networkTotals.avgContactRate;
  const contactDelta = b.contactRate - contactPeer;

  const ptpPeer = networkTotals.avgPtpKept;
  const ptpDelta = b.ptpKept - ptpPeer;

  const branchDPD = getBranchDPD(b.id);
  const branch30Plus = branchDPD
    .filter((d) => d[0] !== "Current" && d[0] !== "1–30")
    .reduce((s, d) => s + (d[1] as number), 0);

  const allBranches30Plus = branches.map((br) =>
    getBranchDPD(br.id)
      .filter((d) => d[0] !== "Current" && d[0] !== "1–30")
      .reduce((s, d) => s + (d[1] as number), 0),
  );
  const peer30Plus = Math.round(allBranches30Plus.reduce((s, v) => s + v, 0) / branches.length);
  const dpdDelta = branch30Plus - peer30Plus;

  let contactImpact = 0,
    ptpImpact = 0,
    dpdImpact = 0;
  if (b.id === "TPA") {
    contactImpact = -4;
    ptpImpact = -2;
    dpdImpact = -1;
  } else if (b.id === "DAL") {
    contactImpact = 3;
    ptpImpact = 2;
    dpdImpact = 1;
  } else if (b.id === "ATL") {
    contactImpact = 2;
    ptpImpact = 1;
    dpdImpact = 1;
  } else if (b.id === "PHX") {
    contactImpact = 1;
    ptpImpact = 0;
    dpdImpact = 0;
  } else if (b.id === "CLT") {
    contactImpact = -1;
    ptpImpact = -1;
    dpdImpact = 0;
  } else if (b.id === "CHI") {
    contactImpact = -2;
    ptpImpact = -1;
    dpdImpact = -1;
  }

  const formatDelta = (val: number) => (val >= 0 ? `+${val} pts` : `−${Math.abs(val)} pts`);

  return [
    {
      name: "Contact rate",
      branch: b.contactRate,
      peer: contactPeer,
      delta: formatDelta(contactDelta),
      impact: formatDelta(contactImpact),
      tone: contactDelta >= 0 ? "good" : "danger",
      detail:
        contactDelta >= 0
          ? "Strong first contact drives early borrower engagement."
          : "Delayed first contact reduces early delinquency resolution.",
    },
    {
      name: "PTP kept",
      branch: b.ptpKept,
      peer: ptpPeer,
      delta: formatDelta(ptpDelta),
      impact: formatDelta(ptpImpact),
      tone: ptpDelta >= 0 ? "good" : "danger",
      detail:
        ptpDelta >= 0
          ? "Consistent follow-up maintains above-average promise fulfillment."
          : "Broken promises concentrated among accounts with delayed follow-up.",
    },
    {
      name: "30+ DPD concentration",
      branch: branch30Plus,
      peer: peer30Plus,
      delta: formatDelta(dpdDelta),
      impact: formatDelta(dpdImpact),
      tone: dpdDelta <= 0 ? "good" : "danger",
      detail:
        dpdDelta <= 0
          ? "Early intervention prevents accounts from rolling forward."
          : "Accounts are rolling into later buckets before effective contact.",
    },
  ];
}

/** @deprecated — use getBranchDrivers for branch-specific data */
export const drivers = getBranchDrivers("TPA");

/* ─────────────── Peer Comparison Data ─────────────── */

export function getPeerData(anchorBranchId: string) {
  const anchor = branches.find((b) => b.id === anchorBranchId);
  if (!anchor) return peers;
  return branches.map((b) => ({
    name: b.name,
    rate: b.collectionRate,
    contact: b.contactRate,
    ptp: b.ptpKept,
    cure: b.cureRate,
    first: b.firstContact,
    path: b.outreachPath,
    isAnchor: b.id === anchorBranchId,
  }));
}

export const peers = [
  {
    name: "Tampa Branch",
    rate: 71,
    contact: 61,
    ptp: 47,
    cure: 58,
    first: "Day 5",
    path: "SMS → Phone",
    isAnchor: true,
  },
  {
    name: "Dallas Branch",
    rate: 84,
    contact: 79,
    ptp: 68,
    cure: 71,
    first: "Day 2",
    path: "SMS → Phone → Field",
    isAnchor: false,
  },
  {
    name: "Atlanta Branch",
    rate: 82,
    contact: 76,
    ptp: 65,
    cure: 69,
    first: "Day 2",
    path: "Phone → SMS → Field",
    isAnchor: false,
  },
  {
    name: "Phoenix Branch",
    rate: 80,
    contact: 73,
    ptp: 62,
    cure: 65,
    first: "Day 3",
    path: "SMS → Phone → Field",
    isAnchor: false,
  },
];

/* ─────────────── Per-Branch Performance Trend ─────────────── */

type TrendPoint = { m: string; a: number; p: number };

export function getBranchPerformanceTrend(branchId: string): TrendPoint[] {
  const map: Record<string, TrendPoint[]> = {
    TPA: [
      { m: "Apr", a: 74, p: 80 },
      { m: "May", a: 73, p: 81 },
      { m: "Jun", a: 72, p: 81 },
      { m: "Jul", a: 73, p: 82 },
      { m: "Aug", a: 70, p: 82 },
      { m: "Sep", a: 71, p: 82 },
    ],
    DAL: [
      { m: "Apr", a: 81, p: 80 },
      { m: "May", a: 82, p: 81 },
      { m: "Jun", a: 83, p: 81 },
      { m: "Jul", a: 83, p: 82 },
      { m: "Aug", a: 84, p: 82 },
      { m: "Sep", a: 84, p: 82 },
    ],
    ATL: [
      { m: "Apr", a: 79, p: 80 },
      { m: "May", a: 80, p: 81 },
      { m: "Jun", a: 81, p: 81 },
      { m: "Jul", a: 81, p: 82 },
      { m: "Aug", a: 82, p: 82 },
      { m: "Sep", a: 82, p: 82 },
    ],
    PHX: [
      { m: "Apr", a: 77, p: 80 },
      { m: "May", a: 78, p: 81 },
      { m: "Jun", a: 78, p: 81 },
      { m: "Jul", a: 79, p: 82 },
      { m: "Aug", a: 79, p: 82 },
      { m: "Sep", a: 79, p: 82 },
    ],
    CLT: [
      { m: "Apr", a: 75, p: 80 },
      { m: "May", a: 75, p: 81 },
      { m: "Jun", a: 76, p: 81 },
      { m: "Jul", a: 76, p: 82 },
      { m: "Aug", a: 76, p: 82 },
      { m: "Sep", a: 76, p: 82 },
    ],
    CHI: [
      { m: "Apr", a: 73, p: 80 },
      { m: "May", a: 73, p: 81 },
      { m: "Jun", a: 74, p: 81 },
      { m: "Jul", a: 74, p: 82 },
      { m: "Aug", a: 74, p: 82 },
      { m: "Sep", a: 74, p: 82 },
    ],
  };
  return map[branchId] ?? map["TPA"]!;
}

/* ─────────────── Per-Branch DPD Distribution ─────────────── */

type DPDEntry = [string, number, string];

export function getBranchDPD(branchId: string): DPDEntry[] {
  const map: Record<string, DPDEntry[]> = {
    TPA: [
      ["Current", 34, "success"],
      ["1–30", 28, "primary"],
      ["31–60", 19, "warn"],
      ["61–90", 11, "danger"],
      ["90+", 8, "danger"],
    ],
    DAL: [
      ["Current", 42, "success"],
      ["1–30", 26, "primary"],
      ["31–60", 16, "warn"],
      ["61–90", 10, "danger"],
      ["90+", 6, "danger"],
    ],
    ATL: [
      ["Current", 40, "success"],
      ["1–30", 27, "primary"],
      ["31–60", 16, "warn"],
      ["61–90", 10, "danger"],
      ["90+", 7, "danger"],
    ],
    PHX: [
      ["Current", 38, "success"],
      ["1–30", 28, "primary"],
      ["31–60", 17, "warn"],
      ["61–90", 10, "danger"],
      ["90+", 7, "danger"],
    ],
    CLT: [
      ["Current", 36, "success"],
      ["1–30", 28, "primary"],
      ["31–60", 18, "warn"],
      ["61–90", 11, "danger"],
      ["90+", 7, "danger"],
    ],
    CHI: [
      ["Current", 35, "success"],
      ["1–30", 27, "primary"],
      ["31–60", 19, "warn"],
      ["61–90", 12, "danger"],
      ["90+", 7, "danger"],
    ],
  };
  return map[branchId] ?? map["TPA"]!;
}

/* ─────────────── Per-Branch Operational Scorecard ─────────────── */

export function getBranchScorecard(branchId: string) {
  const b = branches.find((x) => x.id === branchId) ?? branches[0]!;
  const peerAvg = {
    ptp: networkTotals.avgPtpKept,
    collections: 19.1,
    escalation: networkTotals.avgEscalationRate,
    contact: networkTotals.avgContactRate,
  };
  const agentVal = parseFloat(b.collectionsPerAgent.replace(/[$K,]/g, ""));
  const diff = agentVal - peerAvg.collections;
  return [
    [
      "PTP kept",
      `${b.ptpKept}%`,
      `${b.ptpKept >= peerAvg.ptp ? "+" : ""}${b.ptpKept - peerAvg.ptp} pts`,
    ],
    ["Collections / agent", b.collectionsPerAgent, `${diff >= 0 ? "+" : ""}$${diff.toFixed(1)}K`],
    [
      "Escalation rate",
      `${b.escalationRate}%`,
      `${b.escalationRate <= peerAvg.escalation ? "" : "+"}${b.escalationRate - peerAvg.escalation} pts`,
    ],
    [
      "Contact rate",
      `${b.contactRate}%`,
      `${b.contactRate >= peerAvg.contact ? "+" : ""}${b.contactRate - peerAvg.contact} pts`,
    ],
  ];
}

/* ─────────────── Customers (Synthetic US Collections Accounts) ─────────────── */

export const customers = [
  {
    id: "C001",
    name: "Michael Carter",
    account: "AL-10482",
    branch: "Branch 101",
    branchId: "101",
    dpd: 38,
    amount: "$24,500",
    risk: "High",
    contact: "High",
    ptp: "Broken",
    priority: "High",
    last: "Phone · 2d ago",
    action: "Call today",
  },
  {
    id: "C002",
    name: "Jessica Williams",
    account: "RL-10931",
    branch: "Branch 101",
    branchId: "101",
    dpd: 31,
    amount: "$18,400",
    risk: "High",
    contact: "Medium",
    ptp: "None",
    priority: "High",
    last: "SMS · 4d ago",
    action: "Field review",
  },
  {
    id: "C003",
    name: "David Johnson",
    account: "PL-20884",
    branch: "Branch 101",
    branchId: "101",
    dpd: 22,
    amount: "$12,500",
    risk: "Medium",
    contact: "High",
    ptp: "Due today",
    priority: "High",
    last: "Phone · yesterday",
    action: "PTP reminder",
  },
  {
    id: "C004",
    name: "Emily Rodriguez",
    account: "RL-11203",
    branch: "Branch 104",
    branchId: "104",
    dpd: 64,
    amount: "$42,800",
    risk: "High",
    contact: "Low",
    ptp: "Broken",
    priority: "High",
    last: "No answer · 1d",
    action: "Field visit",
  },
  {
    id: "C005",
    name: "Robert Miller",
    account: "PL-22401",
    branch: "Branch 101",
    branchId: "101",
    dpd: 16,
    amount: "$9,200",
    risk: "Medium",
    contact: "High",
    ptp: "Kept before",
    priority: "Medium",
    last: "SMS · today",
    action: "Wait 24h",
  },
  {
    id: "C006",
    name: "Sarah Anderson",
    account: "AL-30552",
    branch: "Branch 101",
    branchId: "101",
    dpd: 45,
    amount: "$28,600",
    risk: "High",
    contact: "Medium",
    ptp: "None",
    priority: "Medium",
    last: "Email · 3d ago",
    action: "Phone call",
  },
  {
    id: "C007",
    name: "James Wilson",
    account: "RL-11782",
    branch: "Branch 104",
    branchId: "104",
    dpd: 28,
    amount: "$19,500",
    risk: "Medium",
    contact: "High",
    ptp: "Kept before",
    priority: "Medium",
    last: "Phone · 1d",
    action: "PTP reminder",
  },
  {
    id: "C008",
    name: "Amanda Thompson",
    account: "PL-21056",
    branch: "Branch 105",
    branchId: "105",
    dpd: 42,
    amount: "$31,400",
    risk: "High",
    contact: "Medium",
    ptp: "Broken",
    priority: "High",
    last: "SMS · 3d ago",
    action: "Call today",
  },
  {
    id: "C009",
    name: "Christopher Martinez",
    account: "RL-12304",
    branch: "Branch 106",
    branchId: "106",
    dpd: 55,
    amount: "$36,000",
    risk: "High",
    contact: "Low",
    ptp: "None",
    priority: "High",
    last: "No answer · 2d",
    action: "Field visit",
  },
  {
    id: "C010",
    name: "Ashley Taylor",
    account: "AL-30891",
    branch: "Branch 105",
    branchId: "105",
    dpd: 18,
    amount: "$8,450",
    risk: "Medium",
    contact: "High",
    ptp: "Due today",
    priority: "Medium",
    last: "Phone · today",
    action: "PTP reminder",
  },
  {
    id: "C011",
    name: "Matthew Thomas",
    account: "RL-13102",
    branch: "Branch 201",
    branchId: "201",
    dpd: 71,
    amount: "$48,000",
    risk: "High",
    contact: "Low",
    ptp: "Broken",
    priority: "High",
    last: "No answer · 5d",
    action: "Field visit",
  },
  {
    id: "C012",
    name: "Olivia Hernandez",
    account: "PL-22890",
    branch: "Branch 202",
    branchId: "202",
    dpd: 35,
    amount: "$14,200",
    risk: "High",
    contact: "Medium",
    ptp: "None",
    priority: "High",
    last: "SMS · 2d ago",
    action: "Call today",
  },
  {
    id: "C013",
    name: "Daniel White",
    account: "RL-14001",
    branch: "Branch 106",
    branchId: "106",
    dpd: 12,
    amount: "$6,800",
    risk: "Low",
    contact: "High",
    ptp: "Kept before",
    priority: "Medium",
    last: "Phone · today",
    action: "Wait 24h",
  },
  {
    id: "C014",
    name: "Megan Harris",
    account: "AL-31204",
    branch: "Branch 201",
    branchId: "201",
    dpd: 48,
    amount: "$22,900",
    risk: "High",
    contact: "Medium",
    ptp: "Broken",
    priority: "High",
    last: "Email · 4d ago",
    action: "Phone call",
  },
  {
    id: "C015",
    name: "Brandon Clark",
    account: "RL-14520",
    branch: "Branch 202",
    branchId: "202",
    dpd: 25,
    amount: "$11,400",
    risk: "Medium",
    contact: "High",
    ptp: "Due today",
    priority: "Medium",
    last: "Phone · yesterday",
    action: "PTP reminder",
  },
  {
    id: "C016",
    name: "Lauren Lewis",
    account: "PL-23410",
    branch: "Branch 104",
    branchId: "104",
    dpd: 9,
    amount: "$5,200",
    risk: "Low",
    contact: "High",
    ptp: "Kept before",
    priority: "Low",
    last: "SMS · today",
    action: "Monitor",
  },
];

/* ─────────────── Customer Analytics Helpers ─────────────── */

function distributeProportionally(counts: number[], total: number): number[] {
  const sum = counts.reduce((a, b) => a + b, 0);
  if (sum === 0 || total === 0) return counts.map(() => 0);

  const exacts = counts.map((c) => (c / sum) * total);
  const floors = exacts.map((e) => Math.floor(e));
  const remainder = total - floors.reduce((a, b) => a + b, 0);

  const order = exacts
    .map((e, i) => ({ frac: counts[i]! > 0 ? e - floors[i]! : -1, i }))
    .sort((a, b) => b.frac - a.frac);

  for (let k = 0; k < remainder; k++) {
    const idx = order[k % order.length]!.i;
    floors[idx]!++;
  }

  return floors;
}

/* ─────────────── Date-Aware Customers Snapshot Engine ─────────────── */

export function getCustomersForDate(dateStr: string = "2026-09-15", branchId?: string | null) {
  const baseTime = new Date("2026-09-15T00:00:00").getTime();
  const targetTime = new Date(`${dateStr}T00:00:00`).getTime();
  const diffDays = Math.round((targetTime - baseTime) / (1000 * 60 * 60 * 24));

  const list = branchId ? customers.filter((c) => c.branchId === branchId) : customers;

  return list.map((c, index) => {
    // Realistic macro-cyclical drift across snapshots:
    // Ensures accounts maintain distinct delinquency stages (from 8 to 80+ DPD) without collapsing to 1
    const cyclicalOffset = Math.round(Math.sin((diffDays + index * 5) / 10) * 4);
    const dateTrend = Math.round(diffDays * 0.08);
    const adjDpd = Math.max(5, Math.min(115, c.dpd + dateTrend + cyclicalOffset));

    // Dynamic PTP status relative to date
    let adjPtp = c.ptp;
    if (diffDays < -3) {
      if (c.ptp === "Broken") adjPtp = "Due soon";
      else if (c.ptp === "Due today") adjPtp = "Pending";
    } else if (diffDays > 3) {
      if (c.ptp === "Due today") adjPtp = "Broken";
    }

    // Dynamic Risk & Priority
    const adjRisk = adjDpd > 30 ? "High" : adjDpd > 15 ? "Medium" : "Low";
    const adjPriority =
      adjDpd > 25 || adjPtp === "Broken" || adjPtp === "Due today"
        ? "High"
        : adjDpd > 12
          ? "Medium"
          : "Low";

    // Dynamic amount with minor interest accrual
    const numericAmt = parseInt(c.amount.replace(/[$,]/g, ""), 10);
    const adjustedVal = Math.max(1000, numericAmt + Math.round(diffDays * 12));
    const adjAmount = `$${adjustedVal.toLocaleString("en-US")}`;

    return {
      ...c,
      dpd: adjDpd,
      ptp: adjPtp,
      risk: adjRisk,
      priority: adjPriority,
      amount: adjAmount,
      last: diffDays < 0 ? "SMS · 2d prior" : diffDays > 3 ? "Phone · 5d ago" : c.last,
    };
  });
}

export function getCustomerAnalytics(branchId?: string | null, dateStr: string = "2026-09-15") {
  const filtered = getCustomersForDate(dateStr, branchId);

  const branchData = branchId ? branches.find((b) => b.id === branchId) : null;
  const targetTotal = branchData
    ? branchData.accounts
    : branches.reduce((s, b) => s + b.accounts, 0);

  // Time delta offset from baseline 15 Sep
  const baseTime = new Date("2026-09-15T00:00:00").getTime();
  const targetTime = new Date(`${dateStr}T00:00:00`).getTime();
  const diffDays = Math.round((targetTime - baseTime) / (1000 * 60 * 60 * 24));

  const [highPriority, medPriority, lowPriority] = distributeProportionally(
    [
      filtered.filter((c) => c.priority === "High").length,
      filtered.filter((c) => c.priority === "Medium").length,
      filtered.filter((c) => c.priority === "Low").length,
    ],
    targetTotal,
  );

  const [highRisk, medRisk, lowRisk] = distributeProportionally(
    [
      filtered.filter((c) => c.risk === "High").length,
      filtered.filter((c) => c.risk === "Medium").length,
      filtered.filter((c) => c.risk === "Low").length,
    ],
    targetTotal,
  );

  const [ptpBroken, ptpDue, ptpKept, ptpNone] = distributeProportionally(
    [
      filtered.filter((c) => c.ptp === "Broken").length,
      filtered.filter((c) => c.ptp === "Due today" || c.ptp === "Due soon").length,
      filtered.filter((c) => c.ptp === "Kept before").length,
      filtered.filter((c) => c.ptp === "None" || c.ptp === "Pending").length,
    ],
    targetTotal,
  );

  const [highContact, medContact, lowContact] = distributeProportionally(
    [
      filtered.filter((c) => c.contact === "High").length,
      filtered.filter((c) => c.contact === "Medium").length,
      filtered.filter((c) => c.contact === "Low").length,
    ],
    targetTotal,
  );

  const [dpd0_30, dpd31_60, dpd61_90, dpd90plus] = distributeProportionally(
    [
      filtered.filter((c) => c.dpd <= 30).length,
      filtered.filter((c) => c.dpd > 30 && c.dpd <= 60).length,
      filtered.filter((c) => c.dpd > 60 && c.dpd <= 90).length,
      filtered.filter((c) => c.dpd > 90).length,
    ],
    targetTotal,
  );

  // Dynamic Delinquency Base scaled with time delta
  const delinquencyFactor = Math.min(0.92, Math.max(0.55, 0.82 + diffDays * 0.005));
  const eligible = Math.round(targetTotal * 0.82);
  const delinquent = Math.round(targetTotal * delinquencyFactor);
  const needsAttention = Math.min(highPriority!, delinquent);

  // Dynamic Exposure & Rates
  const baseExposure = branchData
    ? parseFloat(branchData.recovered.replace(/[$M]/g, "")) * 0.65
    : 8.4;
  const dynExposure = (baseExposure + diffDays * 0.06).toFixed(1);
  const baseContactRate = branchData ? branchData.contactRate : networkTotals.avgContactRate;
  const dynContactRate = Math.min(88, Math.max(54, baseContactRate - Math.round(diffDays * 0.3)));
  const basePtpKept = branchData ? branchData.ptpKept : networkTotals.avgPtpKept;
  const dynPtpKept = Math.min(78, Math.max(45, basePtpKept - Math.round(diffDays * 0.5)));

  return {
    total: targetTotal,
    eligible,
    delinquent,
    needsAttention,
    recoveryExposure: `$${dynExposure}M`,
    contactRate: dynContactRate,
    ptpKeptRate: dynPtpKept,
    priority: { high: highPriority!, medium: medPriority!, low: lowPriority! },
    risk: { high: highRisk!, medium: medRisk!, low: lowRisk! },
    ptp: { broken: ptpBroken!, due: ptpDue!, kept: ptpKept!, none: ptpNone! },
    contactability: { high: highContact!, medium: medContact!, low: lowContact! },
    dpd: {
      bucket0_30: dpd0_30!,
      bucket31_60: dpd31_60!,
      bucket61_90: dpd61_90!,
      bucket90plus: dpd90plus!,
    },
  };
}

/* ─────────────── Customer Detail Model Helper ─────────────── */

export interface CustomerDetailContext {
  product: string;
  dpdHistory: { period: string; dpd: number }[];
  paymentBehaviour: {
    consistencyRatio: string;
    consistencyPct: number;
    expectedMonthly: string;
    actualAvg: string;
    lastAmount: string;
    lastDate: string;
    ptpMade: number;
    ptpFulfilled: number;
    probNextBracket: string;
    probChargeOff: string;
  };
  outreach: {
    totalAttempts: number;
    successful: number;
    contactRate: number;
    phoneReach: number;
    smsReach: number;
    preferredChannel: string;
    lastContactDate: string;
    bestWindow: string;
  };
  riskTrajectory: {
    direction: "Deteriorating" | "Stable" | "Improving";
    previousDpd: number;
    d30Dpd?: number;
    d15Dpd?: number;
    delta30Dpd?: number;
    delta15Dpd?: number;
    dpdChange: string;
    dpd15Change?: string;
    exposureRatio: string;
    severityTier?: string;
    notes: string;
  };
  priorityJustification: string[];
  nba: {
    action: string;
    timing: string;
    reason: string;
    approach: string;
    suggestedJourney: { step: string; channel: string; icon: string }[];
  };
  ruleChecks: { label: string; passed: boolean }[];
  timeline: {
    id: string;
    type: "ptp" | "phone" | "sms" | "payment" | "visit";
    title: string;
    note: string;
    timestamp: string;
    date: string;
    isGood?: boolean;
    isAlert?: boolean;
  }[];
}

export interface CustomerTrajectoryProfile {
  d30Ratio: number;
  d15Ratio: number;
  direction: "Deteriorating" | "Stable" | "Improving";
  story: string;
}

export const CUSTOMER_TRAJECTORIES: Record<string, CustomerTrajectoryProfile> = {
  // Tampa Branch (Diverse mix of rapid escalation, stable, and improving cure accounts)
  C001: {
    d30Ratio: 0.48,
    d15Ratio: 0.74,
    direction: "Deteriorating",
    story: "Rapid delinquency acceleration following missed auto-debit.",
  },
  C002: {
    d30Ratio: 0.45,
    d15Ratio: 0.71,
    direction: "Deteriorating",
    story: "Steadily crossed 30+ DPD boundary over the last billing cycle.",
  },
  C003: {
    d30Ratio: 0.86,
    d15Ratio: 0.95,
    direction: "Stable",
    story: "Delinquency holding steady in 20–25 DPD band awaiting salary credit.",
  },
  C005: {
    d30Ratio: 1.5,
    d15Ratio: 1.19,
    direction: "Improving",
    story: "Account curing! DPD decreased from 24 to 16 following partial payment.",
  },
  C006: {
    d30Ratio: 0.44,
    d15Ratio: 0.71,
    direction: "Deteriorating",
    story: "Fast forward roll into 31–60 bucket; broken commitment unfulfilled.",
  },

  // Dallas Branch (High exposure & distinct delinquency curves)
  C004: {
    d30Ratio: 0.59,
    d15Ratio: 0.81,
    direction: "Deteriorating",
    story: "Chronic delinquency hardening; roll forward to 60+ DPD bucket without cure.",
  },
  C007: {
    d30Ratio: 0.78,
    d15Ratio: 0.89,
    direction: "Stable",
    story: "Moderate delinquency progression within early-to-mid bucket.",
  },
  C016: {
    d30Ratio: 0.0,
    d15Ratio: 0.44,
    direction: "Deteriorating",
    story: "Soft initial delinquency; newly slipped into 1–10 DPD window.",
  },

  // Atlanta Branch (Mid-to-high delinquency jumps)
  C008: {
    d30Ratio: 0.57,
    d15Ratio: 0.81,
    direction: "Deteriorating",
    story: "PTP breakage caused sharp 15-day escalation from 34 to 42 DPD.",
  },
  C010: {
    d30Ratio: 0.44,
    d15Ratio: 0.77,
    direction: "Deteriorating",
    story: "New roll from grace period into 15–30 DPD bracket.",
  },

  // Phoenix Branch (Includes active curing customer and chronic installment)
  C009: {
    d30Ratio: 0.63,
    d15Ratio: 0.83,
    direction: "Deteriorating",
    story: "Hardening commercial installment risk; uncontactable over last 2 cycles.",
  },
  C013: {
    d30Ratio: 1.5,
    d15Ratio: 1.25,
    direction: "Improving",
    story: "Improving payment trajectory; borrower actively reducing past due days.",
  },

  // Charlotte Branch (Severe delinquency escalation)
  C011: {
    d30Ratio: 0.59,
    d15Ratio: 0.81,
    direction: "Deteriorating",
    story: "Severe default trajectory approaching 90+ DPD charge-off threshold.",
  },
  C014: {
    d30Ratio: 0.58,
    d15Ratio: 0.81,
    direction: "Deteriorating",
    story: "Repeated broken commitments driving progression towards late stage.",
  },

  // Chicago Branch (Steady mid-delinquency tracking)
  C012: {
    d30Ratio: 0.46,
    d15Ratio: 0.74,
    direction: "Deteriorating",
    story: "Crossed from 15 DPD into 30+ DPD threshold over past 30 days.",
  },
  C015: {
    d30Ratio: 0.6,
    d15Ratio: 0.8,
    direction: "Stable",
    story: "Holding within mid-delinquency band; partial commitment pending.",
  },
};

export function getCustomerDetailContext(
  customerId: string,
  dateStr: string = "2026-09-15",
): CustomerDetailContext {
  const adjustedList = getCustomersForDate(dateStr);
  const c = adjustedList.find((x) => x.id === customerId) || adjustedList[0]!;

  const isHighRisk = c.risk === "High";
  const isBrokenPtp = c.ptp === "Broken";

  // Dynamic Dates for DPD Trend relative to selected date
  const targetDateObj = new Date(`${dateStr}T00:00:00`);
  const d30Obj = new Date(targetDateObj.getTime() - 30 * 24 * 60 * 60 * 1000);
  const d15Obj = new Date(targetDateObj.getTime() - 15 * 24 * 60 * 60 * 1000);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const d30Label = `${months[d30Obj.getMonth()]} ${d30Obj.getDate()}`;
  const d15Label = `${months[d15Obj.getMonth()]} ${d15Obj.getDate()}`;
  const currLabel = `${months[targetDateObj.getMonth()]} ${targetDateObj.getDate()}`;

  // Complete Historical Event Master List (with ISO dates)
  const masterTimeline = [
    {
      id: "ev-ptp-break",
      date: "2026-09-20",
      type: "ptp" as const,
      title: "Promise to Pay Broken",
      note: "Promised installment not credited by commitment date",
      timestamp: "Sep 20 · 3:15 PM",
      isAlert: true,
    },
    {
      id: "ev-phone-call",
      date: "2026-09-18",
      type: "phone" as const,
      title: "Connected by Phone",
      note: "Customer cited temporary cash flow delay; requested 2-day grace",
      timestamp: "Sep 18 · 11:20 AM",
    },
    {
      id: "ev-sms-del",
      date: "2026-09-16",
      type: "sms" as const,
      title: "Automated SMS Delivered",
      note: "Delinquency reminder delivered with secure online payment portal link",
      timestamp: "Sep 16 · 9:00 AM",
    },
    {
      id: "ev-emi-miss",
      date: "2026-09-15",
      type: "payment" as const,
      title: "Scheduled Payment Missed",
      note: "Monthly installment debit $650 returned due to insufficient funds",
      timestamp: "Sep 15 · 6:00 AM",
      isAlert: true,
    },
    {
      id: "ev-courtesy-sms",
      date: "2026-09-10",
      type: "sms" as const,
      title: "Pre-due Courtesy Reminder",
      note: "SMS alert sent 5 days prior to monthly payment due date",
      timestamp: "Sep 10 · 10:30 AM",
    },
    {
      id: "ev-aug-settle",
      date: "2026-08-20",
      type: "ptp" as const,
      title: "Promise to Pay Honored",
      note: "Customer fulfilled $650 commitment through online payment portal",
      timestamp: "Aug 20 · 2:45 PM",
      isGood: true,
    },
    {
      id: "ev-aug-emi",
      date: "2026-08-15",
      type: "payment" as const,
      title: "August Payment Cleared",
      note: "Auto-debit successful for monthly repayment",
      timestamp: "Aug 15 · 8:15 AM",
      isGood: true,
    },
    {
      id: "ev-jul-contact",
      date: "2026-07-22",
      type: "phone" as const,
      title: "Routine Verification Call",
      note: "Contact information and employment details confirmed",
      timestamp: "Jul 22 · 4:00 PM",
    },
    {
      id: "ev-jul-due-notice",
      date: "2026-07-01",
      type: "sms" as const,
      title: "Billing Cycle Statement Generated",
      note: "Monthly statement dispatched via automated SMS and secure email portal",
      timestamp: "Jul 1 · 8:00 AM",
    },
    {
      id: "ev-jun-ptp",
      date: "2026-06-25",
      type: "ptp" as const,
      title: "Promise to Pay Recorded",
      note: "Borrower scheduled $650 partial settlement via automated phone IVR",
      timestamp: "Jun 25 · 1:30 PM",
      isGood: true,
    },
    {
      id: "ev-jun-outreach",
      date: "2026-06-18",
      type: "phone" as const,
      title: "Specialist Follow-up Call",
      note: "Frontline agent contacted borrower to discuss payment cadence options",
      timestamp: "Jun 18 · 11:15 AM",
    },
    {
      id: "ev-jun-payment",
      date: "2026-06-15",
      type: "payment" as const,
      title: "June Installment Processed",
      note: "ACH payment credited successfully to loan account",
      timestamp: "Jun 15 · 9:00 AM",
      isGood: true,
    },
  ];

  // STRICT FILTER: NEVER show events that occur AFTER the selected date
  const filteredTimeline = masterTimeline.filter((ev) => ev.date <= dateStr);

  const profile = CUSTOMER_TRAJECTORIES[c.id] ?? {
    d30Ratio: c.risk === "High" ? 0.55 : c.risk === "Medium" ? 0.75 : 1.2,
    d15Ratio: c.risk === "High" ? 0.78 : c.risk === "Medium" ? 0.88 : 1.1,
    direction: (c.risk === "High"
      ? "Deteriorating"
      : c.risk === "Medium"
        ? "Stable"
        : "Improving") as "Deteriorating" | "Stable" | "Improving",
    story: "Standard account delinquency cycle tracking.",
  };

  let d30Dpd = Math.max(0, Math.round(c.dpd * profile.d30Ratio));
  let d15Dpd = Math.max(0, Math.round(c.dpd * profile.d15Ratio));

  if (profile.direction === "Improving") {
    if (d30Dpd <= c.dpd) d30Dpd = c.dpd + 8;
    if (d15Dpd <= c.dpd) d15Dpd = c.dpd + 3;
    if (d15Dpd >= d30Dpd) d15Dpd = Math.round((d30Dpd + c.dpd) / 2);
  } else if (profile.direction === "Deteriorating") {
    if (d30Dpd >= c.dpd) d30Dpd = Math.max(0, c.dpd - 12);
    if (d15Dpd >= c.dpd) d15Dpd = Math.max(0, c.dpd - 5);
    if (d15Dpd <= d30Dpd) d15Dpd = Math.round((d30Dpd + c.dpd) / 2);
  } else {
    // Stable
    if (Math.abs(d30Dpd - c.dpd) > 5) d30Dpd = Math.max(0, c.dpd - 3);
    if (Math.abs(d15Dpd - c.dpd) > 3) d15Dpd = Math.max(0, c.dpd - 1);
  }

  const delta15Dpd = c.dpd - d15Dpd;
  const delta30Dpd = c.dpd - d30Dpd;

  const trajectoryDirection: "Deteriorating" | "Stable" | "Improving" = profile.direction;

  const severityTier =
    c.risk === "High" || c.dpd > 30
      ? "Elevated Default Risk"
      : c.risk === "Medium" || c.dpd > 15
        ? "Moderate Risk Exposure"
        : "Low Delinquency Tier";

  return {
    product: c.account.startsWith("PL")
      ? "Personal Loan"
      : c.account.startsWith("AL")
        ? "Auto Loan"
        : "Retail Installment Loan",
    dpdHistory: [
      { period: d30Label, dpd: d30Dpd },
      { period: d15Label, dpd: d15Dpd },
      { period: currLabel, dpd: c.dpd },
    ],
    paymentBehaviour: {
      consistencyRatio: isHighRisk ? "2 of last 6" : "4 of last 6",
      consistencyPct: isHighRisk ? 33 : 67,
      expectedMonthly: "$650",
      actualAvg: isHighRisk ? "$325" : "$580",
      lastAmount: "$650",
      lastDate: dateStr >= "2026-09-01" ? "Aug 15 (31d prior)" : "Jul 15 (45d prior)",
      ptpMade: isBrokenPtp ? 3 : 2,
      ptpFulfilled: isBrokenPtp ? 1 : 2,
      probNextBracket: c.dpd >= 60 ? "78%" : c.dpd >= 30 ? "64%" : isHighRisk ? "58%" : "42%",
      probChargeOff: c.dpd >= 60 ? "32%" : c.dpd >= 30 ? "21%" : isHighRisk ? "18%" : "8%",
    },
    outreach: {
      totalAttempts: 9,
      successful: c.contact === "High" ? 7 : c.contact === "Medium" ? 4 : 2,
      contactRate: c.contact === "High" ? 78 : c.contact === "Medium" ? 45 : 22,
      phoneReach: c.contact === "High" ? 75 : 40,
      smsReach: 48,
      preferredChannel: c.contact === "Low" ? "Field Visit" : "Phone Call",
      lastContactDate: c.last,
      bestWindow: "10:00 AM – 12:30 PM",
    },
    riskTrajectory: {
      direction: trajectoryDirection,
      previousDpd: d15Dpd,
      d30Dpd,
      d15Dpd,
      delta30Dpd,
      delta15Dpd,
      dpdChange:
        delta30Dpd > 0
          ? `+${delta30Dpd} DPD (30d)`
          : delta30Dpd < 0
            ? `${delta30Dpd} DPD (30d)`
            : "0 DPD (Stable)",
      dpd15Change:
        delta15Dpd > 0
          ? `+${delta15Dpd} DPD (15d)`
          : delta15Dpd < 0
            ? `${delta15Dpd} DPD (15d)`
            : "0 DPD (Stable)",
      exposureRatio: c.risk === "High" ? "Above branch median" : "Within normal limits",
      severityTier,
      notes: `${c.dpd} DPD as of ${currLabel}. Outstanding balance ${c.amount}.`,
    },
    priorityJustification: [
      trajectoryDirection === "Improving"
        ? `${c.dpd} DPD as of ${currLabel} (${delta30Dpd} DPD reduction over 30d — active account self-cure)`
        : `${c.dpd} DPD as of ${currLabel} (+${delta30Dpd} DPD over 30 days, +${delta15Dpd} DPD recent 15d velocity)`,
      profile.story,
      isBrokenPtp
        ? "Promise-to-Pay broken with no payment received"
        : "Payment commitment active requiring confirmation",
      c.contact === "High"
        ? "High phone responsiveness — prime window for direct phone resolution"
        : "Low digital responsiveness — requires specialized agent follow-up",
    ],
    nba: {
      action: c.contact === "Low" ? "Schedule Field Visit" : "Call Customer",
      timing: "Today · Morning Window (10:00 AM)",
      reason: isBrokenPtp
        ? `Recent PTP break + ${c.dpd} DPD + high phone contactability.`
        : `Delinquency hardening (${c.dpd} DPD) + high exposure + timely intervention window.`,
      approach:
        "Acknowledge the missed commitment, confirm immediate payment capacity, and agree on a realistic partial settlement or PTP date.",
      suggestedJourney: [
        {
          step: "Today",
          channel: c.contact === "Low" ? "Field Visit" : "Phone Call",
          icon: "Phone",
        },
        { step: "+2 days", channel: "SMS / Email", icon: "MessageSquare" },
        { step: "Escalate", channel: "Specialized Outreach", icon: "MapPin" },
      ],
    },
    ruleChecks: [
      { label: "Account eligible for operational outreach", passed: true },
      { label: "No successful contact in past 48 hours", passed: true },
      { label: "Promise-to-Pay follow-up protocol active", passed: true },
      { label: "Channel permitted under Fair Practice Code", passed: true },
    ],
    timeline: filteredTimeline,
  };
}
