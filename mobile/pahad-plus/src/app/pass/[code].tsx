import { Alert, RefreshControl, ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import QRCode from "react-native-qrcode-svg";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { dateTime } from "@/lib/format";
import { useLoad } from "@/lib/useLoad";
import { C, R } from "@/lib/theme";
import { Badge, Button, ErrorView, H1, Loading, Notice, P } from "@/components/ui";

const STATUS: Record<string, { label: string; tone: "sage" | "ochre" | "clay" | "dark" }> = {
  active: { label: "✓ Ready: show this at the gate", tone: "sage" },
  pending: { label: "◷ Waiting for the organiser's approval", tone: "ochre" },
  checked_in: { label: "✓ Checked in", tone: "dark" },
  revoked: { label: "✕ Revoked by the organiser", tone: "clay" },
  cancelled: { label: "Cancelled", tone: "clay" },
};

/** The E-Pass: a QR code with the pass code, works at the gate even with a weak signal once loaded. */
export default function PassScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { refresh: refreshAll } = useAuth();
  const { data: p, error, loading, refreshing, refresh, reload } = useLoad(() => api.pass(code), [code]);
  if (loading && !p) return <Loading />;
  if (error && !p) return <ErrorView message={error} onRetry={reload} />;
  if (!p) return null;
  const st = STATUS[p.status] ?? { label: p.status, tone: "dark" as const };

  const cancel = () =>
    Alert.alert("Cancel this E-Pass?", "Your place will be freed for someone else.", [
      { text: "Keep it", style: "cancel" },
      { text: "Cancel E-Pass", style: "destructive", onPress: async () => { const r = await api.cancelPass(p.code); Alert.alert(r.message); refreshAll(); reload(); } },
    ]);

  return (
    <ScrollView contentContainerStyle={{ padding: 20, alignItems: "stretch" }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={C.ochre} colors={[C.ochre]} />}>
      <View style={{ backgroundColor: C.card, borderRadius: R.lg, padding: 20, borderWidth: 1, borderColor: C.ochre, alignItems: "center" }}>
        <Text style={{ color: C.ochre, fontWeight: "900", letterSpacing: 1 }}>PAHAD+ E-PASS</Text>
        <H1 style={{ textAlign: "center", marginTop: 8 }}>{p.post.title}</H1>
        <P muted style={{ textAlign: "center", marginTop: 6 }}>{[p.post.startsAt ? dateTime(p.post.startsAt) : "", p.post.venue || [p.post.locality, p.post.region].filter(Boolean).join(", ")].filter(Boolean).join("\n")}</P>
        <View style={{ backgroundColor: "#F4F1EA", padding: 16, borderRadius: R.lg, marginTop: 18, opacity: p.status === "active" ? 1 : 0.35 }}>
          <QRCode value={p.code} size={220} backgroundColor="#F4F1EA" color="#11181B" />
        </View>
        <Text style={{ color: C.ink, fontFamily: "monospace", fontSize: 22, fontWeight: "900", letterSpacing: 3, marginTop: 12 }}>{p.code}</Text>
        <Text style={{ color: C.ink, fontWeight: "800", fontSize: 16, marginTop: 8 }}>{p.holder}</Text>
        <View style={{ marginTop: 12 }}><Badge label={st.label} tone={st.tone} /></View>
        {p.checkedInAt ? <P muted style={{ marginTop: 8, fontSize: 12 }}>Checked in {dateTime(p.checkedInAt)}</P> : null}
        {p.paid ? <P muted style={{ marginTop: 6, fontSize: 12 }}>Paid E-Pass · receipt in your email</P> : null}
      </View>
      <Notice text="Tip: open this screen before you reach the venue. Turn your brightness up at the gate." />
      <Button kind="outline" title="Event details" onPress={() => router.push({ pathname: "/post/[id]", params: { id: p.post.id } })} />
      {p.mine && (p.status === "active" || p.status === "pending") && !p.paid ? <Button kind="danger" style={{ marginTop: 10 }} title="Cancel my E-Pass" onPress={cancel} /> : null}
    </ScrollView>
  );
}
