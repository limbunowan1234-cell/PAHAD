import { PollAudienceFields } from "./PollClient";
import { Field } from "./ui";
import { db } from "@/lib/db";
import { roleLabel } from "@/lib/permissions";
import { defaultEligible, isoToIstInput, parseOptions, VISIBILITY, type PollPhase } from "@/lib/polls";
import type { Poll, PollCategory } from "@/lib/types";

export const PHASE_TONE: Record<PollPhase, "grey" | "amber" | "green" | "red" | "teal"> = { draft: "grey", upcoming: "amber", active: "green", paused: "amber", closed: "grey" };

/** Fields shared by "create" and "edit" (edit locks options and voters once voting starts). */
export async function PollFields({ poll, voterIds, locked = false }: { poll?: Poll; voterIds?: string[]; locked?: boolean }) {
  const users = (await db.all("users")).filter((u) => u.active && u.role !== "sysadmin").sort((a, b) => a.name.localeCompare(b.name));
  const voters = users.map((u) => ({
    id: u.id, name: u.name, roleLabel: roleLabel(u.role),
    defaults: { gb: defaultEligible("gb", u), eb: defaultEligible("eb", u), ga: defaultEligible("ga", u) } as Record<PollCategory, boolean>,
  }));
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {poll && <input type="hidden" name="id" value={poll.id} />}
      <PollAudienceFields voters={voters} category={poll?.category} selected={voterIds} locked={locked} />
      <Field label="Results visibility *">
        <select name="results_visibility" defaultValue={poll?.results_visibility ?? "admin"} disabled={locked} className="field">
          {Object.entries(VISIBILITY).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
        </select>
      </Field>
      <Field label="Poll title *" className="sm:col-span-2"><input name="title" required maxLength={200} defaultValue={poll?.title} disabled={locked} className="field" /></Field>
      <Field label="Description" className="sm:col-span-2"><textarea name="description" rows={3} maxLength={3000} defaultValue={poll?.description} disabled={locked} className="field" /></Field>
      <Field label="Candidates / options * (one per line)" className="sm:col-span-2">
        <textarea name="options" rows={5} required defaultValue={poll ? parseOptions(poll).map((o) => o.label).join("\n") : ""} disabled={locked} className="field" placeholder={"Candidate A\nCandidate B"} />
      </Field>
      <Field label="Opens (India time) *"><input name="opens_at" type="datetime-local" required defaultValue={poll ? isoToIstInput(poll.opens_at) : ""} readOnly={locked} className="field" /></Field>
      <Field label="Closes (India time) *"><input name="closes_at" type="datetime-local" required defaultValue={poll ? isoToIstInput(poll.closes_at) : ""} className="field" /></Field>
    </div>
  );
}
