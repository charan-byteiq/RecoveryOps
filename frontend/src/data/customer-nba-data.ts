export interface CustomerData {
  id: string;
  name: string;
  acct: string;
  br: string;
  dpd: number;
  exp: number;
  risk: string;
  ptp: string;
  reach: number;
  ch: [string, number, number][]; // [touchpointMethod, successRate, costPerTouch]
  aff: [string, number][]; // [touchpointMethod, affinityScore]
  pri: number;
  tier: "High" | "Medium" | "Low";
  content: [string, string]; // [templateName, templateObjective]
  cad: [string, string]; // [followUpTiming, scheduleInterval]
  touches: number; // total outreach attempts post due-date to current date
  cov: number; // repayment ratio / coverage %
  repaymentType: "Full Repayment" | "Partial Repayment" | "Pending Repayment";
  daysToRepay: number; // turnaround time customer takes to repay
  pays: number; // repayments count
  last: number; // days since last payment
  rsp: string; // optimal response window
  open: number; // template open rate %
  click: number; // link engagement rate %
}

const raw =
  "C011,Matthew Thomas,RL-13102,201,63,47088,High,Due soon|C004,Emily Rodriguez,RL-11203,104,59,41888,High,Due soon|C009,Christopher Martinez,RL-12304,106,51,35088,High,None|C006,Sarah Anderson,AL-30552,101,43,27688,High,None|C008,Amanda Thompson,PL-21056,105,39,30488,High,Due soon|C014,Megan Harris,AL-31204,201,38,21988,High,Due soon|C001,Michael Carter,AL-10482,101,28,23588,Medium,Due soon|C007,James Wilson,RL-11782,104,26,18588,Medium,Kept before|C012,Olivia Hernandez,PL-22890,202,26,13288,Medium,None|C002,Daniel Lee,AL-10931,101,22,9800,Medium,Kept before|C003,Priya Nair,PL-20417,105,18,8400,Medium,None|C005,Robert King,RL-11990,106,14,7200,Low,Kept before|C010,Linda Gomez,AL-10655,202,11,6100,Low,None|C013,Arjun Mehta,PL-20988,104,9,4300,Low,Kept before|C015,Hannah Brooks,AL-10771,101,6,2900,Low,None|C016,Tom Reyes,RL-12011,201,3,1800,Low,None";

export const CUSTOMERS: CustomerData[] = raw.split("|").map((r, i) => {
  const parts = r.split(",");
  const id = parts[0]!;
  const name = parts[1]!;
  const acct = parts[2]!;
  const br = parts[3]!;
  const dpd = +parts[4]!;
  const exp = +parts[5]!;
  const risk = parts[6]!;
  const ptp = parts[7]!;

  const reach = Math.max(10, Math.round(70 - dpd * 0.8 + (i % 3) * 6));
  const ph = Math.max(15, Math.round(reach + 18 - (i % 4) * 3));
  const sms = Math.min(90, Math.round(reach * 1.1 + 14 - (i % 3) * 4));
  const em = Math.max(8, Math.round(reach * 0.5 + (i % 5)));
  const fv = dpd >= 30 ? 85 : null;

  const ch: [string, number, number][] = [
    ["Direct Phone", ph, 4.5],
    ["SMS Alert", sms, 0.8],
    ["Digital Mail", em, 0.3],
  ];
  if (fv) ch.push(["Field Visit", fv, 32]);

  const aff: [string, number][] = ch
    .map(
      ([n, s, c]) =>
        [
          n,
          Math.round(
            s * 0.7 +
              (n === "Field Visit" ? (dpd - 30) * 0.5 : 0) +
              (n === "SMS Alert" ? 4 : 0) -
              c / 4,
          ),
        ] as [string, number],
    )
    .sort((a, b) => b[1] - a[1]);

  const cov = Math.round(50 - dpd * 0.4 + (i % 4) * 8);
  const last = dpd + Math.round(dpd * 0.3);
  const pri = Math.min(
    99,
    Math.round((100 - cov) * 0.4 + (100 - reach) * 0.35 + Math.min(100, (last / 60) * 100) * 0.25),
  );
  const tier: "High" | "Medium" | "Low" = pri >= 65 ? "High" : pri >= 45 ? "Medium" : "Low";

  // Template suggestions for the Recovery Operations Frontline Team
  const content: [string, string] =
    ptp === "Due soon" && dpd >= 30
      ? [
          "Settlement Offer Template",
          "Objective: Secure binding settlement with formal waiver terms",
        ]
      : dpd >= 30
        ? [
            "Broken-Commitment Re-engagement Template",
            "Objective: Escalate broken PTP & propose restructuring plan",
          ]
        : ptp === "Kept before"
          ? [
              "Courtesy Due Reminder Template",
              "Objective: Reinforce positive repayment track & share instant pay link",
            ]
          : [
              "Standard Delinquency Notice Template",
              "Objective: Present statement summary and portal resolution options",
            ];

  // Follow-up timing / contact intervals
  const cad: [string, string] =
    dpd >= 45
      ? ["Every 2 days", "Daily touch until borrower connects"]
      : dpd >= 30
        ? ["Every 3 days", "Twice-weekly structured follow-up"]
        : dpd >= 15
          ? ["Weekly", "Weekly review & status check"]
          : ["Every 10 days", "Bi-weekly monitoring cycle"];

  // Outreach tracking post due-date up to current date
  const touches = Math.max(2, Math.round(dpd / 7) + (i % 5) + (dpd > 30 ? 4 : 1));

  // Repayment behavior analysis
  const repaymentType: "Full Repayment" | "Partial Repayment" | "Pending Repayment" =
    cov >= 60 ? "Full Repayment" : cov >= 20 ? "Partial Repayment" : "Pending Repayment";
  const daysToRepay = Math.max(3, Math.round(dpd * 0.6 + (i % 4) * 3));

  return {
    id,
    name,
    acct,
    br,
    dpd,
    exp,
    risk,
    ptp,
    reach,
    ch,
    aff,
    pri,
    tier,
    content,
    cad,
    touches,
    cov,
    repaymentType,
    daysToRepay,
    pays: dpd > 45 ? 0 : 1 + (i % 3),
    last,
    rsp: ["10:00–12:30", "2:00–5:00 PM", "9:00–11:00 AM"][i % 3]!,
    open: 20 + (i % 5) * 8,
    click: 12 + (i % 4) * 9,
  };
});

CUSTOMERS.sort((a, b) => b.pri - a.pri);

export const TOUCHPOINT_METHODS = ["Direct Phone", "SMS Alert", "Digital Mail", "Field Visit"];

export const TEMPLATES = [
  "Settlement Offer Template",
  "Broken-Commitment Re-engagement Template",
  "Courtesy Due Reminder Template",
  "Standard Delinquency Notice Template",
];

export const TIMING_CYCLES = ["Every 2 days", "Every 3 days", "Weekly", "Every 10 days"];

export const bestTouchpoint = (c: CustomerData) => c.aff[0]![0];
export const formatCurrency = (n: number) => "$" + n.toLocaleString();
