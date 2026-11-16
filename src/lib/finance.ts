import "server-only";
import { db } from "./db";
import type { FinanceApproval, FinanceEntry } from "./types";

/** Set by the President in Admin → Finance → Settings. */
export async function getFinanceSettings() {
  const [threshold, exportRule] = await Promise.all([db.get("settings", "finance:threshold"), db.get("settings", "finance:export_rule")]);
  return {
    /** Amounts at or above this need both the President and the General Secretary. 0 = always one approval. */
    threshold: Number(threshold?.value ?? 0) || 0,
    /** Whether the Treasurer's exports need Governing Body approval. */
    exportRule: (exportRule?.value === "direct" ? "direct" : "approval") as "direct" | "approval",
  };
}

export function approvalsOf(entry: FinanceEntry): FinanceApproval[] {
  try {
    return JSON.parse(entry.approvals || "[]") as FinanceApproval[];
  } catch {
    return [];
  }
}

export const inr = (amount: number | string) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(amount));
