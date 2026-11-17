import type { Ballot, Poll, PollCategory, PollOption, PollReceipt, PollResultsVisibility, PollVoter, PublicUser, Role } from "./types";

export const CATEGORY: Record<PollCategory, { short: string; label: string; hint: string }> = {
  gb: { short: "GB", label: "Governing Body", hint: "L1: President, General Secretary, Joint Secretary, Treasury and Additional Members of GB" },
  eb: { short: "EB", label: "Executive Body", hint: "L2: Chief Executive Director, Executive Secretary and Record Officer" },
  ga: { short: "GA", label: "General Assembly", hint: "All active member accounts" },
};

const DEFAULT_ROLES: Record<PollCategory, Role[] | "all"> = {
  gb: ["super_admin", "general_secretary", "joint_secretary", "treasurer", "gb_member"],
  eb: ["admin", "executive_secretary", "record_officer"],
  ga: "all",
};

/** Suggested voters for a category. The President can change the list for each poll before voting starts. */
export function defaultEligible(category: PollCategory, u: Pick<PublicUser, "role" | "active">) {
  if (!u.active || u.role === "sysadmin") return false; // technical support never votes
  const roles = DEFAULT_ROLES[category];
  return roles === "all" || roles.includes(u.role);
}

export const VISIBILITY: Record<PollResultsVisibility, string> = {
  admin: "President / Admin only: results stay in the dashboard",
  after_close: "After voting closes: eligible members see the results",
  public: "Public: shown on the website after closing, once you authorise it",
};

export const parseOptions = (p: Pick<Poll, "options">): PollOption[] => {
  try {
    const v = JSON.parse(p.options || "[]");
    return Array.isArray(v) ? v.filter((o) => o && typeof o.id === "string" && typeof o.label === "string") : [];
  } catch {
    return [];
  }
};

// ---------------------------------------------------------------- India time
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
/** "2026-11-20T10:00" typed in India time → ISO (UTC). */
export function istInputToIso(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return "";
  const d = new Date(`${value}:00+05:30`);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}
/** ISO → value for <input type="datetime-local"> in India time. */
export const isoToIstInput = (iso: string) => (iso ? new Date(new Date(iso).getTime() + IST_OFFSET_MS).toISOString().slice(0, 16) : "");
export const formatIst = (iso: string) =>
  iso ? new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) + " IST" : "—";

// ---------------------------------------------------------------- status
export type PollPhase = "draft" | "upcoming" | "active" | "paused" | "closed";
export const PHASE_LABEL: Record<PollPhase, string> = { draft: "Draft", upcoming: "Upcoming", active: "Active", paused: "Paused", closed: "Closed" };

/** What members see: the stored status combined with the opening and closing times. */
export function phaseOf(p: Pick<Poll, "status" | "opens_at" | "closes_at">, now = Date.now()): PollPhase {
  if (p.status === "draft") return "draft";
  if (p.status === "closed" || (p.closes_at && now >= Date.parse(p.closes_at))) return "closed";
  if (p.status === "paused") return "paused";
  if (p.opens_at && now < Date.parse(p.opens_at)) return "upcoming";
  return "active";
}

export const voterKey = (pollId: string, userId: string) => `${pollId}:${userId}`;

/** Can this member see this poll's results now? Managers always can (from the dashboard). */
export function canSeeResults(p: Poll, opts: { manager: boolean; eligible: boolean; now?: number }) {
  if (opts.manager) return true;
  if (phaseOf(p, opts.now) !== "closed") return false; // never live results for ordinary members
  if (p.results_visibility === "after_close") return opts.eligible;
  if (p.results_visibility === "public") return p.public_authorized || opts.eligible;
  return false;
}

// ---------------------------------------------------------------- results
export type Tally = {
  options: (PollOption & { votes: number; share: number })[];
  eligible: number;
  cast: number;
  ballots: number;
  turnout: number;
  notVoted: PollVoter[];
  /** Ballots and "has voted" receipts must always match. */
  consistent: boolean;
  winners: string[];
};

export function tally(p: Poll, voters: PollVoter[], receipts: PollReceipt[], ballots: Ballot[]): Tally {
  const opts = parseOptions(p);
  const counts = new Map(opts.map((o) => [o.id, 0]));
  for (const b of ballots) if (counts.has(b.option_id)) counts.set(b.option_id, counts.get(b.option_id)! + 1);
  const total = ballots.length;
  const voted = new Set(receipts.map((r) => r.user_id));
  const options = opts.map((o) => ({ ...o, votes: counts.get(o.id)!, share: total ? (counts.get(o.id)! / total) * 100 : 0 }));
  const top = Math.max(0, ...options.map((o) => o.votes));
  return {
    options,
    eligible: voters.length,
    cast: receipts.length,
    ballots: total,
    turnout: voters.length ? (receipts.length / voters.length) * 100 : 0,
    notVoted: voters.filter((v) => !voted.has(v.user_id)).sort((a, b) => a.user_name.localeCompare(b.user_name)),
    consistent: total === receipts.length,
    winners: top > 0 ? options.filter((o) => o.votes === top).map((o) => o.label) : [],
  };
}

export const pct = (n: number) => `${n.toFixed(n > 0 && n < 10 ? 1 : 0)}%`;
