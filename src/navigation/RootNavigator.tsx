import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import { useSession } from "../providers/SessionProvider";
import { LoginScreen } from "../screens/LoginScreen";
import { RoleLoadingScreen } from "../screens/RoleLoadingScreen";
import { SignUpScreen } from "../screens/SignUpScreen";
import { RoleTabs } from "./RoleTabs";
import type { RootStackParamList } from "./types";

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
          <Stack.Group>
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="SignUp" component={SignUpScreen} options={{ headerShown: false }} />
          </Stack.Group>
        ) : (
          <Stack.Screen name="App" component={RoleTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

