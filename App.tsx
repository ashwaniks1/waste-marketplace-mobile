import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import React, { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { SessionProvider, useSession } from "./src/providers/SessionProvider";
import { TimezoneProvider } from "./src/providers/TimezoneProvider";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

function NotificationPermissionBootstrap() {
  const { state } = useSession();
  useEffect(() => {
    if (state.status !== "signed_in") return;
    void Notifications.requestPermissionsAsync();
  }, [state.status]);
  return null;
}

function AppWithTimezone() {
  const { state } = useSession();
  const userId = state.status === "signed_in" ? state.session.user.id : null;
  return (
    <TimezoneProvider userId={userId}>
      <NotificationPermissionBootstrap />
      <RootNavigator />
      <StatusBar style="light" />
    </TimezoneProvider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <AppWithTimezone />
      </SessionProvider>
    </SafeAreaProvider>
  );
}
