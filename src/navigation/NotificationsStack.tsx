import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import { NotificationsScreen } from "../screens/notifications/NotificationsScreen";
import { BrandHeaderTitle } from "../ui/BrandHeaderTitle";
import { marketHeaderBase } from "./headerTheme";

export type NotificationsStackParamList = {
  NotificationsHome: undefined;
};

const Stack = createNativeStackNavigator<NotificationsStackParamList>();

export function NotificationsStackNav() {
  return (
    <Stack.Navigator screenOptions={marketHeaderBase}>
      <Stack.Screen
        name="NotificationsHome"
        component={NotificationsScreen}
        options={{ headerTitle: () => <BrandHeaderTitle subtitle="Notifications" /> }}
      />
    </Stack.Navigator>
  );
}
