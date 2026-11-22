import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text } from "react-native";
import { router } from "expo-router";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { C } from "@/lib/theme";
import { Button, Field, H1, Notice, P } from "@/components/ui";

export default function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  const submit = async () => {
    setMsg("");
    try {
      const r = await api.login(email.trim(), password);
      if (r.ok && r.token) { await signIn(r.token); router.back(); }
      else setMsg(r.message);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Couldn't sign in.");
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
        <H1>Welcome back</H1>
        <P muted style={{ marginTop: 6, marginBottom: 20 }}>Sign in to post, save, follow and get E-Passes.</P>
        {msg ? <Notice text={msg} tone="error" /> : null}
        <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" textContentType="emailAddress" />
        <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" textContentType="password" onSubmitEditing={submit} />
        <Button title="Sign in" onPress={submit} disabled={!email || !password} />
        <Text style={{ color: C.ochre, fontWeight: "700", textAlign: "center", marginTop: 16 }} onPress={() => router.replace("/forgot")}>Forgot password?</Text>
        <Text style={{ color: C.muted, textAlign: "center", marginTop: 22 }}>
          New to PAHAD+? <Text style={{ color: C.ochre, fontWeight: "800" }} onPress={() => router.replace("/signup")}>Create an account</Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
