import { getCurrentUser } from "@/lib/auth/session";
import { db, newId } from "@/lib/db";
import { getFinanceSettings } from "@/lib/finance";
import { appendToSheet } from "@/lib/google";
import { financeAccess, roleLabel } from "@/lib/permissions";

const COLUMNS = ["entry_no", "entry_date", "type", "amount", "description", "status", "submitted_by_name", "receipt_url", "created_at"] as const;

function csvCell(v: unknown) {
  let s = String(v ?? "");
  if (/^[=+\-@]/.test(s)) s = `'${s}`; // prevent spreadsheet formula injection
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Please sign in.", { status: 401 });
  const access = financeAccess(user);
  let approvedBy = "Governing Body (direct)";

  if (access !== "approve") {
    if (access !== "record") return new Response("Forbidden", { status: 403 });
    const { exportRule } = await getFinanceSettings();
    if (exportRule === "approval") {
      const reqId = new URL(request.url).searchParams.get("request") ?? "";
      const req = await db.get("finance_requests", reqId);
      if (!req || req.kind !== "export" || req.requested_by !== user.id || req.status !== "approved") {
        return new Response("This export needs Governing Body approval first.", { status: 403 });
      }
      await db.update("finance_requests", req.id, { status: "used" }); // one approved export = one download
      approvedBy = req.decided_by_name;
    } else {
      approvedBy = "Not required (setting)";
    }
  }

  const entries = (await db.all("finance")).sort((a, b) => a.entry_date.localeCompare(b.entry_date));
  const csv = [COLUMNS.join(","), ...entries.map((e) => COLUMNS.map((c) => csvCell(e[c])).join(","))].join("\r\n");
  const at = new Date().toISOString();
  await db.insert("activity", {
    id: newId(), actor_id: user.id, actor_name: user.name, action: "exported", entity: "finance", entity_id: "",
    summary: `${entries.length} finance entries (approved by: ${approvedBy})`, details: "", directorate: user.directorate ?? "", created_at: at,
  });
  await appendToSheet("Exports", [at, user.name, roleLabel(user.role), `${entries.length} entries (CSV)`, approvedBy]);

  return new Response("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pahad-finance-${at.slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
