import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import { BrandHeaderTitle } from "../../ui/BrandHeaderTitle";
import { marketHeaderBase } from "../headerTheme";
import { DriverEarningsScreen } from "../../screens/driver/DriverEarningsScreen";
import { DriverHomeScreen } from "../../screens/driver/DriverHomeScreen";
import { ListingDetailScreen } from "../../screens/listing/ListingDetailScreen";
import { LiveTrackScreen } from "../../screens/track/LiveTrackScreen";
import { PublicProfileScreen } from "../../screens/profile/PublicProfileScreen";

export type DriverHomeStackParamList = {
  DriverPickups: undefined;
  DriverEarnings: undefined;
  ListingDetail: { id: string };
  LiveTrack: { listingId: string };
  PublicProfile: { id: string; title?: string };
};

const Stack = createNativeStackNavigator<DriverHomeStackParamList>();

export function DriverHomeStack() {
  return (
    <Stack.Navigator screenOptions={marketHeaderBase}>
      <Stack.Screen
        name="DriverPickups"
        component={DriverHomeScreen}
        options={{ headerTitle: () => <BrandHeaderTitle subtitle="Open pickups" /> }}
      />
      <Stack.Screen name="DriverEarnings" component={DriverEarningsScreen} options={{ title: "Earnings" }} />
      <Stack.Screen name="ListingDetail" component={ListingDetailScreen} options={{ title: "Job" }} />
      <Stack.Screen name="LiveTrack" component={LiveTrackScreen} options={{ title: "Live tracking" }} />
      <Stack.Screen name="PublicProfile" component={PublicProfileScreen} options={({ route }) => ({ title: route.params.title ?? "Profile" })} />
    </Stack.Navigator>
  );
}
