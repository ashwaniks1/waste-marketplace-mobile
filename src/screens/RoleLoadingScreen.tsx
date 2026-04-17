import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

export function RoleLoadingScreen() {
  return (
    <View style={styles.container}>
      <ActivityIndicator />
      <Text style={styles.text}>Loading session…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  text: { opacity: 0.7 },
});

