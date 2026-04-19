import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import { ListingDetailScreen } from "../../screens/listing/ListingDetailScreen";
import { LiveTrackScreen } from "../../screens/track/LiveTrackScreen";
import { PublicProfileScreen } from "../../screens/profile/PublicProfileScreen";
import { SellerHomeScreen } from "../../screens/seller/SellerHomeScreen";

export type SellerHomeStackParamList = {
  SellerFeed: undefined;
  ListingDetail: { id: string };
  LiveTrack: { listingId: string };
  PublicProfile: { id: string; title?: string };
};

const Stack = createNativeStackNavigator<SellerHomeStackParamList>();

export function SellerHomeStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="SellerFeed" component={SellerHomeScreen} options={{ title: "Seller" }} />
      <Stack.Screen name="ListingDetail" component={ListingDetailScreen} options={{ title: "Listing" }} />
      <Stack.Screen name="LiveTrack" component={LiveTrackScreen} options={{ title: "Live tracking" }} />
      <Stack.Screen name="PublicProfile" component={PublicProfileScreen} options={({ route }) => ({ title: route.params.title ?? "Profile" })} />
    </Stack.Navigator>
  );
}
