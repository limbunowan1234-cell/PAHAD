"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import { Loader2 } from "lucide-react";
import { savePost, type ActionState } from "@/app/admin/actions";
import { keepValuesOnSubmit } from "@/lib/use-form-submit";
import type { Post, PostType } from "@/lib/types";
import type { Unit } from "@/lib/types";
import { ScopePicker } from "./ScopePicker";
import { POST_TYPE_LABEL } from "@/lib/utils";
import { TRAINING_AUDIENCE, trainingAudience, type TrainingAudience } from "@/lib/training";

const CATEGORY_HINT: Record<PostType, string> = {
  news: "e.g. Announcement, Community story, Press",
  event: "e.g. Workshop, Meeting, Community conversation",
  programme: "e.g. Community learning, Youth, Livelihood",
  resource: "e.g. Report, Publication, Learning material",
  document: "e.g. Constitution v1.0, Policy, Annual report",
  training: "e.g. Orientation, Field guide, Facilitator notes",
};

export function PostEditor({ post, canPublish, units }: { post?: Post; canPublish: boolean; units: Unit[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(savePost, null);
  const [type, setType] = useState<PostType>(post?.type ?? "news");
  const [cover, setCover] = useState(post?.cover ?? "");

  return (
    <form method="post" onSubmit={keepValuesOnSubmit(action)} className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <input type="hidden" name="id" value={post?.id ?? ""} />
      <div className="space-y-5 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <label className="block">
          <span className="label">Title *</span>
          <input name="title" required defaultValue={post?.title} className="field text-lg" />
        </label>
        <label className="block">
          <span className="label">Short summary</span>
          <textarea name="excerpt" rows={2} maxLength={400} defaultValue={post?.excerpt} className="field" placeholder="One or two sentences shown on cards and in search results." />
        </label>
        <label className="block">
          <span className="label">{type === "document" ? "Description (optional)" : "Main text"}</span>
          <textarea name="body" rows={16} defaultValue={post?.body} className="field font-[450] leading-relaxed" />
          <span className="mt-1 block text-xs text-muted">Leave a blank line between paragraphs. Start a line with “## ” for a heading or “- ” for a bullet point.</span>
        </label>
      </div>

      <aside className="space-y-5">
        <div className="space-y-4 rounded-2xl border border-line bg-white p-5">
          <label className="block">
            <span className="label">Type</span>
            <select name="type" value={type} onChange={(e) => setType(e.target.value as PostType)} className="field">
              {(Object.keys(POST_TYPE_LABEL) as PostType[]).map((t) => (
                <option key={t} value={t}>{POST_TYPE_LABEL[t]}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">Status</span>
            <select name="status" defaultValue={post?.status === "published" && !canPublish ? "pending" : (post?.status ?? (canPublish ? "published" : "pending"))} className="field">
              <option value="draft">Draft (not visible)</option>
              <option value="pending">{canPublish ? "Awaiting review" : "Send for review"}</option>
              {canPublish && <option value="published">Published</option>}
            </select>
          </label>
          {type === "training" && (
            <label className="block">
              <span className="label">Who can see it</span>
              <select name="audience" defaultValue={trainingAudience(post?.audience ?? "")} className="field">
                {(Object.keys(TRAINING_AUDIENCE) as TrainingAudience[]).map((a) => (
                  <option key={a} value={a}>{TRAINING_AUDIENCE[a]}</option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-muted">Training material is always members only. It appears on the Training page for the levels chosen here.</span>
            </label>
          )}
          {type !== "document" && type !== "training" && (
            <label className="block">
              <span className="label">Privacy</span>
              <select name="visibility" defaultValue={post?.visibility === "members" ? "members" : "public"} className="field">
                <option value="public">Public: anyone can read it</option>
                <option value="members">Members only: signed-in members</option>
              </select>
              <span className="mt-1 block text-xs text-muted">Members-only posts are hidden from search engines, search results and public lists.</span>
            </label>
          )}
          <div className="[&>div]:!grid-cols-1">
            <ScopePicker units={units} mode="record" showGeo={false} value={post} />
          </div>
          <label className="block">
            <span className="label">Category / label</span>
            <input name="category" defaultValue={post?.category} className="field" placeholder={CATEGORY_HINT[type]} />
          </label>
          {(type === "event" || type === "document") && (
            <label className="block">
              <span className="label">{type === "event" ? "Event date" : "Approval date"}</span>
              <input type="date" name="event_date" defaultValue={post?.event_date} className="field" />
            </label>
          )}
          {(type === "event" || type === "programme") && (
            <label className="block">
              <span className="label">{type === "event" ? "Venue" : "Location"}</span>
              <input name="location" defaultValue={post?.location} className="field" placeholder="e.g. Chowrasta, Darjeeling" />
            </label>
          )}
          <label className="block">
            <span className="label">Web address (slug)</span>
            <input name="slug" defaultValue={post?.slug} className="field" placeholder="Created from the title" />
          </label>
        </div>

        <div className="space-y-3 rounded-2xl border border-line bg-white p-5">
          <span className="label">Cover image</span>
          {cover && (
            <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-sand">
              <Image src={cover} alt="" fill sizes="320px" className="object-cover" />
            </div>
          )}
          <input type="hidden" name="cover" value={cover} />
          <input type="file" name="cover_file" accept="image/jpeg,image/png,image/webp" className="block w-full text-sm" />
          <input name="cover_link" type="url" placeholder="…or paste a Google Drive photo link" className="field text-sm" />
          {cover && <button type="button" onClick={() => setCover("")} className="text-xs font-semibold text-red-700">Remove cover</button>}
          <p className="text-xs text-muted">Upload a JPG, PNG or WebP up to 4 MB, or paste a Drive link shared as “Anyone with the link”. Wide (16:9) photos look best.</p>
        </div>

        <div className="space-y-3 rounded-2xl border border-line bg-white p-5">
          <span className="label">{type === "event" ? "Event poster or details (PDF, optional)" : "Attachment (PDF, optional)"}</span>
          {post?.file_url && <a href={post.file_url} target="_blank" className="block truncate text-sm text-teal underline">Current file</a>}
          <input type="hidden" name="file_url" value={post?.file_url ?? ""} />
          <input type="file" name="attachment" accept="application/pdf" className="block w-full text-sm" />
          <input name="file_link" type="url" placeholder="…or paste a Google Drive file link" className="field text-sm" />
          <p className="text-xs text-muted">PDF up to 4 MB, or a Drive link shared as “Anyone with the link”.{type === "document" && " Publish only approved, authorised versions."}</p>
        </div>

        <div className="space-y-3 rounded-2xl border border-line bg-white p-5">
          <span className="label">{type === "event" ? "Registration form link (optional)" : "Form link (optional)"}</span>
          <input name="form_url" type="url" defaultValue={post?.form_url} placeholder="https://forms.gle/… or docs.google.com/forms/…" className="field text-sm" />
          <p className="text-xs text-muted">A Google Form link. Full docs.google.com/forms links are shown inside the page; short forms.gle links open in a new tab.</p>
        </div>

        {state && !state.ok && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{state.message}</p>}
        <button disabled={pending} className="btn btn-primary w-full disabled:opacity-60">
          {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {post ? "Save changes" : canPublish ? "Save" : "Submit for review"}
        </button>
      </aside>
    </form>
  );
}
