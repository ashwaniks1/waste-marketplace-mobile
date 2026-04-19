import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import React, { useEffect, useState } from "react";
import { ChatStack } from "./chat/ChatStack";
import { BuyerHomeStack } from "./home/BuyerHomeStack";
import { DriverHomeStack } from "./home/DriverHomeStack";
import { SellerHomeStack } from "./home/SellerHomeStack";
import { NotificationsStackNav } from "./NotificationsStack";
import { SettingsStackNav } from "./SettingsStack";
import { useChatUnreadCount } from "../hooks/useChatUnreadCount";
import { supabase } from "../lib/supabase";
import { useSession } from "../providers/SessionProvider";

export type TabsParamList = {
  Home: undefined;
  Messages: undefined;
  Notifications: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<TabsParamList>();

function useUnreadNotificationCount(userId: string | null) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!userId) {
      setCount(0);
      return;
    }
    async function refresh() {
      const { count: c } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .is("read_at", null);
      setCount(c ?? 0);
    }
    void refresh();
    const ch = supabase
      .channel(`tab-notif:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => void refresh(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [userId]);
  return count;
}

export function RoleTabs() {
  const { state } = useSession();
  const userId = state.status === "signed_in" ? state.session.user.id : null;
  const unreadNotif = useUnreadNotificationCount(userId);
  const { count: unreadChats } = useChatUnreadCount(userId);

  const HomeComponent =
    state.status === "signed_in" && state.role === "driver"
      ? DriverHomeStack
      : state.status === "signed_in" && state.role === "buyer"
        ? BuyerHomeStack
        : SellerHomeStack;

  const homeLabel =
    state.status === "signed_in" && state.role === "driver"
      ? "Pickups"
      : state.status === "signed_in" && state.role === "buyer"
        ? "Browse"
        : "My listings";

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarLabelStyle: { fontWeight: "700", fontSize: 11 },
        tabBarStyle: { paddingTop: 6, height: 62 },
        tabBarActiveTintColor: "#23D5AB",
        tabBarInactiveTintColor: "rgba(15,23,42,0.55)",
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeComponent}
        options={{
          tabBarLabel: homeLabel,
          tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Messages"
        component={ChatStack}
        options={{
          headerShown: false,
          tabBarLabel: "Messages",
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles" color={color} size={size} />,
          tabBarBadge: unreadChats > 0 ? Math.min(unreadChats, 99) : undefined,
        }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsStackNav}
        options={{
          headerShown: false,
          tabBarLabel: "Alerts",
          tabBarIcon: ({ color, size }) => <Ionicons name="notifications" color={color} size={size} />,
          tabBarBadge: unreadNotif > 0 ? Math.min(unreadNotif, 99) : undefined,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsStackNav}
        options={{
          title: "Settings",
          tabBarLabel: "Settings",
          tabBarIcon: ({ color, size }) => <Ionicons name="settings" color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}
