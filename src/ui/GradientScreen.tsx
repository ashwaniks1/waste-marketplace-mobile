import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, View, type ViewProps } from "react-native";
import { colors } from "./theme";

export function GradientScreen({
  children,
  style,
  decorated,
}: ViewProps & { children: React.ReactNode; decorated?: boolean }) {
  return (
    <LinearGradient colors={["#04120E", "#06241A", colors.bg]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.root, style]}>
      <View style={styles.inner}>
        {decorated ? (
          <>
            <Text style={[styles.deco, styles.d1]}>♻️</Text>
            <Text style={[styles.deco, styles.d2]}>🌱</Text>
            <Text style={[styles.deco, styles.d3]}>🗑️</Text>
          </>
        ) : null}
        {children}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  inner: { flex: 1 },
  deco: {
    position: "absolute",
    fontSize: 120,
    opacity: 0.06,
    zIndex: 0,
    pointerEvents: "none",
  },
  d1: { top: "12%", right: "-6%" },
  d2: { bottom: "18%", left: "-8%" },
  d3: { top: "42%", left: "30%" },
});
