import type { NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { Platform } from "react-native";

const headerBg = Platform.OS === "ios" ? "rgba(4,18,14,0.92)" : "#04120E";

/** Shared dark marketplace header chrome (use per-screen `headerTitle` for brand + subtitles). */
export const marketHeaderBase: NativeStackNavigationOptions = {
  headerStyle: { backgroundColor: headerBg },
  headerShadowVisible: false,
  headerTintColor: "#BFFFEA",
};
