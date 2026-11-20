import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Razorpay (PAHAD's own account: PAHAD collects every paid E-Pass and pays organisers out).
 * Needs RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET; RAZORPAY_WEBHOOK_SECRET for the webhook. Without the keys,
 * paid events are switched off everywhere.
 */
const KEY_ID = process.env.RAZORPAY_KEY_ID ?? "";
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET ?? "";
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET ?? "";
// Only for automated tests: point the API at a local stand-in.
const API = process.env.RAZORPAY_API_BASE || "https://api.razorpay.com";

export const paymentsConfigured = Boolean(KEY_ID && KEY_SECRET);
export const razorpayKeyId = KEY_ID;

async function call<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Basic ${Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString("base64")}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });
  const json = (await res.json().catch(() => null)) as (T & { error?: { description?: string } }) | null;
  if (!res.ok || !json) throw new Error(json?.error?.description || `Razorpay error (${res.status})`);
  return json;
}

export async function createRazorpayOrder(amount: number, receipt: string, notes: Record<string, string>) {
  return call<{ id: string; amount: number; currency: string }>("/v1/orders", { amount, currency: "INR", receipt, notes });
}

export async function refundRazorpayPayment(paymentId: string, amount: number) {
  return call<{ id: string; status: string }>(`/v1/payments/${encodeURIComponent(paymentId)}/refund`, { amount, speed: "normal" });
}

const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/** Checkout's success callback: signature = HMAC-SHA256(order_id|payment_id, key secret). */
export function validPaymentSignature(orderId: string, paymentId: string, signature: string) {
  if (!KEY_SECRET) return false;
  return safeEqual(createHmac("sha256", KEY_SECRET).update(`${orderId}|${paymentId}`).digest("hex"), String(signature));
}

/** Webhooks: signature = HMAC-SHA256(raw body, webhook secret). */
export function validWebhookSignature(rawBody: string, signature: string) {
  if (!WEBHOOK_SECRET) return false;
  return safeEqual(createHmac("sha256", WEBHOOK_SECRET).update(rawBody).digest("hex"), String(signature));
}

export const rupees = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: paise % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;
