import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { CATEGORY, formatIst, PHASE_LABEL, phaseOf, tally } from "@/lib/polls";

function csvCell(v: unknown) {
  let s = String(v ?? "");
  if (/^[=+\-@]/.test(s)) s = `'${s}`; // prevent spreadsheet formula injection
  return `"${s.replace(/"/g, '""')}"`;
}
const line = (...cells: unknown[]) => cells.map(csvCell).join(",");

/** Results export: totals per option and participation. Never individual ballots. */
export async function GET(_req: Request, { params }: RouteContext<"/admin/voting/[id]/export">) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "polls.manage")) return new Response("Forbidden", { status: 403 });
  const { id } = await params;
  const poll = await db.get("polls", id);
  if (!poll) return new Response("Not found", { status: 404 });
  const [voters, receipts, ballots] = await Promise.all([db.findBy("poll_voters", "poll_id", id), db.findBy("poll_receipts", "poll_id", id), db.findBy("ballots", "poll_id", id)]);
  const t = tally(poll, voters, receipts, ballots);
  const rows = [
    line("Poll", poll.title),
    line("Category", `${CATEGORY[poll.category].short} (${CATEGORY[poll.category].label})`),
    line("Status", PHASE_LABEL[phaseOf(poll)]),
    line("Opens", formatIst(poll.opens_at)),
    line("Closes", formatIst(poll.closes_at)),
    line("Exported", formatIst(new Date().toISOString()), "by", user.name),
    "",
    line("Candidate / option", "Votes", "Share %"),
    ...t.options.map((o) => line(o.label, o.votes, o.share.toFixed(1))),
    "",
    line("Eligible voters", t.eligible),
    line("Votes cast", t.cast),
    line("Turnout %", t.turnout.toFixed(1)),
    line("Integrity check", t.consistent ? "OK: ballots match voting records" : `FAILED: ${t.ballots} ballots vs ${t.cast} records`),
    "",
    line("Not voted"),
    ...t.notVoted.map((v) => line(v.user_name)),
  ];
  const name = poll.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
  return new Response("﻿" + rows.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pahad-poll-${name}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
