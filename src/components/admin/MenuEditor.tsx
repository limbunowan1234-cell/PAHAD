"use client";

import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, Loader2, Plus, Trash2 } from "lucide-react";
import { resetMenu, saveMenu } from "@/app/admin/menu-actions";
import type { MenuGroup, MenuItem } from "@/lib/menu";
import { cn } from "@/lib/utils";

type PageOption = { label: string; href: string };

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [x] = next.splice(from, 1);
  next.splice(to, 0, x);
  return next;
}

function IconButton({ label, onClick, disabled, children, danger }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode; danger?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-white disabled:opacity-30",
        danger ? "text-red-700 hover:bg-red-50" : "text-teal hover:bg-sand",
      )}
    >
      {children}
    </button>
  );
}

/** Reorder, rename, hide, add and move menu sections and links; saved as one menu. */
export function MenuEditor({ initial, pages }: { initial: MenuGroup[]; pages: PageOption[] }) {
  const [groups, setGroups] = useState<MenuGroup[]>(initial);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const update = (fn: (g: MenuGroup[]) => MenuGroup[]) => {
    setGroups(fn);
    setDirty(true);
    setMsg(null);
  };
  const setGroup = (gi: number, patch: Partial<MenuGroup>) => update((gs) => gs.map((g, i) => (i === gi ? { ...g, ...patch } : g)));
  const setItems = (gi: number, fn: (items: MenuItem[]) => MenuItem[]) => update((gs) => gs.map((g, i) => (i === gi ? { ...g, items: fn(g.items ?? []) } : g)));
  const setItem = (gi: number, ii: number, patch: Partial<MenuItem>) => setItems(gi, (items) => items.map((it, j) => (j === ii ? { ...it, ...patch } : it)));
  const moveItemTo = (gi: number, ii: number, target: number) =>
    update((gs) => {
      const item = gs[gi].items?.[ii];
      if (!item || target === gi) return gs;
      return gs.map((g, i) => (i === gi ? { ...g, items: (g.items ?? []).filter((_, j) => j !== ii) } : i === target ? { ...g, items: [...(g.items ?? []), item] } : g));
    });

  function save() {
    start(async () => {
      const r = await saveMenu(JSON.stringify(groups));
      if (r) setMsg({ ok: r.ok, text: r.message });
      if (r?.ok) setDirty(false);
    });
  }
  function reset() {
    if (!confirm("Put the menu back to the original layout? Your changes to the menu will be lost.")) return;
    start(async () => {
      const r = await resetMenu();
      if (r) setMsg({ ok: r.ok, text: r.message });
      if (r?.ok) window.location.reload();
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        The order here is the order on the website: first section on the left of the top menu, first link at the top of its dropdown. The footer follows the same order.
      </p>
      {groups.map((g, gi) => (
        <section key={gi} className={cn("rounded-2xl border bg-white p-4 sm:p-5", g.hidden ? "border-dashed border-line opacity-70" : "border-line")}>
          <div className="flex flex-wrap items-end gap-2">
            <span className="mr-1 inline-flex h-9 w-9 items-center justify-center rounded-full bg-teal text-sm font-bold text-white">{gi + 1}</span>
            <label className="min-w-[10rem] flex-1">
              <span className="label">Section name</span>
              <input value={g.label} onChange={(e) => setGroup(gi, { label: e.target.value })} className="field" />
            </label>
            <label className="min-w-[10rem] flex-1">
              <span className="label">Opens</span>
              <input value={g.href} onChange={(e) => setGroup(gi, { href: e.target.value })} className="field font-mono text-sm" placeholder="/news" />
            </label>
            <div className="flex gap-1.5">
              <IconButton label="Move section earlier" onClick={() => update((gs) => move(gs, gi, gi - 1))} disabled={gi === 0}><ArrowUp className="h-4 w-4" /></IconButton>
              <IconButton label="Move section later" onClick={() => update((gs) => move(gs, gi, gi + 1))} disabled={gi === groups.length - 1}><ArrowDown className="h-4 w-4" /></IconButton>
              <IconButton label={g.hidden ? "Show section" : "Hide section"} onClick={() => setGroup(gi, { hidden: !g.hidden })}>{g.hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</IconButton>
              <IconButton
                label="Remove section"
                danger
                onClick={() => confirm(`Remove the “${g.label}” section and its links from the menu? Pages themselves are not deleted.`) && update((gs) => gs.filter((_, i) => i !== gi))}
              >
                <Trash2 className="h-4 w-4" />
              </IconButton>
            </div>
          </div>
          {g.hidden && <p className="mt-2 text-xs font-semibold text-coral-700">Hidden from the website</p>}

          <ol className="mt-4 space-y-2">
            {(g.items ?? []).map((it, ii) => (
              <li key={ii} className={cn("rounded-xl border p-3", it.hidden ? "border-dashed border-line bg-sand/40" : "border-line bg-sand/70")}>
                <div className="flex flex-wrap items-end gap-2">
                  <span className="w-6 text-sm font-semibold text-muted">{ii + 1}.</span>
                  <label className="min-w-[9rem] flex-1">
                    <span className="sr-only">Link name</span>
                    <input value={it.label} onChange={(e) => setItem(gi, ii, { label: e.target.value })} className="field py-2 text-sm" placeholder="Link name" />
                  </label>
                  <label className="min-w-[9rem] flex-1">
                    <span className="sr-only">Link address</span>
                    <input value={it.href} onChange={(e) => setItem(gi, ii, { href: e.target.value })} className="field py-2 font-mono text-xs" placeholder="/pages/features" />
                  </label>
                  <div className="flex gap-1.5">
                    <IconButton label="Move link up" onClick={() => setItems(gi, (items) => move(items, ii, ii - 1))} disabled={ii === 0}><ArrowUp className="h-4 w-4" /></IconButton>
                    <IconButton label="Move link down" onClick={() => setItems(gi, (items) => move(items, ii, ii + 1))} disabled={ii === (g.items?.length ?? 0) - 1}><ArrowDown className="h-4 w-4" /></IconButton>
                    <IconButton label={it.hidden ? "Show link" : "Hide link"} onClick={() => setItem(gi, ii, { hidden: !it.hidden })}>{it.hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</IconButton>
                    <IconButton label="Remove link" danger onClick={() => setItems(gi, (items) => items.filter((_, j) => j !== ii))}><Trash2 className="h-4 w-4" /></IconButton>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 pl-8">
                  <input value={it.description ?? ""} onChange={(e) => setItem(gi, ii, { description: e.target.value })} className="field min-w-[12rem] flex-1 py-1.5 text-xs" placeholder="Short description shown in the dropdown (optional)" />
                  {groups.length > 1 && (
                    <select value="" onChange={(e) => e.target.value !== "" && moveItemTo(gi, ii, Number(e.target.value))} className="field w-auto py-1.5 text-xs" aria-label="Move this link to another section">
                      <option value="">Move to section…</option>
                      {groups.map((og, oi) => oi !== gi && <option key={oi} value={oi}>{og.label || `Section ${oi + 1}`}</option>)}
                    </select>
                  )}
                </div>
              </li>
            ))}
          </ol>
          <AddLink pages={pages} onAdd={(item) => setItems(gi, (items) => [...items, item])} />
        </section>
      ))}

      <button
        type="button"
        onClick={() => update((gs) => [...gs, { label: "New section", href: "/", items: [] }])}
        className="inline-flex items-center gap-2 rounded-full border border-dashed border-teal px-4 py-2 text-sm font-semibold text-teal hover:bg-sand"
      >
        <Plus className="h-4 w-4" /> Add a top menu section
      </button>

      <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white/95 p-3 shadow-lg backdrop-blur">
        <button type="button" onClick={save} disabled={pending || !dirty} className="btn btn-primary disabled:opacity-50">
          {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Save menu
        </button>
        <button type="button" onClick={reset} disabled={pending} className="text-sm font-semibold text-red-700 hover:underline">Reset to original</button>
        {dirty && !msg && <span className="text-sm text-coral-700">Unsaved changes</span>}
        {msg && <span role="status" className={cn("text-sm", msg.ok ? "text-green-800" : "text-red-800")}>{msg.text}</span>}
      </div>
    </div>
  );
}

function AddLink({ pages, onAdd }: { pages: PageOption[]; onAdd: (item: MenuItem) => void }) {
  const [choice, setChoice] = useState("");
  const [label, setLabel] = useState("");
  const [href, setHref] = useState("");
  const custom = choice === "__custom";
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <select
        value={choice}
        onChange={(e) => {
          const v = e.target.value;
          setChoice(v);
          if (v && v !== "__custom") {
            const p = pages.find((x) => x.href === v);
            if (p) onAdd({ label: p.label, href: p.href });
            setChoice("");
          }
        }}
        className="field w-auto py-2 text-sm"
        aria-label="Add a link to this section"
      >
        <option value="">+ Add a link…</option>
        {pages.map((p) => (
          <option key={p.href} value={p.href}>{p.label} ({p.href})</option>
        ))}
        <option value="__custom">Other link (type the address)…</option>
      </select>
      {custom && (
        <>
          <input value={label} onChange={(e) => setLabel(e.target.value)} className="field w-40 py-2 text-sm" placeholder="Link name" />
          <input value={href} onChange={(e) => setHref(e.target.value)} className="field w-56 py-2 font-mono text-xs" placeholder="/path or https://…" />
          <button
            type="button"
            disabled={!label.trim() || !href.trim()}
            onClick={() => {
              onAdd({ label: label.trim(), href: href.trim() });
              setLabel("");
              setHref("");
              setChoice("");
            }}
            className="btn btn-primary py-2 text-sm disabled:opacity-50"
          >
            Add
          </button>
        </>
      )}
    </div>
  );
}
