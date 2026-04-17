import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import { useSession } from "../providers/SessionProvider";
import { LoginScreen } from "../screens/LoginScreen";
import { BuyerDashboardScreen } from "../screens/buyer/BuyerDashboardScreen";
import { SellerDashboardScreen } from "../screens/seller/SellerDashboardScreen";
import { DriverDashboardScreen } from "../screens/driver/DriverDashboardScreen";
import { RoleLoadingScreen } from "../screens/RoleLoadingScreen";

export type RootStackParamList = {
  Login: undefined;
  RoleLoading: undefined;
  BuyerDashboard: undefined;
  SellerDashboard: undefined;
  DriverDashboard: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { state } = useSession();

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {state.status === "loading" ? (
          <Stack.Screen
            name="RoleLoading"
            component={RoleLoadingScreen}
            options={{ headerShown: false }}
          />
        ) : state.status === "signed_out" ? (
          <Stack.Screen name="Login" component={LoginScreen} options={{ title: "Sign in" }} />
        ) : state.role === "buyer" ? (
          <Stack.Screen
            name="BuyerDashboard"
            component={BuyerDashboardScreen}
            options={{ title: "Buyer" }}
          />
        ) : state.role === "driver" ? (
          <Stack.Screen
            name="DriverDashboard"
            component={DriverDashboardScreen}
            options={{ title: "Driver" }}
          />
        ) : (
          <Stack.Screen
            name="SellerDashboard"
            component={SellerDashboardScreen}
            options={{ title: "Seller" }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

