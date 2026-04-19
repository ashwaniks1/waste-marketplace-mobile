import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import React from "react";
import { ChatStack } from "./chat/ChatStack";
import { BuyerHomeStack } from "./home/BuyerHomeStack";
import { DriverHomeStack } from "./home/DriverHomeStack";
import { SellerHomeStack } from "./home/SellerHomeStack";
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
      ? DriverHomeStack
      : state.status === "signed_in" && state.role === "buyer"
        ? BuyerHomeStack
        : SellerHomeStack;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarLabelStyle: { fontWeight: "700" },
        tabBarStyle: { paddingTop: 6, height: 62 },
        tabBarActiveTintColor: "#23D5AB",
        tabBarInactiveTintColor: "rgba(15,23,42,0.55)",
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeComponent}
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatStack}
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => <Ionicons name="settings" color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}

