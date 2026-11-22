import { useMemo, useState } from "react";
import { Linking, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import { api, siteUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLoad } from "@/lib/useLoad";
import { C, R } from "@/lib/theme";
import { Tile, YouTube } from "@/components/Tiles";
import { Button, Chip, ErrorView, H2, Loading, P, Tap } from "@/components/ui";

const go = (params: Record<string, string>) => router.push({ pathname: "/", params });

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const { config, signedIn } = useAuth();
  const { data, setData, error, loading, refreshing, refresh, reload } = useLoad(() => api.discover());
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const items = useMemo(() => {
    const all = data?.items ?? [];
    const query = q.trim().toLowerCase();
    return all.filter((c) => (filter === "all" || c.hubKey === filter) && (!query || `${c.title} ${c.summary} ${c.region} ${c.locality}`.toLowerCase().includes(query)));
  }, [data, filter, q]);

  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorView message={error} onRetry={reload} />;
  if (!data) return null;

  const follow = async (id: string) => {
    if (!signedIn) return router.push("/login");
    setData({ ...data, creators: data.creators.map((c) => (c.id === id ? { ...c, following: !c.following } : c)) });
    await api.follow(id).catch(() => {});
  };

  return (
    <ScrollView style={{ backgroundColor: C.page }} contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={C.ochre} colors={[C.ochre]} />}>
      <Text style={st.title}>Discover</Text>
      <TextInput value={q} onChangeText={setQ} placeholder="Search events, places, businesses…" placeholderTextColor={C.faint} style={st.search} returnKeyType="search" />

      {data.spotlights.length ? (
        <>
          <H2 style={st.h}>Spotlight</H2>
          {data.spotlights.map((s) => (
            <View key={s.youtubeId + s.title} style={st.spot}>
              <YouTube id={s.youtubeId} title={s.title} />
              <Text style={st.spotLabel}>{s.executive ? "⭐ " : ""}{s.label}</Text>
              <Tap onPress={() => (s.postId ? router.push({ pathname: "/post/[id]", params: { id: s.postId } }) : s.url ? WebBrowser.openBrowserAsync(siteUrl(s.url)) : undefined)}>
                <Text style={st.spotTitle}>{s.title}</Text>
                <P muted numberOfLines={2}>{s.text}</P>
                <Text style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>by {s.by}</Text>
              </Tap>
            </View>
          ))}
        </>
      ) : null}

      {data.creators.length ? (
        <>
          <H2 style={st.h}>Creators & guilds</H2>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {data.creators.map((c) => (
              <View key={c.id} style={st.creator}>
                <Tap onPress={() => router.push({ pathname: "/user/[id]", params: { id: c.id } })} style={{ alignItems: "center" }}>
                  <View style={st.avatar}><Text style={{ color: C.page, fontWeight: "900", fontSize: 20 }}>{c.name[0]?.toUpperCase()}</Text></View>
                  <Text style={st.creatorName} numberOfLines={1}>{c.name}</Text>
                  <Text style={{ color: C.muted, fontSize: 11 }}>{c.hub}</Text>
                </Tap>
                <Button small kind={c.following ? "outline" : "primary"} title={c.following ? "Following" : "Follow"} onPress={() => follow(c.id)} style={{ marginTop: 8 }} />
              </View>
            ))}
          </ScrollView>
        </>
      ) : null}

      <H2 style={st.h}>Hubs</H2>
      <View style={st.grid}>
        {(config?.hubs ?? []).map((h) => (
          <Tap key={h.key} onPress={() => go({ hub: h.key })} style={st.hub}>
            <Text style={{ fontSize: 26 }}>{h.emoji}</Text>
            <Text style={st.hubName}>{h.label}</Text>
            <Text style={{ color: C.muted, fontSize: 11 }} numberOfLines={2}>{h.blurb}</Text>
          </Tap>
        ))}
      </View>

      <H2 style={st.h}>Briefs</H2>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {(config?.briefTypes ?? []).map((b) => <Chip key={b.key} label={`${b.emoji} ${b.label}`} onPress={() => go(b.key === "job" ? { hub: "jobs" } : { hub: "briefs", type: b.key })} />)}
      </View>

      <H2 style={st.h}>Regions</H2>
      <View style={st.grid}>
        {(config?.regions ?? []).map((r) => (
          <Tap key={r} onPress={() => go({ region: r })} style={[st.hub, { alignItems: "center", backgroundColor: C.panel }]}>
            <Text style={st.hubName}>{r}</Text>
          </Tap>
        ))}
      </View>

      <H2 style={st.h}>Explore</H2>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        {[["all", "All"], ["events", "Events"], ["roam", "Roam"], ["business", "Business"], ["jobs", "Jobs"], ["briefs", "Briefs"]].map(([k, l]) => (
          <Chip key={k} label={l} on={filter === k} onPress={() => setFilter(k)} />
        ))}
      </ScrollView>
      {items.length === 0 ? <P muted>Nothing here yet.</P> : <View style={st.grid}>{items.map((c) => <Tile key={c.id} c={c} />)}</View>}

      <View style={[st.about]}>
        <H2>About PAHAD+</H2>
        <P muted style={{ marginTop: 6, fontSize: 13 }}>A community app by PAHAD. Anyone can post; PAHAD&apos;s verifiers check posts, so contact and booking details show only for genuine listings.</P>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14, marginTop: 10 }}>
          <Text style={st.link} onPress={() => WebBrowser.openBrowserAsync(siteUrl("/plus/terms"))}>Terms & guidelines</Text>
          <Text style={st.link} onPress={() => WebBrowser.openBrowserAsync(siteUrl("/privacy#pahad-plus"))}>Privacy</Text>
          <Text style={st.link} onPress={() => WebBrowser.openBrowserAsync(siteUrl("/plus/help"))}>Help</Text>
          <Text style={st.link} onPress={() => Linking.openURL(siteUrl("/"))}>pahad.org</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  title: { color: C.ink, fontFamily: "serif", fontWeight: "700", fontSize: 30 },
  search: { marginTop: 12, backgroundColor: C.card, borderColor: C.line, borderWidth: 1, borderRadius: R.pill, color: C.ink, paddingHorizontal: 16, paddingVertical: 11, fontSize: 15 },
  h: { marginTop: 24, marginBottom: 10 },
  spot: { backgroundColor: C.card, borderRadius: R.lg, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: C.line },
  spotLabel: { color: C.ochre, fontWeight: "800", fontSize: 12, marginTop: 10 },
  spotTitle: { color: C.ink, fontWeight: "800", fontSize: 17, marginTop: 4, marginBottom: 2 },
  creator: { width: 120, marginRight: 10, backgroundColor: C.card, borderRadius: R.lg, padding: 12, alignItems: "center", borderWidth: 1, borderColor: C.line },
  avatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: C.clay, alignItems: "center", justifyContent: "center" },
  creatorName: { color: C.ink, fontWeight: "800", marginTop: 6, maxWidth: 100 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  hub: { width: "48.5%", backgroundColor: C.card, borderRadius: R.md, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: C.line },
  hubName: { color: C.ink, fontFamily: "serif", fontWeight: "700", fontSize: 16, marginTop: 2 },
  about: { backgroundColor: C.card, borderRadius: R.lg, padding: 16, marginTop: 20, borderWidth: 1, borderColor: C.line },
  link: { color: C.ochre, fontWeight: "700", textDecorationLine: "underline" },
});
