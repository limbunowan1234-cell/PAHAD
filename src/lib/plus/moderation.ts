import "server-only";
import { after } from "next/server";
import { db } from "../db";
import { log, now } from "../admin-helpers";
import type { PublicUser } from "../types";
import { canGrantFlagProof, canModeratePlus, canVerifyPlusPost } from "./access";
import type { PlusStatus } from "./config";
import { notifyPlus } from "./notify";
import { pushToRegion } from "./push";

async function loadForModeration(user: PublicUser, id: string) {
  if (!canModeratePlus(user)) throw new Error("Only the President or members he assigned as PAHAD+ verifiers can do this.");
  const p = await db.get("plus_posts", id);
  if (!p) throw new Error("This post no longer exists.");
  if (p.status === "removed") throw new Error("The poster removed this post.");
  if (!canVerifyPlusPost(user, p)) {
    throw new Error(p.hub === "roam" ? "Places (Roam) are verified by members above the General Assembly, or by the local verifier for that region." : "This post is outside the region you verify.");
  }
  return p;
}

export const LABEL: Record<PlusStatus, string> = {
  unverified: "unverified", verified: "verified", flag_proof: "Flag-Proof", hold: "on hold", rejected: "rejected", removed: "removed",
};

/** One moderation decision (shared by the single form and the bulk bar). Throws a friendly Error when not allowed. */
export async function moderateOne(user: PublicUser, id: string, to: PlusStatus, reason: string) {
  if (!["verified", "flag_proof", "hold", "rejected", "unverified"].includes(to)) throw new Error("Choose an action.");
  const p = await loadForModeration(user, id);
  if (to === "flag_proof" && !canGrantFlagProof(user)) throw new Error("Only the President can make a post Flag-Proof.");
  if (p.status === "flag_proof" && to !== "flag_proof" && !canGrantFlagProof(user)) throw new Error("Only the President can change a Flag-Proof post.");
  if (to === "rejected" && reason.length < 3) throw new Error("Please give the poster a reason.");

  const verifying = to === "verified" || to === "flag_proof";
  await db.update("plus_posts", id, {
    status: to,
    reject_reason: to === "rejected" || to === "hold" ? reason : "",
    ...(verifying ? { verified_by_name: user.name, verified_at: p.verified_at || now() } : {}),
    // Restoring after reports starts the count again.
    ...(to !== "hold" && p.status === "hold" ? { flags: 0 } : {}),
    updated_at: now(),
  });
  if (to !== "hold" && p.status === "hold") for (const f of await db.findBy("plus_flags", "post_id", id)) await db.remove("plus_flags", f.id);
  await log(user, to === "rejected" ? "rejected" : verifying ? "verified" : "moderated", "plus post", id, `${p.title}: ${LABEL[to]}${reason ? ` (${reason})` : ""}`, {
    before: { status: p.status }, after: { status: to },
  });
  // Phone notifications (when switched on): tell the poster, and for a newly verified alert, everyone following that region.
  const wasVerified = p.status === "verified" || p.status === "flag_proof";
  if ((verifying && !wasVerified) || to === "rejected") {
    after(() => notifyPlus(p.author_id, verifying
      ? { kind: "verify", title: "Your post is verified ✅", body: `“${p.title}” is now marked Verified on PAHAD+.`, url: `/plus/${p.id}` }
      : { kind: "verify", title: "Your post wasn't approved", body: reason ? `“${p.title}”: ${reason}` : `“${p.title}”`, url: "/plus/me" }));
  }
  const liveAlert = p.hub === "briefs" && p.brief_type === "alert" && (!p.valid_until || Date.parse(p.valid_until) > Date.now());
  if (verifying && !wasVerified && liveAlert) {
    after(() => pushToRegion(p.region, { title: `⚠️ ${p.region}: ${p.title}`, body: p.summary, url: `/plus/${p.id}`, tag: `alert-${p.id}` }, p.author_id).then(() => undefined));
  }
  return p.title;
}

