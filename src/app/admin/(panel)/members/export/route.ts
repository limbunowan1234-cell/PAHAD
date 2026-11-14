import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";

const COLUMNS = ["member_no", "name", "email", "phone", "area", "address", "occupation", "category", "interests", "status", "source", "added_by", "created_at"] as const;

function csvCell(v: unknown) {
  let s = String(v ?? "");
  if (/^[=+\-@]/.test(s)) s = `'${s}`; // prevent spreadsheet formula injection
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "members.export")) return new Response("Forbidden", { status: 403 });
  const members = await db.all("members");
  const csv = [COLUMNS.join(","), ...members.map((m) => COLUMNS.map((c) => csvCell(m[c])).join(","))].join("\r\n");
  return new Response("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pahad-members-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
