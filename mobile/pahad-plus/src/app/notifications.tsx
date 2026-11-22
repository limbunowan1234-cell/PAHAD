import { useEffect } from "react";
import { FlatList, RefreshControl, Text, View } from "react-native";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { api, siteUrl } from "@/lib/api";
import { plusDate } from "@/lib/format";
import { useLoad } from "@/lib/useLoad";
import { C, R } from "@/lib/theme";
import type { Note } from "@/lib/types";
import { Empty, ErrorView, Loading, Tap } from "@/components/ui";

/** In-app links: /plus/<id>, /plus/pass/<code>, /plus/u/<id>, /plus/me open screens; anything else opens the website. */
function openLink(url: string) {
  if (!url) return;
  const m = url.match(/^\/plus\/(pass|u|c)\/([\w-]+)/) ?? url.match(/^\/plus\/([\w-]{8,})$/);
  if (m && m.length === 3) {
    const [, kind, id] = m;
    if (kind === "pass") return router.push({ pathname: "/pass/[code]", params: { code: id } });
    if (kind === "u") return router.push({ pathname: "/user/[id]", params: { id } });
    if (kind === "c") return router.push({ pathname: "/circular/[id]", params: { id } });
  }
  if (m && m.length === 2) return router.push({ pathname: "/post/[id]", params: { id: m[1] } });
  if (url.startsWith("/plus/me")) return router.push("/me");
  WebBrowser.openBrowserAsync(siteUrl(url)).catch(() => {});
}

export default function Notifications() {
  const { data, error, loading, refreshing, refresh, reload } = useLoad(() => api.me());
  useEffect(() => { if (data?.unread) api.notificationsRead().catch(() => {}); }, [data?.unread]);
  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorView message={error} onRetry={reload} />;
  const notes = data?.notifications ?? [];
  return (
    <FlatList<Note>
      data={notes}
      keyExtractor={(n) => n.id}
      contentContainerStyle={{ padding: 16, flexGrow: 1 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={C.ochre} colors={[C.ochre]} />}
      ListEmptyComponent={<Empty emoji="🔔" title="No notifications yet" text="Verification results, E-Pass updates and support on your posts appear here." />}
      renderItem={({ item: n }) => (
        <Tap onPress={() => openLink(n.url)} style={{ backgroundColor: n.read ? C.card : C.cream, borderRadius: R.md, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.line }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
            <Text style={{ color: C.ink, fontWeight: "800", flex: 1 }}>{n.title}</Text>
            <Text style={{ color: C.muted, fontSize: 11 }}>{plusDate(n.createdAt, { day: "numeric", month: "short" })}</Text>
          </View>
          {n.body ? <Text style={{ color: C.muted, marginTop: 4, lineHeight: 19 }}>{n.body}</Text> : null}
        </Tap>
      )}
    />
  );
}
