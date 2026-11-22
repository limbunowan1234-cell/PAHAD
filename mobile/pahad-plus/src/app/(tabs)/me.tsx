import { useState } from "react";
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import QRCode from "react-native-qrcode-svg";
import { api, siteUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { dateTime, initials } from "@/lib/format";
import { useLoad } from "@/lib/useLoad";
import { C, R } from "@/lib/theme";
import { Tile } from "@/components/Tiles";
import { Badge, Button, Chip, Empty, ErrorView, Loading, Notice, P, Tap } from "@/components/ui";

const STATUS: Record<string, string> = { unverified: "◷ Unverified", verified: "✓ Verified", flag_proof: "🛡 Flag-Proof", hold: "⏸ On hold", rejected: "✕ Not approved" };
const PASS_STATUS: Record<string, string> = { active: "Ready", pending: "Waiting for approval", checked_in: "Checked in", revoked: "Revoked" };

function SignedOut() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, paddingTop: insets.top + 40 }}>
      <Empty emoji="👋" title="Your PAHAD+ profile" text="Sign in to post, save places, follow creators and keep your E-Passes in one place."
        action={<View style={{ gap: 10, width: 240 }}><Button title="Sign in" onPress={() => router.push("/login")} /><Button kind="outline" title="Create account" onPress={() => router.push("/signup")} /></View>} />
    </View>
  );
}

export default function MeScreen() {
  const { signedIn, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const [section, setSection] = useState<"posts" | "passes" | "saved">("posts");
  const [showQr, setShowQr] = useState(false);
  const { data: me, error, loading, refreshing, refresh, reload } = useLoad(() => (signedIn ? api.me() : Promise.resolve(null)), [signedIn]);
  if (!signedIn) return <SignedOut />;
  if (loading && !me) return <Loading />;
  if (error && !me) return <ErrorView message={error} onRetry={reload} />;
  if (!me) return null;
  const p = me.profile;

  return (
    <ScrollView style={{ backgroundColor: C.page }} contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={C.ochre} colors={[C.ochre]} />}>
      <View style={st.head}>
        <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
          <View style={st.avatar}><Text style={st.avatarText}>{initials(p.name)}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={st.name} numberOfLines={1}>{p.name}</Text>
            <Text style={{ color: C.muted, fontSize: 12 }}>{p.accountId} · {p.accountTypeLabel}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
              {p.member ? <Badge label="PAHAD member" tone="sage" /> : null}
              {p.emailVerified ? <Badge label="✓ Email confirmed" tone="dark" /> : <Badge label="Email not confirmed" tone="clay" />}
            </View>
          </View>
          <Tap onPress={() => router.push("/notifications")} style={st.bell}>
            <Text style={{ fontSize: 20 }}>🔔</Text>
            {me.unread ? <View style={st.dot}><Text style={st.dotText}>{me.unread}</Text></View> : null}
          </Tap>
        </View>
        <View style={st.stats}>
          {([["Posts", me.counts.posts], ["Followers", me.counts.followers], ["Following", me.counts.following]] as const).map(([l, n]) => (
            <View key={l} style={st.stat}><Text style={st.statN}>{n}</Text><Text style={st.statL}>{l}</Text></View>
          ))}
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
          <Button small kind="outline" title="Settings" onPress={() => router.push("/settings")} />
          <Button small kind="outline" title="Public profile" onPress={() => router.push({ pathname: "/user/[id]", params: { id: p.id } })} />
          <Button small kind="outline" title={showQr ? "Hide my QR" : "My QR"} onPress={() => setShowQr((v) => !v)} />
        </View>
        {showQr ? (
          <View style={st.qr}>
            <QRCode value={siteUrl(`/plus/u/${p.id}`)} size={180} backgroundColor="#F4F1EA" color="#11181B" />
            <Text style={{ color: C.page, fontWeight: "900", marginTop: 8 }}>{p.accountId}</Text>
          </View>
        ) : null}
      </View>

      {!p.emailVerified ? (
        <View style={{ marginTop: 14 }}>
          <Notice text={`Please confirm your email (${p.email}) to post and get E-Passes. Check your inbox for the link from PAHAD+.`} />
          <Button small kind="outline" title="Resend confirmation link" onPress={async () => { const r = await api.resend(); Alert.alert(r.message); }} />
        </View>
      ) : null}

      <View style={{ flexDirection: "row", marginTop: 20, marginBottom: 12 }}>
        <Chip label={`My posts (${me.posts.length})`} on={section === "posts"} onPress={() => setSection("posts")} />
        <Chip label={`E-Passes (${me.passes.length})`} on={section === "passes"} onPress={() => setSection("passes")} />
        <Chip label={`Saved (${me.saved.length})`} on={section === "saved"} onPress={() => setSection("saved")} />
      </View>

      {section === "posts" ? (
        me.posts.length === 0 ? <Empty emoji="✍️" title="No posts yet" text="Share an event, a place to roam, your business or a local alert." action={<Button title="+ New post" onPress={() => router.push("/new")} />} />
          : <View style={st.grid}>{me.posts.map((c) => <Tile key={c.id} c={c} footer={<Text style={{ color: c.status === "hold" || c.status === "rejected" ? C.danger : C.muted, fontSize: 11, fontWeight: "800", marginTop: 6 }}>{STATUS[c.status ?? ""] ?? c.status}{c.live === false && c.status !== "hold" && c.status !== "rejected" ? " · ended" : ""}</Text>} />)}</View>
      ) : section === "passes" ? (
        me.passes.length === 0 ? <Empty emoji="🎟" title="No E-Passes yet" text="Free and paid E-Passes for events appear here." />
          : me.passes.map((ps) => (
            <Tap key={ps.code} onPress={() => router.push({ pathname: "/pass/[code]", params: { code: ps.code } })} style={st.pass}>
              <Text style={{ fontSize: 26 }}>🎟</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.ink, fontWeight: "800", fontSize: 15 }} numberOfLines={1}>{ps.title}</Text>
                <Text style={{ color: C.muted, fontSize: 12 }}>{[ps.startsAt ? dateTime(ps.startsAt) : "", ps.venue || ps.region].filter(Boolean).join(" · ")}</Text>
                <Text style={{ color: ps.status === "active" ? C.sage : C.ochre, fontWeight: "800", fontSize: 12, marginTop: 2 }}>{PASS_STATUS[ps.status] ?? ps.status}</Text>
              </View>
              <Text style={{ color: C.muted, fontSize: 18 }}>›</Text>
            </Tap>
          ))
      ) : me.saved.length === 0 ? <Empty emoji="🔖" title="Nothing saved yet" text="Tap Save on a post to keep it here." />
        : <View style={st.grid}>{me.saved.map((c) => <Tile key={c.id} c={c} />)}</View>}

      <Button kind="ghost" title="Sign out" style={{ marginTop: 28 }} onPress={() => Alert.alert("Sign out of PAHAD+?", "", [{ text: "Cancel", style: "cancel" }, { text: "Sign out", style: "destructive", onPress: () => signOut() }])} />
      <P muted style={{ textAlign: "center", fontSize: 11, marginTop: 6 }}>PAHAD+ by PAHAD · data from pahad.org</P>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  head: { backgroundColor: C.panel, borderRadius: R.lg, padding: 16 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: C.clay, alignItems: "center", justifyContent: "center" },
  avatarText: { color: C.page, fontWeight: "900", fontSize: 22 },
  name: { color: C.ink, fontWeight: "900", fontSize: 20 },
  bell: { width: 44, height: 44, borderRadius: 16, backgroundColor: "rgba(0,0,0,0.3)", alignItems: "center", justifyContent: "center" },
  dot: { position: "absolute", top: 4, right: 4, backgroundColor: C.clay, borderRadius: 9, minWidth: 18, height: 18, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  dotText: { color: C.page, fontWeight: "900", fontSize: 10 },
  stats: { flexDirection: "row", gap: 8, marginTop: 16 },
  stat: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)", borderRadius: R.md, paddingVertical: 8, alignItems: "center" },
  statN: { color: C.ink, fontWeight: "900", fontSize: 18 },
  statL: { color: C.muted, fontWeight: "700", fontSize: 10, textTransform: "uppercase" },
  qr: { alignSelf: "center", backgroundColor: "#F4F1EA", padding: 14, borderRadius: R.lg, alignItems: "center", marginTop: 16 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  pass: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.card, borderRadius: R.md, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.line },
});
