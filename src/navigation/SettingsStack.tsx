import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import { BrandHeaderTitle } from "../ui/BrandHeaderTitle";
import { marketHeaderBase } from "./headerTheme";
import { EditProfileScreen } from "../screens/profile/EditProfileScreen";
import { MyProfileScreen } from "../screens/profile/MyProfileScreen";
import { TimeZonePickScreen } from "../screens/settings/TimeZonePickScreen";
import { SettingsScreen } from "../screens/SettingsScreen";

export type SettingsStackParamList = {
  SettingsRoot: undefined;
  MyProfile: undefined;
  EditProfile: undefined;
  TimeZonePick: undefined;
};

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export function SettingsStackNav() {
  return (
    <Stack.Navigator screenOptions={marketHeaderBase}>
      <Stack.Screen
        name="SettingsRoot"
        component={SettingsScreen}
        options={{ headerTitle: () => <BrandHeaderTitle subtitle="Settings" /> }}
      />
      <Stack.Screen name="MyProfile" component={MyProfileScreen} options={{ title: "My profile" }} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: "Edit profile" }} />
      <Stack.Screen name="TimeZonePick" component={TimeZonePickScreen} options={{ title: "Time zone" }} />
    </Stack.Navigator>
  );
}
