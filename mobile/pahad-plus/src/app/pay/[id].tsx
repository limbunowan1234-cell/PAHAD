import { useEffect, useState } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { C } from "@/lib/theme";
import { Button, Empty, Loading } from "@/components/ui";

type Checkout = { key: string; orderId: string; amount: number; name: string; description: string; prefill: { name: string; email: string } };

/** Razorpay Checkout (UPI, cards, net banking) inside the app. PAHAD's server checks the payment signature. */
function checkoutHtml(c: Checkout) {
  const opts = JSON.stringify({ key: c.key, order_id: c.orderId, amount: c.amount, currency: "INR", name: c.name, description: c.description, prefill: c.prefill, theme: { color: "#D9A75A" } });
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{background:#11181B;color:#F4F1EA;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}</style></head>
<body><p>Opening secure payment…</p>
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
<script>
  const send = (m) => window.ReactNativeWebView.postMessage(JSON.stringify(m));
  const o = ${opts};
  o.handler = (r) => send({ type: "paid", orderId: r.razorpay_order_id, paymentId: r.razorpay_payment_id, signature: r.razorpay_signature });
  o.modal = { ondismiss: () => send({ type: "dismissed" }) };
  const rzp = new Razorpay(o);
  rzp.on("payment.failed", (e) => send({ type: "failed", message: (e.error && e.error.description) || "Payment failed." }));
  rzp.open();
</script></body></html>`;
}

export default function PayScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { refresh } = useAuth();
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const [msg, setMsg] = useState("");
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    api.payStart(id).then((r) => {
      if (r.ok && r.done) router.replace({ pathname: "/pass/[code]", params: { code: r.done } });
      else if (r.ok && r.key && r.orderId) setCheckout({ key: r.key, orderId: r.orderId, amount: r.amount ?? 0, name: r.name ?? "PAHAD+", description: r.description ?? "E-Pass", prefill: r.prefill ?? { name: "", email: "" } });
      else setMsg(r.message);
    }).catch((e) => setMsg(e instanceof Error ? e.message : "Couldn't start the payment."));
  }, [id]);

  const onMessage = async (e: WebViewMessageEvent) => {
    const m = JSON.parse(e.nativeEvent.data) as { type: string; orderId?: string; paymentId?: string; signature?: string; message?: string };
    if (m.type === "dismissed") return router.back();
    if (m.type === "failed") return setMsg(m.message ?? "Payment failed.");
    if (m.type === "paid" && m.orderId && m.paymentId && m.signature) {
      setConfirming(true);
      const r = await api.payConfirm(m.orderId, m.paymentId, m.signature).catch((err) => ({ ok: false, message: err instanceof Error ? err.message : "Couldn't confirm.", code: undefined }));
      setConfirming(false);
      refresh();
      if (r.ok && r.code) router.replace({ pathname: "/pass/[code]", params: { code: r.code } });
      else setMsg(`${r.message} If money left your account, your E-Pass will appear in Profile → E-Passes within a few minutes, or PAHAD will refund it.`);
    }
  };

  if (msg) return <Empty emoji="💳" title="Payment" text={msg} action={<Button title="Back" onPress={() => router.back()} />} />;
  if (!checkout || confirming) return <Loading />;
  return (
    <View style={{ flex: 1, backgroundColor: C.page }}>
      <WebView originWhitelist={["*"]} source={{ html: checkoutHtml(checkout), baseUrl: "https://pahad.org" }} onMessage={onMessage} javaScriptEnabled setSupportMultipleWindows={false} style={{ backgroundColor: C.page }} />
    </View>
  );
}
