import { Ionicons } from "@expo/vector-icons";
import { type RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ensureConversationId } from "../../lib/chat";
import { supabase } from "../../lib/supabase";
import type { BuyerHomeStackParamList } from "../../navigation/home/BuyerHomeStack";
import type { DriverHomeStackParamList } from "../../navigation/home/DriverHomeStack";
import type { SellerHomeStackParamList } from "../../navigation/home/SellerHomeStack";
import { useSession } from "../../providers/SessionProvider";
import { GlassCard } from "../../ui/GlassCard";
import { GradientScreen } from "../../ui/GradientScreen";

type AnyListingRoute = RouteProp<BuyerHomeStackParamList | SellerHomeStackParamList | DriverHomeStackParamList, "ListingDetail">;
type AnyNav = NativeStackNavigationProp<BuyerHomeStackParamList | SellerHomeStackParamList | DriverHomeStackParamList>;

export function ListingDetailScreen() {
  const route = useRoute<AnyListingRoute>();
  const navigation = useNavigation<AnyNav>();
  const { state } = useSession();
  const me = state.status === "signed_in" ? state.session.user.id : null;
  const role = state.status === "signed_in" ? state.role : null;

  const id = route.params.id;
  const [row, setRow] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase.from("listing_public_feed").select("*").eq("id", id).maybeSingle();
      if (cancelled) return;
      if (error) setError(error.message);
      else setRow(data);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const canTrack = useMemo(() => {
    if (!row || !me) return false;
    if (!row.delivery_required) return false;
    if (!row.assigned_driver_id) return false;
    if (row.seller_id === me) return true;
    if (row.accepted_by === me) return true;
    if (row.assigned_driver_id === me) return true;
    return false;
  }, [row, me]);

  const isBuyer = role === "buyer";

  async function openChat() {
    if (!me || !isBuyer) return;
    const convId = await ensureConversationId(id, me);
    if (!convId) {
      Alert.alert("Chat unavailable", "Could not create or load a conversation thread.");
      return;
    }
    (navigation as any).getParent()?.navigate?.("Chat", {
      screen: "ChatThread",
      params: { conversationId: convId, title: "Chat" },
    });
  }

  return (
    <GradientScreen>
      <ScrollView contentContainerStyle={styles.container}>
        {loading ? (
          <Text style={styles.muted}>Loading…</Text>
        ) : error ? (
          <GlassCard>
            <Text style={styles.title}>Unable to load listing</Text>
            <Text style={styles.muted}>{error}</Text>
          </GlassCard>
        ) : !row ? (
          <Text style={styles.muted}>Not found.</Text>
        ) : (
          <>
            <GlassCard>
              <Text style={styles.kicker}>{String(row.waste_type).replaceAll("_", " ")}</Text>
              <Text style={styles.h1}>{row.quantity}</Text>
              <Text style={styles.muted}>{row.address}</Text>
              <View style={styles.row}>
                <Text style={styles.price}>
                  {String(row.asking_price)} {row.currency}
                </Text>
                <Text style={styles.pill}>{row.status}</Text>
              </View>
            </GlassCard>

            <GlassCard style={{ marginTop: 12 }}>
              <Text style={styles.section}>Seller</Text>
              <Pressable
                style={styles.personRow}
                onPress={() => navigation.navigate("PublicProfile", { id: row.seller_id, title: row.seller_name ?? "Seller" })}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{(row.seller_name ?? "?").slice(0, 1).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.personName}>{row.seller_name ?? "Seller"}</Text>
                  <Text style={styles.muted}>Tap to view profile & reviews</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.65)" />
              </Pressable>
            </GlassCard>

            {row.assigned_driver_id ? (
              <GlassCard style={{ marginTop: 12 }}>
                <Text style={styles.section}>Driver</Text>
                <Pressable
                  style={styles.personRow}
                  onPress={() =>
                    navigation.navigate("PublicProfile", { id: row.assigned_driver_id, title: "Driver" })
                  }
                >
                  <Ionicons name="car" size={18} color="#B7FFD0" />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.personName}>Assigned driver</Text>
                    <Text style={styles.muted}>Tap to view profile</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.65)" />
                </Pressable>
              </GlassCard>
            ) : null}

            <View style={styles.actions}>
              {isBuyer ? (
                <Pressable style={styles.primaryBtn} onPress={openChat}>
                  <Ionicons name="chatbubbles" color="white" size={18} />
                  <Text style={styles.primaryBtnText}>Message seller</Text>
                </Pressable>
              ) : null}

              {canTrack ? (
                <Pressable style={styles.secondaryBtn} onPress={() => navigation.navigate("LiveTrack", { listingId: id })}>
                  <Ionicons name="map" color="white" size={18} />
                  <Text style={styles.secondaryBtnText}>Track pickup</Text>
                </Pressable>
              ) : null}
            </View>
          </>
        )}
      </ScrollView>
    </GradientScreen>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 28 },
  kicker: { color: "rgba(255,255,255,0.65)", fontWeight: "800", letterSpacing: 0.6, textTransform: "uppercase", fontSize: 12 },
  h1: { color: "white", fontSize: 26, fontWeight: "900", marginTop: 8 },
  muted: { color: "rgba(255,255,255,0.65)", marginTop: 8, lineHeight: 18, fontWeight: "600" },
  title: { color: "white", fontSize: 18, fontWeight: "900" },
  row: { marginTop: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  price: { color: "white", fontSize: 18, fontWeight: "900" },
  pill: { color: "rgba(255,255,255,0.85)", fontWeight: "900", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: "rgba(0,0,0,0.25)" },
  section: { color: "rgba(255,255,255,0.65)", fontWeight: "900", marginBottom: 10 },
  personRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.18)",
  },
  avatarText: { color: "white", fontWeight: "900" },
  personName: { color: "white", fontWeight: "900", fontSize: 16 },
  actions: { marginTop: 16, gap: 10 },
  primaryBtn: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: "rgba(91,140,255,0.95)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  primaryBtnText: { color: "white", fontWeight: "900" },
  secondaryBtn: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: "rgba(35,213,171,0.22)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(35,213,171,0.35)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  secondaryBtnText: { color: "white", fontWeight: "900" },
});
