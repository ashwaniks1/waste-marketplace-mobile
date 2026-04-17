import { StatusBar } from "expo-status-bar";
import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { SessionProvider } from "./src/providers/SessionProvider";

export default function App() {
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <RootNavigator />
        <StatusBar style="light" />
      </SessionProvider>
    </SafeAreaProvider>
  );
}
