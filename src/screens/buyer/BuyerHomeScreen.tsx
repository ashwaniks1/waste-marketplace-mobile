import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Location from "expo-location";
import React, { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MarketListingCard, type PublicListingRow } from "../../components/MarketListingCard";
import type { BuyerHomeStackParamList } from "../../navigation/home/BuyerHomeStack";
import { supabase } from "../../lib/supabase";
import { haversineMiles } from "../../utils/geo";
import { GradientScreen } from "../../ui/GradientScreen";
import { GlassCard } from "../../ui/GlassCard";

type Nav = NativeStackNavigationProp<BuyerHomeStackParamList>;

const MILES = [
  { label: "Any", value: null as number | null },
  { label: "5 mi", value: 5 },
  { label: "10 mi", value: 10 },
  { label: "25 mi", value: 25 },
];

export function BuyerHomeScreen() {
  const navigation = useNavigation<Nav>();
  const [items, setItems] = useState<PublicListingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [miles, setMiles] = useState<number | null>(null);
  const [wasteType, setWasteType] = useState<string | null>(null);
  const [sort, setSort] = useState<"nearest" | "newest">("newest");
  const [ratings, setRatings] = useState<Record<string, { avg: number; count: number }>>({});
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== "granted") return;
      const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setPoint({ lat: p.coords.latitude, lng: p.coords.longitude });
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from("listing_public_feed")
        .select("*")
        .in("status", ["open", "reopened"])
        .order("created_at", { ascending: false })
        .limit(200);
      if (cancelled) return;
      if (error) {
        setError(error.message);
        setItems([]);
      } else {
        const rows = (data as PublicListingRow[]) ?? [];
        setItems(rows);

        const sellerIds = [...new Set(rows.map((r) => r.seller_id).filter(Boolean))];
        if (sellerIds.length) {
          const { data: revs } = await supabase.from("reviews").select("to_user_id,score").in("to_user_id", sellerIds).limit(2000);
          const map: Record<string, { sum: number; count: number }> = {};
          for (const r of (revs as { to_user_id: string; score: number }[] | null) ?? []) {
            map[r.to_user_id] ??= { sum: 0, count: 0 };
            map[r.to_user_id]!.sum += r.score;
            map[r.to_user_id]!.count += 1;
          }
          const out: Record<string, { avg: number; count: number }> = {};
          for (const [k, v] of Object.entries(map)) out[k] = { avg: v.sum / v.count, count: v.count };
          setRatings(out);
        } else {
          setRatings({});
        }
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    let rows = items;
    if (wasteType) rows = rows.filter((r) => r.waste_type === wasteType);
    if (miles != null && point) {
      rows = rows.filter((r) => {
        if (r.latitude == null || r.longitude == null) return false;
        return haversineMiles(point, { lat: r.latitude, lng: r.longitude }) <= miles;
      });
    }
    const scored = rows.map((r) => {
      const d =
        point && r.latitude != null && r.longitude != null ? haversineMiles(point, { lat: r.latitude, lng: r.longitude }) : null;
      const t = new Date(r.created_at as unknown as string).getTime();
      return { r, d, t };
    });
    scored.sort((a, b) => {
      if (sort === "nearest") return (a.d ?? 1e9) - (b.d ?? 1e9);
      return b.t - a.t;
    });
    return scored;
  }, [items, miles, point, sort, wasteType]);

  const filterSummary = useMemo(() => {
    const mileLabel = MILES.find((m) => m.value === miles)?.label ?? "Any";
    const mat = wasteType ?? "All materials";
    const ord = sort === "nearest" ? "Nearest" : "Newest";
    return `${mileLabel} · ${mat} · ${ord}`;
  }, [miles, wasteType, sort]);

  return (
    <GradientScreen decorated>
      <View style={styles.header}>
        <Text style={styles.title}>Nearby listings</Text>
        <Text style={styles.sub}>Premium marketplace feed with distance + trust signals.</Text>
      </View>

      <GlassCard style={{ marginHorizontal: 16, marginBottom: 12, paddingVertical: 4 }}>
        <Pressable
          onPress={() => setFiltersOpen((o) => !o)}
          style={styles.filterHeader}
          accessibilityRole="button"
          accessibilityState={{ expanded: filtersOpen }}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Filters</Text>
            {!filtersOpen ? <Text style={styles.filterSummary}>{filterSummary}</Text> : null}
          </View>
          <Ionicons name={filtersOpen ? "chevron-up" : "chevron-down"} size={22} color="rgba(255,255,255,0.75)" />
        </Pressable>
        {filtersOpen ? (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 10 }}>
              {MILES.map((m) => {
                const active = miles === m.value;
                return (
                  <Pressable key={m.label} onPress={() => setMiles(m.value)} style={[styles.chip, active && styles.chipActive]}>
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{m.label}</Text>
                  </Pressable>
                );
              })}
              <Pressable onPress={() => setSort(sort === "nearest" ? "newest" : "nearest")} style={styles.chip}>
                <Ionicons name="swap-vertical" size={14} color="white" />
                <Text style={styles.chipText}>{sort === "nearest" ? "Nearest" : "Newest"}</Text>
              </Pressable>
            </ScrollView>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 10 }}>
              {["PLASTIC", "METAL", "CARDBOARD", "PAPER", "GLASS"].map((wt) => {
                const active = wasteType === wt;
                return (
                  <Pressable key={wt} onPress={() => setWasteType(active ? null : wt)} style={[styles.chip, active && styles.chipActive]}>
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{wt}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </>
        ) : null}
      </GlassCard>

      {loading ? <Text style={styles.center}>Loading…</Text> : null}
      {error ? <Text style={styles.err}>{error}</Text> : null}

      <FlatList
        style={{ flex: 1 }}
        data={filtered.map((x) => x.r)}
        keyExtractor={(x) => x.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        ListEmptyComponent={
          !loading && !error ? (
            <GlassCard style={{ padding: 20 }}>
              <Text style={styles.emptyTitle}>No listings match</Text>
              <Text style={styles.emptySub}>Try widening distance, clearing the material filter, or checking back later.</Text>
            </GlassCard>
          ) : null
        }
        renderItem={({ item }) => {
          const d =
            point && item.latitude != null && item.longitude != null
              ? haversineMiles(point, { lat: item.latitude, lng: item.longitude })
              : null;
          const rating = ratings[item.seller_id] ?? null;
          return (
            <MarketListingCard
              item={item}
              distanceMiles={d}
              sellerRating={rating}
              onPress={() => navigation.navigate("ListingDetail", { id: item.id })}
            />
          );
        }}
      />
    </GradientScreen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8 },
  title: { color: "white", fontSize: 26, fontWeight: "900" },
  sub: { color: "rgba(255,255,255,0.65)", marginTop: 8, fontWeight: "600", lineHeight: 18 },
  cardTitle: { color: "white", fontWeight: "900" },
  filterHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  filterSummary: { color: "rgba(255,255,255,0.55)", marginTop: 6, fontWeight: "700", fontSize: 12 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.25)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.14)",
  },
  chipActive: { backgroundColor: "rgba(35,213,171,0.22)", borderColor: "rgba(35,213,171,0.35)" },
  chipText: { color: "rgba(255,255,255,0.85)", fontWeight: "900", fontSize: 12 },
  chipTextActive: { color: "white" },
  center: { color: "rgba(255,255,255,0.7)", textAlign: "center", paddingVertical: 10 },
  err: { color: "#FFB4BD", textAlign: "center", paddingVertical: 10, fontWeight: "800" },
  emptyTitle: { color: "white", fontWeight: "900", fontSize: 16 },
  emptySub: { color: "rgba(255,255,255,0.65)", marginTop: 8, fontWeight: "600", lineHeight: 18 },
});
