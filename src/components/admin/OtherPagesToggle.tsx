"use client";

import { useState } from "react";
import { PagesPicker } from "./PagesPicker";
import type { CustomPage } from "@/lib/types";

/**
 * Every approved video that is switched ON appears on the films page. This optional
 * checkbox also places it on other pages; unticked, no other pages are sent (pages = "").
 */
export function OtherPagesToggle({ value = "", filmsTitle, customPages }: { value?: string; filmsTitle: string; customPages: CustomPage[] }) {
  const [on, setOn] = useState(Boolean(value));
  return (
    <div className="space-y-3 sm:col-span-2">
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="also_other" checked={on} onChange={(e) => setOn(e.target.checked)} className="h-4 w-4 accent-teal" />
        Also show on other pages
        <span className="text-muted">(it always shows on {filmsTitle})</span>
      </label>
      {on && <PagesPicker value={value} legend="Also show on these pages" customPages={customPages} />}
    </div>
  );
}
