import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import { ChatListScreen } from "../../screens/chat/ChatListScreen";
import { ChatThreadScreen } from "../../screens/chat/ChatThreadScreen";

export type ChatStackParamList = {
  ChatList: undefined;
  ChatThread: { conversationId: string; title?: string };
};

const Stack = createNativeStackNavigator<ChatStackParamList>();

export function ChatStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="ChatList" component={ChatListScreen} options={{ title: "Chat" }} />
      <Stack.Screen
        name="ChatThread"
        component={ChatThreadScreen}
        options={({ route }) => ({ title: route.params.title ?? "Conversation" })}
      />
    </Stack.Navigator>
  );
}

