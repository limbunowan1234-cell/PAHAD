"use server";

import { requireUser } from "@/lib/auth/session";
import { log, notify, now, str, type ActionState } from "@/lib/admin-helpers";
import { db, newId } from "@/lib/db";
import { getFinanceSettings } from "@/lib/finance";
import { appendToSheet, flushOutbox, uploadToDrive } from "@/lib/google";
import { can, financeAccess, roleLabel } from "@/lib/permissions";
import { storeUpload } from "@/lib/storage";
import type { FinanceApproval, FinanceEntry, FinanceRequestKind, FinanceType, PublicUser } from "@/lib/types";

const TYPES: FinanceType[] = ["income", "expense", "donation", "dues"];
const RECEIPT_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

async function run(fn: (user: PublicUser) => Promise<string>): Promise<ActionState> {
  try {
    return { ok: true, message: await fn(await requireUser()) };
  } catch (e) {
    if (e instanceof Error && !("digest" in e)) return { ok: false, message: e.message };
    throw e;
  }
}

function needAccess(user: PublicUser, level: "view" | "record" | "approve") {
  const a = financeAccess(user);
  const ok = level === "view" ? a !== "none" : a === level;
  if (!ok) {
    throw new Error(
      level === "approve" ? "Only the Governing Body can approve finance." : level === "record" ? "Only the Treasurer can record finance entries." : "You don't have finance access.",
    );
  }
}

const governingBody = async () => (await db.all("users")).filter((u) => u.active && financeAccess(u) === "approve");

function parseAmount(raw: string): string {
  const n = Number(raw.replace(/[,₹\s]/g, ""));
  if (!Number.isFinite(n) || n <= 0) throw new Error("Enter an amount greater than zero.");
  if (n > 1e9) throw new Error("That amount looks too large. Please check it.");
  return n.toFixed(2);
}

async function nextEntryNo() {
  const year = new Date().getFullYear();
  const nums = (await db.all("finance")).map((f) => f.entry_no).filter((n) => n.startsWith(`PF-${year}-`)).map((n) => Number(n.split("-")[2]) || 0);
  return `PF-${year}-${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(4, "0")}`;
}

const ledgerRow = (e: FinanceEntry, status: string, by: string) => [
  e.entry_no, e.entry_date, e.type, Number(e.amount), e.description, e.submitted_by_name, status, e.receipt_url, by, now(),
];

/** Record an entry in the Sheet and remember whether it reached Google. */
async function syncLedger(e: FinanceEntry, status: string, by: string) {
  const ok = await appendToSheet("Ledger", ledgerRow(e, status, by));
  await db.update("finance", e.id, { synced: ok });
}

// ------------------------------------------------------------------ Treasurer: new entry
export async function submitFinanceEntry(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run(async (user) => {
    needAccess(user, "record");
    const type = str(fd, "type", 20) as FinanceType;
    if (!TYPES.includes(type)) throw new Error("Choose income, expense, donation or dues.");
    const amount = parseAmount(str(fd, "amount", 20));
    const entry_date = str(fd, "entry_date", 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entry_date)) throw new Error("Choose the date of the transaction.");
    const description = str(fd, "description", 500);
    if (description.length < 3) throw new Error("Add a short description.");
    const receipt = fd.get("receipt");
    if (!(receipt instanceof File) || receipt.size === 0) throw new Error("A receipt is required. Attach a photo or PDF of the receipt.");
    if (!RECEIPT_TYPES.includes(receipt.type)) throw new Error("The receipt must be a JPG, PNG, WebP image or a PDF.");
    if (receipt.size > 4 * 1024 * 1024) throw new Error("The receipt must be 4 MB or smaller.");

    const entry_no = await nextEntryNo();
    const ext = receipt.type === "application/pdf" ? "pdf" : receipt.type.split("/")[1];
    const [y, m] = entry_date.split("-");
    const receipt_url =
      (await uploadToDrive(receipt, ["PAHAD Finance", y, m], `${entry_no} ${entry_date} Rs${amount}.${ext}`)) ??
      (await storeUpload(receipt, "documents"));

    const entry: FinanceEntry = {
      id: newId(), entry_no, type, amount, entry_date, description, receipt_url,
      submitted_by: user.id, submitted_by_name: user.name, status: "submitted", approvals: "[]",
      locked: false, synced: false, created_at: now(), updated_at: now(),
    };
    await db.insert("finance", entry);
    await syncLedger(entry, "Submitted", user.name);
    await log(user, "recorded finance entry", "finance", entry.id, `${entry_no}: ${type} ₹${amount}`, { after: { entry_no, type, amount, entry_date, description } });
    for (const gb of await governingBody()) {
      await notify(gb.id, `New finance entry ${entry_no} (${type}, ₹${amount}) is waiting for approval.`, "/admin/finance");
    }
    return `${entry_no} submitted for Governing Body approval.`;
  });
}

// ------------------------------------------------------------------ Governing Body: approve / reject
export async function decideFinanceEntry(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run(async (user) => {
    needAccess(user, "approve");
    const entry = await db.get("finance", str(fd, "id", 60));
    if (!entry) throw new Error("Entry not found.");
    if (entry.status !== "submitted") throw new Error(`This entry is already ${entry.status}.`);
    if (entry.submitted_by === user.id) throw new Error("Nobody can approve their own entry.");
    const decision = str(fd, "decision", 10) === "reject" ? "rejected" : "approved";
    const note = str(fd, "note", 300);
    const approvals = JSON.parse(entry.approvals || "[]") as FinanceApproval[];
    if (approvals.some((a) => a.by === user.id)) throw new Error("You have already approved this entry.");
    approvals.push({ by: user.id, name: user.name, role: user.role, decision, note, at: now() });

    const { threshold } = await getFinanceSettings();
    let status: FinanceEntry["status"] = entry.status;
    let message: string;
    if (decision === "rejected") {
      status = "rejected";
      message = `${entry.entry_no} rejected.`;
    } else {
      const dual = threshold > 0 && Number(entry.amount) >= threshold;
      const approvedRoles = new Set(approvals.filter((a) => a.decision === "approved").map((a) => a.role));
      const complete = !dual || (approvedRoles.has("super_admin") && approvedRoles.has("general_secretary"));
      status = complete ? "approved" : "submitted";
      message = complete
        ? `${entry.entry_no} approved and locked.`
        : `Approval recorded. ₹${entry.amount} is at or above ₹${threshold.toLocaleString("en-IN")}, so it also needs the ${user.role === "super_admin" ? "General Secretary" : "President"}.`;
    }
    const updated = { ...entry, status, approvals: JSON.stringify(approvals), locked: status !== "submitted", updated_at: now() };
    await db.update("finance", entry.id, updated);
    await appendToSheet("Approvals", [entry.entry_no, decision === "approved" ? "Approved" : "Rejected", user.name, roleLabel(user.role), now(), note]);
    if (status !== "submitted") await syncLedger(updated, status === "approved" ? "Approved" : "Rejected", user.name);
    await log(user, decision === "approved" ? "approved finance entry" : "rejected finance entry", "finance", entry.id, `${entry.entry_no}${note ? `: ${note}` : ""}`, {
      before: { status: entry.status }, after: { status },
    });
    await notify(entry.submitted_by, `${entry.entry_no} was ${decision === "approved" ? (status === "approved" ? "approved" : "approved by one Governing Body member") : "rejected"} by ${user.name}.${note ? ` Note: ${note}` : ""}`, "/admin/finance");
    return message;
  });
}

// ------------------------------------------------------------------ Treasurer: request a change, deletion or export
export async function requestFinanceChange(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run(async (user) => {
    needAccess(user, "record");
    const kind = str(fd, "kind", 10) as FinanceRequestKind;
    if (!["edit", "delete", "export"].includes(kind)) throw new Error("Unknown request.");
    let entry_id = "";
    let payload: Record<string, string> = {};
    const reason = str(fd, "reason", 300);
    if (kind !== "export") {
      const entry = await db.get("finance", str(fd, "entry_id", 60));
      if (!entry) throw new Error("Entry not found.");
      if (entry.status === "deleted") throw new Error("This entry was already deleted.");
      entry_id = entry.id;
      if (reason.length < 3) throw new Error("Explain why this change is needed.");
      payload = { reason };
      if (kind === "edit") {
        payload.amount = str(fd, "amount", 20) ? parseAmount(str(fd, "amount", 20)) : entry.amount;
        payload.description = str(fd, "description", 500) || entry.description;
        payload.entry_date = str(fd, "entry_date", 10) || entry.entry_date;
      }
    } else {
      payload = { reason: reason || "Finance report" };
    }
    const id = newId();
    await db.insert("finance_requests", {
      id, entry_id, kind, payload: JSON.stringify(payload), requested_by: user.id, requested_by_name: user.name,
      status: "pending", decided_by_name: "", created_at: now(),
    });
    await log(user, `requested finance ${kind}`, "finance", entry_id || id, payload.reason);
    for (const gb of await governingBody()) await notify(gb.id, `${user.name} requested a finance ${kind}: ${payload.reason}`, "/admin/finance");
    return "Request sent to the Governing Body.";
  });
}

export async function decideFinanceRequest(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run(async (user) => {
    needAccess(user, "approve");
    const req = await db.get("finance_requests", str(fd, "id", 60));
    if (!req || req.status !== "pending") throw new Error("This request is no longer pending.");
    if (req.requested_by === user.id) throw new Error("Nobody can approve their own request.");
    const approve = str(fd, "decision", 10) !== "reject";
    await db.update("finance_requests", req.id, { status: approve ? "approved" : "rejected", decided_by_name: user.name });
    const payload = JSON.parse(req.payload) as Record<string, string>;

    if (approve && req.kind !== "export") {
      const entry = await db.get("finance", req.entry_id);
      if (!entry) throw new Error("Entry not found.");
      if (req.kind === "delete") {
        const updated = { ...entry, status: "deleted" as const, locked: true, updated_at: now() };
        await db.update("finance", entry.id, updated);
        await syncLedger(updated, `Deleted (approved by ${user.name}): ${payload.reason}`, user.name);
        await log(user, "approved finance deletion", "finance", entry.id, entry.entry_no, { before: entry, after: { status: "deleted" } });
      } else {
        const changes = { amount: payload.amount, description: payload.description, entry_date: payload.entry_date };
        const updated = { ...entry, ...changes, updated_at: now() };
        await db.update("finance", entry.id, updated);
        await syncLedger(updated, `Edited (approved by ${user.name}): ${payload.reason}`, user.name);
        await log(user, "approved finance edit", "finance", entry.id, entry.entry_no, {
          before: { amount: entry.amount, description: entry.description, entry_date: entry.entry_date }, after: changes,
        });
      }
    } else {
      await log(user, `${approve ? "approved" : "rejected"} finance ${req.kind} request`, "finance", req.entry_id || req.id, payload.reason ?? "");
    }
    await appendToSheet("Approvals", [req.entry_id ? (await db.get("finance", req.entry_id))?.entry_no ?? "" : "export", `${req.kind} request ${approve ? "approved" : "rejected"}`, user.name, roleLabel(user.role), now(), payload.reason ?? ""]);
    await notify(req.requested_by, `Your finance ${req.kind} request was ${approve ? "approved" : "rejected"} by ${user.name}.`, "/admin/finance");
    return `Request ${approve ? "approved" : "rejected"}.`;
  });
}

// ------------------------------------------------------------------ sync and settings
export async function retryFinanceSync(): Promise<ActionState> {
  return run(async (user) => {
    needAccess(user, "view");
    const waiting = await flushOutbox(100);
    if (waiting === 0) {
      for (const e of (await db.all("finance")).filter((f) => !f.synced)) await db.update("finance", e.id, { synced: true });
      return "Everything is synced with Google Sheets.";
    }
    return `${waiting} record(s) are still waiting. They'll be retried automatically.`;
  });
}

export async function saveFinanceSettings(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run(async (user) => {
    if (!can(user.role, "settings.manage")) throw new Error("Only the President can change finance settings.");
    const raw = str(fd, "threshold", 20).replace(/[,₹\s]/g, "");
    const threshold = raw ? Number(raw) : 0;
    if (!Number.isFinite(threshold) || threshold < 0) throw new Error("Enter a valid amount, or 0 for no dual approval.");
    const exportRule = str(fd, "export_rule", 20) === "direct" ? "direct" : "approval";
    const before = await getFinanceSettings();
    for (const [id, value] of [["finance:threshold", String(threshold)], ["finance:export_rule", exportRule]] as const) {
      if (await db.get("settings", id)) await db.update("settings", id, { value, updated_by: user.name });
      else await db.insert("settings", { id, value, updated_by: user.name, created_at: now() });
    }
    await log(user, "changed finance settings", "settings", "finance", `Dual approval from ₹${threshold}; Treasurer exports: ${exportRule}`, {
      before, after: { threshold, exportRule },
    });
    return "Finance settings saved.";
  });
}
