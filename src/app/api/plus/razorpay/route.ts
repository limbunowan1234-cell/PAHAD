import { revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { fulfilOrder } from "@/lib/plus/payments";
import { validWebhookSignature } from "@/lib/plus/razorpay";

/**
 * Razorpay webhook (set it up in the Razorpay Dashboard → Webhooks, events: order.paid and refund.processed).
 * It issues the E-Pass even when the buyer closed the app before Checkout returned, and records refunds made in Razorpay.
 */
export async function POST(request: Request) {
  const raw = await request.text();
  if (!validWebhookSignature(raw, request.headers.get("x-razorpay-signature") ?? "")) return new Response("Invalid signature", { status: 400 });
  let event: { event?: string; payload?: Record<string, { entity?: Record<string, unknown> }> };
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }
  const payment = event.payload?.payment?.entity ?? {};
  if (event.event === "order.paid") {
    const order = (await db.findBy("plus_orders", "rzp_order_id", String(payment.order_id ?? event.payload?.order?.entity?.id ?? "")))[0];
    if (order && order.status === "created") {
      await fulfilOrder(order, String(payment.id ?? ""));
      revalidateTag("plus", { expire: 0 }); // route handlers can't use updateTag; expire now so the pass / refund shows at once
    }
  } else if (event.event === "refund.processed") {
    const refund = event.payload?.refund?.entity ?? {};
    const order = (await db.all("plus_orders")).find((o) => o.rzp_payment_id && o.rzp_payment_id === String(refund.payment_id ?? ""));
    if (order && order.status === "paid") {
      await db.update("plus_orders", order.id, { status: "refunded", refund_id: String(refund.id ?? ""), refunded_at: new Date().toISOString() });
      if (order.pass_id) await db.update("plus_passes", order.pass_id, { status: "cancelled" });
      revalidateTag("plus", { expire: 0 }); // route handlers can't use updateTag; expire now so the pass / refund shows at once
    }
  }
  return Response.json({ ok: true });
}
