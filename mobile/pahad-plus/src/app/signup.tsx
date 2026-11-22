import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { api, siteUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { C } from "@/lib/theme";
import { Button, Chip, Field, H1, Label, Notice, P } from "@/components/ui";

const TYPES = [["individual", "Individual"], ["business", "Business"], ["organisation", "Organisation"]] as const;

export default function Signup() {
  const { signIn } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [type, setType] = useState("individual");
  const [password, setPassword] = useState("");
  const [terms, setTerms] = useState(false);
  const [msg, setMsg] = useState("");

  const submit = async () => {
    setMsg("");
    try {
      const r = await api.signup({ name: name.trim(), email: email.trim(), phone: phone.trim(), account_type: type, password, terms });
      if (r.ok && r.token) { await signIn(r.token); router.replace("/me"); }
      else setMsg(r.message);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Couldn't create the account.");
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <H1>Join PAHAD+</H1>
        <P muted style={{ marginTop: 6, marginBottom: 20 }}>Share events, places and businesses from the hills. We&apos;ll email you a link to confirm your account.</P>
        {msg ? <Notice text={msg} tone="error" /> : null}
        <Field label="Your name (or business / organisation name)" value={name} onChangeText={setName} autoComplete="name" />
        <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
        <Field label="Phone (optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" />
        <Label>Account type</Label>
        <View style={{ flexDirection: "row", marginBottom: 14 }}>
          {TYPES.map(([k, l]) => <Chip key={k} label={l} on={type === k} onPress={() => setType(k)} />)}
        </View>
        <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" hint="At least 10 characters. A few words work well." />
        <Pressable onPress={() => setTerms((v) => !v)} style={{ flexDirection: "row", gap: 10, alignItems: "flex-start", marginBottom: 18 }}>
          <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: C.ochre, backgroundColor: terms ? C.ochre : "transparent", alignItems: "center", justifyContent: "center" }}>
            {terms ? <Text style={{ color: C.page, fontWeight: "900" }}>✓</Text> : null}
          </View>
          <Text style={{ color: C.ink, flex: 1, lineHeight: 20 }}>
            I accept the <Text style={{ color: C.ochre, fontWeight: "700" }} onPress={() => WebBrowser.openBrowserAsync(siteUrl("/plus/terms"))}>PAHAD+ terms and community guidelines</Text>.
          </Text>
        </Pressable>
        <Button title="Create account" onPress={submit} disabled={!name || !email || !password || !terms} />
        <Text style={{ color: C.muted, textAlign: "center", marginTop: 20 }}>
          Already have an account? <Text style={{ color: C.ochre, fontWeight: "800" }} onPress={() => router.replace("/login")}>Sign in</Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
