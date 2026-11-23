"use client";

import Image from "next/image";
import { useState } from "react";
import { Field } from "@/components/admin/ui";
import { customPagePath } from "@/lib/menu";
import type { CustomPage, CustomPageFormat } from "@/lib/types";

export function CustomPageFields({ p, sections }: { p?: CustomPage; sections: string[] }) {
  const [format, setFormat] = useState<CustomPageFormat>(p?.format === "html" ? "html" : "standard");
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {p && <input type="hidden" name="id" value={p.id} />}
      <input type="hidden" name="cover" value={p?.cover ?? ""} />
      <Field label="Page title *"><input name="title" required defaultValue={p?.title} className="field" placeholder="e.g. Features" /></Field>
      <Field label="Page format">
        <select name="format" value={format} onChange={(event) => setFormat(event.target.value as CustomPageFormat)} className="field">
          <option value="standard">Standard page at /page-name</option>
          <option value="html">Custom HTML at /pages/page-name</option>
        </select>
      </Field>
      <Field label="Web address" hint={`The page opens at ${customPagePath("page-name", format)}. Leave blank to use the title.`}>
        <input name="slug" defaultValue={p?.slug} className="field font-mono text-sm" placeholder="features" />
      </Field>
      <Field label="Status">
        <select name="status" defaultValue={p?.status ?? "published"} className="field">
          <option value="published">Published: visible on the website</option>
          <option value="draft">Draft: hidden</option>
        </select>
      </Field>
      <div className={format === "html" ? "hidden" : "contents"}>
        <Field label="Small label above the title"><input name="eyebrow" defaultValue={p?.eyebrow} className="field" placeholder="e.g. Media" /></Field>
        <Field label="Introduction" className="sm:col-span-2"><textarea name="intro" rows={2} maxLength={400} defaultValue={p?.intro} className="field" placeholder="One or two sentences under the title." /></Field>
      </div>
      <Field
        label={format === "html" ? "Complete HTML document" : "Main text (optional)"}
        className="sm:col-span-2"
        hint={format === "html"
          ? "Paste a complete HTML document, including its own styles. It displays full-width in an isolated page without the PAHAD header or footer. Inline scripts run in a sandbox."
          : "Leave a blank line between paragraphs. Start a line with “## ” for a heading or “- ” for a bullet point."}
      >
        <textarea
          name="body"
          rows={format === "html" ? 28 : 8}
          maxLength={format === "html" ? 250_000 : undefined}
          defaultValue={p?.body}
          className={`field ${format === "html" ? "min-h-[65vh] font-mono text-sm leading-relaxed" : ""}`}
        />
      </Field>
      <div className={format === "html" ? "hidden" : "contents"}>
        <Field label="Show content labelled" hint="Lists every published post whose Category / label is exactly this, e.g. “Feature”. Leave blank for none.">
          <input name="collect" defaultValue={p?.collect} className="field" placeholder="e.g. Feature" />
        </Field>
      </div>
      {!p && (
        <Field label="Add to the menu under">
          <select name="add_to" defaultValue="" className="field">
            <option value="">Don’t add to the menu yet</option>
            {sections.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
      )}
      <div className={format === "html" ? "hidden" : "contents"}>
        <Field label="Banner photo" hint="JPG, PNG or WebP up to 4 MB. Wide photos look best.">
          <input type="file" name="cover_file" accept="image/jpeg,image/png,image/webp" className="block w-full text-sm" />
        </Field>
        <Field label="…or banner photo from Google Drive"><input name="cover_link" type="url" className="field" placeholder="https://drive.google.com/file/d/…/view" /></Field>
        {p?.cover && (
          <div className="relative aspect-[16/7] overflow-hidden rounded-xl bg-sand sm:col-span-2">
            <Image src={p.cover} alt="" fill sizes="600px" className="object-cover" />
          </div>
        )}
      </div>
    </div>
  );
}
