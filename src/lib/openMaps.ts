import { Alert, Linking, Platform } from "react-native";

/** Open native maps for directions to a coordinate (Apple Maps on iOS, geo intent on Android). */
export function openDirectionsToCoords(lat: number, lng: number, label = "Pickup"): void {
  const safeLabel = encodeURIComponent(label);
  const ll = `${lat},${lng}`;
  const url =
    Platform.OS === "ios"
      ? `maps://?daddr=${ll}&dirflg=d`
      : `google.navigation:q=${lat},${lng}`;
  void Linking.openURL(url).catch(() => {
    void Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`);
  });
}

/** Search / directions by address string when coordinates are unknown. */
export function openDirectionsToAddress(address: string, label = "Pickup"): void {
  const q = encodeURIComponent(address);
  const url =
    Platform.OS === "ios"
      ? `maps://?daddr=${q}&dirflg=d`
      : `geo:0,0?q=${q}(${encodeURIComponent(label)})`;
  void Linking.openURL(url).catch(() => {
    void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`);
  });
}

export function openMapsChoice(lat: number | null | undefined, lng: number | null | undefined, address: string, label = "Pickup"): void {
  const hasCoords = lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng);
  if (hasCoords) {
    if (Platform.OS === "ios") {
      Alert.alert("Open in Maps", "Choose a maps app.", [
        { text: "Apple Maps", onPress: () => void Linking.openURL(`maps://?daddr=${lat},${lng}&dirflg=d`) },
        {
          text: "Google Maps",
          onPress: () =>
            void Linking.openURL(`comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`).catch(() =>
              Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`),
            ),
        },
        { text: "Cancel", style: "cancel" },
      ]);
      return;
    }
    openDirectionsToCoords(lat!, lng!, label);
    return;
  }
  if (address?.trim()) {
    openDirectionsToAddress(address.trim(), label);
    return;
  }
  Alert.alert("No location", "This listing does not have an address or map pin yet.");
}
