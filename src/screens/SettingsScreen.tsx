import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { GradientScreen } from "../ui/GradientScreen";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { SettingsStackParamList } from "../navigation/SettingsStack";
import { useSession } from "../providers/SessionProvider";

type Nav = NativeStackNavigationProp<SettingsStackParamList>;

export function SettingsScreen() {
  const navigation = useNavigation<Nav>();
  const { state, signOut } = useSession();
  const insets = useSafeAreaInsets();

  return (
    <GradientScreen decorated style={{ flex: 1 }}>
      <View style={[styles.container, { paddingTop: 12 + insets.top }]}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.sub}>
          Signed in as:{" "}
          {state.status === "signed_in" ? `${state.session.user.email ?? state.session.user.id}` : "—"}
        </Text>
        <Text style={styles.sub}>Role: {state.status === "signed_in" ? state.role ?? "unknown" : "—"}</Text>

        <Pressable onPress={() => navigation.navigate("MyProfile")} style={styles.secondary}>
          <Text style={styles.secondaryText}>My profile</Text>
        </Pressable>

        <Pressable onPress={() => navigation.navigate("TimeZonePick")} style={styles.secondary}>
          <Text style={styles.secondaryText}>Time zone</Text>
        </Pressable>

        <Pressable onPress={signOut} style={styles.button}>
          <Text style={styles.buttonText}>Sign out</Text>
        </Pressable>
      </View>
    </GradientScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 10 },
  title: { fontSize: 22, fontWeight: "800", color: "white" },
  sub: { color: "rgba(255,255,255,0.7)", fontWeight: "600" },
  secondary: {
    marginTop: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: "rgba(91,140,255,0.95)",
    minHeight: 48,
    justifyContent: "center",
  },
  secondaryText: { color: "white", fontWeight: "900", textAlign: "center" },
  button: {
    marginTop: 8,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.2)",
    minHeight: 48,
    justifyContent: "center",
  },
  buttonText: { color: "white", fontWeight: "900", textAlign: "center" },
});

