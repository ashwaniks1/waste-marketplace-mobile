import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { supabase } from "../../lib/supabase";

type Listing = {
  id: string;
  waste_type: string;
  quantity: string;
  asking_price: string | number;
  currency: string;
  status: string;
  address: string;
  delivery_required: boolean;
};

export function BuyerHomeScreen() {
  const [items, setItems] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from("waste_listings")
        .select("id,waste_type,quantity,asking_price,currency,status,address,delivery_required")
        .in("status", ["open", "accepted"])
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
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Listings</Text>
      <Text style={styles.sub}>Discover waste lots near you and make offers.</Text>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.muted}>Loading…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Can’t load listings</Text>
          <Text style={styles.muted}>{error}</Text>
          <Text style={styles.muted}>
            If this is a new environment, you likely still need Supabase RLS policies for `waste_listings`.
          </Text>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.muted}>No listings yet.</Text>
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
              <Text style={styles.cardSub}>{item.address}</Text>
              <Text style={styles.price}>
                {String(item.asking_price)} {item.currency}
                {item.delivery_required ? " • Delivery" : ""}
              </Text>
              <Text style={styles.badge}>{item.status}</Text>
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
  price: { marginTop: 10, fontWeight: "800" },
  badge: { marginTop: 10, opacity: 0.6, fontWeight: "700" },
});

