import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import React from "react";
import { BuyerHomeScreen } from "../screens/buyer/BuyerHomeScreen";
import { SellerHomeScreen } from "../screens/seller/SellerHomeScreen";
import { DriverHomeScreen } from "../screens/driver/DriverHomeScreen";
import { ChatStack } from "./chat/ChatStack";
import { SettingsScreen } from "../screens/SettingsScreen";
import { useSession } from "../providers/SessionProvider";

export type TabsParamList = {
  Home: undefined;
  Chat: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<TabsParamList>();

export function RoleTabs() {
  const { state } = useSession();

  const HomeComponent =
    state.status === "signed_in" && state.role === "driver"
      ? DriverHomeScreen
      : state.status === "signed_in" && state.role === "buyer"
        ? BuyerHomeScreen
        : SellerHomeScreen;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        tabBarLabelStyle: { fontWeight: "700" },
      }}
    >
      <Tab.Screen name="Home" component={HomeComponent} options={{ title: "Marketplace" }} />
      <Tab.Screen name="Chat" component={ChatStack} options={{ headerShown: false }} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

