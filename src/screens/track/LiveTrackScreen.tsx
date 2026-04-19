import { Ionicons } from "@expo/vector-icons";
import { type RouteProp, useRoute } from "@react-navigation/native";
import * as Location from "expo-location";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { supabase } from "../../lib/supabase";
import type { BuyerHomeStackParamList } from "../../navigation/home/BuyerHomeStack";
import type { DriverHomeStackParamList } from "../../navigation/home/DriverHomeStack";
import type { SellerHomeStackParamList } from "../../navigation/home/SellerHomeStack";
import { useSession } from "../../providers/SessionProvider";
import { GlassCard } from "../../ui/GlassCard";
import { GradientScreen } from "../../ui/GradientScreen";

type AnyRoute = RouteProp<BuyerHomeStackParamList | SellerHomeStackParamList | DriverHomeStackParamList, "LiveTrack">;

type LiveRow = {
  listing_id: string;
  driver_id: string;
  lat: number;
  lng: number;
  recorded_at: string;
};

export function LiveTrackScreen() {
  const route = useRoute<AnyRoute>();
  const { state } = useSession();
  const me = state.status === "signed_in" ? state.session.user.id : null;
  const role = state.status === "signed_in" ? state.role : null;

  const listingId = route.params.listingId;
  const [listing, setListing] = useState<any | null>(null);
  const [live, setLive] = useState<LiveRow | null>(null);
  const [job, setJob] = useState<{ id: string; status: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const watchRef = useRef<Location.LocationSubscription | null>(null);

  const isDriver = role === "driver" && !!me && !!listing?.assigned_driver_id && listing.assigned_driver_id === me;

  const region = useMemo(() => {
    const lat = live?.lat ?? listing?.latitude ?? 37.3349;
    const lng = live?.lng ?? listing?.longitude ?? -122.009;
    return { latitude: lat, longitude: lng, latitudeDelta: 0.08, longitudeDelta: 0.08 };
  }, [live, listing]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setError(null);
      const { data: l, error: e1 } = await supabase.from("listing_public_feed").select("*").eq("id", listingId).maybeSingle();
      if (cancelled) return;
      if (e1) setError(e1.message);
      else setListing(l);

      const { data: j } = await supabase
        .from("transport_jobs")
        .select("id,status")
        .eq("listing_id", listingId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled) setJob(j);

      const { data: loc } = await supabase.from("listing_live_locations").select("*").eq("listing_id", listingId).maybeSingle();
      if (!cancelled) setLive((loc as LiveRow) ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [listingId]);

  useEffect(() => {
    const channel = supabase
      .channel(`live:${listingId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "listing_live_locations", filter: `listing_id=eq.${listingId}` },
        (payload) => {
          const row = (payload.new ?? payload.old) as LiveRow;
          if (row && "lat" in row) setLive(row as LiveRow);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [listingId]);

  useEffect(() => {
    if (!isDriver || !listing?.assigned_driver_id) return;

    let cancelled = false;
    (async () => {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== "granted") {
        Alert.alert("Location required", "Enable location to share live tracking with the buyer/seller.");
        return;
      }

      watchRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 10_000,
          distanceInterval: 25,
        },
        async (pos) => {
          if (cancelled || !me) return;
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const { error } = await supabase.from("listing_live_locations").upsert(
            {
              listing_id: listingId,
              driver_id: me,
              lat,
              lng,
              heading: pos.coords.heading ?? null,
              speed: pos.coords.speed ?? null,
              recorded_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            { onConflict: "listing_id" },
          );
          if (error) setError(error.message);
        },
      );
    })();

    return () => {
      cancelled = true;
      watchRef.current?.remove();
      watchRef.current = null;
    };
  }, [isDriver, listing?.assigned_driver_id, listingId, me]);

  async function setTransportStatus(next: "scheduled" | "in_transit" | "completed" | "cancelled") {
    if (!job?.id) return;
    const { data, error } = await supabase.rpc("driver_set_transport_status", { p_job_id: job.id, p_status: next });
    if (error) {
      Alert.alert("Update failed", error.message);
      return;
    }
    if (data && typeof data === "object" && (data as any).ok === false) {
      Alert.alert("Update failed", String((data as any).error ?? "unknown"));
      return;
    }
    setJob({ id: job.id, status: next });
  }

  return (
    <GradientScreen>
      <View style={styles.mapWrap}>
        <MapView style={StyleSheet.absoluteFill} initialRegion={region}>
          {live ? <Marker coordinate={{ latitude: live.lat, longitude: live.lng }} title="Driver" /> : null}
          {listing?.latitude && listing?.longitude ? (
            <Marker coordinate={{ latitude: listing.latitude, longitude: listing.longitude }} pinColor="#23D5AB" title="Pickup" />
          ) : null}
        </MapView>
        <View style={styles.floating}>
          <GlassCard style={{ padding: 12 }}>
            <Text style={styles.title}>Live tracking</Text>
            <Text style={styles.muted}>
              {live ? `Last update: ${new Date(live.recorded_at).toLocaleTimeString()}` : "Waiting for driver location…"}
            </Text>
            {job ? (
              <Text style={styles.muted}>
                Job status: <Text style={styles.bold}>{job.status}</Text>
              </Text>
            ) : (
              <Text style={styles.muted}>No transport job found yet.</Text>
            )}
            {error ? <Text style={styles.err}>{error}</Text> : null}
          </GlassCard>
        </View>
      </View>

      {isDriver ? (
        <View style={styles.controls}>
          <Pressable style={styles.btn} onPress={() => void setTransportStatus("in_transit")}>
            <Ionicons name="navigate" color="white" size={18} />
            <Text style={styles.btnText}>On the way</Text>
          </Pressable>
          <Pressable style={styles.btn} onPress={() => void setTransportStatus("completed")}>
            <Ionicons name="checkmark-done" color="white" size={18} />
            <Text style={styles.btnText}>Complete</Text>
          </Pressable>
        </View>
      ) : null}
    </GradientScreen>
  );
}

const styles = StyleSheet.create({
  mapWrap: { flex: 1 },
  floating: { position: "absolute", top: 14, left: 14, right: 14 },
  title: { color: "white", fontWeight: "900", fontSize: 16 },
  muted: { color: "rgba(255,255,255,0.7)", marginTop: 6, fontWeight: "600" },
  bold: { color: "white", fontWeight: "900" },
  err: { color: "#FFB4BD", marginTop: 8, fontWeight: "800" },
  controls: { padding: 12, gap: 10, flexDirection: "row" },
  btn: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 12,
    backgroundColor: "rgba(91,140,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  btnText: { color: "white", fontWeight: "900" },
});
