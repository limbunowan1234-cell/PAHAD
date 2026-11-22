import { Tabs } from "expo-router";
import { Text, View } from "react-native";
import { C } from "@/lib/theme";

function Icon({ glyph, focused }: { glyph: string; focused: boolean }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.6 }}>{glyph}</Text>;
}

/** Bottom bar: Valley (feed) · Discover · + Post · Profile, as on the website. */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: C.deep, borderTopColor: C.line, height: 64, paddingTop: 6 },
        tabBarActiveTintColor: C.ink,
        tabBarInactiveTintColor: C.faint,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700", marginBottom: 6 },
        animation: "fade",
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Valley", tabBarIcon: ({ focused }) => <Icon glyph="⛰️" focused={focused} /> }} />
      <Tabs.Screen name="discover" options={{ title: "Discover", tabBarIcon: ({ focused }) => <Icon glyph="🧭" focused={focused} /> }} />
      <Tabs.Screen
        name="new"
        options={{
          title: "Post",
          tabBarIcon: () => (
            <View style={{ backgroundColor: C.clay, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 4, marginTop: -2 }}>
              <Text style={{ color: C.page, fontWeight: "900", fontSize: 18 }}>＋</Text>
            </View>
          ),
          tabBarLabel: "Post",
        }}
      />
      <Tabs.Screen name="me" options={{ title: "Profile", tabBarIcon: ({ focused }) => <Icon glyph="👤" focused={focused} /> }} />
    </Tabs>
  );
}
