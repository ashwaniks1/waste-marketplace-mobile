import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { supabase } from "../../lib/supabase";
import { useSession } from "../../providers/SessionProvider";

type Listing = {
  id: string;
  waste_type: string;
  quantity: string;
  status: string;
  asking_price: string | number;
  currency: string;
  pickup_job_status: string;
  assigned_driver_id: string | null;
};

export function SellerHomeScreen() {
  const { state } = useSession();
  const userId = state.status === "signed_in" ? state.session.user.id : null;
  const [items, setItems] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from("waste_listings")
        .select("id,waste_type,quantity,status,asking_price,currency,pickup_job_status,assigned_driver_id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (cancelled) return;
      if (error) {
        setError(error.message);
        setItems([]);
      } else {
        setItems((data as Listing[]) ?? []);
      }
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My listings</Text>
      <Text style={styles.sub}>Manage inventory, offers, and pickup jobs.</Text>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.muted}>Loading…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Can’t load your listings</Text>
          <Text style={styles.muted}>{error}</Text>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.muted}>You haven’t posted anything yet.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(x) => x.id}
          contentContainerStyle={{ paddingVertical: 10, gap: 10 }}
          renderItem={({ item }) => (
            <Pressable style={styles.card}>
              <Text style={styles.cardTitle}>
                {item.waste_type} • {item.quantity}
              </Text>
              <Text style={styles.cardSub}>
                {String(item.asking_price)} {item.currency} • {item.status}
              </Text>
              <Text style={styles.badge}>
                Pickup: {item.pickup_job_status}
                {item.assigned_driver_id ? " • Driver assigned" : ""}
              </Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "white" },
  title: { fontSize: 22, fontWeight: "900" },
  sub: { opacity: 0.7, marginTop: 6 },
  center: { paddingTop: 30, alignItems: "center", gap: 10 },
  muted: { opacity: 0.65, textAlign: "center" },
  errorTitle: { fontWeight: "900", fontSize: 16 },
  card: {
    borderRadius: 16,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.12)",
    backgroundColor: "white",
  },
  cardTitle: { fontWeight: "900" },
  cardSub: { opacity: 0.7, marginTop: 6 },
  badge: { marginTop: 10, opacity: 0.65, fontWeight: "800" },
});

