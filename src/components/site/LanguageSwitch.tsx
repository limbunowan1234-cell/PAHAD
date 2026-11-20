"use client";

import { useEffect, useState } from "react";
import { Languages } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * EN / नेपाली switch. In Nepali mode every English phrase on the page that has a Nepali version
 * (Admin → Nepali translation) is swapped in the browser, including text that appears later
 * (menus, new pages). Phrases without a translation stay in English. The choice is remembered.
 */
const KEY = "pahad-lang";
const ATTRS = ["placeholder", "aria-label", "title"] as const;
const SKIP = "script,style,noscript,textarea,code,pre,svg,[data-no-translate],[translate=no]";

let dictPromise: Promise<Record<string, string>> | null = null;
const loadDict = () => (dictPromise ??= fetch("/api/i18n/ne").then((r) => (r.ok ? r.json() : {})).catch(() => ({})));

function readLang(): "en" | "ne" {
  try {
    return localStorage.getItem(KEY) === "ne" ? "ne" : "en";
  } catch {
    return "en";
  }
}

let observer: MutationObserver | null = null;

function startNepali(dict: Record<string, string>) {
  const norm = (s: string) => s.replace(/\s+/g, " ").trim();
  const translated = new WeakSet<Node>();

  const doText = (node: Text) => {
    const raw = node.nodeValue ?? "";
    const key = norm(raw);
    if (!key || translated.has(node) && !dict[key]) return;
    const ne = dict[key];
    if (!ne || node.parentElement?.closest(SKIP)) return;
    const lead = raw.match(/^\s*/)?.[0] ?? "";
    const trail = raw.match(/\s*$/)?.[0] ?? "";
    node.nodeValue = lead + ne + trail;
    translated.add(node);
  };
  const doEl = (el: Element) => {
    if (el.closest(SKIP)) return;
    for (const a of ATTRS) {
      const v = el.getAttribute(a);
      const ne = v ? dict[norm(v)] : undefined;
      if (ne) el.setAttribute(a, ne);
    }
  };
  const walk = (root: Node) => {
    if (root.nodeType === Node.TEXT_NODE) return doText(root as Text);
    if (root.nodeType !== Node.ELEMENT_NODE) return;
    doEl(root as Element);
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    let n: Node | null;
    while ((n = w.nextNode())) {
      if (n.nodeType === Node.TEXT_NODE) doText(n as Text);
      else doEl(n as Element);
    }
  };

  document.documentElement.lang = "ne";
  walk(document.body);
  observer?.disconnect();
  observer = new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === "characterData") doText(r.target as Text);
      else if (r.type === "attributes") doEl(r.target as Element);
      else r.addedNodes.forEach(walk);
    }
  });
  observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: [...ATTRS] });
}

export function LanguageSwitch({ className }: { className?: string }) {
  const [lang, setLang] = useState<"en" | "ne">("en");

  useEffect(() => {
    const saved = readLang();
    if (saved !== "ne") return;
    // Let the page finish hydrating first, so React's own text is in place.
    const t = setTimeout(() => {
      setLang("ne");
      loadDict().then(startNepali);
    }, 400);
    return () => clearTimeout(t);
  }, []);

  function choose(next: "en" | "ne") {
    try {
      localStorage.setItem(KEY, next);
    } catch {}
    if (next === "en") {
      window.location.reload(); // simplest way to bring every English phrase back
      return;
    }
    setLang("ne");
    loadDict().then(startNepali);
  }

  return (
    <button
      type="button"
      data-no-translate
      onClick={() => choose(lang === "ne" ? "en" : "ne")}
      className={cn("inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm font-semibold text-teal hover:bg-sand", className)}
      aria-label={lang === "ne" ? "Switch to English" : "नेपालीमा हेर्नुहोस् (View in Nepali)"}
      lang={lang === "ne" ? "en" : "ne"}
    >
      <Languages className="h-4 w-4" aria-hidden />
      {lang === "ne" ? "English" : "नेपाली"}
    </button>
  );
}
