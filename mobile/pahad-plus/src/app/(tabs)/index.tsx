import { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLoad } from "@/lib/useLoad";
import { C, R } from "@/lib/theme";
import type { Card, Tab } from "@/lib/types";
import { Reel } from "@/components/Reel";
import { Button, Chip, Empty, ErrorView, Loading } from "@/components/ui";

const TABS: { key: Tab; label: string }[] = [
  { key: "community", label: "Community" },
  { key: "following", label: "Following" },
  { key: "foryou", label: "For You" },
];
const PILLS = [
  { key: "events", label: "Events" },
  { key: "roam", label: "Roam" },
  { key: "business", label: "Business" },
  { key: "jobs", label: "Jobs" },
  { key: "briefs", label: "Briefs" },
];

/** Valley: the PAHAD+ feed, one post per screen. Swipe up for the next. */
export default function Valley() {
  const params = useLocalSearchParams<{ hub?: string; region?: string; type?: string; q?: string }>();
  const { config, signedIn } = useAuth();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>("community");
  const [hub, setHub] = useState<string | undefined>(params.hub);
  const [region, setRegion] = useState<string | undefined>(params.region);
  const [type, setType] = useState<string | undefined>(params.type);
  const [q, setQ] = useState(params.q ?? "");
  const [searching, setSearching] = useState(Boolean(params.q));
  const [query, setQuery] = useState(params.q ?? "");
  const [height, setHeight] = useState(0);

  // Discover links open the feed with a hub, region or brief type (adjusting state while rendering, as React recommends).
  const linkKey = `${params.hub ?? ""}|${params.region ?? ""}|${params.type ?? ""}`;
  const [seenLink, setSeenLink] = useState(linkKey);
  if (linkKey !== seenLink) {
    setSeenLink(linkKey);
    if (params.hub !== undefined) setHub(params.hub || undefined);
    if (params.region !== undefined) setRegion(params.region || undefined);
    if (params.type !== undefined) setType(params.type || undefined);
  }

  const { data, setData, error, loading, refreshing, refresh, reload } = useLoad(() => api.feed({ tab, hub, region, type: hub === "briefs" ? type : undefined, q: query || undefined }), [tab, hub, region, type, query]);
  const items = data?.items ?? [];
  const onChange = useCallback((c: Card) => setData((d) => (d ? { ...d, items: d.items.map((x) => (x.id === c.id ? c : x)) } : d)), [setData]);
  const briefTypes = useMemo(() => (config?.briefTypes ?? []).filter((b) => b.key !== "job"), [config]);

  return (
    <View style={{ flex: 1, backgroundColor: C.page }} onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
      {loading && !data ? <Loading /> : error && !data ? <ErrorView message={error} onRetry={reload} /> : items.length === 0 ? (
        <View style={{ flex: 1, paddingTop: insets.top + 120 }}>
          <Empty
            title={query ? "Nothing matches that search" : tab === "following" ? (signedIn ? "No posts from people you follow yet" : "Sign in to follow accounts") : "Nothing here yet"}
            text={query ? "Try another word, or clear the search." : tab === "following" ? "Tap + Follow on a post to see that account's posts here." : `Be the first to share something${region ? ` from ${region}` : ""}.`}
            action={<Button title="+ Post on PAHAD+" onPress={() => router.push("/new")} />}
          />
        </View>
      ) : height > 0 ? (
        <FlatList
          data={items}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => <Reel card={item} height={height} onChange={onChange} />}
          pagingEnabled
          snapToInterval={height}
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          getItemLayout={(_, i) => ({ length: height, offset: height * i, index: i })}
          windowSize={3}
          initialNumToRender={2}
          maxToRenderPerBatch={2}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={C.ochre} colors={[C.ochre]} progressViewOffset={insets.top + 100} />}
        />
      ) : null}

      {/* Header over the picture: tabs, PAHAD's picks, hub pills. */}
      <View style={[st.header, { paddingTop: insets.top + 10 }]} pointerEvents="box-none">
        <View style={st.topRow}>
          <View style={st.brand}>
            <View style={st.logo}><Text style={{ color: C.page, fontWeight: "900" }}>▲</Text></View>
            <Text style={st.brandText}>PAHAD+</Text>
          </View>
          <View style={st.tabs}>
            {TABS.map((t) => (
              <Pressable key={t.key} onPress={() => setTab(t.key)} style={[st.tab, tab === t.key && st.tabOn]}>
                <Text style={[st.tabText, tab === t.key && { color: C.ink, fontWeight: "900" }]}>{t.label}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable onPress={() => setSearching((v) => !v)} style={st.iconBtn} accessibilityLabel="Search"><Text style={{ fontSize: 17 }}>🔍</Text></Pressable>
          <Pressable onPress={() => setTab(tab === "pahad" ? "community" : "pahad")} style={[st.iconBtn, tab === "pahad" && { backgroundColor: C.ochre }]} accessibilityLabel="PAHAD's picks">
            <Text style={{ fontSize: 17 }}>⭐</Text>
          </Pressable>
        </View>
        {searching ? (
          <TextInput
            value={q}
            onChangeText={setQ}
            onSubmitEditing={() => setQuery(q.trim())}
            placeholder="Search PAHAD+"
            placeholderTextColor={C.faint}
            returnKeyType="search"
            autoFocus={!params.q}
            style={st.search}
          />
        ) : null}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }} contentContainerStyle={{ paddingRight: 16 }}>
          <Chip label="All" on={!hub} onPress={() => setHub(undefined)} />
          {PILLS.map((p) => <Chip key={p.key} label={p.label} on={hub === p.key} onPress={() => setHub(hub === p.key ? undefined : p.key)} />)}
        </ScrollView>
        {hub === "briefs" ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
            <Chip label="All briefs" on={!type} onPress={() => setType(undefined)} />
            {briefTypes.map((b) => <Chip key={b.key} label={`${b.emoji} ${b.label}`} on={type === b.key} onPress={() => setType(b.key)} />)}
          </ScrollView>
        ) : null}
        {(region || query || tab === "pahad") ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
            {tab === "pahad" ? <Text style={st.tag}>⭐ PAHAD&apos;s picks</Text> : null}
            {region ? <Text style={st.tag} onPress={() => setRegion(undefined)}>{region}  ✕</Text> : null}
            {query ? <Text style={st.tag} onPress={() => { setQuery(""); setQ(""); }}>“{query}”  ✕</Text> : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  header: { position: "absolute", top: 0, left: 0, right: 0, paddingHorizontal: 12 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  brand: { flexDirection: "row", alignItems: "center", gap: 6 },
  logo: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.clay, alignItems: "center", justifyContent: "center" },
  brandText: { color: C.ink, fontFamily: "serif", fontWeight: "700", fontSize: 17 },
  tabs: { flex: 1, flexDirection: "row", justifyContent: "center", gap: 10 },
  tab: { paddingBottom: 4, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabOn: { borderBottomColor: C.ochre },
  tabText: { color: "rgba(244,241,234,0.7)", fontWeight: "700", fontSize: 13 },
  iconBtn: { width: 38, height: 38, borderRadius: 14, backgroundColor: "rgba(29,53,58,0.85)", alignItems: "center", justifyContent: "center" },
  search: { marginTop: 10, backgroundColor: "rgba(11,17,19,0.85)", borderColor: C.line, borderWidth: 1, borderRadius: R.pill, color: C.ink, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15 },
  tag: { backgroundColor: C.ink, color: C.page, fontWeight: "800", fontSize: 12, paddingHorizontal: 12, paddingVertical: 5, borderRadius: R.pill, overflow: "hidden" },
});
