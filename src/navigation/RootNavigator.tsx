import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import { useSession } from "../providers/SessionProvider";
import { LoginScreen } from "../screens/LoginScreen";
import { RoleLoadingScreen } from "../screens/RoleLoadingScreen";
import { RoleTabs } from "./RoleTabs";

export type RootStackParamList = {
  Login: undefined;
  RoleLoading: undefined;
  App: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { state } = useSession();

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {state.status === "loading" ? (
          <Stack.Screen
            name="RoleLoading"
            component={RoleLoadingScreen}
            options={{ headerShown: false }}
          />
        ) : state.status === "signed_out" ? (
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        ) : (
          <Stack.Screen name="App" component={RoleTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

