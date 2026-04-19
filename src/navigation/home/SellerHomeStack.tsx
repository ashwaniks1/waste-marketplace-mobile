import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import { BrandHeaderTitle } from "../../ui/BrandHeaderTitle";
import { marketHeaderBase } from "../headerTheme";
import { ListingDetailScreen } from "../../screens/listing/ListingDetailScreen";
import { LiveTrackScreen } from "../../screens/track/LiveTrackScreen";
import { PublicProfileScreen } from "../../screens/profile/PublicProfileScreen";
import { CreateListingScreen } from "../../screens/seller/CreateListingScreen";
import { SellerHomeScreen } from "../../screens/seller/SellerHomeScreen";

export type SellerHomeStackParamList = {
  SellerListings: undefined;
  CreateListing: undefined;
  ListingDetail: { id: string };
  LiveTrack: { listingId: string };
  PublicProfile: { id: string; title?: string };
};

const Stack = createNativeStackNavigator<SellerHomeStackParamList>();

export function SellerHomeStack() {
  return (
    <Stack.Navigator screenOptions={marketHeaderBase}>
      <Stack.Screen
        name="SellerListings"
        component={SellerHomeScreen}
        options={{ headerTitle: () => <BrandHeaderTitle subtitle="My listings" /> }}
      />
      <Stack.Screen name="CreateListing" component={CreateListingScreen} options={{ title: "New listing" }} />
      <Stack.Screen name="ListingDetail" component={ListingDetailScreen} options={{ title: "Listing" }} />
      <Stack.Screen name="LiveTrack" component={LiveTrackScreen} options={{ title: "Live tracking" }} />
      <Stack.Screen name="PublicProfile" component={PublicProfileScreen} options={({ route }) => ({ title: route.params.title ?? "Profile" })} />
    </Stack.Navigator>
  );
}
