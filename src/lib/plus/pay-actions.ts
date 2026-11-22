"use server";

import { refreshTag } from "@/lib/refresh-tag";
import { db, newId } from "@/lib/db";
import { notify, now, str, type ActionState } from "@/lib/admin-helpers";
import { passesOpen } from "./passes";
import { feeFor, fulfilOrder, getFeePercent, isApprovedOrganiser, newLocalOrder, placesHeld } from "./payments";
import { createRazorpayOrder, paymentsConfigured, razorpayKeyId, validPaymentSignature } from "./razorpay";
import { getPlusUser } from "./session";

const IFSC = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const UPI = /^[\w.\-]{2,256}@[a-zA-Z]{2,64}$/;

/** Business / Organisation accounts ask the President to let them sell E-Passes. */
export async function applyAsOrganiser(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const u = await getPlusUser();
  if (!u) return { ok: false, message: "Please sign in again." };
  if (u.account_type === "individual") return { ok: false, message: "Only Business and Organisation accounts can sell E-Passes." };
  if (!u.email_verified) return { ok: false, message: "Please confirm your email first." };
  const account_name = str(fd, "account_name", 120);
  const upi = str(fd, "upi", 100).toLowerCase();
  const bank_account = str(fd, "bank_account", 20).replace(/\s/g, "");
  const ifsc = str(fd, "ifsc", 11).toUpperCase();
  if (account_name.length < 3) return { ok: false, message: "Enter the name on the bank account or UPI." };
  if (upi && !UPI.test(upi)) return { ok: false, message: "That UPI ID doesn't look right (e.g. name@okbank)." };
  if (bank_account && (!/^\d{9,18}$/.test(bank_account) || !IFSC.test(ifsc))) return { ok: false, message: "Enter a valid bank account number and IFSC code." };
  if (!upi && !bank_account) return { ok: false, message: "Give a UPI ID or bank account so PAHAD can pay you." };
  const existing = await db.get("plus_organisers", u.id);
  if (existing?.status === "approved") return { ok: true, message: "You're already approved to sell E-Passes." };
  const row = { account_name, upi, bank_account, ifsc: bank_account ? ifsc : "", status: "pending" as const, note: "", requested_at: now(), decided_by_name: "", decided_at: "" };
  if (existing) await db.update("plus_organisers", u.id, row);
  else await db.insert("plus_organisers", { id: u.id, ...row });
  for (const a of (await db.all("users")).filter((x) => x.active && x.role === "super_admin")) await notify(a.id, `${u.name} asks to sell E-Passes on PAHAD+.`, "/admin/plus/payments");
  return { ok: true, message: "Sent to PAHAD. You can add a price to events once the President approves." };
}

export type Checkout = { ok: false; message: string } | { ok: true; done?: string; key: string; orderId: string; amount: number; name: string; description: string; prefill: { name: string; email: string } };

/** Start buying a paid E-Pass: holds a place for 15 minutes while the person pays in Razorpay Checkout. */
export async function startPaidPass(postId: string): Promise<Checkout> {
  const u = await getPlusUser();
  if (!u) return { ok: false, message: "Sign in to buy an E-Pass." };
  if (!u.email_verified) return { ok: false, message: "Please confirm your email first (Me → Resend confirmation link)." };
  if (!paymentsConfigured) return { ok: false, message: "Payments aren't switched on yet." };
  const p = await db.get("plus_posts", postId);
  if (!p || p.price <= 0 || !passesOpen(p)) return { ok: false, message: "E-Passes aren't on sale for this event." };
  if (!(await isApprovedOrganiser(p.author_id))) return { ok: false, message: "Sales for this event are paused." };
  const mine = await db.get("plus_passes", `${postId}:${u.id}`);
  if (mine && mine.status !== "cancelled") return { ok: true, done: mine.code, key: "", orderId: "", amount: 0, name: "", description: "", prefill: { name: "", email: "" } };
  if (p.pass_capacity > 0 && (await placesHeld(postId, u.id)) >= p.pass_capacity) return { ok: false, message: "Sorry, all E-Passes for this event have gone." };
  const fee = feeFor(p.price, await getFeePercent());
  try {
    const order = await createRazorpayOrder(p.price, `plus-${newId().slice(0, 12)}`, { post_id: p.id, user_id: u.id, event: p.title.slice(0, 200) });
    await newLocalOrder(p, u, fee, order.id);
    return { ok: true, key: razorpayKeyId, orderId: order.id, amount: p.price, name: "PAHAD+", description: `E-Pass: ${p.title}`.slice(0, 250), prefill: { name: u.name, email: u.email } };
  } catch (e) {
    console.error("Razorpay order failed", e);
    return { ok: false, message: "Couldn't start the payment. Please try again in a moment." };
  }
}

/** Razorpay Checkout's success callback. The signature proves the payment; the pass is issued only then. */
export async function confirmPaidPass(input: { orderId: string; paymentId: string; signature: string }): Promise<{ ok: boolean; message: string; code?: string }> {
  const u = await getPlusUser();
  if (!u) return { ok: false, message: "Please sign in again. Your payment is safe: your E-Pass will appear under Me." };
  const orderId = String(input?.orderId ?? ""), paymentId = String(input?.paymentId ?? ""), signature = String(input?.signature ?? "");
  if (!validPaymentSignature(orderId, paymentId, signature)) return { ok: false, message: "We couldn't confirm this payment. If money was taken, contact PAHAD." };
  const order = (await db.findBy("plus_orders", "rzp_order_id", orderId))[0];
  if (!order || order.user_id !== u.id) return { ok: false, message: "Order not found." };
  const code = await fulfilOrder(order, paymentId);
  refreshTag("plus");
  return { ok: true, message: "Payment received.", code };
}
