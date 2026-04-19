import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { GlassCard } from "../ui/GlassCard";
import { listingAddressForDriverCard, type PublicListingRow } from "./MarketListingCard";

export function DriverPickupCard({
  item,
  distanceMiles,
  sellerRating,
  estPayout,
  busy,
  onAccept,
  onOpenDetail,
}: {
  item: PublicListingRow;
  distanceMiles: number | null;
  sellerRating: { avg: number; count: number } | null;
  estPayout: number;
  busy: boolean;
  onAccept: () => void;
  onOpenDetail?: () => void;
}) {
  const title = item.waste_type.replaceAll("_", " ");
  const ratingLabel =
    sellerRating && sellerRating.count > 0
      ? `${sellerRating.avg.toFixed(1)} (${sellerRating.count})`
      : "New seller";

  const body = (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.sub}>{item.quantity}</Text>
        <Text style={styles.addr} numberOfLines={2}>
          {listingAddressForDriverCard(item)}
        </Text>
        <View style={styles.metaRow}>
          <Ionicons name="navigate-outline" size={14} color="rgba(255,255,255,0.75)" />
          <Text style={styles.meta}>{distanceMiles != null ? `${distanceMiles.toFixed(1)} mi` : "Distance —"}</Text>
          <Text style={styles.dot}>•</Text>
          <Ionicons name="star" size={14} color="#FFD36A" />
          <Text style={styles.meta}>{ratingLabel}</Text>
        </View>
        {onOpenDetail ? <Text style={styles.tapHint}>Tap card for details</Text> : null}
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={styles.payoutLabel}>Est. payout</Text>
        <Text style={styles.payout}>${estPayout.toFixed(2)}</Text>
        <Text style={styles.currency}>{item.currency}</Text>
      </View>
    </View>
  );

  return (
    <GlassCard style={{ padding: 14 }}>
      {onOpenDetail ? (
        <Pressable onPress={onOpenDetail} android_ripple={{ color: "rgba(255,255,255,0.08)" }}>
          {body}
        </Pressable>
      ) : (
        body
      )}

      <Pressable disabled={busy} onPress={onAccept} style={[styles.accept, busy && { opacity: 0.55 }]}>
        <Ionicons name="checkmark-circle" color="white" size={20} />
        <Text style={styles.acceptText}>{busy ? "Claiming…" : "Accept pickup"}</Text>
      </Pressable>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  title: { color: "white", fontSize: 16, fontWeight: "900" },
  sub: { color: "rgba(255,255,255,0.72)", marginTop: 6, fontWeight: "700" },
  addr: { color: "rgba(255,255,255,0.78)", marginTop: 8, fontWeight: "600", lineHeight: 18 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  meta: { color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: "800" },
  dot: { color: "rgba(255,255,255,0.35)", fontWeight: "900" },
  payoutLabel: { color: "rgba(255,255,255,0.65)", fontWeight: "800", fontSize: 12 },
  payout: { color: "white", fontSize: 20, fontWeight: "900", marginTop: 4 },
  currency: { color: "rgba(255,255,255,0.65)", fontWeight: "800", marginTop: 2 },
  tapHint: { color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: "700", marginTop: 8 },
  accept: {
    marginTop: 12,
    borderRadius: 16,
    paddingVertical: 14,
    minHeight: 48,
    backgroundColor: "rgba(91,140,255,0.95)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  acceptText: { color: "white", fontWeight: "900" },
});
