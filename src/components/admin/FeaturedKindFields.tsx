"use client";

import { useState } from "react";
import type { FeaturedKind } from "@/lib/types";

type Option = { id: string; label: string };

/** Pick what to feature: only the matching list is shown. Announcements are written here directly. */
export function FeaturedKindFields({ posts, videos, people }: { posts: Option[]; videos: Option[]; people: Option[] }) {
  const [kind, setKind] = useState<FeaturedKind>("post");
  const select = (name: string, options: Option[], empty: string) =>
    options.length ? (
      <select name={name} required className="field">
        {options.map((o) => (
          <option key={o.id} value={o.id}>{o.label}</option>
        ))}
      </select>
    ) : (
      <p className="rounded-xl bg-sand p-3 text-sm text-muted">{empty}</p>
    );
  return (
    <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
      <label className="block">
        <span className="label">Feature a…</span>
        <select name="kind" value={kind} onChange={(e) => setKind(e.target.value as FeaturedKind)} className="field">
          <option value="post">Post (news, event, programme, knowledge)</option>
          <option value="video">YouTube video</option>
          <option value="announcement">Announcement</option>
          <option value="person">Member of Our Team</option>
        </select>
      </label>
      <label className="block">
        <span className="label">{kind === "announcement" ? "Announcement" : "Which one"}</span>
        {kind === "post" && select("ref_post", posts, "No published posts yet. Only published posts can be featured.")}
        {kind === "video" && select("ref_video", videos, "No approved videos yet. Only approved videos can be featured.")}
        {kind === "person" && select("ref_person", people, "Add people on the Our Team page first.")}
        {kind === "announcement" && <span className="block rounded-xl bg-sand p-3 text-sm text-muted">Write the title, text and link below.</span>}
      </label>
    </div>
  );
}
