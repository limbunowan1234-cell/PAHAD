import { ScrollView, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { api } from "@/lib/api";
import { plusDate } from "@/lib/format";
import { useLoad } from "@/lib/useLoad";
import { C } from "@/lib/theme";
import { Badge, ErrorView, H1, Loading, P } from "@/components/ui";

/** A PAHAD circular approved as public ("Policy & Assembly Summaries"). Shows "## " headings and "- " bullets. */
export default function CircularScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, loading, reload } = useLoad(() => api.circular(id), [id]);
  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorView message={error} onRetry={reload} />;
  if (!data) return null;
  const blocks = data.body.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <View style={{ flexDirection: "row", gap: 6 }}>
        <Badge label="🏛 Policy & Assembly Summaries" tone="ochre" />
      </View>
      <Text style={{ color: C.muted, fontFamily: "monospace", marginTop: 12 }}>{data.number}</Text>
      <H1 style={{ marginTop: 4 }}>{data.title}</H1>
      <P muted style={{ marginTop: 6, fontSize: 13 }}>Issued by {data.issuedBy || "PAHAD"} · {plusDate(data.createdAt)}</P>
      <View style={{ marginTop: 16, gap: 12 }}>
        {blocks.map((b, i) => {
          if (/^#{1,6}\s*/.test(b)) return <Text key={i} style={{ color: C.ochre, fontWeight: "800", fontSize: 17 }}>{b.replace(/^#{1,6}\s*/, "").replace(/\*\*/g, "")}</Text>;
          const lines = b.split("\n");
          if (lines.every((l) => l.trim().startsWith("- "))) return <View key={i} style={{ gap: 4 }}>{lines.map((l, j) => <P key={j}>•  {l.trim().slice(2).replace(/\*\*/g, "")}</P>)}</View>;
          return <P key={i} style={{ lineHeight: 23 }}>{b.replace(/\*\*/g, "")}</P>;
        })}
      </View>
    </ScrollView>
  );
}
