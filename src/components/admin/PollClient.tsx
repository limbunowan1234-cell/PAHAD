"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { castVote } from "@/app/admin/poll-actions";
import { CATEGORY } from "@/lib/polls";
import type { PollCategory, PollOption } from "@/lib/types";

/** Member ballot: one choice, confirmed before it is sent. A vote cannot be changed afterwards. */
export function VoteForm({ pollId, options }: { pollId: string; options: PollOption[] }) {
  const [choice, setChoice] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const chosen = options.find((o) => o.id === choice);
  if (msg?.ok) {
    return (
      <p role="status" className="flex items-center gap-2 rounded-xl bg-sage-100 p-4 font-semibold text-teal">
        <CheckCircle2 className="h-5 w-5" aria-hidden /> {msg.message}
      </p>
    );
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!chosen || !window.confirm(`Cast your vote for “${chosen.label}”? You can't change it afterwards.`)) return;
        start(async () => {
          const res = await castVote(pollId, choice);
          setMsg(res);
          router.refresh();
        });
      }}
    >
      <fieldset>
        <legend className="sr-only">Choose one</legend>
        <div className="space-y-2">
          {options.map((o) => (
            <label key={o.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-line px-4 py-3 hover:bg-sand has-[:checked]:border-teal has-[:checked]:bg-sage-100">
              <input type="radio" name="option" value={o.id} checked={choice === o.id} onChange={() => setChoice(o.id)} className="h-4 w-4 accent-teal" />
              <span className="font-medium text-ink">{o.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {msg && !msg.ok && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">{msg.message}</p>}
      <button disabled={!choice || pending} className="btn btn-primary mt-4 disabled:opacity-50">
        {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Cast vote
      </button>
      <p className="mt-2 text-xs text-muted">Your choice is secret: ballots are stored without your name. You can vote once.</p>
    </form>
  );
}

type Voter = { id: string; name: string; roleLabel: string; defaults: Record<PollCategory, boolean> };

/** Category plus eligible voters. Changing the category re-selects that category's default voters. */
export function PollAudienceFields({ voters, category: initialCategory, selected, locked }: { voters: Voter[]; category?: PollCategory; selected?: string[]; locked?: boolean }) {
  const [category, setCategory] = useState<PollCategory>(initialCategory ?? "gb");
  const [chosen, setChosen] = useState<Set<string>>(() => new Set(selected ?? voters.filter((v) => v.defaults[initialCategory ?? "gb"]).map((v) => v.id)));
  const pick = (c: PollCategory) => {
    setCategory(c);
    setChosen(new Set(voters.filter((v) => v.defaults[c]).map((v) => v.id)));
  };
  const toggle = (id: string) => setChosen((s) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    return n;
  });
  return (
    <>
      <label className="block">
        <span className="label">Voting category *</span>
        <select name="category" value={category} disabled={locked} onChange={(e) => pick(e.target.value as PollCategory)} className="field">
          {(Object.keys(CATEGORY) as PollCategory[]).map((c) => (
            <option key={c} value={c}>{CATEGORY[c].short}: {CATEGORY[c].label}</option>
          ))}
        </select>
        <span className="mt-1 block text-xs text-muted">Default voters: {CATEGORY[category].hint}.</span>
      </label>
      <fieldset className="sm:col-span-2" disabled={locked}>
        <legend className="label">Eligible voters ({chosen.size})</legend>
        {!locked && (
          <div className="mb-2 flex gap-3 text-xs font-semibold text-teal">
            <button type="button" onClick={() => pick(category)} className="hover:underline">Reset to {CATEGORY[category].short} defaults</button>
            <button type="button" onClick={() => setChosen(new Set(voters.map((v) => v.id)))} className="hover:underline">Select all</button>
            <button type="button" onClick={() => setChosen(new Set())} className="hover:underline">Clear</button>
          </div>
        )}
        <div className="grid max-h-72 gap-1 overflow-y-auto rounded-xl border border-line p-2 sm:grid-cols-2">
          {voters.map((v) => (
            <label key={v.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-sand">
              <input type="checkbox" name="voters" value={v.id} checked={chosen.has(v.id)} onChange={() => toggle(v.id)} className="h-4 w-4 accent-teal" />
              <span className="text-ink">{v.name}</span>
              <span className="truncate text-xs text-muted">{v.roleLabel}</span>
            </label>
          ))}
        </div>
        {locked && <p className="mt-1 text-xs text-muted">Locked: voting has started.</p>}
      </fieldset>
    </>
  );
}
