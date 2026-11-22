import { useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { initials } from "@/lib/format";
import { useLoad } from "@/lib/useLoad";
import { C, R } from "@/lib/theme";
import { Tile } from "@/components/Tiles";
import { shareCard } from "@/components/Reel";
import { Badge, Button, ErrorView, H2, Loading, P } from "@/components/ui";

export default function ProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { signedIn } = useAuth();
  const { data: u, setData, error, loading, refreshing, refresh, reload } = useLoad(() => api.profile(id), [id]);
  const [busy, setBusy] = useState(false);
  if (loading && !u) return <Loading />;
  if (error && !u) return <ErrorView message={error} onRetry={reload} />;
  if (!u) return null;

  const follow = async () => {
    if (!signedIn) return router.push("/login");
    setBusy(true);
    const before = u;
    setData({ ...u, following: !u.following, counts: { ...u.counts, followers: u.counts.followers + (u.following ? -1 : 1) } });
    try { const r = await api.follow(u.id); if (!r.ok) setData(before); } catch { setData(before); } finally { setBusy(false); }
  };

  return (
    <>
      <Stack.Screen options={{ title: u.name }} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={C.ochre} colors={[C.ochre]} />}>
        <View style={st.head}>
          <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
            <View style={st.avatar}><Text style={st.avatarText}>{initials(u.name)}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={st.name} numberOfLines={1}>{u.name}</Text>
              <Text style={{ color: C.muted, fontSize: 12 }}>{u.accountId}</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                {u.accountType ? <Badge label={u.accountType} /> : null}
                {u.member ? <Badge label="PAHAD member" tone="sage" /> : null}
                {u.badge ? <Badge label={u.badge} tone="cream" /> : null}
                {u.privateMode ? <Badge label="🔒 Private" /> : null}
              </View>
            </View>
          </View>
          <View style={st.stats}>
            {([["Posts", u.counts.posts], ["Support", u.counts.supports], ["Followers", u.counts.followers], ["Following", u.counts.following]] as const).map(([l, n]) => (
              <View key={l} style={st.stat}><Text style={st.statN}>{n ?? "—"}</Text><Text style={st.statL}>{l}</Text></View>
            ))}
          </View>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
            {u.self ? <Button small kind="outline" title="Edit profile" onPress={() => router.push("/settings")} />
              : <Button small kind={u.following ? "outline" : "primary"} title={u.following ? "Following" : "+ Follow"} loading={busy} onPress={follow} />}
            <Button small kind="outline" title="Share profile" onPress={() => shareCard({ title: `${u.name} on PAHAD+`, href: `/plus/u/${u.id}` })} />
          </View>
        </View>

        {u.privateMode && !u.self ? (
          <P muted style={{ textAlign: "center", marginTop: 24 }}>This account is private. Their posts still appear in the feed, but not as a list here.</P>
        ) : (
          <>
            <H2 style={{ marginTop: 22, marginBottom: 10 }}>Posts</H2>
            {u.posts.length === 0 ? <P muted>No live posts yet.</P> : <View style={st.grid}>{u.posts.map((c) => <Tile key={c.id} c={c} />)}</View>}
            {u.saved.length ? (
              <>
                <H2 style={{ marginTop: 18, marginBottom: 10 }}>Saved</H2>
                <View style={st.grid}>{u.saved.map((c) => <Tile key={c.id} c={c} />)}</View>
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </>
  );
}

const st = StyleSheet.create({
  head: { backgroundColor: C.panel, borderRadius: R.lg, padding: 16 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: C.clay, alignItems: "center", justifyContent: "center" },
  avatarText: { color: C.page, fontWeight: "900", fontSize: 22 },
  name: { color: C.ink, fontWeight: "900", fontSize: 20 },
  stats: { flexDirection: "row", gap: 8, marginTop: 16 },
  stat: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)", borderRadius: R.md, paddingVertical: 8, alignItems: "center" },
  statN: { color: C.ink, fontWeight: "900", fontSize: 18 },
  statL: { color: C.muted, fontWeight: "700", fontSize: 10, textTransform: "uppercase" },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
});
