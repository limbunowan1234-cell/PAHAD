import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { WebView } from "react-native-webview";
import { C, R } from "@/lib/theme";
import type { Card } from "@/lib/types";
import { openCard } from "./Reel";
import { Badge, Tap, TrustBadge } from "./ui";

/** A post in a list or grid (Discover, profiles, Me). */
export function Tile({ c, wide, footer }: { c: Card; wide?: boolean; footer?: React.ReactNode }) {
  return (
    <Tap onPress={() => openCard(c)} style={[st.tile, wide ? { width: "100%" } : { width: "48.5%" }]}>
      <View style={[st.media, wide && { aspectRatio: 16 / 9 }]}>
        {c.image ? <Image source={{ uri: c.image }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} /> : <Text style={{ fontSize: 34 }}>{c.emoji}</Text>}
        <View style={st.hub}><Text style={st.hubText}>{c.emoji} {c.hubLabel}</Text></View>
      </View>
      <View style={{ padding: 10 }}>
        <Text style={st.title} numberOfLines={2}>{c.title}</Text>
        <Text style={st.meta} numberOfLines={1}>{[c.region, c.author].filter(Boolean).join(" · ")}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
          <TrustBadge trust={c.trust} />
          {c.authentic ? <Badge label="✓ Authentic" tone="sage" /> : null}
        </View>
        {footer}
      </View>
    </Tap>
  );
}

/** A YouTube video, played inside the app (youtube-nocookie). */
export function YouTube({ id, title }: { id: string; title: string }) {
  return (
    <View style={st.video} accessibilityLabel={`Video: ${title}`}>
      <WebView
        source={{ uri: `https://www.youtube-nocookie.com/embed/${id}?playsinline=1&rel=0&modestbranding=1` }}
        allowsFullscreenVideo
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        style={{ backgroundColor: "#000" }}
      />
    </View>
  );
}

const st = StyleSheet.create({
  tile: { backgroundColor: C.card, borderRadius: R.md, overflow: "hidden", borderWidth: 1, borderColor: C.line, marginBottom: 10 },
  media: { aspectRatio: 1, backgroundColor: C.panel, alignItems: "center", justifyContent: "center" },
  hub: { position: "absolute", left: 8, top: 8, backgroundColor: "rgba(17,24,27,0.8)", borderRadius: R.pill, paddingHorizontal: 8, paddingVertical: 3 },
  hubText: { color: C.ink, fontSize: 10, fontWeight: "800" },
  title: { color: C.ink, fontWeight: "800", fontSize: 14, lineHeight: 19 },
  meta: { color: C.muted, fontSize: 12, marginTop: 3 },
  video: { aspectRatio: 16 / 9, borderRadius: R.md, overflow: "hidden", backgroundColor: "#000", marginTop: 16 },
});
