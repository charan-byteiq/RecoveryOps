import { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from "react";

export interface DemoSnapshotPreset {
  date: string; // ISO format: YYYY-MM-DD
  label: string;
  quarterLabel: string;
  badge: string;
  description: string;
}

export const DEMO_SNAPSHOTS: DemoSnapshotPreset[] = [
  {
    date: "2026-07-01",
    label: "Jul 1, 2026",
    quarterLabel: "Q3 · Jul 01",
    badge: "Quarter Start",
    description: "Q3 baseline portfolio · Initial delinquency cycle",
  },
  {
    date: "2026-08-01",
    label: "Aug 1, 2026",
    quarterLabel: "Q3 · Aug 01",
    badge: "Mid-Quarter",
    description: "August recovery peak · High cure rates active",
  },
  {
    date: "2026-09-01",
    label: "Sep 1, 2026",
    quarterLabel: "Q3 · Sep 01",
    badge: "Month Start",
    description: "Early September billing cycle · Soft delinquencies",
  },
  {
    date: "2026-09-10",
    label: "Sep 10, 2026",
    quarterLabel: "Q3 · Sep 10",
    badge: "Pre-Cycle",
    description: "Early contact window · PTP fulfillment pending",
  },
  {
    date: "2026-09-15",
    label: "Sep 15, 2026",
    quarterLabel: "Q3 · Sep 15",
    badge: "Active Snapshot",
    description: "Peak operational urgency · Broken PTP intervention window",
  },
  {
    date: "2026-09-20",
    label: "Sep 20, 2026",
    quarterLabel: "Q3 · Sep 20",
    badge: "Hardening Stage",
    description: "Post-breakage escalation · 30+ DPD concentration",
  },
  {
    date: "2026-09-30",
    label: "Sep 30, 2026",
    quarterLabel: "Q3 · Sep 30",
    badge: "Quarter Close",
    description: "Q3 final reconciliation · Year-to-date write-off review",
  },
];

interface DateContextValue {
  selectedDate: string; // e.g. "2026-09-15"
  formattedDate: string; // e.g. "Sep 15, 2026"
  formattedButtonLabel: string; // e.g. "Q3 · Sep 15"
  selectedYear: number;
  selectedMonth: number; // 1-12
  selectedDay: number;
  selectDate: (date: string) => void;
  presets: DemoSnapshotPreset[];
  isDateInQ3: (date: string) => boolean;
}

const DateContext = createContext<DateContextValue | null>(null);

const STORAGE_KEY = "recoveryops-selected-business-date";
const DEFAULT_DATE = "2026-09-15";

export function formatDateLabel(isoStr: string): string {
  const parts = isoStr.split("-");
  if (parts.length !== 3) return isoStr;
  const year = parts[0];
  const monthIdx = parseInt(parts[1]!, 10) - 1;
  const day = parseInt(parts[2]!, 10);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[monthIdx] || ""} ${day}, ${year}`;
}

export function formatQuarterButtonLabel(isoStr: string): string {
  const parts = isoStr.split("-");
  if (parts.length !== 3) return "Q3 · Jul–Sep";
  const monthIdx = parseInt(parts[1]!, 10) - 1;
  const day = parseInt(parts[2]!, 10);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dayStr = day < 10 ? `0${day}` : `${day}`;
  return `Q3 · ${months[monthIdx]} ${dayStr}`;
}

export function DateProvider({ children }: { children: ReactNode }) {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && stored.startsWith("2026-")) return stored;
    } catch {
      /* ignore */
    }
    return DEFAULT_DATE;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, selectedDate);
    } catch {
      /* ignore */
    }
  }, [selectedDate]);

  const selectDate = (date: string) => {
    // Clamp to Q3 2026 (2026-07-01 to 2026-09-30)
    if (date < "2026-07-01") date = "2026-07-01";
    if (date > "2026-09-30") date = "2026-09-30";
    setSelectedDate(date);
  };

  const isDateInQ3 = (date: string) => date >= "2026-07-01" && date <= "2026-09-30";

  const { formattedDate, formattedButtonLabel, selectedYear, selectedMonth, selectedDay } = useMemo(() => {
    const parts = selectedDate.split("-");
    const y = parseInt(parts[0] || "2026", 10);
    const m = parseInt(parts[1] || "9", 10);
    const d = parseInt(parts[2] || "15", 10);

    return {
      formattedDate: formatDateLabel(selectedDate),
      formattedButtonLabel: formatQuarterButtonLabel(selectedDate),
      selectedYear: y,
      selectedMonth: m,
      selectedDay: d,
    };
  }, [selectedDate]);

  return (
    <DateContext.Provider
      value={{
        selectedDate,
        formattedDate,
        formattedButtonLabel,
        selectedYear,
        selectedMonth,
        selectedDay,
        selectDate,
        presets: DEMO_SNAPSHOTS,
        isDateInQ3,
      }}
    >
      {children}
    </DateContext.Provider>
  );
}

export function useDate() {
  const context = useContext(DateContext);
  if (!context) {
    throw new Error("useDate must be used within a DateProvider");
  }
  return context;
}
