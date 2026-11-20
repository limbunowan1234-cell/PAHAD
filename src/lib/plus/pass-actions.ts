"use server";

import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { db } from "@/lib/db";
import { now, str, type ActionState } from "@/lib/admin-helpers";
import { codeFrom, gateAccess, newPassCode, passesOpen, takenPlaces } from "./passes";
import { getPlusUser } from "./session";

/** Get (or re-open) a free E-Pass. One per person per event; respects the organiser's limit. */
export async function registerPass(postId: string): Promise<ActionState> {
  const u = await getPlusUser();
  if (!u) return { ok: false, message: "Sign in to get an E-Pass." };
  if (!u.email_verified) return { ok: false, message: "Please confirm your email first (Me → Resend confirmation link)." };
  const p = await db.get("plus_posts", postId);
  if (!p || !passesOpen(p)) return { ok: false, message: "E-Passes aren't available for this event." };
  if (p.price > 0) return { ok: false, message: "This is a paid E-Pass: use Buy E-Pass." };
  const id = `${postId}:${u.id}`;
  const existing = await db.get("plus_passes", id);
  if (existing && existing.status !== "cancelled") redirect(`/plus/pass/${existing.code}`);
  if (p.pass_capacity > 0 && (await takenPlaces(postId)) >= p.pass_capacity) return { ok: false, message: "Sorry, all E-Passes for this event have gone." };
  let code = newPassCode();
  if (existing) {
    await db.update("plus_passes", id, { status: "active", holder_name: u.name, created_at: now(), reminded: false });
    code = existing.code;
  } else {
    for (let i = 0; i < 3 && (await db.findBy("plus_passes", "code", code)).length; i++) code = newPassCode();
    await db.insert("plus_passes", {
      id, code, post_id: postId, user_id: u.id, holder_name: u.name, status: "active", checked_in_at: "", checked_in_by: "", reminded: false, order_id: "", created_at: now(),
    });
  }
  updateTag("plus");
  redirect(`/plus/pass/${code}?new=1`);
}

export async function cancelPass(code: string): Promise<ActionState> {
  const u = await getPlusUser();
  if (!u) return { ok: false, message: "Please sign in again." };
  const pass = (await db.findBy("plus_passes", "code", code))[0];
  if (!pass || pass.user_id !== u.id) return { ok: false, message: "Not found." };
  if (pass.order_id) return { ok: false, message: "Paid E-Passes can't be cancelled here. For a refund, contact the organiser or PAHAD." };
  if (pass.status !== "active") return { ok: false, message: pass.status === "checked_in" ? "You've already been checked in." : "This E-Pass is already cancelled." };
  await db.update("plus_passes", pass.id, { status: "cancelled" });
  updateTag("plus");
  return { ok: true, message: "Your E-Pass is cancelled and your place is free for someone else." };
}

export type GateResult = { ok: boolean; message: string; name?: string; at?: string } | null;

/** Check someone in at the gate, from a scanned QR or a typed code. Organiser or PAHAD verifier only. */
export async function checkInPass(postId: string, _prev: GateResult, fd: FormData): Promise<GateResult> {
  const p = await db.get("plus_posts", postId);
  if (!p) return { ok: false, message: "Event not found." };
  const who = await gateAccess(p);
  if (!who?.canAct) return { ok: false, message: "Only the organiser or a PAHAD verifier can check people in." };
  const code = codeFrom(str(fd, "code", 300));
  if (!code) return { ok: false, message: "That isn't an E-Pass code." };
  const pass = (await db.findBy("plus_passes", "code", code))[0];
  if (!pass || pass.post_id !== postId) return { ok: false, message: "Not a pass for this event." };
  if (pass.status === "cancelled") return { ok: false, message: "This E-Pass was cancelled.", name: pass.holder_name };
  if (pass.status === "checked_in") return { ok: false, message: "Already checked in.", name: pass.holder_name, at: pass.checked_in_at };
  const at = now();
  await db.update("plus_passes", pass.id, { status: "checked_in", checked_in_at: at, checked_in_by: who.name });
  return { ok: true, message: "Welcome! Checked in.", name: pass.holder_name, at };
}
