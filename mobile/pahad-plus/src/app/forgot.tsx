import { useState } from "react";
import { ScrollView } from "react-native";
import { api } from "@/lib/api";
import { Button, Field, H1, Notice, P } from "@/components/ui";

/** Sends the reset link by email; the person sets the new password on pahad.org from that link. */
export default function Forgot() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
      <H1>Forgot password</H1>
      <P muted style={{ marginTop: 6, marginBottom: 20 }}>Enter your email. If it belongs to a PAHAD+ account, we&apos;ll send a link to set a new password.</P>
      {msg ? <Notice text={msg.text} tone={msg.ok ? "ok" : "error"} /> : null}
      <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <Button
        title="Send reset link"
        disabled={!email}
        onPress={async () => {
          try { const r = await api.forgot(email.trim()); setMsg({ ok: r.ok, text: r.message }); }
          catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : "Couldn't send the link." }); }
        }}
      />
    </ScrollView>
  );
}
