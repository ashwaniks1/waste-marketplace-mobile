import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { GlassCard } from "../ui/GlassCard";

export type PublicListingRow = {
  id: string;
  waste_type: string;
  quantity: string;
  asking_price: string | number;
  currency: string;
  status: string;
  address: string;
  images: string[] | null;
  delivery_required: boolean;
  pickup_job_status: string;
  latitude: number | null;
  longitude: number | null;
  seller_id: string;
  seller_name: string | null;
  seller_avatar_url: string | null;
  created_at?: string;
  driver_commission_amount?: string | number | null;
  driver_commission_percent?: string | number | null;
  commission_kind?: string | null;
};

export function MarketListingCard({
  item,
  distanceMiles,
  sellerRating,
  onPress,
}: {
  item: PublicListingRow;
  distanceMiles: number | null;
  sellerRating: { avg: number; count: number } | null;
  onPress: () => void;
}) {
  const cover = item.images?.[0];
  const title = item.waste_type.replaceAll("_", " ");
  const ratingLabel =
    sellerRating && sellerRating.count > 0
      ? `${sellerRating.avg.toFixed(1)} (${sellerRating.count})`
      : "New seller";

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.press, pressed && { transform: [{ scale: 0.99 }] }]}>
      <GlassCard style={styles.card}>
        <View style={styles.hero}>
          {cover ? <Image source={{ uri: cover }} style={styles.cover} /> : <View style={styles.coverFallback} />}
          <View style={styles.heroOverlay} />
          <View style={styles.heroTopRow}>
            <View style={styles.pill}>
              <Ionicons name="leaf" size={14} color="#B7FFD0" />
              <Text style={styles.pillText}>{item.delivery_required ? "Delivery" : "Pickup"}</Text>
            </View>
            <View style={styles.pill}>
              <Text style={styles.pillText}>{item.status}</Text>
            </View>
          </View>
          <Text style={styles.heroTitle}>{title}</Text>
          <Text style={styles.heroSub}>{item.quantity}</Text>
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.addr} numberOfLines={2}>
              {item.address}
            </Text>
            <View style={styles.metaRow}>
              <Ionicons name="navigate-outline" size={14} color="rgba(255,255,255,0.75)" />
              <Text style={styles.metaText}>{distanceMiles != null ? `${distanceMiles.toFixed(1)} mi` : "Distance —"}</Text>
              <Text style={styles.dot}>•</Text>
              <Ionicons name="star" size={14} color="#FFD36A" />
              <Text style={styles.metaText}>{ratingLabel}</Text>
            </View>
          </View>
          <View style={styles.priceCol}>
            <Text style={styles.price}>{String(item.asking_price)}</Text>
            <Text style={styles.currency}>{item.currency}</Text>
          </View>
        </View>

        <View style={styles.sellerRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(item.seller_name ?? "?").slice(0, 1).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sellerName}>{item.seller_name ?? "Seller"}</Text>
            <Text style={styles.sellerHint}>Verified marketplace participant</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.65)" />
        </View>
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  press: { marginBottom: 12 },
  card: { padding: 0, overflow: "hidden" },
  hero: { height: 132, padding: 12, justifyContent: "flex-end" },
  cover: { ...StyleSheet.absoluteFillObject },
  coverFallback: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(35,213,171,0.18)" },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.35)" },
  heroTopRow: { position: "absolute", top: 10, left: 10, right: 10, flexDirection: "row", justifyContent: "space-between" },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.18)",
  },
  pillText: { color: "rgba(255,255,255,0.92)", fontSize: 12, fontWeight: "800" },
  heroTitle: { color: "white", fontSize: 18, fontWeight: "900" },
  heroSub: { color: "rgba(255,255,255,0.78)", marginTop: 4, fontWeight: "600" },
  row: { padding: 14, flexDirection: "row", gap: 12, alignItems: "flex-start" },
  addr: { color: "rgba(255,255,255,0.86)", fontWeight: "600", lineHeight: 18 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  metaText: { color: "rgba(255,255,255,0.72)", fontSize: 12, fontWeight: "700" },
  dot: { color: "rgba(255,255,255,0.35)", fontWeight: "900" },
  priceCol: { alignItems: "flex-end" },
  price: { color: "white", fontSize: 18, fontWeight: "900" },
  currency: { color: "rgba(255,255,255,0.65)", fontSize: 12, fontWeight: "800", marginTop: 2 },
  sellerRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingBottom: 14 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.18)",
  },
  avatarText: { color: "white", fontWeight: "900" },
  sellerName: { color: "white", fontWeight: "900" },
  sellerHint: { color: "rgba(255,255,255,0.55)", marginTop: 2, fontSize: 12, fontWeight: "600" },
});
