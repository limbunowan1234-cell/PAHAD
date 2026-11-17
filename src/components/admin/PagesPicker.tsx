import { PLACEMENT_PAGES, pageList } from "@/lib/placements";

/** Checkboxes named "pages" for choosing where a video or featured item appears. */
export function PagesPicker({ value = "", legend = "Show on these pages" }: { value?: string; legend?: string }) {
  const chosen = new Set(pageList(value));
  return (
    <fieldset className="sm:col-span-2">
      <legend className="label">{legend}</legend>
      <div className="mt-1 flex flex-wrap gap-2">
        {PLACEMENT_PAGES.map((p) => (
          <label key={p.key} className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-line px-3 py-1.5 text-sm has-[:checked]:border-teal has-[:checked]:bg-sage-100">
            <input type="checkbox" name="pages" value={p.key} defaultChecked={chosen.has(p.key)} className="h-4 w-4 accent-teal" />
            {p.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
