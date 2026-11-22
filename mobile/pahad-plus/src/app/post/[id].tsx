import { useState } from "react";
import { Alert, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { router, Stack, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useVideoPlayer, VideoView } from "expo-video";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { dateTime, plusDate, waLink } from "@/lib/format";
import { useLoad } from "@/lib/useLoad";
import { C, R } from "@/lib/theme";
import type { PostDetail } from "@/lib/types";
import { shareCard, useCardActions } from "@/components/Reel";
import { YouTube } from "@/components/Tiles";
import { Badge, Button, Card, ErrorView, H1, Loading, Notice, P, TrustBadge } from "@/components/ui";

const REASONS = ["Wrong or misleading", "Spam or scam", "Offensive or unsafe", "Not in the hills region", "Other"];

function FileVideo({ url }: { url: string }) {
  const player = useVideoPlayer(url, (p) => { p.loop = false; });
  return <VideoView player={player} style={{ width: "100%", aspectRatio: 16 / 9, marginTop: 16, borderRadius: R.md, backgroundColor: "#000" }} nativeControls contentFit="contain" fullscreenOptions={{ enable: true }} />;
}

function Actions({ d }: { d: PostDetail }) {
  const { c, toggle } = useCardActions(d.card);
  if (!d.live || c.source !== "user") return null;
  return (
    <View style={st.actions}>
      <Pressable onPress={() => toggle("like")} style={[st.act, c.liked && st.actOn]}><Text style={st.actText}>{c.liked ? "❤️" : "🤍"} {c.likes}</Text></Pressable>
      <Pressable onPress={() => toggle("save")} style={[st.act, c.saved && st.actOn]}><Text style={st.actText}>{c.saved ? "🔖 Saved" : "📑 Save"}</Text></Pressable>
      {!d.mine ? <Pressable onPress={() => toggle("support")} style={[st.act, c.supported && st.actOn]}><Text style={st.actText}>🤝 {c.supports || "Support"}</Text></Pressable> : null}
      {!d.mine && c.authorId ? <Pressable onPress={() => toggle("follow")} style={[st.act, c.following && st.actOn]}><Text style={st.actText}>{c.following ? "Following" : "+ Follow"}</Text></Pressable> : null}
      <Pressable onPress={() => shareCard(c)} style={st.act}><Text style={st.actText}>📤 Share</Text></Pressable>
    </View>
  );
}

function EPass({ d, reload }: { d: PostDetail; reload: () => void }) {
  const p = d.pass!;
  const { signedIn } = useAuth();
  const [msg, setMsg] = useState("");
  const get = async () => {
    const r = await api.registerPass(d.card.id);
    const code = r.redirect?.match(/\/plus\/pass\/([A-Z0-9]+)/)?.[1];
    if (code) router.push({ pathname: "/pass/[code]", params: { code } });
    else setMsg(r.message);
    reload();
  };
  return (
    <Card style={{ marginTop: 16, borderColor: C.ochre }}>
      <Text style={{ color: C.ochre, fontWeight: "900", fontSize: 16 }}>🎟 {p.label}</Text>
      {p.state === "holding" ? (
        <Button style={{ marginTop: 12 }} title={p.myStatus === "checked_in" ? "Checked in · view E-Pass" : p.myStatus === "pending" ? "Request sent · view E-Pass" : "View my E-Pass"} onPress={() => router.push({ pathname: "/pass/[code]", params: { code: p.myCode } })} />
      ) : p.state === "unverified" ? <P muted style={{ marginTop: 6 }}>E-Passes open once PAHAD verifies this event.</P>
      : p.state === "closed" ? <P muted style={{ marginTop: 6 }}>E-Passes are closed: the event has ended.</P>
      : p.state === "soldout" ? <P muted style={{ marginTop: 6 }}>All E-Passes have gone.</P>
      : p.state === "paused" ? <P muted style={{ marginTop: 6 }}>Sales for this event are paused.</P>
      : p.state === "signin" || !signedIn ? <Button style={{ marginTop: 12 }} title={`Sign in to ${p.price > 0 ? "buy" : "get"} an E-Pass`} onPress={() => router.push("/login")} />
      : p.state === "buy" ? (
        <>
          <Button style={{ marginTop: 12 }} kind="accent" title={`Buy ${p.label}`} onPress={() => router.push({ pathname: "/pay/[id]", params: { id: d.card.id } })} />
          <P muted style={{ marginTop: 8, fontSize: 12 }}>Secure payment by Razorpay (UPI, cards, net banking) to PAHAD.{p.left !== null ? ` ${p.left} of ${p.capacity} left.` : ""}</P>
        </>
      ) : (
        <>
          <Button style={{ marginTop: 12 }} title={p.approval ? "Request an E-Pass" : "Get my free E-Pass"} onPress={get} />
          {p.left !== null ? <P muted style={{ marginTop: 8, fontSize: 12 }}>{p.left} of {p.capacity} left</P> : null}
        </>
      )}
      {msg ? <P style={{ marginTop: 8 }}>{msg}</P> : null}
      {p.canCheckIn ? <Button kind="outline" small style={{ marginTop: 12 }} title={`Check-in & registrations (${p.registrations ?? 0})`} onPress={() => router.push({ pathname: "/checkin/[id]", params: { id: d.card.id } })} /> : null}
    </Card>
  );
}

export default function PostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { signedIn, refresh: refreshAll } = useAuth();
  const { data: d, error, loading, refreshing, refresh, reload } = useLoad(() => api.post(id), [id]);
  if (loading && !d) return <Loading />;
  if (error && !d) return <ErrorView message={error} onRetry={reload} />;
  if (!d) return null;
  const c = d.card;
  const l = d.locked;
  const open = (url: string) => WebBrowser.openBrowserAsync(url).catch(() => Linking.openURL(url));

  const report = () => {
    if (!signedIn) return router.push("/login");
    Alert.alert("Report this post", "What's wrong?", [
      ...REASONS.map((reason) => ({ text: reason, onPress: async () => { const r = await api.report(c.id, reason, ""); Alert.alert("Thank you", r.message); } })),
      { text: "Cancel", style: "cancel" as const },
    ]);
  };
  const block = () => {
    if (!signedIn) return router.push("/login");
    Alert.alert(`Block ${c.author}?`, "You won't see their posts.", [
      { text: "Cancel", style: "cancel" },
      { text: "Block", style: "destructive", onPress: async () => { const r = await api.block(c.authorId); Alert.alert(r.ok ? "Blocked" : "Couldn't block", r.message); refreshAll(); router.back(); } },
    ]);
  };
  const remove = () =>
    Alert.alert("Remove this post from PAHAD+?", "", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: async () => { const r = await api.deletePost(c.id); Alert.alert(r.message); refreshAll(); reload(); } },
    ]);

  return (
    <>
      <Stack.Screen options={{ title: c.hubLabel }} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={C.ochre} colors={[C.ochre]} />}>
        {c.image ? <Image source={{ uri: c.image }} style={{ width: "100%", aspectRatio: 16 / 10 }} contentFit="cover" transition={250} /> : null}
        <View style={{ padding: 16 }}>
          {d.statusNote ? <Notice text={d.statusNote} /> : null}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            <Badge label={`${c.emoji} ${c.hubLabel}`} />
            <TrustBadge trust={c.trust} />
            {c.authentic ? <Badge label="✓ Authentic" tone="sage" /> : null}
            {c.authorBadge ? <Badge label={c.authorBadge} tone="cream" /> : null}
          </View>
          <H1 style={{ marginTop: 12 }}>{c.title}</H1>
          <P muted style={{ marginTop: 6 }}>📍 {[c.locality, c.region].filter(Boolean).join(", ")}</P>
          {c.when ? <Text style={{ color: C.sage, fontWeight: "800", marginTop: 4 }}>🗓 {c.when}</Text> : null}
          {c.summary ? <P style={{ marginTop: 12 }}>{c.summary}</P> : null}

          <View style={st.facts}>
            {c.kind ? <Fact k="Kind" v={c.kind} /> : null}
            {d.stage ? <Fact k="Stage" v={d.stage} /> : null}
            {d.bestSeason ? <Fact k="Best season" v={d.bestSeason} /> : null}
            {d.hours ? <Fact k="Hours" v={d.hours} /> : null}
            {d.endsAt ? <Fact k="Ends" v={dateTime(d.endsAt)} /> : null}
            {d.deadline ? <Fact k="Last date" v={plusDate(d.deadline)} /> : null}
          </View>

          {d.body ? <P style={{ marginTop: 14, lineHeight: 23 }}>{d.body}</P> : null}
          {c.youtubeId ? <YouTube id={c.youtubeId} title={c.title} /> : null}
          {c.videoUrl ? <FileVideo url={c.videoUrl} /> : null}

          {l && Object.values(l).some(Boolean) ? (
            <Card style={{ marginTop: 16, backgroundColor: C.sageDeep }}>
              {c.contactsUnverified ? <Notice text="◷ The poster chose to show these before PAHAD verified the post. Check before you pay or share personal details." /> : null}
              {l.venue ? <Fact k="Venue" v={l.venue} /> : null}
              {l.organiser ? <Fact k="Organiser" v={l.organiser} /> : null}
              {l.address ? <Fact k="Address" v={l.address} /> : null}
              {l.regId ? <Fact k="Registration ID" v={l.regId} /> : null}
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                {l.phone ? <Button small title="📞 Call" onPress={() => Linking.openURL(`tel:${l.phone}`)} /> : null}
                {l.whatsapp ? <Button small title="WhatsApp" onPress={() => Linking.openURL(waLink(l.whatsapp))} /> : null}
                {l.email ? <Button small title="✉ Email" onPress={() => Linking.openURL(`mailto:${l.email}`)} /> : null}
                {l.instagram ? <Button small title={`Instagram ${l.instagram}`} onPress={() => open(`https://instagram.com/${encodeURIComponent(l.instagram.replace(/^@/, ""))}`)} /> : null}
                {l.link ? <Button small kind="accent" title={c.hub === "events" ? "Register ↗" : c.hub === "briefs" ? "Apply / source ↗" : "Book ↗"} onPress={() => open(l.link)} /> : null}
                {l.website ? <Button small kind="outline" title="Website ↗" onPress={() => open(l.website)} /> : null}
                {l.mapLink ? <Button small kind="outline" title="Map ↗" onPress={() => open(l.mapLink)} /> : null}
              </View>
            </Card>
          ) : null}
          {!c.verified ? <Notice text={`🔒 Contact and booking details unlock once a PAHAD verifier checks this ${c.hub === "events" ? "event" : "post"}.`} /> : null}

          {d.pass ? <EPass d={d} reload={reload} /> : null}
          <Actions d={d} />

          <Pressable onPress={() => c.authorId && router.push({ pathname: "/user/[id]", params: { id: c.authorId } })}>
            <P muted style={{ marginTop: 18, fontSize: 13 }}>
              Posted by <Text style={{ textDecorationLine: c.authorId ? "underline" : "none", color: C.ink }}>{c.author}</Text>
              {c.authorMember ? " · PAHAD member" : ""} · {plusDate(c.createdAt)}{d.verifiedByPahad ? " · verified by PAHAD" : ""}
            </P>
          </Pressable>

          <View style={{ marginTop: 18, gap: 10 }}>
            {d.mine ? (d.status !== "removed" ? <Button kind="danger" title="Remove my post" onPress={remove} /> : null) : c.source === "user" ? (
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Button kind="outline" small title="Report" onPress={report} />
                {c.authorId ? <Button kind="outline" small title={`Block ${c.author}`} onPress={block} /> : null}
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </>
  );
}

function Fact({ k, v }: { k: string; v: string }) {
  return (
    <View style={{ marginTop: 6, minWidth: "45%" }}>
      <Text style={{ color: C.muted, fontSize: 12 }}>{k}</Text>
      <Text style={{ color: C.ink, fontWeight: "700", fontSize: 14 }}>{v}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  facts: { flexDirection: "row", flexWrap: "wrap", columnGap: 16, marginTop: 8 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 18 },
  act: { backgroundColor: C.card, borderRadius: R.pill, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1, borderColor: C.line },
  actOn: { borderColor: C.ochre, backgroundColor: C.cream },
  actText: { color: C.ink, fontWeight: "800", fontSize: 13 },
});
