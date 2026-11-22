import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "@/lib/auth";
import { C } from "@/lib/theme";

SystemUI.setBackgroundColorAsync(C.page).catch(() => {});

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: C.page },
            headerTintColor: C.ink,
            headerTitleStyle: { fontWeight: "700" },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: C.page },
            animation: "slide_from_right",
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="post/[id]" options={{ title: "" }} />
          <Stack.Screen name="circular/[id]" options={{ title: "Circular" }} />
          <Stack.Screen name="user/[id]" options={{ title: "Profile" }} />
          <Stack.Screen name="pass/[code]" options={{ title: "E-Pass" }} />
          <Stack.Screen name="checkin/[id]" options={{ title: "Check-in" }} />
          <Stack.Screen name="pay/[id]" options={{ title: "Payment", presentation: "modal" }} />
          <Stack.Screen name="login" options={{ title: "Sign in", presentation: "modal" }} />
          <Stack.Screen name="signup" options={{ title: "Create account", presentation: "modal" }} />
          <Stack.Screen name="forgot" options={{ title: "Forgot password", presentation: "modal" }} />
          <Stack.Screen name="settings" options={{ title: "Settings" }} />
          <Stack.Screen name="notifications" options={{ title: "Notifications" }} />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
