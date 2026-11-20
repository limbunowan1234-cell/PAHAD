"use server";

import { updateTag } from "next/cache";
import { after } from "next/server";
import { db, newId } from "@/lib/db";
import { guarded, log, notify, now, str, type ActionState } from "@/lib/admin-helpers";
import { PLUS_REGIONS, type PlusStatus } from "@/lib/plus/config";
import { canApprovePublic, canGrantFlagProof, canModeratePlus, canVerifyPlusPost } from "@/lib/plus/access";
import { pushToRegion, pushToUser } from "@/lib/plus/push";
import { eventMoney, FEE_SETTING } from "@/lib/plus/payments";
import { refundRazorpayPayment, rupees } from "@/lib/plus/razorpay";
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

/** One moderation decision (shared by the single form and the bulk bar). Throws a friendly Error when not allowed. */
async function moderateOne(user: PublicUser, id: string, to: PlusStatus, reason: string) {
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
    after(() => pushToUser(p.author_id, verifying
      ? { title: "Your post is verified ✅", body: `“${p.title}” now shows its full details on PAHAD+.`, url: `/plus/${p.id}`, tag: `post-${p.id}` }
      : { title: "Your post wasn't approved", body: reason ? `“${p.title}”: ${reason}` : `“${p.title}”`, url: "/plus/me", tag: `post-${p.id}` }).then(() => undefined));
  }
  const liveAlert = p.hub === "briefs" && p.brief_type === "alert" && (!p.valid_until || Date.parse(p.valid_until) > Date.now());
  if (verifying && !wasVerified && liveAlert) {
    after(() => pushToRegion(p.region, { title: `⚠️ ${p.region}: ${p.title}`, body: p.summary, url: `/plus/${p.id}`, tag: `alert-${p.id}` }, p.author_id).then(() => undefined));
  }
  return p.title;
}

/** Verify / hold / restore / reject. Reject needs a reason, which the poster sees. */
export async function moderatePlusPost(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return guarded("dashboard.view", async (user) => {
    const to = str(fd, "status", 20) as PlusStatus;
    const title = await moderateOne(user, str(fd, "id", 64), to, str(fd, "reason", 300));
    updateTag("plus");
    return `“${title}” is now ${LABEL[to]}.`;
  });
}

/** The bulk bar: the same decision for every ticked post the user may act on; the others are skipped and counted. */
export async function bulkModeratePlus(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return guarded("dashboard.view", async (user) => {
    const ids = [...new Set(fd.getAll("ids").map(String))].slice(0, 100);
    if (ids.length === 0) throw new Error("Tick at least one post.");
    const to = str(fd, "status", 20) as PlusStatus;
    if (!["verified", "hold", "rejected"].includes(to)) throw new Error("Choose Verify, Hold or Reject.");
    const reason = str(fd, "reason", 300);
    if (to === "rejected" && reason.length < 3) throw new Error("Please give the posters a reason.");
    let done = 0;
    const skipped: string[] = [];
    for (const id of ids) {
      try {
        await moderateOne(user, id, to, reason);
        done++;
      } catch (e) {
        skipped.push(e instanceof Error ? e.message : "not allowed");
      }
    }
    updateTag("plus");
    return `${done} post${done === 1 ? "" : "s"} now ${LABEL[to]}.${skipped.length ? ` ${skipped.length} skipped (${[...new Set(skipped)].join(" ")})` : ""}`;
  });
}

// ------------------------------------------------------------------ PP accounts: suspend / reinstate
const SUSPENDED = "Account suspended";

/** Verifiers and the President can suspend a PAHAD+ account: it is signed out and its live posts go on hold. */
export async function suspendPlusUser(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return guarded("dashboard.view", async (user) => {
    if (!canModeratePlus(user)) throw new Error("Only the President or PAHAD+ verifiers can suspend accounts.");
    const target = await db.get("plus_users", str(fd, "id", 64));
    if (!target) throw new Error("Account not found.");
    const reason = str(fd, "reason", 300);
    if (reason.length < 3) throw new Error("Give a reason (kept in the Activity Log).");
    if (target.status === "suspended") return `${target.name} is already suspended.`;
    await db.update("plus_users", target.id, { status: "suspended", suspend_reason: reason, suspended_by: user.name });
    let held = 0;
    for (const p of await db.findBy("plus_posts", "author_id", target.id)) {
      if (["unverified", "verified"].includes(p.status)) { await db.update("plus_posts", p.id, { status: "hold", reject_reason: SUSPENDED, updated_at: now() }); held++; }
    }
    await log(user, "suspended", "plus account", target.id, `${target.name} (${target.email}): ${reason}`, { before: { status: target.status }, after: { status: "suspended", posts_held: held } });
    updateTag("plus");
    return `${target.name} is suspended; ${held} post${held === 1 ? "" : "s"} on hold.`;
  });
}

/** President only. Posts held because of the suspension go back to Unverified (they need checking again). */
export async function reinstatePlusUser(userId: string): Promise<ActionState> {
  return guarded("plus.permission", async (user) => {
    const target = await db.get("plus_users", userId);
    if (!target) throw new Error("Account not found.");
    await db.update("plus_users", target.id, { status: "active", suspend_reason: "", suspended_by: "" });
    let back = 0;
    for (const p of await db.findBy("plus_posts", "author_id", target.id)) {
      if (p.status === "hold" && p.reject_reason === SUSPENDED) { await db.update("plus_posts", p.id, { status: "unverified", reject_reason: "", updated_at: now() }); back++; }
    }
    await log(user, "reinstated", "plus account", target.id, `${target.name} (${target.email})`, { before: { status: target.status }, after: { status: "active" } });
    updateTag("plus");
    return `${target.name} is active again; ${back} post${back === 1 ? "" : "s"} back in the queue as Unverified.`;
  });
}

// ------------------------------------------------------------------ paid events (President)
export async function setPlusFee(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return guarded("plus.payments", async (user) => {
    const n = Number(str(fd, "fee", 6));
    if (!Number.isFinite(n) || n < 0 || n > 50) throw new Error("Enter a fee between 0 and 50 percent.");
    const value = String(Math.round(n * 100) / 100);
    const old = await db.get("settings", FEE_SETTING);
    if (old) await db.update("settings", FEE_SETTING, { value, updated_by: user.name });
    else await db.insert("settings", { id: FEE_SETTING, value, updated_by: user.name, created_at: now() });
    await log(user, "updated", "plus fee", FEE_SETTING, `PAHAD+ fee: ${value}%`, { before: { fee: old?.value ?? "0" }, after: { fee: value } });
    return `PAHAD's fee on paid E-Passes is now ${value}%. It applies to new sales.`;
  });
}

export async function decideOrganiser(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return guarded("plus.payments", async (user) => {
    const o = await db.get("plus_organisers", str(fd, "id", 64));
    if (!o) throw new Error("Not found.");
    const to = str(fd, "decision", 12) as "approved" | "rejected" | "revoked";
    if (!["approved", "rejected", "revoked"].includes(to)) throw new Error("Choose a decision.");
    const note = str(fd, "note", 300);
    const pp = await db.get("plus_users", o.id);
    await db.update("plus_organisers", o.id, { status: to, note, decided_by_name: user.name, decided_at: now() });
    await log(user, to, "plus organiser", o.id, `${pp?.name ?? "PAHAD+ account"}: paid organiser ${to}${note ? ` (${note})` : ""}`, { before: { status: o.status }, after: { status: to } });
    if (pp) after(() => pushToUser(pp.id, { title: to === "approved" ? "You can sell E-Passes now" : "Paid E-Pass request", body: to === "approved" ? "Add a price when you post an event." : note || `Your request was ${to}.`, url: "/plus/me#sell" }).then(() => undefined));
    updateTag("plus");
    return `${pp?.name ?? "Organiser"}: ${to}.`;
  });
}

/** Refund one paid E-Pass through Razorpay; the pass is cancelled. */
async function refundOne(user: PublicUser, orderId: string) {
  const o = await db.get("plus_orders", orderId);
  if (!o || o.status !== "paid") throw new Error("Only paid orders can be refunded.");
  const refund = await refundRazorpayPayment(o.rzp_payment_id, o.amount);
  await db.update("plus_orders", o.id, { status: "refunded", refund_id: refund.id, refunded_at: now() });
  if (o.pass_id) await db.update("plus_passes", o.pass_id, { status: "cancelled" });
  await log(user, "refunded", "plus order", o.id, `${o.holder_name}: ${rupees(o.amount)} (${refund.id})`);
  after(() => pushToUser(o.user_id, { title: "E-Pass refunded", body: `${rupees(o.amount)} is on its way back to you.`, url: "/plus/me#passes" }).then(() => undefined));
  return o;
}

export async function refundPlusOrder(orderId: string): Promise<ActionState> {
  return guarded("plus.payments", async (user) => {
    const o = await refundOne(user, orderId);
    updateTag("plus");
    return `Refunded ${rupees(o.amount)} to ${o.holder_name}.`;
  });
}

/** For a cancelled or rejected event: refund every paid E-Pass. */
export async function refundAllForEvent(postId: string): Promise<ActionState> {
  return guarded("plus.payments", async (user) => {
    const paid = (await db.findBy("plus_orders", "post_id", postId)).filter((o) => o.status === "paid");
    let ok = 0;
    const failed: string[] = [];
    for (const o of paid) {
      try { await refundOne(user, o.id); ok++; } catch (e) { failed.push(`${o.holder_name}: ${e instanceof Error ? e.message : "failed"}`); }
    }
    updateTag("plus");
    return `${ok} refund${ok === 1 ? "" : "s"} made.${failed.length ? ` Failed: ${failed.join("; ")}` : ""}`;
  });
}

/** Record a payout PAHAD made to the organiser (the bank transfer / UPI itself happens outside the app). */
export async function recordPayout(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return guarded("plus.payments", async (user) => {
    const post = await db.get("plus_posts", str(fd, "post_id", 64));
    if (!post) throw new Error("Event not found.");
    const amount = Math.round(Number(str(fd, "amount", 12)) * 100);
    const reference = str(fd, "reference", 120);
    const money = await eventMoney(post.id);
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("Enter the amount paid.");
    if (amount > money.owed) throw new Error(`That's more than is owed (${rupees(money.owed)}).`);
    if (reference.length < 3) throw new Error("Add the UPI / bank transfer reference.");
    await db.insert("plus_payouts", { id: newId(), post_id: post.id, organiser_id: post.author_id, amount, reference, paid_by_name: user.name, paid_at: now() });
    await log(user, "paid out", "plus payout", post.id, `${post.title}: ${rupees(amount)} to ${post.author_name} (${reference})`);
    after(() => pushToUser(post.author_id, { title: "PAHAD paid you", body: `${rupees(amount)} for “${post.title}”. Ref: ${reference}`, url: "/plus/me#sell" }).then(() => undefined));
    return `Recorded: ${rupees(amount)} paid to ${post.author_name}.`;
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
