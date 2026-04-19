import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useState } from "react";
import * as Location from "expo-location";
import MapView, { Marker } from "react-native-maps";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchOwnUserProfile } from "../../lib/fetchOwnUserProfile";
import { uploadListingPhoto } from "../../lib/listingPhotoUpload";
import { supabase } from "../../lib/supabase";
import { useSession } from "../../providers/SessionProvider";
import { GlassCard } from "../../ui/GlassCard";
import { GradientScreen } from "../../ui/GradientScreen";

const WASTE_TYPES = ["PLASTIC", "PAPER", "CARDBOARD", "METAL", "GLASS", "E_WASTE", "ORGANIC", "MIXED", "CUSTOM"] as const;

export function CreateListingScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { state } = useSession();
  const userId = state.status === "signed_in" ? state.session.user.id : null;

  const [wasteType, setWasteType] = useState<(typeof WASTE_TYPES)[number]>("PLASTIC");
  const [title, setTitle] = useState("");
  const [quantity, setQuantity] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [askingPrice, setAskingPrice] = useState("");
  const [delivery, setDelivery] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState("");
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [defaultPct, setDefaultPct] = useState(10);
  const [busy, setBusy] = useState(false);
  const [currency, setCurrency] = useState("USD");
  const [pinLat, setPinLat] = useState(37.7749);
  const [pinLng, setPinLng] = useState(-122.4194);
  const mapW = Dimensions.get("window").width - 32;

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("platform_settings").select("default_driver_commission_percent").eq("id", 1).maybeSingle();
      const pct = data?.default_driver_commission_percent != null ? Number(data.default_driver_commission_percent) : 10;
      setDefaultPct(Number.isFinite(pct) ? pct : 10);
    })();
  }, []);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { user } = await fetchOwnUserProfile(userId);
      const cur = (user as any)?.currency;
      if (typeof cur === "string" && cur.trim().length === 3) setCurrency(cur.trim().toUpperCase());
    })();
  }, [userId]);

  async function reverseFillAddress(lat: number, lng: number) {
    try {
      const places = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      const p = places[0];
      if (!p) return;
      const line = [p.streetNumber, p.street, p.city, p.region, p.postalCode].filter(Boolean).join(", ");
      if (line) setAddress(line);
    } catch {
      /* keep typed address */
    }
  }

  async function addPhotosFromLibrary() {
    if (!userId) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Photos", "Allow photo library access to add listing photos.");
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: 12,
      quality: 0.85,
    });
    if (picked.canceled || !picked.assets?.length) return;
    setUploadingPhotos(true);
    try {
      const next: string[] = [];
      for (const a of picked.assets) {
        next.push(await uploadListingPhoto(userId, a.uri));
      }
      setUploadedUrls((u) => [...u, ...next]);
    } catch (e: any) {
      Alert.alert("Upload failed", e?.message ?? "Could not upload one or more photos.");
    } finally {
      setUploadingPhotos(false);
    }
  }

  function removeUploadedPhoto(uri: string) {
    setUploadedUrls((u) => u.filter((x) => x !== uri));
  }

  async function useMyLocationForPin() {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== "granted") {
      Alert.alert("Location needed", "Allow location to drop a pin near you for pickup.");
      return;
    }
    const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    setPinLat(p.coords.latitude);
    setPinLng(p.coords.longitude);
    await reverseFillAddress(p.coords.latitude, p.coords.longitude);
  }

  async function submit() {
    if (!userId) return;
    const t = title.trim();
    if (!t) {
      Alert.alert("Listing name", "Enter a short name buyers will see in search and chat.");
      return;
    }
    if (uploadedUrls.length < 1) {
      Alert.alert("Photos required", "Add at least one photo of your materials. You can add more later until the listing is completed.");
      return;
    }
    const q = quantity.trim();
    const addr = address.trim();
    const price = Number(askingPrice.replace(/,/g, "").trim());
    if (!q) {
      Alert.alert("Missing quantity", "Describe how much material you are listing.");
      return;
    }
    if (!addr) {
      Alert.alert("Missing address", "Pickup or drop-off address is required.");
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      Alert.alert("Invalid price", "Enter a positive asking price.");
      return;
    }
    let fee: number | null = null;
    if (delivery) {
      const f = Number((deliveryFee || "0").replace(/,/g, "").trim());
      if (!Number.isFinite(f) || f <= 0) {
        Alert.alert("Delivery fee", "Enter a positive delivery fee when delivery is enabled.");
        return;
      }
      fee = f;
    }

    setBusy(true);
    const now = new Date().toISOString();
    const row = {
      user_id: userId,
      title: t,
      waste_type: wasteType,
      quantity: q,
      description: description.trim() || null,
      images: uploadedUrls,
      address: addr,
      asking_price: price,
      currency,
      status: "open",
      delivery_available: delivery,
      delivery_fee: delivery ? fee : null,
      delivery_required: delivery,
      latitude: pinLat,
      longitude: pinLng,
      pickup_job_status: "none",
      commission_kind: "percent",
      driver_commission_percent: defaultPct,
      driver_commission_amount: null,
      pickup_zip: null,
      created_at: now,
      updated_at: now,
    };

    const { error } = await supabase.from("waste_listings").insert(row as any);
    setBusy(false);
    if (error) {
      Alert.alert("Could not publish", error.message);
      return;
    }
    Alert.alert("Listed", "Your listing is live on the marketplace.", [
      { text: "OK", onPress: () => navigation.goBack() },
    ]);
  }

  return (
    <GradientScreen decorated>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 16, paddingBottom: 24 + insets.bottom }}
        >
          <Text style={styles.lead}>Publish a pickup or delivery listing. Fields mirror the web seller flow.</Text>

          <GlassCard style={{ marginTop: 14 }}>
            <Text style={styles.label}>Listing name *</Text>
            <Text style={styles.hint}>Shown in search and chat — e.g. “Retail cardboard bundle”.</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Short name buyers will recognize"
              placeholderTextColor="rgba(255,255,255,0.45)"
              style={styles.input}
              maxLength={80}
            />
            <Text style={[styles.label, { marginTop: 14 }]}>Material type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 10 }}>
              {WASTE_TYPES.map((wt) => {
                const on = wasteType === wt;
                return (
                  <Pressable key={wt} onPress={() => setWasteType(wt)} style={[styles.chip, on && styles.chipOn]}>
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{wt}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </GlassCard>

          <GlassCard style={{ marginTop: 12 }}>
            <Text style={styles.label}>Quantity *</Text>
            <TextInput
              value={quantity}
              onChangeText={setQuantity}
              placeholder="e.g. 2 pallets, 500 lbs"
              placeholderTextColor="rgba(255,255,255,0.45)"
              style={styles.input}
            />
            <Text style={[styles.label, { marginTop: 14 }]}>Description</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Optional details for buyers"
              placeholderTextColor="rgba(255,255,255,0.45)"
              style={[styles.input, styles.multiline]}
              multiline
            />
            <Text style={[styles.label, { marginTop: 14 }]}>Address *</Text>
            <TextInput
              value={address}
              onChangeText={setAddress}
              placeholder="Pickup location (edit after placing pin)"
              placeholderTextColor="rgba(255,255,255,0.45)"
              style={[styles.input, styles.multiline]}
              multiline
            />
            <Text style={[styles.hint, { marginTop: 10 }]}>
              Drag the pin to set an approximate pickup point; we reverse-geocode into the address field. You can still edit the text.
            </Text>
            <View style={[styles.mapWrap, { width: mapW, height: 200, marginTop: 12 }]}>
              <MapView
                style={StyleSheet.absoluteFill}
                initialRegion={{
                  latitude: pinLat,
                  longitude: pinLng,
                  latitudeDelta: 0.06,
                  longitudeDelta: 0.06,
                }}
                region={{
                  latitude: pinLat,
                  longitude: pinLng,
                  latitudeDelta: 0.06,
                  longitudeDelta: 0.06,
                }}
              >
                <Marker
                  coordinate={{ latitude: pinLat, longitude: pinLng }}
                  draggable
                  onDragEnd={(e) => {
                    const { latitude, longitude } = e.nativeEvent.coordinate;
                    setPinLat(latitude);
                    setPinLng(longitude);
                    void reverseFillAddress(latitude, longitude);
                  }}
                />
              </MapView>
            </View>
            <Pressable style={[styles.secondary, { marginTop: 12 }]} onPress={() => void useMyLocationForPin()}>
              <Text style={styles.secondaryText}>Use my current location</Text>
            </Pressable>
            <Text style={[styles.label, { marginTop: 14 }]}>Asking price (USD) *</Text>
            <TextInput
              value={askingPrice}
              onChangeText={setAskingPrice}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor="rgba(255,255,255,0.45)"
              style={styles.input}
            />
          </GlassCard>

          <GlassCard style={{ marginTop: 12 }}>
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Delivery available</Text>
                <Text style={styles.hint}>Drivers can claim paid pickups when enabled.</Text>
              </View>
              <Switch value={delivery} onValueChange={setDelivery} trackColor={{ false: "#334155", true: "#0f766e" }} thumbColor="#f8fafc" />
            </View>
            {delivery ? (
              <>
                <Text style={[styles.label, { marginTop: 14 }]}>Delivery fee (USD) *</Text>
                <TextInput
                  value={deliveryFee}
                  onChangeText={setDeliveryFee}
                  keyboardType="decimal-pad"
                  placeholder="Fee charged to buyer"
                  placeholderTextColor="rgba(255,255,255,0.45)"
                  style={styles.input}
                />
              </>
            ) : null}
            <Text style={[styles.muted, { marginTop: 12 }]}>Driver commission: {defaultPct}% of sale (platform default).</Text>
          </GlassCard>

          <GlassCard style={{ marginTop: 12 }}>
            <Text style={styles.label}>Photos *</Text>
            <Text style={styles.hint}>
              Pick images from your library. We upload them securely and store public links (like a photo URL you could paste in a
              browser). At least one photo is required before you publish; you can add more later until the listing is completed.
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, marginTop: 12 }}>
              {uploadedUrls.map((uri) => (
                <View key={uri} style={styles.photoWrap}>
                  <Image source={{ uri }} style={styles.photoThumb} />
                  <Pressable style={styles.photoRemove} onPress={() => removeUploadedPhoto(uri)}>
                    <Text style={styles.photoRemoveTx}>×</Text>
                  </Pressable>
                </View>
              ))}
            </ScrollView>
            <Pressable
              style={[styles.secondary, { marginTop: 14, opacity: uploadingPhotos ? 0.65 : 1 }]}
              disabled={uploadingPhotos}
              onPress={() => void addPhotosFromLibrary()}
            >
              {uploadingPhotos ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.secondaryText}>Add photos from library</Text>
              )}
            </Pressable>
          </GlassCard>

          <Pressable
            onPress={() => void submit()}
            disabled={busy}
            style={[styles.primary, { marginTop: 18, marginBottom: 8 + insets.bottom }, busy && { opacity: 0.6 }]}
          >
            {busy ? <ActivityIndicator color="white" /> : <Text style={styles.primaryText}>Publish listing</Text>}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </GradientScreen>
  );
}

const styles = StyleSheet.create({
  lead: { color: "rgba(255,255,255,0.75)", fontWeight: "700", lineHeight: 20 },
  label: { color: "white", fontWeight: "900" },
  hint: { color: "rgba(255,255,255,0.55)", marginTop: 6, fontWeight: "600", fontSize: 12 },
  muted: { color: "rgba(255,255,255,0.6)", fontWeight: "600", fontSize: 12 },
  input: {
    marginTop: 8,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "rgba(0,0,0,0.28)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.14)",
    color: "white",
    fontWeight: "700",
  },
  multiline: { minHeight: 88, textAlignVertical: "top" },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.25)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.14)",
  },
  chipOn: { backgroundColor: "rgba(35,213,171,0.22)", borderColor: "rgba(35,213,171,0.35)" },
  chipText: { color: "rgba(255,255,255,0.85)", fontWeight: "900", fontSize: 12 },
  chipTextOn: { color: "white" },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  primary: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: "rgba(35,213,171,0.95)",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { color: "white", fontWeight: "900", fontSize: 16 },
  mapWrap: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.18)",
    alignSelf: "center",
  },
  secondary: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "rgba(91,140,255,0.35)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
  },
  secondaryText: { color: "white", fontWeight: "900" },
  photoWrap: { position: "relative" },
  photoThumb: { width: 96, height: 96, borderRadius: 14, backgroundColor: "rgba(0,0,0,0.25)" },
  photoRemove: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  photoRemoveTx: { color: "white", fontWeight: "900", fontSize: 18, marginTop: -2 },
});
