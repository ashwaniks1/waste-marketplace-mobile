import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import type { SellerHomeStackParamList } from "../../navigation/home/SellerHomeStack";
import { supabase } from "../../lib/supabase";
import { useSession } from "../../providers/SessionProvider";
import { GlassCard } from "../../ui/GlassCard";
import { GradientScreen } from "../../ui/GradientScreen";

type Nav = NativeStackNavigationProp<SellerHomeStackParamList>;

type Row = {
  id: string;
  waste_type: string;
  quantity: string;
  status: string;
  pickup_job_status: string;
  assigned_driver_id: string | null;
  asking_price: string | number;
  currency: string;
};

export function SellerHomeScreen() {
  const navigation = useNavigation<Nav>();
  const { state } = useSession();
  const userId = state.status === "signed_in" ? state.session.user.id : null;
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from("waste_listings")
        .select("id,waste_type,quantity,status,pickup_job_status,assigned_driver_id,asking_price,currency")
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
    const completed = items.filter((i) => i.status === "completed").length;
    return { active, completed };
  }, [items]);

  return (
    <GradientScreen>
      <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
        <Text style={styles.title}>Seller command center</Text>
        <Text style={styles.sub}>Earnings integration continues to layer on your existing web flows.</Text>
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 12, gap: 12 }}>
        <GlassCard>
          <Text style={styles.cardTitle}>At a glance</Text>
          <View style={{ flexDirection: "row", gap: 12, marginTop: 10 }}>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Active listings</Text>
              <Text style={styles.statValue}>{stats.active}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Completed</Text>
              <Text style={styles.statValue}>{stats.completed}</Text>
            </View>
          </View>
        </GlassCard>
      </View>

      {loading ? <Text style={styles.center}>Loading…</Text> : null}
      {error ? <Text style={styles.err}>{error}</Text> : null}

      <FlatList
        style={{ flex: 1 }}
        data={items}
        keyExtractor={(x) => x.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 28, gap: 12 }}
        ListHeaderComponent={<Text style={styles.section}>Your listings</Text>}
        renderItem={({ item }) => (
          <Pressable onPress={() => navigation.navigate("ListingDetail", { id: item.id })}>
            <GlassCard style={{ padding: 14 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{item.waste_type.replaceAll("_", " ")}</Text>
                  <Text style={styles.rowSub}>{item.quantity}</Text>
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
            </GlassCard>
          </Pressable>
        )}
      />
    </GradientScreen>
  );
}

const styles = StyleSheet.create({
  title: { color: "white", fontSize: 26, fontWeight: "900" },
  sub: { color: "rgba(255,255,255,0.65)", marginTop: 8, fontWeight: "600", lineHeight: 18 },
  cardTitle: { color: "white", fontWeight: "900" },
  stat: { flex: 1, borderRadius: 16, padding: 12, backgroundColor: "rgba(0,0,0,0.22)", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.12)" },
  statLabel: { color: "rgba(255,255,255,0.65)", fontWeight: "800", fontSize: 12 },
  statValue: { color: "white", fontWeight: "900", fontSize: 22, marginTop: 6 },
  section: { color: "white", fontWeight: "900", fontSize: 16, marginBottom: 6 },
  rowTitle: { color: "white", fontWeight: "900", fontSize: 16 },
  rowSub: { color: "rgba(255,255,255,0.7)", marginTop: 6, fontWeight: "700" },
  pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: "rgba(0,0,0,0.25)", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.14)" },
  pillText: { color: "rgba(255,255,255,0.9)", fontWeight: "900", fontSize: 12 },
  hint: { color: "rgba(255,255,255,0.65)", fontWeight: "700" },
  center: { color: "rgba(255,255,255,0.7)", textAlign: "center", paddingVertical: 10 },
  err: { color: "#FFB4BD", textAlign: "center", paddingVertical: 10, fontWeight: "800" },
});
