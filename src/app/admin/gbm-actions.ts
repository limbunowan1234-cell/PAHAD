"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { log, notify, now, str, type ActionState } from "@/lib/admin-helpers";
import { db, newId } from "@/lib/db";
import { can, GEO_KINDS, within, type Permission } from "@/lib/permissions";
import { loadStructure } from "@/lib/structure";
import type { CircularAudience, Meeting, PublicUser, Role, Vote } from "@/lib/types";

const GB_ROLES: Role[] = ["super_admin", "general_secretary", "joint_secretary", "treasurer", "gb_member"];
const EXEC_ROLES: Role[] = ["admin", "executive_secretary", "record_officer", "sysadmin"]; // Executive Body, incl. SYS

async function run(permission: Permission, fn: (user: PublicUser) => Promise<string>): Promise<ActionState> {
  try {
    const user = await requireUser();
    if (!can(user.role, permission)) throw new Error("Your role does not allow this.");
    return { ok: true, message: await fn(user) };
  } catch (e) {
    if (e instanceof Error && !("digest" in e)) return { ok: false, message: e.message };
    throw e;
  }
}

async function getMeeting(id: string) {
  const m = await db.get("meetings", id);
  if (!m) throw new Error("Meeting not found.");
  return m;
}

const governingBody = async () => (await db.all("users")).filter((u) => u.active && GB_ROLES.includes(u.role));
const presidents = async () => (await db.all("users")).filter((u) => u.active && u.role === "super_admin");

async function nextNumber(table: "resolutions" | "circulars", prefix: string) {
  const year = new Date().getFullYear();
  const nums = (await db.all(table)).map((r) => r.number).filter((n) => n.startsWith(`${prefix}-${year}-`)).map((n) => Number(n.split("-")[2]) || 0);
  return `${prefix}-${year}-${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, "0")}`;
}

// ------------------------------------------------------------------ meetings
export async function createMeeting(_prev: ActionState, fd: FormData): Promise<ActionState> {
  let id = "";
  const res = await run("gbm.draft", async (user) => {
    const title = str(fd, "title", 160) || "Governing Body Meeting";
    const meeting_date = str(fd, "meeting_date", 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(meeting_date)) throw new Error("Choose the meeting date.");
    id = newId();
    const m: Meeting = {
      id, title, meeting_date, start_time: str(fd, "start_time", 5), venue: str(fd, "venue", 200), status: "scheduled",
      agenda: "", agenda_status: "draft", agenda_approved_by: "", notice: "", notice_issued_at: "",
      minutes: "", minutes_status: "draft", minutes_approved_by: "", created_by: user.id, created_by_name: user.name,
      created_at: now(), updated_at: now(),
    };
    await db.insert("meetings", m);
    await log(user, "scheduled", "meeting", id, `${title} on ${meeting_date}`);
    return "Meeting created.";
  });
  if (res?.ok) redirect(`/admin/meetings/${id}`);
  return res;
}

export async function updateMeetingDetails(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run("gbm.draft", async (user) => {
    const m = await getMeeting(str(fd, "id", 60));
    const status = str(fd, "status", 12) as Meeting["status"];
    const patch = {
      title: str(fd, "title", 160) || m.title, meeting_date: str(fd, "meeting_date", 10) || m.meeting_date,
      start_time: str(fd, "start_time", 5), venue: str(fd, "venue", 200),
      status: ["scheduled", "held", "cancelled"].includes(status) ? status : m.status, updated_at: now(),
    };
    await db.update("meetings", m.id, patch);
    await log(user, "updated meeting", "meeting", m.id, patch.title, { before: { meeting_date: m.meeting_date, status: m.status }, after: patch });
    return "Meeting details saved.";
  });
}

/** Agenda or minutes: the General Secretary drafts and submits; the President approves. Approved text is locked. */
export async function saveDraft(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run("gbm.draft", async (user) => {
    const m = await getMeeting(str(fd, "id", 60));
    const part = str(fd, "part", 10) === "minutes" ? "minutes" : "agenda";
    if (m[`${part}_status`] === "approved") throw new Error(`The ${part} is approved and locked.`);
    const text = str(fd, "text", 50_000);
    const submit = str(fd, "submit", 5) === "yes";
    if (submit && text.length < 5) throw new Error(`Write the ${part} before submitting it.`);
    await db.update("meetings", m.id, { [part]: text, [`${part}_status`]: submit ? "submitted" : "draft", updated_at: now() });
    await log(user, submit ? `submitted ${part}` : `saved ${part}`, "meeting", m.id, m.title);
    if (submit) for (const p of await presidents()) await notify(p.id, `${user.name} submitted the ${part} of “${m.title}” for your approval.`, `/admin/meetings/${m.id}`);
    return submit ? `The ${part} was sent to the President for approval.` : `The ${part} draft was saved.`;
  });
}

export async function decideDraft(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run("gbm.approve", async (user) => {
    const m = await getMeeting(str(fd, "id", 60));
    const part = str(fd, "part", 10) === "minutes" ? "minutes" : "agenda";
    const approve = str(fd, "decision", 10) !== "return";
    if (m[`${part}_status`] !== "submitted") throw new Error(`The ${part} has not been submitted for approval.`);
    const note = str(fd, "note", 300);
    await db.update("meetings", m.id, {
      [`${part}_status`]: approve ? "approved" : "draft", [`${part}_approved_by`]: approve ? user.name : "", updated_at: now(),
    });
    await log(user, approve ? `approved ${part}` : `returned ${part}`, "meeting", m.id, `${m.title}${note ? `: ${note}` : ""}`);
    await notify(m.created_by, `The ${part} of “${m.title}” was ${approve ? "approved" : "returned for changes"} by ${user.name}.${note ? ` Note: ${note}` : ""}`, `/admin/meetings/${m.id}`);
    return approve ? `The ${part} is approved and locked.` : `The ${part} was returned to the General Secretary.`;
  });
}

/** Issue the meeting notice to every Governing Body member (as a circular and a notification). */
export async function issueNotice(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run("gbm.draft", async (user) => {
    const m = await getMeeting(str(fd, "id", 60));
    const notice = str(fd, "notice", 5000);
    if (notice.length < 10) throw new Error("Write the notice first.");
    if (m.agenda_status !== "approved") throw new Error("The President must approve the agenda before the notice is issued.");
    await db.update("meetings", m.id, { notice, notice_issued_at: now(), updated_at: now() });
    await db.insert("circulars", {
      id: newId(), number: await nextNumber("circulars", "PC"), title: `Notice: ${m.title} (${m.meeting_date})`, body: `${notice}\n\n## Agenda\n\n${m.agenda}`,
      audience: "governing_body", visibility: "", geo: "", meeting_id: m.id, issued_by: user.id, issued_by_name: user.name, created_at: now(),
    });
    for (const gb of await governingBody()) await notify(gb.id, `Notice issued: ${m.title} on ${m.meeting_date}${m.start_time ? ` at ${m.start_time}` : ""}${m.venue ? `, ${m.venue}` : ""}.`, `/admin/meetings/${m.id}`);
    await log(user, "issued notice", "meeting", m.id, m.title);
    return "Notice issued to the Governing Body.";
  });
}

// ------------------------------------------------------------------ resolutions
export async function proposeResolution(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run("gbm.draft", async (user) => {
    const m = await getMeeting(str(fd, "meeting_id", 60));
    const title = str(fd, "title", 200);
    if (title.length < 3) throw new Error("Give the resolution a title.");
    const number = await nextNumber("resolutions", "GBR");
    await db.insert("resolutions", {
      id: newId(), meeting_id: m.id, number, title, body: str(fd, "body", 10_000), status: "proposed", votes: "[]",
      decided_by_name: "", decided_at: "", created_by_name: user.name, created_at: now(),
    });
    await log(user, "proposed resolution", "meeting", m.id, `${number}: ${title}`);
    return `${number} added. Governing Body members can now record their votes.`;
  });
}

export async function castVote(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run("gbm.vote", async (user) => {
    const r = await db.get("resolutions", str(fd, "id", 60));
    if (!r) throw new Error("Resolution not found.");
    if (r.status !== "proposed") throw new Error("Voting on this resolution has closed.");
    const vote = str(fd, "vote", 10) as Vote["vote"];
    if (!["for", "against", "abstain"].includes(vote)) throw new Error("Choose for, against or abstain.");
    const votes = (JSON.parse(r.votes || "[]") as Vote[]).filter((v) => v.by !== user.id);
    votes.push({ by: user.id, name: user.name, vote, at: now() });
    await db.update("resolutions", r.id, { votes: JSON.stringify(votes) });
    await log(user, `voted ${vote}`, "resolution", r.id, r.number);
    return `Your vote (${vote}) on ${r.number} was recorded.`;
  });
}

export async function decideResolution(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run("gbm.approve", async (user) => {
    const r = await db.get("resolutions", str(fd, "id", 60));
    if (!r) throw new Error("Resolution not found.");
    if (r.status !== "proposed") throw new Error(`${r.number} is already ${r.status}.`);
    const ratify = str(fd, "decision", 10) !== "reject";
    await db.update("resolutions", r.id, { status: ratify ? "ratified" : "rejected", decided_by_name: user.name, decided_at: now() });
    await log(user, ratify ? "ratified resolution" : "rejected resolution", "resolution", r.id, `${r.number}: ${r.title}`, { before: { status: r.status }, after: { status: ratify ? "ratified" : "rejected", votes: JSON.parse(r.votes || "[]") } });
    for (const gb of await governingBody()) await notify(gb.id, `${r.number} “${r.title}” was ${ratify ? "ratified" : "rejected"} by ${user.name}.`, `/admin/meetings/${r.meeting_id}`);
    return `${r.number} ${ratify ? "ratified" : "rejected"}.`;
  });
}

// ------------------------------------------------------------------ follow-ups (tasks linked to a meeting)
export async function addFollowUp(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run("gbm.draft", async (user) => {
    const m = await getMeeting(str(fd, "meeting_id", 60));
    const title = str(fd, "title", 200);
    if (title.length < 3) throw new Error("Describe the follow-up.");
    const assignee = await db.get("users", str(fd, "assigned_to", 60));
    if (!assignee || !assignee.active) throw new Error("Choose who will follow this up.");
    const id = newId();
    await db.insert("tasks", {
      id, title, description: `Follow-up from ${m.title} (${m.meeting_date})`, assigned_to: assignee.id, assigned_by: user.id,
      due_date: str(fd, "due_date", 10), priority: "normal", status: "todo", meeting_id: m.id, created_at: now(), updated_at: now(),
    });
    await notify(assignee.id, `Follow-up from ${m.title}: “${title}”.`, "/admin/tasks");
    await log(user, "added follow-up", "meeting", m.id, `${title} → ${assignee.name}`);
    return `Follow-up assigned to ${assignee.name}.`;
  });
}

// ------------------------------------------------------------------ circulars
export async function issueCircular(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run("circulars.issue", async (user) => {
    const title = str(fd, "title", 200);
    const body = str(fd, "body", 20_000);
    if (title.length < 3 || body.length < 10) throw new Error("Add a title and the text of the circular.");
    const audience = str(fd, "audience", 20) as CircularAudience;
    if (!["general_assembly", "governing_body", "executive", "all"].includes(audience)) throw new Error("Choose who the circular is for.");
    const s = await loadStructure();
    const geoRow = s.byId.get(str(fd, "geo", 60));
    const geo = geoRow && GEO_KINDS.includes(geoRow.kind) ? geoRow.id : "";
    const number = await nextNumber("circulars", "PC");
    const id = newId();
    await db.insert("circulars", { id, number, title, body, audience, visibility: "", geo, meeting_id: "", issued_by: user.id, issued_by_name: user.name, created_at: now() });

    // Notify everyone in the audience (and, for an area circular, inside that area).
    const [users, members] = await Promise.all([db.all("users"), db.all("members")]);
    const memberGeo = new Map(members.map((m) => [m.email.toLowerCase(), m.geo]));
    const recipients = users.filter((u) => {
      if (!u.active || u.id === user.id) return false;
      const inAudience =
        audience === "all" ||
        (audience === "general_assembly" && u.role === "editor") ||
        (audience === "governing_body" && GB_ROLES.includes(u.role)) ||
        (audience === "executive" && EXEC_ROLES.includes(u.role));
      if (!inAudience) return false;
      if (!geo) return true;
      const where = u.geo || memberGeo.get(u.email.toLowerCase()) || "";
      return within(s, where, geo);
    });
    for (const r of recipients) await notify(r.id, `New circular ${number}: ${title}`, "/admin/circulars");
    await log(user, "issued circular", "circular", id, `${number}: ${title} → ${audience}${geoRow ? ` (${geoRow.name})` : ""}`);
    return `${number} issued to ${recipients.length} ${recipients.length === 1 ? "person" : "people"}.`;
  });
}
