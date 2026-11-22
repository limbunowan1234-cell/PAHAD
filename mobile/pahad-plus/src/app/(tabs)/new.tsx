import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLoad } from "@/lib/useLoad";
import { C, R } from "@/lib/theme";
import { Button, Chip, Empty, Field, H1, Label, Notice, P } from "@/components/ui";

type HubKey = "events" | "roam" | "business" | "briefs";
const pad = (n: number) => String(n).padStart(2, "0");
/** The website expects local (Indian) time as YYYY-MM-DDTHH:mm, and dates as YYYY-MM-DD. */
const toLocal = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const toDate = (d: Date) => toLocal(d).slice(0, 10);
const show = (v: string) => (v ? new Date(v.length === 10 ? `${v}T00:00` : v).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", ...(v.length > 10 ? { hour: "2-digit", minute: "2-digit" } : {}) }) : "");

function DateField({ label, value, onChange, withTime }: { label: string; value: string; onChange: (v: string) => void; withTime?: boolean }) {
  const [iosOpen, setIosOpen] = useState(false);
  const current = value ? new Date(value.length === 10 ? `${value}T00:00` : value) : new Date();
  const open = () => {
    if (Platform.OS !== "android") return setIosOpen((v) => !v);
    DateTimePickerAndroid.open({
      value: current, mode: "date", minimumDate: new Date(),
      onChange: (e: DateTimePickerEvent, d?: Date) => {
        if (e.type !== "set" || !d) return;
        if (!withTime) return onChange(toDate(d));
        DateTimePickerAndroid.open({ value: d, mode: "time", is24Hour: false, onChange: (e2, t) => { if (e2.type === "set" && t) onChange(toLocal(t)); } });
      },
    });
  };
  return (
    <View style={{ marginBottom: 14 }}>
      <Label>{label}</Label>
      <Pressable onPress={open} style={{ backgroundColor: C.page, borderWidth: 1, borderColor: C.line, borderRadius: R.md, padding: 14, flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ color: value ? C.ink : C.faint, fontSize: 15 }}>{value ? show(value) : "Choose…"}</Text>
        {value ? <Text style={{ color: C.muted }} onPress={() => onChange("")}>✕</Text> : <Text>🗓</Text>}
      </Pressable>
      {iosOpen ? <DateTimePicker value={current} mode={withTime ? "datetime" : "date"} minimumDate={new Date()} display="inline" onChange={(_, d) => d && onChange(withTime ? toLocal(d) : toDate(d))} /> : null}
    </View>
  );
}

export default function NewPost() {
  const { signedIn, config, refresh } = useAuth();
  const insets = useSafeAreaInsets();
  const me = useLoad(() => (signedIn ? api.me() : Promise.resolve(null)), [signedIn]);
  const [hub, setHub] = useState<HubKey>("events");
  const [briefType, setBriefType] = useState("alert");
  const [f, setF] = useState<Record<string, string>>({ region: "Darjeeling" });
  const [flags, setFlags] = useState({ show_contacts: false, pass_enabled: false, approval: false });
  const [photo, setPhoto] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [msg, setMsg] = useState("");
  const set = (k: string) => (v: string) => setF((x) => ({ ...x, [k]: v }));

  if (!signedIn) {
    return <View style={{ flex: 1, paddingTop: insets.top + 60 }}><Empty emoji="✍️" title="Share something from the hills" text="Sign in to post events, places to roam, local businesses, alerts and jobs." action={<Button title="Sign in" onPress={() => router.push("/login")} />} /></View>;
  }
  const profile = me.data?.profile;

  const pick = async (camera: boolean) => {
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 0.8, allowsEditing: true, aspect: [4, 5] };
    if (camera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return setMsg("Camera permission is needed to take a photo.");
    }
    const r = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (r.canceled || !r.assets[0]) return;
    const a = r.assets[0];
    if (a.fileSize && a.fileSize > 4 * 1024 * 1024) return setMsg("That photo is over 4 MB. Choose a smaller one.");
    setPhoto({ uri: a.uri, name: a.fileName ?? "photo.jpg", type: a.mimeType ?? "image/jpeg" });
  };

  const submit = async () => {
    setMsg("");
    const fields: Record<string, string | boolean | undefined> = {
      ...f, hub, show_contacts: flags.show_contacts,
      ...(hub === "briefs" ? { brief_type: briefType } : {}),
      ...(hub === "events" ? { pass_enabled: flags.pass_enabled, pass_mode: flags.approval ? "approval" : "" } : {}),
      contact_phone: f.contact_phone ?? (profile?.phone || ""),
      contact_instagram: f.contact_instagram ?? (profile?.instagram || ""),
      contact_email: f.contact_email ?? (profile?.contactEmail || ""),
    };
    try {
      const r = await api.createPost(fields, photo ?? undefined);
      const id = r.redirect?.match(/\/plus\/([\w-]+)\?posted=1/)?.[1];
      if (r.ok && id) {
        setF({ region: f.region }); setPhoto(null); refresh();
        router.push({ pathname: "/post/[id]", params: { id } });
      } else setMsg(r.message);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Couldn't post.");
    }
  };

  const briefTypes = (config?.briefTypes ?? []).filter((b) => b.userCanPost);
  const roamKinds = config?.roamKinds ?? [];

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.page }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <H1>New post</H1>
        <P muted style={{ marginTop: 4, marginBottom: 16 }}>It goes live as Unverified. Contact and booking details unlock once a PAHAD verifier checks it.</P>
        {profile && !profile.emailVerified ? <Notice text="Please confirm your email first (Profile → Resend confirmation link)." tone="error" /> : null}
        {msg ? <Notice text={msg} tone="error" /> : null}

        <Label>What are you sharing?</Label>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
          {(config?.hubs ?? []).map((h) => <Chip key={h.key} label={`${h.emoji} ${h.label}`} on={hub === h.key} onPress={() => setHub(h.key as HubKey)} />)}
        </ScrollView>
        {hub === "briefs" ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
            {briefTypes.map((b) => <Chip key={b.key} label={`${b.emoji} ${b.label}`} on={briefType === b.key} onPress={() => setBriefType(b.key)} />)}
          </ScrollView>
        ) : null}

        <Label>Photo</Label>
        {photo ? (
          <View style={{ marginBottom: 14 }}>
            <Image source={{ uri: photo.uri }} style={{ width: "100%", aspectRatio: 4 / 5, borderRadius: R.md }} contentFit="cover" />
            <Text style={{ color: C.danger, fontWeight: "700", marginTop: 8 }} onPress={() => setPhoto(null)}>Remove photo</Text>
          </View>
        ) : (
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 14 }}>
            <Button small kind="outline" title="📷 Camera" onPress={() => pick(true)} />
            <Button small kind="outline" title="🖼 Gallery" onPress={() => pick(false)} />
          </View>
        )}

        <Field label="Title *" value={f.title ?? ""} onChangeText={set("title")} maxLength={120} />
        <Field label="Short summary *" value={f.summary ?? ""} onChangeText={set("summary")} maxLength={280} multiline />
        <Label>Region</Label>
        <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 14 }}>
          {(config?.regions ?? []).map((r) => <Chip key={r} label={r} on={f.region === r} onPress={() => set("region")(r)} />)}
        </View>
        <Field label="Town / locality" value={f.locality ?? ""} onChangeText={set("locality")} placeholder="e.g. Chowrasta, Darjeeling" />

        {hub === "events" ? (
          <>
            <DateField label="Starts *" value={f.starts_at ?? ""} onChange={set("starts_at")} withTime />
            <DateField label="Ends (optional)" value={f.ends_at ?? ""} onChange={set("ends_at")} withTime />
            <Field label="Venue" value={f.venue ?? ""} onChangeText={set("venue")} />
            <Field label="Organiser" value={f.organiser ?? ""} onChangeText={set("organiser")} />
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <Text style={{ color: C.ink, fontWeight: "700" }}>Offer E-Passes</Text>
              <Switch value={flags.pass_enabled} onValueChange={(v) => setFlags({ ...flags, pass_enabled: v })} trackColor={{ true: C.ochre, false: C.line }} thumbColor={C.ink} />
            </View>
            {flags.pass_enabled ? (
              <>
                <Field label="Places (0 = no limit)" value={f.pass_capacity ?? ""} onChangeText={set("pass_capacity")} keyboardType="number-pad" />
                <Field label="Price in ₹ (empty = free)" value={f.price ?? ""} onChangeText={set("price")} keyboardType="decimal-pad" hint="Paid E-Passes need PAHAD's approval as an organiser (Settings → Sell paid E-Passes)." />
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <Text style={{ color: C.ink, fontWeight: "700", flex: 1 }}>I approve each E-Pass request</Text>
                  <Switch value={flags.approval} onValueChange={(v) => setFlags({ ...flags, approval: v })} trackColor={{ true: C.ochre, false: C.line }} thumbColor={C.ink} />
                </View>
              </>
            ) : null}
          </>
        ) : null}

        {hub === "roam" ? (
          <>
            <Label>Kind of place</Label>
            <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 14 }}>{roamKinds.map((k) => <Chip key={k} label={k} on={f.kind === k} onPress={() => set("kind")(k)} />)}</View>
            <Label>Stage</Label>
            <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 14 }}>{(config?.roamStages ?? []).map((s) => <Chip key={s.key} label={s.label} on={(f.stage ?? "open") === s.key} onPress={() => set("stage")(s.key)} />)}</View>
            <Field label="Best season" value={f.best_season ?? ""} onChangeText={set("best_season")} placeholder="e.g. October to April" />
            <Field label="Hours" value={f.hours ?? ""} onChangeText={set("hours")} />
          </>
        ) : null}

        {hub === "business" ? (
          <>
            <Field label="Kind of business" value={f.kind ?? ""} onChangeText={set("kind")} placeholder="e.g. Café, Artisan shop" />
            <Field label="Hours" value={f.hours ?? ""} onChangeText={set("hours")} />
            <Field label="Registration / licence no. (optional)" value={f.reg_id ?? ""} onChangeText={set("reg_id")} hint="Shown only after PAHAD verifies the post." />
          </>
        ) : null}

        {hub === "briefs" && briefType === "alert" ? <Field label="Show for how many hours?" value={f.alert_hours ?? ""} onChangeText={set("alert_hours")} keyboardType="number-pad" placeholder={String(config?.rules.alertDefaultHours ?? 48)} /> : null}
        {hub === "briefs" && (briefType === "job" || briefType === "opportunity") ? <DateField label="Last date to apply *" value={f.deadline ?? ""} onChange={set("deadline")} /> : null}

        <Field label="Details" value={f.body ?? ""} onChangeText={set("body")} multiline maxLength={4000} />
        <Field label="YouTube or video link (optional)" value={f.youtube ?? ""} onChangeText={set("youtube")} autoCapitalize="none" />

        <Label>Contact (shown after verification)</Label>
        <Field label="Phone" value={f.contact_phone ?? profile?.phone ?? ""} onChangeText={set("contact_phone")} keyboardType="phone-pad" />
        <Field label="WhatsApp" value={f.contact_whatsapp ?? ""} onChangeText={set("contact_whatsapp")} keyboardType="phone-pad" />
        <Field label="Email" value={f.contact_email ?? profile?.contactEmail ?? ""} onChangeText={set("contact_email")} autoCapitalize="none" keyboardType="email-address" />
        <Field label="Instagram" value={f.contact_instagram ?? profile?.instagram ?? ""} onChangeText={set("contact_instagram")} autoCapitalize="none" />
        <Field label="Address" value={f.address ?? ""} onChangeText={set("address")} />
        <Field label="Website" value={f.website ?? ""} onChangeText={set("website")} autoCapitalize="none" keyboardType="url" />
        <Field label={hub === "events" ? "Registration link" : hub === "briefs" ? "Apply / source link" : "Booking link"} value={f.link ?? ""} onChangeText={set("link")} autoCapitalize="none" keyboardType="url" />
        <Field label="Map link" value={f.map_link ?? ""} onChangeText={set("map_link")} autoCapitalize="none" keyboardType="url" />
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={{ color: C.ink, fontWeight: "700" }}>Show my contacts before verification</Text>
            <Text style={{ color: C.muted, fontSize: 12 }}>Phone, WhatsApp, email, Instagram and address show straight away. Links still wait for PAHAD.</Text>
          </View>
          <Switch value={flags.show_contacts} onValueChange={(v) => setFlags({ ...flags, show_contacts: v })} trackColor={{ true: C.ochre, false: C.line }} thumbColor={C.ink} />
        </View>

        <Button title="Post on PAHAD+" onPress={submit} disabled={!f.title || !f.summary} />
        <P muted style={{ fontSize: 12, marginTop: 10, textAlign: "center" }}>By posting you agree to the PAHAD+ community guidelines.</P>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
