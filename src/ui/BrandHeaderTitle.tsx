import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

export function BrandHeaderTitle({ subtitle }: { subtitle?: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.mark}>
        <Ionicons name="leaf" size={18} color="#06241A" />
      </View>
      <View>
        <Text style={styles.brand}>WasteMarket</Text>
        {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  mark: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#5EDDC0",
    alignItems: "center",
    justifyContent: "center",
  },
  brand: { color: "white", fontWeight: "900", fontSize: 16, letterSpacing: 0.2 },
  sub: { color: "rgba(255,255,255,0.55)", fontWeight: "800", fontSize: 10, marginTop: 1 },
});
