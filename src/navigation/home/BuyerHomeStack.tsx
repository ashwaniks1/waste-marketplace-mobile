import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import { BuyerHomeScreen } from "../../screens/buyer/BuyerHomeScreen";
import { ListingDetailScreen } from "../../screens/listing/ListingDetailScreen";
import { LiveTrackScreen } from "../../screens/track/LiveTrackScreen";
import { PublicProfileScreen } from "../../screens/profile/PublicProfileScreen";

export type BuyerHomeStackParamList = {
  BuyerFeed: undefined;
  ListingDetail: { id: string };
  LiveTrack: { listingId: string };
  PublicProfile: { id: string; title?: string };
};

const Stack = createNativeStackNavigator<BuyerHomeStackParamList>();

export function BuyerHomeStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="BuyerFeed" component={BuyerHomeScreen} options={{ title: "Marketplace" }} />
      <Stack.Screen name="ListingDetail" component={ListingDetailScreen} options={{ title: "Listing" }} />
      <Stack.Screen name="LiveTrack" component={LiveTrackScreen} options={{ title: "Live tracking" }} />
      <Stack.Screen name="PublicProfile" component={PublicProfileScreen} options={({ route }) => ({ title: route.params.title ?? "Profile" })} />
    </Stack.Navigator>
  );
}
