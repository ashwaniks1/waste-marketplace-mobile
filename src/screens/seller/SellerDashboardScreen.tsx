import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSession } from "../../providers/SessionProvider";

export function SellerDashboardScreen() {
  const { signOut } = useSession();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Seller dashboard</Text>
      <Text style={styles.sub}>Post listings, manage offers, schedule pickups, earnings.</Text>
      <Pressable onPress={signOut} style={styles.button}>
        <Text style={styles.buttonText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 10, backgroundColor: "white" },
  title: { fontSize: 22, fontWeight: "700" },
  sub: { opacity: 0.7 },
  button: { marginTop: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, backgroundColor: "#111A2E" },
  buttonText: { color: "white", fontWeight: "700", textAlign: "center" },
});

