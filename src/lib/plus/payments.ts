import "server-only";
import { db, newId } from "../db";
import type { PlusOrder, PlusPost } from "../types";
import { newPassCode } from "./passes";

const now = () => new Date().toISOString();
export const FEE_SETTING = "plus_fee_percent";
/** How long an unpaid checkout holds a place. */
export const HOLD_MINUTES = 15;

export async function getFeePercent(): Promise<number> {
  const s = await db.get("settings", FEE_SETTING);
  const n = Number(s?.value ?? 0);
  return Number.isFinite(n) ? Math.min(Math.max(n, 0), 50) : 0;
}

export const feeFor = (amount: number, percent: number) => Math.round((amount * percent) / 100);

export async function isApprovedOrganiser(userId: string) {
  return (await db.get("plus_organisers", userId))?.status === "approved";
}

/** Places taken: passes that aren't cancelled, plus checkouts still being paid for. */
export async function placesHeld(postId: string, exceptUserId = "") {
  const [passes, orders] = await Promise.all([db.findBy("plus_passes", "post_id", postId), db.findBy("plus_orders", "post_id", postId)]);
  const cutoff = Date.now() - HOLD_MINUTES * 60_000;
  const pending = orders.filter((o) => o.status === "created" && o.user_id !== exceptUserId && Date.parse(o.created_at) > cutoff).length;
  return passes.filter((p) => p.status !== "cancelled").length + pending;
}

/**
 * Issue the E-Pass for a paid order. Safe to call twice (the checkout callback and the webhook can both arrive):
 * the second call returns the same pass.
 */
export async function fulfilOrder(order: PlusOrder, paymentId: string): Promise<string> {
  const fresh = await db.get("plus_orders", order.id);
  if (fresh?.status === "paid" && fresh.pass_id) return (await db.get("plus_passes", fresh.pass_id))?.code ?? "";
  const passId = `${order.post_id}:${order.user_id}`;
  const existing = await db.get("plus_passes", passId);
  let code = existing?.code ?? newPassCode();
  if (existing) {
    await db.update("plus_passes", passId, { status: "active", holder_name: order.holder_name, order_id: order.id, reminded: false, created_at: now() });
  } else {
    for (let i = 0; i < 3 && (await db.findBy("plus_passes", "code", code)).length; i++) code = newPassCode();
    await db.insert("plus_passes", {
      id: passId, code, post_id: order.post_id, user_id: order.user_id, holder_name: order.holder_name, status: "active",
      checked_in_at: "", checked_in_by: "", reminded: false, order_id: order.id, created_at: now(),
    });
  }
  await db.update("plus_orders", order.id, { status: "paid", rzp_payment_id: paymentId, pass_id: passId, paid_at: now() });
  return code;
}

export async function newLocalOrder(post: PlusPost, user: { id: string; name: string }, fee: number, rzpOrderId: string) {
  const id = newId();
  await db.insert("plus_orders", {
    id, rzp_order_id: rzpOrderId, rzp_payment_id: "", post_id: post.id, user_id: user.id, holder_name: user.name, amount: post.price,
    fee, status: "created", pass_id: "", refund_id: "", created_at: now(), paid_at: "", refunded_at: "",
  });
  return id;
}

/** Money for one event: what was sold, PAHAD's fee, refunds, what has been paid out, and what is still owed. */
export async function eventMoney(postId: string) {
  const [orders, payouts] = await Promise.all([db.findBy("plus_orders", "post_id", postId), db.findBy("plus_payouts", "post_id", postId)]);
  const paid = orders.filter((o) => o.status === "paid");
  const refunded = orders.filter((o) => o.status === "refunded");
  const gross = paid.reduce((s, o) => s + o.amount, 0);
  const fee = paid.reduce((s, o) => s + o.fee, 0);
  const paidOut = payouts.reduce((s, p) => s + p.amount, 0);
  return { sold: paid.length, refunds: refunded.length, refundedAmount: refunded.reduce((s, o) => s + o.amount, 0), gross, fee, net: gross - fee, paidOut, owed: gross - fee - paidOut, payouts };
}
