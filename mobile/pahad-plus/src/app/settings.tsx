import { useState } from "react";
import { Alert, ScrollView, Switch, Text, View } from "react-native";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { api, siteUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLoad } from "@/lib/useLoad";
import { C } from "@/lib/theme";
import type { Me } from "@/lib/types";
import { Button, Card, Chip, ErrorView, Field, H2, Loading, Notice, P } from "@/components/ui";

const SWITCHES: { key: keyof Me["settings"]; label: string; hint: string }[] = [
  { key: "private_mode", label: "Private profile", hint: "Your posts stay in the feed, but your profile doesn't list them." },
  { key: "hide_saved", label: "Hide my saved posts", hint: "Others can't see what you saved." },
  { key: "hide_contacts", label: "Don't prefill my contacts", hint: "New posts start without your phone, Instagram and email." },
  { key: "mute_support", label: "Mute support notifications", hint: "No alert when someone supports your post." },
  { key: "mute_events", label: "Mute event notifications", hint: "No alerts about E-Passes and events." },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <Card style={{ marginBottom: 16 }}><H2 style={{ marginBottom: 12 }}>{title}</H2>{children}</Card>;
}

export default function Settings() {
  const { signedIn } = useAuth();
  const { data: me, setData, error, loading, reload } = useLoad(() => api.me(), [signedIn]);
  if (!signedIn) { router.replace("/login"); return null; }
  if (loading && !me) return <Loading />;
  if (error && !me) return <ErrorView message={error} onRetry={reload} />;
  if (!me) return null;
  return <SettingsForm me={me} setData={setData} reload={reload} />;
}

function SettingsForm({ me, setData, reload }: { me: Me; setData: (m: Me) => void; reload: () => void }) {
  const { refresh: refreshAll, signOut, config } = useAuth();
  const [name, setName] = useState(me.profile.name);
  const [phone, setPhone] = useState(me.profile.phone);
  const [instagram, setInstagram] = useState(me.profile.instagram);
  const [contactEmail, setContactEmail] = useState(me.profile.contactEmail);
  const [org, setOrg] = useState({ account_name: "", upi: "", bank_account: "", ifsc: "" });
  const [memberEmail, setMemberEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);


  const show = (r: { ok: boolean; message: string }) => { setMsg({ ok: r.ok, text: r.message }); if (r.ok) { reload(); refreshAll(); } };
  const toggle = async (key: keyof Me["settings"], on: boolean) => {
    setData({ ...me, settings: { ...me.settings, [key]: on } });
    const r = await api.setting(key, on).catch(() => ({ ok: false, message: "Couldn't save." }));
    if (!r.ok) { setData(me); setMsg({ ok: false, text: r.message }); }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
      {msg ? <Notice text={msg.text} tone={msg.ok ? "ok" : "error"} /> : null}

      <Section title="Profile">
        <Field label="Name" value={name} onChangeText={setName} />
        <Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Button title="Save profile" onPress={async () => show(await api.updateProfile(name.trim(), phone.trim()))} />
      </Section>

      <Section title="Account type">
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {(config?.accountTypes ?? []).map((t) => (
            <Chip key={t.key} label={t.label} on={me.profile.accountType === t.key} onPress={async () => show(await api.accountType(t.key))} />
          ))}
        </View>
        <P muted style={{ fontSize: 12, marginTop: 8 }}>Business and Organisation accounts can apply to sell paid E-Passes.</P>
      </Section>

      <Section title="Collaboration contacts">
        <P muted style={{ fontSize: 13, marginBottom: 10 }}>These prefill new posts. Each post decides whether to show them.</P>
        <Field label="Instagram" value={instagram} onChangeText={setInstagram} autoCapitalize="none" placeholder="@yourname" />
        <Field label="Contact email" value={contactEmail} onChangeText={setContactEmail} autoCapitalize="none" keyboardType="email-address" />
        <Button title="Save contacts" onPress={async () => show(await api.updateContacts(phone.trim(), instagram.trim(), contactEmail.trim()))} />
      </Section>

      <Section title="Privacy & notifications">
        {SWITCHES.map((sw) => (
          <View key={sw.key} style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.ink, fontWeight: "700" }}>{sw.label}</Text>
              <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{sw.hint}</Text>
            </View>
            <Switch value={me.settings[sw.key]} onValueChange={(v) => toggle(sw.key, v)} trackColor={{ true: C.ochre, false: C.line }} thumbColor={C.ink} />
          </View>
        ))}
      </Section>

      <Section title="PAHAD membership">
        {me.profile.member ? (
          <>
            <P>Your PAHAD membership is linked. Your posts show a “PAHAD member” badge.</P>
            <Button kind="outline" small style={{ marginTop: 10 }} title="Unlink membership" onPress={async () => show(await api.memberUnlink())} />
          </>
        ) : (
          <>
            <P muted style={{ fontSize: 13, marginBottom: 10 }}>Are you a PAHAD member? Link your membership to show a member badge. We&apos;ll email a confirmation link to the address PAHAD has on record.</P>
            <Field label="Email on your PAHAD membership (if different)" value={memberEmail} onChangeText={setMemberEmail} autoCapitalize="none" keyboardType="email-address" />
            <Button small title="Link membership" onPress={async () => show(await api.memberLink({ member_email: memberEmail.trim() }))} />
          </>
        )}
      </Section>

      {me.organiser ? (
        <Section title="Sell paid E-Passes">
          {me.organiser.status === "approved" ? (
            <P>You&apos;re approved to sell paid E-Passes. PAHAD collects payments by Razorpay and pays you out (PAHAD&apos;s fee: {me.organiser.feePercent}%).</P>
          ) : me.organiser.status === "pending" ? (
            <P>Your application is waiting for the President&apos;s approval.</P>
          ) : (
            <>
              {me.organiser.status === "rejected" || me.organiser.status === "revoked" ? <Notice text={`Not approved${me.organiser.note ? `: ${me.organiser.note}` : "."}`} tone="error" /> : null}
              <P muted style={{ fontSize: 13, marginBottom: 10 }}>Apply to sell paid E-Passes. Payout details are seen only by the President.</P>
              <Field label="Account holder name" value={org.account_name} onChangeText={(v) => setOrg({ ...org, account_name: v })} />
              <Field label="UPI ID" value={org.upi} onChangeText={(v) => setOrg({ ...org, upi: v })} autoCapitalize="none" />
              <Field label="Bank account number (optional)" value={org.bank_account} onChangeText={(v) => setOrg({ ...org, bank_account: v })} keyboardType="number-pad" />
              <Field label="IFSC (optional)" value={org.ifsc} onChangeText={(v) => setOrg({ ...org, ifsc: v })} autoCapitalize="characters" />
              <Button small title="Apply" onPress={async () => show(await api.organiser(org))} />
            </>
          )}
        </Section>
      ) : null}

      {me.blocked.length ? (
        <Section title="Blocked accounts">
          {me.blocked.map((b) => (
            <View key={b.id} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <Text style={{ color: C.ink, fontWeight: "700" }}>{b.name}</Text>
              <Button small kind="outline" title="Unblock" onPress={async () => show(await api.unblock(b.id))} />
            </View>
          ))}
        </Section>
      ) : null}

      <Section title="About">
        {[["Terms & community guidelines", "/plus/terms"], ["Privacy", "/privacy#pahad-plus"], ["Help", "/plus/help"]].map(([l, u]) => (
          <Text key={u} style={{ color: C.ochre, fontWeight: "700", marginBottom: 12 }} onPress={() => WebBrowser.openBrowserAsync(siteUrl(u))}>{l} ↗</Text>
        ))}
      </Section>

      <Section title="Delete account">
        <P muted style={{ fontSize: 13, marginBottom: 10 }}>Removes your PAHAD+ account and your posts. This can&apos;t be undone.</P>
        <Field label="Your password" value={password} onChangeText={setPassword} secureTextEntry />
        <Button kind="danger" title="Delete my PAHAD+ account" disabled={!password} onPress={() =>
          Alert.alert("Delete your PAHAD+ account?", "Your account and posts will be removed. This can't be undone.", [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: async () => {
              const r = await api.deleteAccount(password);
              if (r.ok) { await signOut(); router.replace("/"); Alert.alert("Your PAHAD+ account has been deleted."); } else setMsg({ ok: false, text: r.message });
            } },
          ])} />
      </Section>
    </ScrollView>
  );
}
