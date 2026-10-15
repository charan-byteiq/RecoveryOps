import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { BranchSummary } from "@/lib/api";

export type Branch = BranchSummary;

interface BranchContextValue {
  /** null means "All Branches" */
  selectedBranch: Branch | null;
  selectBranch: (branch: Branch) => void;
  clearBranch: () => void;
  hasBranch: boolean;
}

const BranchContext = createContext<BranchContextValue | null>(null);
const STORAGE_KEY = "recoveryops-selected-branch";

function isValidBranch(value: unknown): value is Branch {
  return (
    typeof value === "object" &&
    value != null &&
    "id" in value &&
    typeof (value as Record<string, unknown>)["id"] === "number" &&
    "sourceBranchCode" in value &&
    typeof (value as Record<string, unknown>)["sourceBranchCode"] === "string"
  );
}

export function BranchProvider({ children }: { children: ReactNode }) {
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as unknown;
        if (isValidBranch(parsed)) return parsed;
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      /* ignore */
    }
    return null;
  });

  useEffect(() => {
    if (selectedBranch) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedBranch));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [selectedBranch]);

  const selectBranch = (branch: Branch) => setSelectedBranch(branch);
  const clearBranch = () => setSelectedBranch(null);

  return (
    <BranchContext.Provider
      value={{ selectedBranch, selectBranch, clearBranch, hasBranch: selectedBranch !== null }}
    >
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  const ctx = useContext(BranchContext);
  if (!ctx) throw new Error("useBranch must be used within BranchProvider");
  return ctx;
}
