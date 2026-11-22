import { memo, useRef, useState } from "react";
import { Share, StyleSheet, Text, View, Pressable } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import { api, siteUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { C, R } from "@/lib/theme";
import type { Card } from "@/lib/types";
import { Badge, TrustBadge } from "./ui";

/** Open a card: PAHAD+ posts and circulars in the app; PAHAD website articles in the in-app browser. */
export function openCard(c: Pick<Card, "id" | "open" | "href">) {
  if (c.open === "post") router.push({ pathname: "/post/[id]", params: { id: c.id } });
  else if (c.open === "circular") router.push({ pathname: "/circular/[id]", params: { id: c.id.replace(/^circular-/, "") } });
  else WebBrowser.openBrowserAsync(siteUrl(c.href)).catch(() => {});
}

export function shareCard(c: Pick<Card, "title" | "href">) {
  Share.share({ message: `${c.title}\n${siteUrl(c.href)}` }).catch(() => {});
}

/** Like / save / support / follow with the change shown straight away, then confirmed by pahad.org. */
export function useCardActions(initial: Card, onChange?: (c: Card) => void) {
  const { signedIn } = useAuth();
  const [c, setC] = useState(initial);
  const update = (next: Card) => { setC(next); onChange?.(next); };
  const need = () => { if (!signedIn) { router.push("/login"); return true; } return false; };
  const toggle = async (kind: "like" | "save" | "support" | "follow") => {
    if (need()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const before = c;
    const opt: Card =
      kind === "like" ? { ...c, liked: !c.liked, likes: c.likes + (c.liked ? -1 : 1) }
      : kind === "save" ? { ...c, saved: !c.saved }
      : kind === "support" ? { ...c, supported: !c.supported, supports: c.supports + (c.supported ? -1 : 1) }
      : { ...c, following: !c.following };
    update(opt);
    try {
      const r = kind === "like" ? await api.like(c.id) : kind === "save" ? await api.save(c.id) : kind === "support" ? await api.support(c.id) : await api.follow(c.authorId);
      if (!r.ok) update(before);
      else if (kind === "like" && typeof r.count === "number") update({ ...opt, liked: Boolean(r.on), likes: r.count });
      else if (kind === "support" && typeof r.count === "number") update({ ...opt, supported: Boolean(r.on), supports: r.count });
    } catch {
      update(before);
    }
  };
  return { c, toggle };
}

const GRADIENTS: Record<string, string> = { events: "#3B2A24", roam: "#1F3936", business: "#2E2A1F", briefs: "#22303A", jobs: "#2A2638" };

function RailButton({ glyph, label, on, onPress }: { glyph: string; label: string; on?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [st.rail, pressed && { transform: [{ scale: 0.9 }] }]} accessibilityRole="button" accessibilityLabel={label}>
      <View style={[st.railIcon, on && { backgroundColor: C.ochre }]}><Text style={{ fontSize: 22 }}>{glyph}</Text></View>
      <Text style={st.railText}>{label}</Text>
    </Pressable>
  );
}

/** One full-screen post in the Valley feed. Double-tap to like. */
export const Reel = memo(function Reel({ card, height, onChange }: { card: Card; height: number; onChange?: (c: Card) => void }) {
  const { c, toggle } = useCardActions(card, onChange);
  const lastTap = useRef(0);
  const [burst, setBurst] = useState(false);
  const isUser = c.source === "user";

  const onTap = () => {
    const t = Date.now();
    if (t - lastTap.current < 300 && isUser) {
      if (!c.liked) toggle("like");
      setBurst(true);
      setTimeout(() => setBurst(false), 700);
    }
    lastTap.current = t;
  };

  const cta = () => {
    if (c.cta.url && c.cta.external) WebBrowser.openBrowserAsync(c.cta.url).catch(() => {});
    else openCard(c);
  };

  return (
    <View style={{ height, backgroundColor: GRADIENTS[c.hubKey] ?? C.panel }}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onTap}>
        {c.image ? (
          <Image source={{ uri: c.image }} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} />
        ) : (
          <View style={[StyleSheet.absoluteFill, st.noMedia]}>
            <Text style={{ fontSize: 56 }}>{c.emoji}</Text>
            <Text style={{ color: C.muted, fontWeight: "800", marginTop: 10 }}>No Media Attached Yet</Text>
          </View>
        )}
        <View style={st.shadeTop} />
        <View style={st.shadeBottom} />
        {c.youtubeId ? <View style={st.play}><Text style={{ fontSize: 26, color: C.page }}>▶</Text></View> : null}
        {burst ? <Text style={st.burst}>❤️</Text> : null}
      </Pressable>

      <View style={st.info} pointerEvents="box-none">
        <View style={st.row}>
          <Pressable onPress={() => isUser && c.authorId && router.push({ pathname: "/user/[id]", params: { id: c.authorId } })} style={st.authorRow}>
            <View style={st.avatar}><Text style={st.avatarText}>{(c.author[0] ?? "P").toUpperCase()}</Text></View>
            <View style={{ flexShrink: 1 }}>
              <Text style={st.author} numberOfLines={1}>{c.author}</Text>
              <View style={[st.row, { gap: 6, marginTop: 3 }]}>
                <TrustBadge trust={c.trust} />
                {c.authentic ? <Badge label="✓ Authentic" tone="sage" /> : null}
                {c.authorBadge ? <Badge label={c.authorBadge} tone="cream" /> : null}
              </View>
            </View>
          </Pressable>
          {c.canFollow ? (
            <Pressable onPress={() => toggle("follow")} style={[st.follow, c.following && { backgroundColor: "transparent", borderColor: C.ink }]}>
              <Text style={[st.followText, c.following && { color: C.ink }]}>{c.following ? "Following" : "+ Follow"}</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={[st.hubTag, c.alert && { backgroundColor: C.clay }]}>
          <Text style={st.hubTagText}>{c.emoji} {c.hubLabel.toUpperCase()}{c.kind ? ` · ${c.kind.toUpperCase()}` : ""}</Text>
        </View>
        <Text style={st.place}>{[c.locality, c.region].filter(Boolean).join(", ")}{c.when ? `  •  ${c.when}` : ""}</Text>
        <Pressable onPress={() => openCard(c)}>
          <Text style={st.title} numberOfLines={3}>{c.title}</Text>
          {c.summary ? <Text style={st.summary} numberOfLines={2}>{c.summary.replace(/^#+\s*/gm, "")}</Text> : null}
        </Pressable>
        <View style={[st.row, { gap: 10, marginTop: 14 }]}>
          <Pressable onPress={cta} style={({ pressed }) => [st.cta, pressed && { transform: [{ scale: 0.97 }] }]}>
            <Text style={st.ctaText}>{c.cta.label}{c.cta.external ? " ↗" : ""}</Text>
          </Pressable>
          <Pressable onPress={() => openCard(c)} style={({ pressed }) => [st.details, pressed && { opacity: 0.7 }]}>
            <Text style={st.detailsText}>Details</Text>
          </Pressable>
        </View>
      </View>

      <View style={st.rails}>
        {isUser ? <RailButton glyph={c.liked ? "❤️" : "🤍"} label={String(c.likes)} on={c.liked} onPress={() => toggle("like")} /> : null}
        {isUser ? <RailButton glyph="🤝" label={c.supports ? String(c.supports) : "Support"} on={c.supported} onPress={() => toggle("support")} /> : null}
        {isUser ? <RailButton glyph={c.saved ? "🔖" : "📑"} label={c.saved ? "Saved" : "Save"} on={c.saved} onPress={() => toggle("save")} /> : null}
        <RailButton glyph="📤" label="Share" onPress={() => shareCard(c)} />
      </View>
    </View>
  );
});

const st = StyleSheet.create({
  noMedia: { alignItems: "center", justifyContent: "center" },
  shadeTop: { position: "absolute", top: 0, left: 0, right: 0, height: 190, backgroundColor: "rgba(17,24,27,0.55)" },
  shadeBottom: { position: "absolute", bottom: 0, left: 0, right: 0, height: "62%", backgroundColor: "rgba(11,17,19,0.62)" },
  play: { position: "absolute", top: "38%", alignSelf: "center", width: 64, height: 64, borderRadius: 32, backgroundColor: C.clay, alignItems: "center", justifyContent: "center" },
  burst: { position: "absolute", top: "40%", alignSelf: "center", fontSize: 90 },
  info: { position: "absolute", left: 16, right: 84, bottom: 22 },
  row: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 10, flexShrink: 1, marginRight: 10 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: C.clay, alignItems: "center", justifyContent: "center" },
  avatarText: { color: C.page, fontWeight: "900", fontSize: 18 },
  author: { color: C.ink, fontWeight: "800", fontSize: 16 },
  follow: { backgroundColor: C.ink, borderRadius: R.pill, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: C.ink },
  followText: { color: C.page, fontWeight: "800", fontSize: 13 },
  hubTag: { alignSelf: "flex-start", backgroundColor: C.clay, borderRadius: R.pill, paddingHorizontal: 12, paddingVertical: 5, marginTop: 14 },
  hubTagText: { color: C.page, fontWeight: "900", fontSize: 11, letterSpacing: 0.5 },
  place: { color: C.muted, marginTop: 8, fontSize: 13, fontWeight: "600" },
  title: { color: C.ink, fontFamily: "serif", fontWeight: "700", fontSize: 26, lineHeight: 31, marginTop: 6 },
  summary: { color: C.muted, fontSize: 14, lineHeight: 20, marginTop: 6 },
  cta: { backgroundColor: C.ink, borderRadius: R.pill, paddingHorizontal: 18, paddingVertical: 12 },
  ctaText: { color: C.page, fontWeight: "900", fontSize: 14 },
  details: { borderRadius: R.pill, paddingHorizontal: 18, paddingVertical: 12, borderWidth: 1, borderColor: "rgba(244,241,234,0.4)" },
  detailsText: { color: C.ink, fontWeight: "800", fontSize: 14 },
  rails: { position: "absolute", right: 10, bottom: 30, alignItems: "center", gap: 14 },
  rail: { alignItems: "center" },
  railIcon: { width: 50, height: 50, borderRadius: 18, backgroundColor: "rgba(29,53,58,0.85)", alignItems: "center", justifyContent: "center" },
  railText: { color: C.ink, fontWeight: "800", fontSize: 12, marginTop: 4 },
});
