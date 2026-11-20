import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { bulkModeratePlus, moderatePlusPost } from "../../plus-actions";
import { PlusTabs } from "@/components/admin/PlusTabs";
import { AdminForm, Disclosure } from "@/components/admin/client";
import { Badge, Empty, Field, Notice, PageHeader } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { canGrantFlagProof, canModeratePlus, canVerifyPlusPost } from "@/lib/plus/access";
import { BRIEF_TYPES, PLUS_HUBS, PLUS_RULES, ROAM_STAGES, type BriefType, type PlusHub, type PlusStatus } from "@/lib/plus/config";
import type { PlusPost } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

export const metadata = { title: "PAHAD+" };

const TABS: { key: string; label: string; statuses: PlusStatus[] }[] = [
  { key: "queue", label: "Waiting for verification", statuses: ["unverified"] },
  { key: "hold", label: "On hold / reported", statuses: ["hold"] },
  { key: "verified", label: "Verified", statuses: ["verified", "flag_proof"] },
  { key: "rejected", label: "Rejected", statuses: ["rejected"] },
];
const TONE: Record<string, "amber" | "green" | "red" | "teal" | "grey"> = {
  unverified: "amber", verified: "green", flag_proof: "teal", hold: "red", rejected: "red", removed: "grey",
};
const LABEL: Record<string, string> = {
  unverified: "Unverified", verified: "Verified", flag_proof: "President Flag-Proof", hold: "On hold", rejected: "Rejected", removed: "Removed",
};

function Row({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 text-sm">
      <dt className="w-32 shrink-0 text-muted">{label}</dt>
      <dd className="min-w-0 break-words text-ink">{value}</dd>
    </div>
  );
}

function Details({ p }: { p: PlusPost }) {
  return (
    <dl className="space-y-1">
      <Row label="Starts" value={p.starts_at.replace("T", " ")} />
      <Row label="Ends" value={p.ends_at.replace("T", " ")} />
      <Row label="Kind" value={p.kind} />
      <Row label="Stage" value={p.stage ? ROAM_STAGES[p.stage as keyof typeof ROAM_STAGES] : ""} />
      <Row label="Venue" value={p.venue} />
      <Row label="Organiser" value={p.organiser} />
      <Row label="Phone" value={p.contact_phone} />
      <Row label="WhatsApp" value={p.contact_whatsapp} />
      <Row label="Email" value={p.contact_email} />
      <Row label="Address" value={p.address} />
      <Row label="Website" value={p.website} />
      <Row label="Link" value={p.link} />
      <Row label="Map" value={p.map_link} />
      <Row label="Best season" value={p.best_season} />
      <Row label="Hours" value={p.hours} />
      <Row label="Valid until" value={p.valid_until ? formatDate(p.valid_until, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""} />
      <Row label="Last date" value={p.deadline} />
      <Row label="E-Passes" value={p.hub === "events" && p.pass_enabled ? `Free E-Passes${p.pass_capacity ? `, limit ${p.pass_capacity}` : ", no limit"}` : ""} />
      <Row label="Likes" value={p.likes ? String(p.likes) : ""} />
      {p.body && <p className="whitespace-pre-line pt-2 text-sm text-ink">{p.body}</p>}
    </dl>
  );
}

export default async function PlusQueuePage({ searchParams }: PageProps<"/admin/plus">) {
  const user = await requireUser();
  const viewOnly = user.role === "sysadmin" && !canModeratePlus(user);
  if (!canModeratePlus(user) && !viewOnly) redirect("/admin");
  const flagProof = canGrantFlagProof(user);
  const sp = await searchParams;
  const tab = TABS.find((t) => t.key === sp.tab) ?? TABS[0];

  const [all, flags] = await Promise.all([db.all("plus_posts"), db.all("plus_flags")]);
  // Verifiers see the posts they may act on (their region; Roam only above the General Assembly or locally).
  const mine = viewOnly ? all : all.filter((p) => canVerifyPlusPost(user, p));
  const counts = Object.fromEntries(TABS.map((t) => [t.key, mine.filter((p) => t.statuses.includes(p.status as PlusStatus)).length]));
  const rows = mine.filter((p) => tab.statuses.includes(p.status as PlusStatus)).sort((a, b) => b.flags - a.flags || a.created_at.localeCompare(b.created_at));
  const reasons = new Map<string, string[]>();
  for (const f of flags) reasons.set(f.post_id, [...(reasons.get(f.post_id) ?? []), f.reason]);

  return (
    <>
      <PageHeader
        title="PAHAD+"
        description={`Posts from the PAHAD+ app. They go live straight away as Unverified, with contact, booking and registration details hidden until a verifier checks them. Unverified posts drop out after ${PLUS_RULES.unverifiedDays} days; ${PLUS_RULES.flagsToHold} community reports put a post on hold unless the President made it Flag-Proof.`}
      />
      <PlusTabs user={user} active="queue" />
      {viewOnly && <Notice>View only. PAHAD+ posts are verified by the President and the verifiers he assigns.</Notice>}
      {!viewOnly && user.role !== "super_admin" && (
        <Notice>
          You verify {user.plus_region ? `posts in ${user.plus_region}` : "posts in every region"}.{" "}
          {PLUS_HUBS.roam.label} places are verified by members above the General Assembly or by a local verifier for the region.
        </Notice>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link key={t.key} href={{ pathname: "/admin/plus", query: t.key === "queue" ? {} : { tab: t.key } }}
            className={cn("rounded-full px-3 py-1.5 text-sm font-medium", t.key === tab.key ? "bg-teal text-white" : "bg-white text-teal ring-1 ring-line hover:bg-cream")}>
            {t.label} ({counts[t.key]})
          </Link>
        ))}
      </div>

      {!viewOnly && rows.length > 1 && tab.key !== "verified" && (
        <div className="mb-4 rounded-2xl border border-line bg-sand/60 p-4">
          <AdminForm id="plus-bulk" action={bulkModeratePlus} submitLabel="Apply to ticked posts">
            <div className="grid gap-3 sm:grid-cols-[200px_1fr]">
              <Field label="For every ticked post">
                <select name="status" defaultValue="verified" className="field">
                  <option value="verified">Verify</option>
                  <option value="hold">Put on hold</option>
                  <option value="rejected">Reject (needs a reason)</option>
                </select>
              </Field>
              <Field label="Reason for the posters" hint="Needed when rejecting."><input name="reason" maxLength={300} className="field" /></Field>
            </div>
          </AdminForm>
        </div>
      )}

      {rows.length === 0 ? (
        <Empty>Nothing here.</Empty>
      ) : (
        <ul className="space-y-4">
          {rows.map((p) => {
            const hub = PLUS_HUBS[p.hub as PlusHub];
            return (
              <li key={p.id} className={cn("rounded-2xl border bg-white p-4 sm:p-5", p.status === "hold" ? "border-red-200" : "border-line")}>
                <div className="flex flex-col gap-4 sm:flex-row">
                  {p.image && (
                    <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-xl bg-sand sm:w-48">
                      <Image src={p.image} alt="" fill sizes="192px" className="object-cover" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {!viewOnly && rows.length > 1 && tab.key !== "verified" && (
                        <input type="checkbox" name="ids" value={p.id} form="plus-bulk" aria-label={`Tick “${p.title}”`} className="h-4 w-4 accent-teal" />
                      )}
                      <Badge tone={TONE[p.status]}>{LABEL[p.status]}</Badge>
                      <Badge>{hub?.emoji} {hub?.label}{p.brief_type ? `: ${BRIEF_TYPES[p.brief_type as BriefType]?.label}` : ""}</Badge>
                      <span className="text-xs text-muted">{p.region}{p.locality ? ` · ${p.locality}` : ""}</span>
                      {p.flags > 0 && <Badge tone="red">{p.flags} report{p.flags === 1 ? "" : "s"}</Badge>}
                    </div>
                    <p className="mt-2 font-semibold text-ink">{p.title}</p>
                    <p className="text-sm text-muted">{p.summary}</p>
                    <p className="mt-1 text-xs text-muted">
                      By {p.author_name} ({p.author_type}) · {formatDate(p.created_at, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      {p.verified_by_name && ` · verified by ${p.verified_by_name}`}
                      {" · "}<a href={`/plus/${p.id}`} target="_blank" className="text-teal underline">Open in PAHAD+</a>
                      {p.hub === "events" && p.pass_enabled && (p.status === "verified" || p.status === "flag_proof") && (
                        <>{" · "}<a href={`/plus/checkin/${p.id}`} target="_blank" className="font-semibold text-teal underline">E-Pass check-in</a></>
                      )}
                    </p>
                    {p.reject_reason && <p className="mt-1 text-sm text-red-800">Reason: {p.reject_reason}</p>}
                    {reasons.get(p.id) && <p className="mt-1 text-sm text-red-800">Reports: {reasons.get(p.id)!.join(" · ")}</p>}
                  </div>
                </div>
                <div className="mt-3">
                  <Disclosure summary="Full details (hidden from the public until verified)">
                    <Details p={p} />
                  </Disclosure>
                </div>
                {!viewOnly && (p.status !== "flag_proof" || flagProof) && (
                  <div className="mt-3">
                    <AdminForm action={moderatePlusPost} submitLabel="Save decision">
                      <input type="hidden" name="id" value={p.id} />
                      <div className="grid gap-3 sm:grid-cols-[220px_1fr]">
                        <Field label="Decision">
                          <select name="status" defaultValue={p.status === "unverified" || p.status === "hold" ? "verified" : p.status} className="field">
                            <option value="verified">Verify: show full details</option>
                            {flagProof && <option value="flag_proof">President Flag-Proof</option>}
                            <option value="hold">Put on hold (hide)</option>
                            <option value="rejected">Reject (hide, tell the poster why)</option>
                            {p.status !== "unverified" && <option value="unverified">Back to Unverified</option>}
                          </select>
                        </Field>
                        <Field label="Reason for the poster" hint="Needed when rejecting. Shown to the poster in their PAHAD+ account.">
                          <input name="reason" maxLength={300} defaultValue={p.reject_reason} className="field" />
                        </Field>
                      </div>
                    </AdminForm>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
