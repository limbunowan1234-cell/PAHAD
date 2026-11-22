import { useState, type ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type PressableProps, type StyleProp, type TextInputProps, type TextStyle, type ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";
import { C, R } from "@/lib/theme";
import type { Trust } from "@/lib/types";

export function H1({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[s.h1, style]}>{children}</Text>;
}
export function H2({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[s.h2, style]}>{children}</Text>;
}
export function P({ children, style, muted, numberOfLines }: { children: ReactNode; style?: StyleProp<TextStyle>; muted?: boolean; numberOfLines?: number }) {
  return <Text numberOfLines={numberOfLines} style={[s.p, muted && { color: C.muted }, style]}>{children}</Text>;
}
export function Label({ children }: { children: ReactNode }) {
  return <Text style={s.label}>{children}</Text>;
}

type BtnKind = "primary" | "accent" | "ghost" | "danger" | "outline";
export function Button({
  title, onPress, kind = "primary", loading, disabled, icon, style, small,
}: { title: string; onPress?: () => unknown; kind?: BtnKind; loading?: boolean; disabled?: boolean; icon?: ReactNode; style?: StyleProp<ViewStyle>; small?: boolean }) {
  const [busy, setBusy] = useState(false);
  const spinning = loading || busy;
  const bg = kind === "primary" ? C.ochre : kind === "accent" ? C.clay : kind === "danger" ? C.dangerBg : "transparent";
  const fg = kind === "primary" || kind === "accent" ? C.page : kind === "danger" ? C.danger : C.ink;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || spinning}
      onPress={async () => {
        if (!onPress) return;
        Haptics.selectionAsync().catch(() => {});
        const r = onPress();
        if (r instanceof Promise) { setBusy(true); try { await r; } finally { setBusy(false); } }
      }}
      style={({ pressed }) => [
        s.btn, small && s.btnSmall, { backgroundColor: bg }, (kind === "outline" || kind === "ghost") && { borderWidth: kind === "outline" ? 1 : 0, borderColor: C.line },
        (disabled || spinning) && { opacity: 0.55 }, pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 }, style,
      ]}
    >
      {spinning ? <ActivityIndicator color={fg} /> : icon}
      <Text style={[s.btnText, small && { fontSize: 13 }, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

export function Tap({ children, style, ...rest }: PressableProps & { style?: StyleProp<ViewStyle>; children: ReactNode }) {
  return (
    <Pressable {...rest} style={({ pressed }) => [style, pressed && { opacity: 0.75, transform: [{ scale: 0.98 }] }]}>
      {children}
    </Pressable>
  );
}

export function Field({ label, hint, style, ...rest }: TextInputProps & { label: string; hint?: string }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Label>{label}</Label>
      <TextInput placeholderTextColor={C.faint} style={[s.field, rest.multiline && { minHeight: 96, textAlignVertical: "top" }, style]} {...rest} />
      {hint ? <Text style={s.hint}>{hint}</Text> : null}
    </View>
  );
}

export function Chip({ label, on, onPress }: { label: string; on?: boolean; onPress?: () => void }) {
  return (
    <Tap onPress={onPress} style={[s.chip, on && { backgroundColor: C.ink }]}>
      <Text style={[s.chipText, on && { color: C.page, fontWeight: "800" }]}>{label}</Text>
    </Tap>
  );
}

export function Badge({ label, tone = "dark" }: { label: string; tone?: "ochre" | "sage" | "clay" | "dark" | "cream" }) {
  const map = { ochre: [C.ochre, C.page], sage: [C.sage, C.page], clay: [C.clay, C.page], dark: [C.panel, C.ink], cream: [C.cream, C.ink] } as const;
  const [bg, fg] = map[tone];
  return <View style={[s.badge, { backgroundColor: bg }]}><Text style={[s.badgeText, { color: fg }]}>{label}</Text></View>;
}

export function TrustBadge({ trust }: { trust: Trust }) {
  if (trust === "pahad") return <Badge label="🛡 PAHAD" tone="ochre" />;
  if (trust === "flag_proof") return <Badge label="🛡 Flag-Proof" tone="ochre" />;
  if (trust === "verified") return <Badge label="✓ Verified" tone="sage" />;
  return <Badge label="◷ Unverified" tone="cream" />;
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function Notice({ text, tone = "info" }: { text: string; tone?: "info" | "ok" | "error" }) {
  const bg = tone === "error" ? C.dangerBg : tone === "ok" ? C.sageDeep : C.cream;
  const fg = tone === "error" ? C.danger : C.ink;
  return <View style={[s.notice, { backgroundColor: bg }]}><Text style={{ color: fg, fontSize: 13, lineHeight: 19 }}>{text}</Text></View>;
}

export function Loading() {
  return <View style={s.center}><ActivityIndicator color={C.ochre} size="large" /></View>;
}

export function Empty({ emoji = "🏔️", title, text, action }: { emoji?: string; title: string; text?: string; action?: ReactNode }) {
  return (
    <View style={[s.center, { padding: 28 }]}>
      <Text style={{ fontSize: 40 }}>{emoji}</Text>
      <Text style={[s.h2, { textAlign: "center", marginTop: 10 }]}>{title}</Text>
      {text ? <Text style={[s.p, { color: C.muted, textAlign: "center", marginTop: 6 }]}>{text}</Text> : null}
      {action ? <View style={{ marginTop: 16 }}>{action}</View> : null}
    </View>
  );
}

export function ErrorView({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <Empty emoji="📡" title="Couldn't load this" text={message} action={onRetry ? <Button title="Try again" onPress={onRetry} /> : undefined} />;
}

export const s = StyleSheet.create({
  h1: { color: C.ink, fontSize: 26, fontWeight: "700", fontFamily: "serif", lineHeight: 32 },
  h2: { color: C.ink, fontSize: 19, fontWeight: "700", fontFamily: "serif" },
  p: { color: C.ink, fontSize: 15, lineHeight: 22 },
  label: { color: C.muted, fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 },
  hint: { color: C.faint, fontSize: 12, marginTop: 5 },
  field: { backgroundColor: C.page, borderColor: C.line, borderWidth: 1, borderRadius: R.md, color: C.ink, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 14, borderRadius: R.pill },
  btnSmall: { paddingHorizontal: 14, paddingVertical: 9 },
  btnText: { fontSize: 15, fontWeight: "800" },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: R.pill, backgroundColor: C.glass, marginRight: 8 },
  chipText: { color: C.ink, fontSize: 13, fontWeight: "700" },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: R.pill, alignSelf: "flex-start" },
  badgeText: { fontSize: 11, fontWeight: "800" },
  card: { backgroundColor: C.card, borderRadius: R.lg, padding: 16, borderWidth: 1, borderColor: C.line },
  notice: { borderRadius: R.md, padding: 12, marginBottom: 12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
