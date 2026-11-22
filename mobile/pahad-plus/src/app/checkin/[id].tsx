import { useRef, useState } from "react";
import { Alert, FlatList, StyleSheet, Text, TextInput, View } from "react-native";
import { useIsFocused, useLocalSearchParams } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { api } from "@/lib/api";
import { dateTime } from "@/lib/format";
import { useLoad } from "@/lib/useLoad";
import { C, R } from "@/lib/theme";
import { Button, Chip, ErrorView, H2, Loading, P } from "@/components/ui";

const STATUS: Record<string, string> = { active: "Ready", pending: "Waiting", checked_in: "Checked in", revoked: "Revoked" };

/** Organiser / PAHAD verifier: scan E-Pass QR codes at the gate and see registrations. */
export default function CheckinScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const focused = useIsFocused();
  const [perm, requestPerm] = useCameraPermissions();
  const { data, error, loading, reload } = useLoad(() => api.checkin(id), [id]);
  const [scanning, setScanning] = useState(false);
  const [code, setCode] = useState("");
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const busy = useRef(false);
  const [show, setShow] = useState<"all" | "pending" | "checked_in">("all");

  const check = async (raw: string) => {
    if (busy.current || !raw) return;
    busy.current = true;
    try {
      const r = await api.checkIn(id, raw);
      Haptics.notificationAsync(r.ok ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error).catch(() => {});
      setResult({ ok: r.ok, text: `${r.message}${r.name ? `\n${r.name}` : ""}${r.at && !r.ok ? ` · ${dateTime(String(r.at))}` : ""}` });
      setCode("");
      reload();
    } catch (e) {
      setResult({ ok: false, text: e instanceof Error ? e.message : "Couldn't check in." });
    } finally {
      setTimeout(() => { busy.current = false; }, 1500);
    }
  };

  const decide = (passCode: string, holder: string, decision: "approve" | "revoke") =>
    Alert.alert(decision === "approve" ? `Approve ${holder}?` : `Revoke ${holder}'s E-Pass?`, "", [
      { text: "Cancel", style: "cancel" },
      { text: decision === "approve" ? "Approve" : "Revoke", style: decision === "revoke" ? "destructive" : "default", onPress: async () => { const r = await api.decidePass(passCode, decision); Alert.alert(r.message); reload(); } },
    ]);

  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorView message={error} onRetry={reload} />;
  if (!data) return null;
  const list = data.passes.filter((p) => show === "all" || p.status === show);

  return (
    <FlatList
      data={list}
      keyExtractor={(p) => p.code}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      ListHeaderComponent={
        <View>
          <H2>{data.post.title}</H2>
          <P muted style={{ marginTop: 4 }}>{data.counts.checkedIn} of {data.counts.total} checked in{data.counts.pending ? ` · ${data.counts.pending} waiting for approval` : ""}</P>

          {scanning && focused ? (
            <View style={st.camera}>
              <CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: ["qr"] }} onBarcodeScanned={({ data: d }) => check(d)} />
              <View style={st.frame} />
            </View>
          ) : null}
          <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
            <Button
              title={scanning ? "Stop scanning" : "📷 Scan E-Pass QR"}
              onPress={async () => {
                if (scanning) return setScanning(false);
                if (!perm?.granted) { const p = await requestPerm(); if (!p.granted) return Alert.alert("Camera permission is needed to scan E-Passes."); }
                setResult(null);
                setScanning(true);
              }}
            />
          </View>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
            <TextInput value={code} onChangeText={(v) => setCode(v.toUpperCase())} placeholder="Or type the code" placeholderTextColor={C.faint} autoCapitalize="characters" style={st.input} onSubmitEditing={() => check(code.trim())} />
            <Button small title="Check in" disabled={!code.trim()} onPress={() => check(code.trim())} />
          </View>
          {result ? (
            <View style={[st.result, { backgroundColor: result.ok ? C.sageDeep : C.dangerBg }]}>
              <Text style={{ color: result.ok ? C.ink : C.danger, fontWeight: "900", fontSize: 16, textAlign: "center" }}>{result.ok ? "✓ " : "✕ "}{result.text}</Text>
            </View>
          ) : null}

          <View style={{ flexDirection: "row", marginTop: 18, marginBottom: 10 }}>
            <Chip label={`All (${data.counts.total})`} on={show === "all"} onPress={() => setShow("all")} />
            {data.post.approval ? <Chip label={`Waiting (${data.counts.pending})`} on={show === "pending"} onPress={() => setShow("pending")} /> : null}
            <Chip label={`Checked in (${data.counts.checkedIn})`} on={show === "checked_in"} onPress={() => setShow("checked_in")} />
          </View>
        </View>
      }
      ListEmptyComponent={<P muted>No registrations here yet.</P>}
      renderItem={({ item: p }) => (
        <View style={st.row}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.ink, fontWeight: "800" }}>{p.holder}</Text>
            <Text style={{ color: C.muted, fontSize: 12, fontFamily: "monospace" }}>{p.code}{p.paid ? " · paid" : ""}</Text>
          </View>
          <Text style={{ color: p.status === "checked_in" ? C.sage : p.status === "pending" ? C.ochre : C.muted, fontWeight: "800", fontSize: 12 }}>{STATUS[p.status] ?? p.status}</Text>
          {p.status === "pending" ? <Button small title="Approve" onPress={() => decide(p.code, p.holder, "approve")} style={{ marginLeft: 8 }} /> : null}
          {(p.status === "pending" || p.status === "active") && !p.paid ? <Button small kind="outline" title="Revoke" onPress={() => decide(p.code, p.holder, "revoke")} style={{ marginLeft: 6 }} /> : null}
        </View>
      )}
    />
  );
}

const st = StyleSheet.create({
  camera: { height: 300, borderRadius: R.lg, overflow: "hidden", marginTop: 16, backgroundColor: "#000", alignItems: "center", justifyContent: "center" },
  frame: { width: 200, height: 200, borderWidth: 3, borderColor: C.ochre, borderRadius: 20 },
  input: { flex: 1, backgroundColor: C.page, borderColor: C.line, borderWidth: 1, borderRadius: R.pill, color: C.ink, paddingHorizontal: 16, fontSize: 16, fontFamily: "monospace" },
  result: { borderRadius: R.md, padding: 16, marginTop: 14 },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: C.card, borderRadius: R.md, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: C.line },
});
