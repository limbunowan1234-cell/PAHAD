"use server";

import { updateTag } from "next/cache";
import { after } from "next/server";
import { db } from "@/lib/db";
import { guarded, log, notify, now, str, type ActionState } from "@/lib/admin-helpers";
import { PLUS_REGIONS, type PlusStatus } from "@/lib/plus/config";
import { canApprovePublic, canGrantFlagProof, canModeratePlus, canVerifyPlusPost } from "@/lib/plus/access";
import { pushToRegion, pushToUser } from "@/lib/plus/push";
import { openApprovalRequest } from "@/lib/plus/approvals";
import type { PublicUser } from "@/lib/types";

// ------------------------------------------------------------------ PAHAD+ queue
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

const LABEL: Record<PlusStatus, string> = {
  unverified: "unverified", verified: "verified", flag_proof: "Flag-Proof", hold: "on hold", rejected: "rejected", removed: "removed",
};

/** Verify / hold / restore / reject. Reject needs a reason, which the poster sees. */
export async function moderatePlusPost(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return guarded("dashboard.view", async (user) => {
    const id = str(fd, "id", 64);
    const to = str(fd, "status", 20) as PlusStatus;
    if (!["verified", "flag_proof", "hold", "rejected", "unverified"].includes(to)) throw new Error("Choose an action.");
    const p = await loadForModeration(user, id);
    if (to === "flag_proof" && !canGrantFlagProof(user)) throw new Error("Only the President can make a post Flag-Proof.");
    if (p.status === "flag_proof" && to !== "flag_proof" && !canGrantFlagProof(user)) throw new Error("Only the President can change a Flag-Proof post.");
    const reason = str(fd, "reason", 300);
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
    updateTag("plus");
    // Phone notifications (when switched on): tell the poster, and for a newly verified alert, everyone following that region.
    const wasVerified = p.status === "verified" || p.status === "flag_proof";
    if ((verifying && !wasVerified) || to === "rejected") {
      after(() => pushToUser(p.author_id, verifying
        ? { title: "Your post is verified ✅", body: `“${p.title}” now shows its full details on PAHAD+.`, url: `/plus/${p.id}`, tag: `post-${p.id}` }
        : { title: "Your post wasn't approved", body: reason ? `“${p.title}”: ${reason}` : `“${p.title}”`, url: "/plus/me", tag: `post-${p.id}` }).then(() => undefined));
    }
    const liveAlert = p.hub === "briefs" && p.brief_type === "alert" && (!p.valid_until || Date.parse(p.valid_until) > Date.now());
    if (verifying && !wasVerified && liveAlert) {
      after(() => pushToRegion(p.region, { title: `⚠️ ${p.region}: ${p.title}`, body: p.summary, url: `/plus/${p.id}`, tag: `alert-${p.id}` }, p.author_id).then(() => undefined));
    }
    return `“${p.title}” is now ${LABEL[to]}.`;
  });
}

// ------------------------------------------------------------------ Admin Team switches (President)
export async function setPlusVerifier(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return guarded("plus.permission", async (user) => {
    const target = await db.get("users", str(fd, "user_id", 64));
    if (!target) throw new Error("Account not found.");
    if (target.role === "sysadmin") throw new Error("The Website Administrator account is view-only.");
    const on = fd.get("on") === "on";
    const region = str(fd, "region", 40);
    if (region && !(PLUS_REGIONS as readonly string[]).includes(region)) throw new Error("Choose a region.");
    await db.update("users", target.id, { can_verify_plus: on, plus_region: on ? region : "" });
    await log(user, on ? "granted" : "revoked", "plus permission", target.id, `PAHAD+ verifier ${on ? `ON${region ? ` (${region})` : ""}` : "OFF"} for ${target.name}`, {
      before: { can_verify_plus: target.can_verify_plus, plus_region: target.plus_region }, after: { can_verify_plus: on, plus_region: on ? region : "" },
    });
    if (target.id !== user.id) await notify(target.id, on ? `You are now a PAHAD+ verifier${region ? ` for ${region}` : ""}. Open PAHAD+ in your dashboard.` : "Your PAHAD+ verifier role was switched off.", on ? "/admin/plus" : "");
    return on ? `${target.name} is a PAHAD+ verifier${region ? ` for ${region}` : ""}.` : `${target.name} is no longer a PAHAD+ verifier.`;
  });
}

export async function setPublicApprover(userId: string, on: boolean): Promise<ActionState> {
  return guarded("plus.permission", async (user) => {
    const target = await db.get("users", userId);
    if (!target) throw new Error("Account not found.");
    if (target.role === "sysadmin") throw new Error("The Website Administrator account is view-only.");
    await db.update("users", userId, { can_approve_public: on });
    await log(user, on ? "granted" : "revoked", "plus permission", userId, `Approve for public / PAHAD+ ${on ? "ON" : "OFF"} for ${target.name}`, {
      before: { can_approve_public: target.can_approve_public }, after: { can_approve_public: on },
    });
    if (target.id !== user.id) await notify(target.id, on ? "You can now approve content for the public website and PAHAD+. Open Approvals in your dashboard." : "Your permission to approve public / PAHAD+ content was switched off.", on ? "/admin/approvals" : "");
    return on ? `${target.name} can approve public / PAHAD+ content.` : `${target.name} can no longer approve public / PAHAD+ content.`;
  });
}

// ------------------------------------------------------------------ approvals: internal → public, PAHAD posts → PAHAD+
/** "Request for PAHAD+" on a published public post. Approvers switch it on directly. */
export async function requestPlusFeature(postId: string): Promise<ActionState> {
  return guarded("content.create", async (user) => {
    const p = await db.get("posts", postId);
    if (!p) throw new Error("Not found.");
    if (p.visibility === "internal" || p.visibility === "members") throw new Error("Only public content can be shown in PAHAD+.");
    if (canApprovePublic(user)) {
      await db.update("posts", postId, { plus_approved: true });
      await log(user, "approved", "plus feature", postId, `${p.title}: shown in PAHAD+`);
      updateTag("posts");
      updateTag("plus");
      return p.status === "published" ? "Now showing in PAHAD+." : "Approved for PAHAD+. It shows there once it is published.";
    }
    const opened = await openApprovalRequest(user, { kind: "plus_feature", entity: "post", entity_id: postId, title: p.title, target: "plus" });
    if (opened) await log(user, "requested", "plus feature", postId, `${p.title}: asked to show in PAHAD+`);
    return "Sent to the President for approval.";
  });
}

export async function removePlusFeature(postId: string): Promise<ActionState> {
  return guarded("content.create", async (user) => {
    if (!canApprovePublic(user)) throw new Error("Only the President or an assigned approver can do this.");
    const p = await db.get("posts", postId);
    if (!p) throw new Error("Not found.");
    await db.update("posts", postId, { plus_approved: false });
    await log(user, "removed", "plus feature", postId, `${p.title}: no longer in PAHAD+`);
    updateTag("posts");
    updateTag("plus");
    return "Removed from PAHAD+.";
  });
}

/** Circulars are internal. Making one public (it then shows in PAHAD+ as a Policy & Assembly Summary) needs approval. */
export async function requestCircularPublic(circularId: string): Promise<ActionState> {
  return guarded("circulars.issue", async (user) => {
    const c = await db.get("circulars", circularId);
    if (!c) throw new Error("Not found.");
    if (c.visibility === "public") return "This circular is already public.";
    if (canApprovePublic(user)) {
      await db.update("circulars", c.id, { visibility: "public" });
      await log(user, "approved", "make public", c.id, `Circular ${c.number}: public`, { before: { visibility: "internal" }, after: { visibility: "public" } });
      updateTag("plus");
      return "Public now: it shows in PAHAD+ under Policy & Assembly Summaries.";
    }
    const opened = await openApprovalRequest(user, { kind: "make_public", entity: "circular", entity_id: c.id, title: `Circular ${c.number}: ${c.title}`, target: "public" });
    if (opened) await log(user, "requested", "make public", c.id, `Circular ${c.number}: asked to make public`);
    return "Sent to the President for approval.";
  });
}

export async function makeCircularInternal(circularId: string): Promise<ActionState> {
  return guarded("circulars.issue", async (user) => {
    const c = await db.get("circulars", circularId);
    if (!c) throw new Error("Not found.");
    await db.update("circulars", c.id, { visibility: "" });
    await log(user, "updated", "circular", c.id, `Circular ${c.number}: internal`, { before: { visibility: c.visibility }, after: { visibility: "" } });
    updateTag("plus");
    return "Internal again: removed from PAHAD+.";
  });
}

export async function decideApproval(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return guarded("dashboard.view", async (user) => {
    if (!canApprovePublic(user)) throw new Error("Only the President or an assigned approver can decide this.");
    const a = await db.get("approvals", str(fd, "id", 64));
    if (!a) throw new Error("Not found.");
    if (a.status !== "pending") throw new Error("This request was already decided.");
    const approve = str(fd, "decision", 10) === "approve";
    const note = str(fd, "note", 300);

    if (approve) {
      if (a.entity === "circular") {
        const c = await db.get("circulars", a.entity_id);
        if (!c) throw new Error("The circular no longer exists.");
        await db.update("circulars", c.id, { visibility: "public" });
      } else {
        const p = await db.get("posts", a.entity_id);
        if (!p) throw new Error("The post no longer exists.");
        if (a.kind === "make_public") {
          await db.update("posts", p.id, { visibility: a.target === "members" ? "members" : "public", updated_at: now() });
        } else {
          if (p.visibility === "internal" || p.visibility === "members") throw new Error("This post is not public, so it can't show in PAHAD+.");
          await db.update("posts", p.id, { plus_approved: true });
        }
      }
    }
    await db.update("approvals", a.id, { status: approve ? "approved" : "rejected", decided_by_name: user.name, note, decided_at: now() });
    await log(user, approve ? "approved" : "rejected", a.kind === "make_public" ? "make public" : "plus feature", a.entity_id, `${a.title}${note ? ` (${note})` : ""}`);
    await notify(a.requested_by, `${approve ? "Approved" : "Not approved"}: “${a.title}”${note ? `. ${note}` : ""}`, a.entity === "circular" ? "/admin/circulars" : "/admin/content");
    updateTag("posts");
    updateTag("plus");
    return approve ? "Approved." : "Rejected.";
  });
}
