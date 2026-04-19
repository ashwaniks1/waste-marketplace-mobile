import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, View, type ViewProps } from "react-native";
import { colors } from "./theme";

export function GradientScreen({ children, style }: ViewProps & { children: React.ReactNode }) {
  return (
    <LinearGradient colors={["#04120E", "#06241A", colors.bg]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.root, style]}>
      <View style={styles.inner}>{children}</View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  inner: { flex: 1 },
});
