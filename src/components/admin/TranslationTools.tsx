"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, Loader2, ScanSearch, Sparkles } from "lucide-react";
import { addPhrases, draftTranslations, saveTranslation } from "@/app/admin/translation-actions";
import { cn } from "@/lib/utils";

const SKIP = "script,style,noscript,textarea,code,pre,svg,template,[data-no-translate],[translate=no]";
const norm = (s: string) => s.replace(/\s+/g, " ").trim();

/** Reads each public page in the admin's browser and collects its English text. */
async function collect(paths: string[], onPage: (i: number) => void) {
  const found: { en: string; page: string }[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < paths.length; i++) {
    onPage(i);
    try {
      const html = await (await fetch(paths[i], { cache: "no-store" })).text();
      const doc = new DOMParser().parseFromString(html, "text/html");
      const add = (t: string) => {
        const en = norm(t);
        if (en && /[A-Za-z]{2}/.test(en) && !seen.has(en)) {
          seen.add(en);
          found.push({ en, page: paths[i] });
        }
      };
      const w = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
      let n: Node | null;
      while ((n = w.nextNode())) if (!n.parentElement?.closest(SKIP)) add(n.nodeValue ?? "");
      doc.querySelectorAll("[placeholder],[aria-label],[title]").forEach((el) => {
        if (el.closest(SKIP)) return;
        for (const a of ["placeholder", "aria-label", "title"]) add(el.getAttribute(a) ?? "");
      });
    } catch {
      /* skip a page that fails to load */
    }
  }
  return found;
}

export function TranslationTools({ paths, waiting }: { paths: string[]; waiting: number }) {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [busy, start] = useTransition();

  const scan = () =>
    start(async () => {
      const found = await collect(paths, (i) => setStatus(`Reading page ${i + 1} of ${paths.length}…`));
      setStatus(`Saving ${found.length} phrases…`);
      const r = await addPhrases(found);
      setStatus(r?.message ?? "");
      router.refresh();
    });

  const draft = () =>
    start(async () => {
      let total = 0;
      for (let round = 0; round < 60; round++) {
        const r = await draftTranslations();
        if (!r?.ok) {
          setStatus(r?.message ?? "Something went wrong.");
          break;
        }
        total += Number(r.message.match(/^\d+/)?.[0] ?? 0);
        setStatus(`${total} drafted, ${r.left ?? 0} to go…`);
        if (!r.left || r.message.startsWith("0 ")) break;
      }
      router.refresh();
    });

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" onClick={scan} disabled={busy} className="btn btn-outline text-teal disabled:opacity-50">
        <ScanSearch className="h-4 w-4" aria-hidden /> Scan the website for text
      </button>
      <button type="button" onClick={draft} disabled={busy || waiting === 0} className="btn btn-primary disabled:opacity-50">
        <Sparkles className="h-4 w-4" aria-hidden /> Draft Nepali with Google ({waiting} waiting)
      </button>
      {busy && <Loader2 className="h-4 w-4 animate-spin text-teal" aria-hidden />}
      {status && <span role="status" className="text-sm text-muted">{status}</span>}
    </div>
  );
}

export function TranslationRow({ id, en, ne, source, page }: { id: string; en: string; ne: string; source: string; page: string }) {
  const [value, setValue] = useState(ne);
  const [state, setState] = useState(source);
  const [msg, setMsg] = useState("");
  const [busy, start] = useTransition();
  const run = (mode: "save" | "keep") =>
    start(async () => {
      const r = await saveTranslation(id, value, mode);
      setMsg(r?.message ?? "");
      if (r?.ok) setState(mode === "keep" ? "keep" : value.trim() ? "human" : "");
    });
  return (
    <li className={cn("rounded-2xl border bg-white p-4", state === "human" ? "border-green-200" : state === "keep" ? "border-dashed border-line" : "border-line")}>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <p className="text-[15px] text-ink">{en}</p>
          <p className="mt-1 text-xs text-muted">
            {page}
            {state === "machine" && <span className="ml-2 font-semibold text-coral-700">Google draft: please check</span>}
            {state === "human" && <span className="ml-2 font-semibold text-green-800">Checked</span>}
            {state === "keep" && <span className="ml-2 font-semibold text-muted">Stays in English</span>}
          </p>
        </div>
        <div>
          <textarea value={value} onChange={(e) => setValue(e.target.value)} rows={Math.min(6, Math.max(1, Math.ceil(en.length / 60)))} lang="ne" className="field text-[15px]" placeholder="नेपाली अनुवाद" />
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <button type="button" disabled={busy} onClick={() => run("save")} className="inline-flex items-center gap-1 rounded-full bg-teal px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
              <Check className="h-3.5 w-3.5" aria-hidden /> Save as checked
            </button>
            {state !== "keep" && (
              <button type="button" disabled={busy} onClick={() => run("keep")} className="text-xs font-semibold text-muted hover:underline">
                Keep in English
              </button>
            )}
            {msg && <span className="text-xs text-muted">{msg}</span>}
          </div>
        </div>
      </div>
    </li>
  );
}
