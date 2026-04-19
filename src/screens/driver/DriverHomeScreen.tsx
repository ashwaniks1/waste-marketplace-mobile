import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Location from "expo-location";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { Alert, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { DriverPickupCard } from "../../components/DriverPickupCard";
import type { PublicListingRow } from "../../components/MarketListingCard";
import type { DriverHomeStackParamList } from "../../navigation/home/DriverHomeStack";
import { supabase } from "../../lib/supabase";
import { haversineMiles } from "../../utils/geo";
import { GradientScreen } from "../../ui/GradientScreen";
import { GlassCard } from "../../ui/GlassCard";
import { useSession } from "../../providers/SessionProvider";

type Nav = NativeStackNavigationProp<DriverHomeStackParamList>;

const MILES = [
  { label: "Any", value: null as number | null },
  { label: "5 mi", value: 5 },
  { label: "10 mi", value: 10 },
  { label: "25 mi", value: 25 },
];

function estPayout(item: PublicListingRow, defaultPct: number): number {
  const base = Number(item.asking_price);
  const kind = item.commission_kind ?? "percent";
  if (kind === "fixed") {
    const fixed = item.driver_commission_amount != null ? Number(item.driver_commission_amount) : 0;
    return Math.max(0, fixed);
  }
  const pct = item.driver_commission_percent != null ? Number(item.driver_commission_percent) : defaultPct;
  return Math.round(base * (pct / 100) * 100) / 100;
}

export function DriverHomeScreen() {
  const navigation = useNavigation<Nav>();
  const { state } = useSession();
  const userId = state.status === "signed_in" ? state.session.user.id : null;

  const [tab, setTab] = useState<"available" | "accepted">("available");
  const [items, setItems] = useState<PublicListingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [miles, setMiles] = useState<number | null>(null);
  const [sort, setSort] = useState<"nearest" | "newest" | "payout">("newest");
  const [defaultPct, setDefaultPct] = useState<number>(10);
  const [ratings, setRatings] = useState<Record<string, { avg: number; count: number }>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={() => navigation.navigate("DriverEarnings")} style={{ paddingHorizontal: 10, paddingVertical: 6 }}>
          <Ionicons name="wallet-outline" size={22} color="#111827" />
        </Pressable>
      ),
    });
  }, [navigation]);

  useEffect(() => {
    (async () => {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== "granted") return;
      const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setPoint({ lat: p.coords.latitude, lng: p.coords.longitude });
    })();
  }, []);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);

    const { data: ps } = await supabase.from("platform_settings").select("default_driver_commission_percent").eq("id", 1).maybeSingle();
    const pct = ps?.default_driver_commission_percent != null ? Number(ps.default_driver_commission_percent) : 10;
    setDefaultPct(Number.isFinite(pct) ? pct : 10);

    let q = supabase.from("listing_public_feed").select("*").order("created_at", { ascending: false }).limit(200);
    if (tab === "available") {
      q = q
        .eq("delivery_required", true)
        .eq("pickup_job_status", "available")
        .is("assigned_driver_id", null)
        .in("status", ["open", "accepted", "reopened"]);
    } else {
      q = q.eq("assigned_driver_id", userId);
    }

    const { data, error } = await q;

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
  }, [tab, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const scored = useMemo(() => {
    let rows = items;
    if (miles != null && point) {
      rows = rows.filter((r) => {
        if (r.latitude == null || r.longitude == null) return false;
        return haversineMiles(point, { lat: r.latitude, lng: r.longitude }) <= miles;
      });
    }
    const mapped = rows.map((r) => {
      const d =
        point && r.latitude != null && r.longitude != null ? haversineMiles(point, { lat: r.latitude, lng: r.longitude }) : null;
      const t = new Date((r.created_at ?? "") as string).getTime();
      const p = estPayout(r, defaultPct);
      return { r, d, t, p };
    });
    mapped.sort((a, b) => {
      if (sort === "nearest") return (a.d ?? 1e9) - (b.d ?? 1e9);
      if (sort === "payout") return b.p - a.p;
      return b.t - a.t;
    });
    return mapped;
  }, [defaultPct, items, miles, point, sort]);

  const filterSummary = useMemo(() => {
    const mileLabel = MILES.find((m) => m.value === miles)?.label ?? "Any";
    const ord = sort === "nearest" ? "Nearest" : sort === "payout" ? "Payout" : "Newest";
    return `${mileLabel} · ${ord}`;
  }, [miles, sort]);

  async function claim(row: PublicListingRow) {
    if (!userId) return;
    setBusyId(row.id);
    try {
      const { data, error } = await supabase.rpc("driver_claim_pickup", { p_listing_id: row.id });
      if (error) {
        Alert.alert("Claim failed", error.message);
        return;
      }
      if (data && typeof data === "object" && (data as any).ok === false) {
        Alert.alert("Claim failed", String((data as any).error ?? "unknown"));
        return;
      }
      Alert.alert("Pickup claimed", "You’re assigned. Share live location from tracking.");
      await load();
      navigation.navigate("LiveTrack", { listingId: row.id });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <GradientScreen>
      <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
        <Text style={styles.title}>Driver pickups</Text>
        <Text style={styles.sub}>Paid delivery jobs near you. Claim a route, track live, and complete with the buyer PIN.</Text>
      </View>

      <View style={styles.segment}>
        <Pressable onPress={() => setTab("available")} style={[styles.segBtn, tab === "available" && styles.segBtnOn]}>
          <Text style={[styles.segText, tab === "available" && styles.segTextOn]}>Available</Text>
        </Pressable>
        <Pressable onPress={() => setTab("accepted")} style={[styles.segBtn, tab === "accepted" && styles.segBtnOn]}>
          <Text style={[styles.segText, tab === "accepted" && styles.segTextOn]}>Accepted</Text>
        </Pressable>
      </View>

      <GlassCard style={{ marginHorizontal: 16, marginBottom: 12, paddingVertical: 4 }}>
        <Pressable
          onPress={() => setFiltersOpen((o) => !o)}
          style={styles.filterHeader}
          accessibilityRole="button"
          accessibilityState={{ expanded: filtersOpen }}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Distance & payout</Text>
            {!filtersOpen ? <Text style={styles.filterSummary}>{filterSummary}</Text> : null}
          </View>
          <Ionicons name={filtersOpen ? "chevron-up" : "chevron-down"} size={22} color="rgba(255,255,255,0.75)" />
        </Pressable>
        {filtersOpen ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 10, paddingBottom: 12 }}>
            {MILES.map((m) => {
              const active = miles === m.value;
              return (
                <Pressable key={m.label} onPress={() => setMiles(m.value)} style={[styles.chip, active && styles.chipActive]}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{m.label}</Text>
                </Pressable>
              );
            })}
            <Pressable onPress={() => setSort("nearest")} style={[styles.chip, sort === "nearest" && styles.chipActive]}>
              <Text style={[styles.chipText, sort === "nearest" && styles.chipTextActive]}>Nearest</Text>
            </Pressable>
            <Pressable onPress={() => setSort("payout")} style={[styles.chip, sort === "payout" && styles.chipActive]}>
              <Text style={[styles.chipText, sort === "payout" && styles.chipTextActive]}>Payout</Text>
            </Pressable>
            <Pressable onPress={() => setSort("newest")} style={[styles.chip, sort === "newest" && styles.chipActive]}>
              <Text style={[styles.chipText, sort === "newest" && styles.chipTextActive]}>Newest</Text>
            </Pressable>
          </ScrollView>
        ) : null}
      </GlassCard>

      {loading ? <Text style={styles.center}>Loading…</Text> : null}
      {error ? <Text style={styles.err}>{error}</Text> : null}

      <FlatList
        style={{ flex: 1 }}
        data={scored.map((x) => x.r)}
        keyExtractor={(x) => x.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 28, gap: 12 }}
        renderItem={({ item }) => {
          const d =
            point && item.latitude != null && item.longitude != null
              ? haversineMiles(point, { lat: item.latitude, lng: item.longitude })
              : null;
          const rating = ratings[item.seller_id] ?? null;
          const payout = estPayout(item, defaultPct);

          if (tab === "available") {
            return (
              <DriverPickupCard
                item={item}
                distanceMiles={d}
                sellerRating={rating}
                estPayout={payout}
                busy={busyId === item.id}
                onOpenDetail={() => navigation.navigate("ListingDetail", { id: item.id })}
                onAccept={() => void claim(item)}
              />
            );
          }

          return (
            <GlassCard style={{ padding: 14 }}>
              <Pressable onPress={() => navigation.navigate("ListingDetail", { id: item.id })}>
                <Text style={styles.mineTitle}>{item.waste_type.replaceAll("_", " ")}</Text>
                <Text style={styles.mineSub}>{item.pickup_job_status}</Text>
              </Pressable>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 10, gap: 10 }}>
                <Pressable onPress={() => navigation.navigate("LiveTrack", { listingId: item.id })} style={[styles.miniBtn, { flex: 1, justifyContent: "center" }]}>
                  <Ionicons name="map" color="white" size={16} />
                  <Text style={styles.miniBtnText}>Track</Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    navigation.navigate("PublicProfile", { id: item.seller_id, title: item.seller_name ?? "Seller" })
                  }
                  style={[styles.miniBtnSecondary, { flex: 1, alignItems: "center" }]}
                >
                  <Text style={styles.miniBtnTextDark}>Seller</Text>
                </Pressable>
              </View>
            </GlassCard>
          );
        }}
      />
    </GradientScreen>
  );
}

const styles = StyleSheet.create({
  title: { color: "white", fontSize: 26, fontWeight: "900" },
  sub: { color: "rgba(255,255,255,0.65)", marginTop: 8, fontWeight: "600", lineHeight: 18 },
  segment: { flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingVertical: 10 },
  segBtn: { flex: 1, borderRadius: 16, paddingVertical: 12, backgroundColor: "rgba(0,0,0,0.25)", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.14)" },
  segBtnOn: { backgroundColor: "rgba(35,213,171,0.22)", borderColor: "rgba(35,213,171,0.35)" },
  segText: { textAlign: "center", color: "rgba(255,255,255,0.75)", fontWeight: "900" },
  segTextOn: { color: "white" },
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
  mineTitle: { color: "white", fontWeight: "900", fontSize: 16 },
  mineSub: { color: "rgba(255,255,255,0.65)", marginTop: 6, fontWeight: "800" },
  miniBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "rgba(91,140,255,0.95)",
  },
  miniBtnSecondary: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
  },
  miniBtnText: { color: "white", fontWeight: "900" },
  miniBtnTextDark: { color: "white", fontWeight: "900" },
});
