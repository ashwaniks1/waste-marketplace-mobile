import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import { BrandHeaderTitle } from "../../ui/BrandHeaderTitle";
import { marketHeaderBase } from "../headerTheme";
import { ChatListScreen } from "../../screens/chat/ChatListScreen";
import { ChatThreadScreen } from "../../screens/chat/ChatThreadScreen";

export type ChatStackParamList = {
  MessagesHome: undefined;
  ChatThread: { conversationId: string; title?: string };
};

const Stack = createNativeStackNavigator<ChatStackParamList>();

export function ChatStack() {
  return (
    <Stack.Navigator screenOptions={marketHeaderBase}>
      <Stack.Screen
        name="MessagesHome"
        component={ChatListScreen}
        options={{ headerTitle: () => <BrandHeaderTitle subtitle="Messages" /> }}
      />
      <Stack.Screen
        name="ChatThread"
        component={ChatThreadScreen}
        options={({ route }) => ({ title: route.params.title ?? "Conversation" })}
      />
    </Stack.Navigator>
  );
}

