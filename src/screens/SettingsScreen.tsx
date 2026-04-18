import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSession } from "../providers/SessionProvider";

export function SettingsScreen() {
  const { state, signOut } = useSession();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.sub}>
        Signed in as:{" "}
        {state.status === "signed_in" ? `${state.session.user.email ?? state.session.user.id}` : "—"}
      </Text>
      <Text style={styles.sub}>Role: {state.status === "signed_in" ? state.role ?? "unknown" : "—"}</Text>

      <Pressable onPress={signOut} style={styles.button}>
        <Text style={styles.buttonText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 10, backgroundColor: "white" },
  title: { fontSize: 22, fontWeight: "800" },
  sub: { opacity: 0.75 },
  button: { marginTop: 14, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, backgroundColor: "#111A2E" },
  buttonText: { color: "white", fontWeight: "800", textAlign: "center" },
});

