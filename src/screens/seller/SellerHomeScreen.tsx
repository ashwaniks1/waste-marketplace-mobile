import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";
import type { SellerHomeStackParamList } from "../../navigation/home/SellerHomeStack";
import { supabase } from "../../lib/supabase";
import { useSession } from "../../providers/SessionProvider";
import { GlassCard } from "../../ui/GlassCard";
import { GradientScreen } from "../../ui/GradientScreen";

type Nav = NativeStackNavigationProp<SellerHomeStackParamList>;

type Row = {
  id: string;
  title: string | null;
  waste_type: string;
  quantity: string;
  status: string;
  pickup_job_status: string;
  assigned_driver_id: string | null;
  asking_price: string | number;
  currency: string;
  images: string[] | null;
};

type QuickFilter = "all" | "active" | "open" | "completed";

const WASTE_ICON: Record<string, string> = {
  PLASTIC: "♻️",
  PAPER: "📄",
  CARDBOARD: "📦",
  METAL: "🔩",
  GLASS: "🫙",
  E_WASTE: "🔌",
  ORGANIC: "🌱",
  MIXED: "🗑️",
  CUSTOM: "♻️",
};

function rowHeadline(item: Row) {
  if (item.title?.trim()) return item.title.trim();
  return `${item.waste_type.replaceAll("_", " ")} · ${item.quantity}`;
}

export function SellerHomeScreen() {
  const navigation = useNavigation<Nav>();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => navigation.navigate("CreateListing")}
          style={{ paddingHorizontal: 12, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 6 }}
        >
          <Ionicons name="add-circle" size={26} color="#BFFFEA" />
        </Pressable>
      ),
    });
  }, [navigation]);
  const { state } = useSession();
  const userId = state.status === "signed_in" ? state.session.user.id : null;
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quick, setQuick] = useState<QuickFilter>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from("waste_listings")
        .select("id,title,waste_type,quantity,status,pickup_job_status,assigned_driver_id,asking_price,currency,images")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (cancelled) return;
      if (error) {
        setError(error.message);
        setItems([]);
      } else setItems((data as Row[]) ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const stats = useMemo(() => {
    const active = items.filter((i) => i.status === "open" || i.status === "accepted" || i.status === "reopened").length;
    const openOnly = items.filter((i) => i.status === "open" || i.status === "reopened").length;
    const completed = items.filter((i) => i.status === "completed").length;
    return { active, openOnly, completed };
  }, [items]);

  const filtered = useMemo(() => {
    if (quick === "all") return items;
    if (quick === "active") return items.filter((i) => i.status === "open" || i.status === "accepted" || i.status === "reopened");
    if (quick === "open") return items.filter((i) => i.status === "open" || i.status === "reopened");
    return items.filter((i) => i.status === "completed");
  }, [items, quick]);

  function toggle(next: QuickFilter) {
    setQuick((q) => (q === next ? "all" : next));
  }

  const filterSummary = useMemo(() => {
    if (quick === "all") return "All listings";
    if (quick === "active") return "Active only";
    if (quick === "open") return "Open / reopened";
    return "Completed";
  }, [quick]);

  return (
    <GradientScreen decorated>
      <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
        <Text style={styles.title}>Seller command center</Text>
        <Text style={styles.sub}>Track materials you’ve listed, driver pickup status, and completed sales in one place.</Text>
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 12, gap: 10 }}>
        <View style={styles.quickRow}>
          <Pressable style={styles.quickBtn} onPress={() => navigation.navigate("CreateListing")}>
            <Ionicons name="add" size={18} color="white" />
            <Text style={styles.quickBtnText}>New listing</Text>
          </Pressable>
          <Pressable style={styles.quickBtnSecondary} onPress={() => setQuick("active")}>
            <Text style={styles.quickBtnTextDark}>Active only</Text>
          </Pressable>
          <Pressable style={styles.quickBtnSecondary} onPress={() => setQuick("completed")}>
            <Text style={styles.quickBtnTextDark}>Completed</Text>
          </Pressable>
        </View>

        <GlassCard style={{ paddingVertical: 4 }}>
          <Pressable
            onPress={() => setFiltersOpen((o) => !o)}
            style={styles.filterHeader}
            accessibilityRole="button"
            accessibilityState={{ expanded: filtersOpen }}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>At a glance — tap to filter</Text>
              {!filtersOpen ? <Text style={styles.filterSummary}>{filterSummary}</Text> : null}
            </View>
            <Ionicons name={filtersOpen ? "chevron-up" : "chevron-down"} size={22} color="rgba(255,255,255,0.75)" />
          </Pressable>
          {filtersOpen ? (
            <>
              <View style={{ gap: 10, marginTop: 6 }}>
                <Pressable style={[styles.stat, quick === "active" && styles.statOn]} onPress={() => toggle("active")}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={styles.statLabel}>Active listings</Text>
                    <Text style={styles.statValue}>{stats.active}</Text>
                  </View>
                  <Text style={styles.statHint}>Open, accepted, reopened</Text>
                </Pressable>
                <Pressable style={[styles.stat, quick === "open" && styles.statOn]} onPress={() => toggle("open")}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={styles.statLabel}>Open / reopened</Text>
                    <Text style={styles.statValue}>{stats.openOnly}</Text>
                  </View>
                  <Text style={styles.statHint}>Accepting offers</Text>
                </Pressable>
                <Pressable style={[styles.stat, quick === "completed" && styles.statOn]} onPress={() => toggle("completed")}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={styles.statLabel}>Completed</Text>
                    <Text style={styles.statValue}>{stats.completed}</Text>
                  </View>
                  <Text style={styles.statHint}>Past deals</Text>
                </Pressable>
              </View>
              {quick !== "all" ? (
                <Pressable onPress={() => setQuick("all")} style={{ marginTop: 10, marginBottom: 4 }}>
                  <Text style={styles.clear}>Clear filter</Text>
                </Pressable>
              ) : null}
            </>
          ) : null}
        </GlassCard>
      </View>

      {loading ? <Text style={styles.center}>Loading…</Text> : null}
      {error ? <Text style={styles.err}>{error}</Text> : null}

      <FlatList
        style={{ flex: 1 }}
        data={filtered}
        keyExtractor={(x) => x.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 28, gap: 12 }}
        ListHeaderComponent={
          <View style={{ marginBottom: 8 }}>
            <Text style={styles.section}>Your listings</Text>
            {quick !== "all" ? (
              <Text style={styles.filterNote}>
                Showing {quick === "active" ? "active" : quick === "open" ? "open / reopened" : "completed"} ({filtered.length})
              </Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          !loading && !error ? (
            <GlassCard style={{ padding: 16 }}>
              <Text style={styles.rowTitle}>Nothing in this view</Text>
              <Text style={styles.rowSub}>Try another filter or publish a new listing.</Text>
            </GlassCard>
          ) : null
        }
        renderItem={({ item }) => {
          const cover = item.images?.[0];
          const icon = WASTE_ICON[item.waste_type] ?? "♻️";
          return (
            <Pressable onPress={() => navigation.navigate("ListingDetail", { id: item.id })}>
              <GlassCard style={{ padding: 0, overflow: "hidden" }}>
                <View style={styles.hero}>
                  {cover ? <Image source={{ uri: cover }} style={styles.cover} /> : <View style={styles.coverFallback} />}
                  <View style={styles.heroOverlay} />
                  <Text style={styles.heroEmoji}>{icon}</Text>
                  <Text style={styles.heroTitle} numberOfLines={2}>
                    {rowHeadline(item)}
                  </Text>
                </View>
                <View style={{ padding: 14 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      {!item.title?.trim() ? null : (
                        <Text style={styles.rowSub}>
                          {item.waste_type.replaceAll("_", " ")} · {item.quantity}
                        </Text>
                      )}
                      <Text style={styles.rowSub}>
                        {String(item.asking_price)} {item.currency}
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 8 }}>
                      <View style={styles.pill}>
                        <Text style={styles.pillText}>{item.status}</Text>
                      </View>
                      <View style={styles.pill}>
                        <Text style={styles.pillText}>{item.pickup_job_status}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 12 }}>
                    <Text style={styles.hint}>{item.assigned_driver_id ? "Driver assigned" : "No driver yet"}</Text>
                    <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.65)" />
                  </View>
                </View>
              </GlassCard>
            </Pressable>
          );
        }}
      />
    </GradientScreen>
  );
}

const styles = StyleSheet.create({
  title: { color: "white", fontSize: 26, fontWeight: "900" },
  sub: { color: "rgba(255,255,255,0.65)", marginTop: 8, fontWeight: "600", lineHeight: 18 },
  quickRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  quickBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(35,213,171,0.35)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(35,213,171,0.55)",
  },
  quickBtnSecondary: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.25)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.14)",
    justifyContent: "center",
  },
  quickBtnText: { color: "white", fontWeight: "900", fontSize: 13 },
  quickBtnTextDark: { color: "rgba(255,255,255,0.88)", fontWeight: "900", fontSize: 13 },
  cardTitle: { color: "white", fontWeight: "900" },
  filterHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  filterSummary: { color: "rgba(255,255,255,0.55)", marginTop: 6, fontWeight: "700", fontSize: 12 },
  stat: {
    borderRadius: 16,
    padding: 12,
    backgroundColor: "rgba(0,0,0,0.22)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.12)",
  },
  statOn: { borderColor: "rgba(35,213,171,0.55)", backgroundColor: "rgba(35,213,171,0.15)" },
  statLabel: { color: "rgba(255,255,255,0.65)", fontWeight: "800", fontSize: 10 },
  statValue: { color: "white", fontWeight: "900", fontSize: 20, marginTop: 4 },
  statHint: { color: "rgba(255,255,255,0.45)", fontWeight: "700", fontSize: 9, marginTop: 4 },
  clear: { color: "#7FFFD4", fontWeight: "900", fontSize: 13 },
  section: { color: "white", fontWeight: "900", fontSize: 16 },
  filterNote: { color: "rgba(255,255,255,0.55)", marginTop: 4, fontWeight: "700", fontSize: 12 },
  rowTitle: { color: "white", fontWeight: "900", fontSize: 16 },
  rowSub: { color: "rgba(255,255,255,0.7)", marginTop: 6, fontWeight: "700" },
  pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: "rgba(0,0,0,0.25)", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.14)" },
  pillText: { color: "rgba(255,255,255,0.9)", fontWeight: "900", fontSize: 12 },
  hint: { color: "rgba(255,255,255,0.65)", fontWeight: "700" },
  center: { color: "rgba(255,255,255,0.7)", textAlign: "center", paddingVertical: 10 },
  err: { color: "#FFB4BD", textAlign: "center", paddingVertical: 10, fontWeight: "800" },
  hero: { height: 100, padding: 12, justifyContent: "flex-end" },
  cover: { ...StyleSheet.absoluteFillObject },
  coverFallback: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(35,213,171,0.2)" },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  heroEmoji: { position: "absolute", top: 10, left: 10, fontSize: 22 },
  heroTitle: { color: "white", fontWeight: "900", fontSize: 16 },
});
