import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { supabase } from "../../lib/supabase";
import { useSession } from "../../providers/SessionProvider";

type JobListing = {
  id: string;
  waste_type: string;
  quantity: string;
  status: string;
  pickup_job_status: string;
  pickup_zip: string | null;
  assigned_driver_id: string | null;
  delivery_required: boolean;
};

export function DriverHomeScreen() {
  const { state } = useSession();
  const userId = state.status === "signed_in" ? state.session.user.id : null;
  const [items, setItems] = useState<JobListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);

      // For now: show "available" jobs and jobs assigned to me.
      // Once PostGIS + matching is added, we’ll filter by distance.
      const { data, error } = await supabase
        .from("waste_listings")
        .select(
          "id,waste_type,quantity,status,pickup_job_status,pickup_zip,assigned_driver_id,delivery_required",
        )
        .eq("delivery_required", true)
        .or(`pickup_job_status.eq.available,assigned_driver_id.eq.${userId}`)
        .order("created_at", { ascending: false })
        .limit(50);

      if (cancelled) return;
      if (error) {
        setError(error.message);
        setItems([]);
      } else {
        setItems((data as JobListing[]) ?? []);
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
      <Text style={styles.title}>Driver jobs</Text>
      <Text style={styles.sub}>Claim nearby pickup jobs and track active deliveries.</Text>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.muted}>Loading…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Can’t load jobs</Text>
          <Text style={styles.muted}>{error}</Text>
          <Text style={styles.muted}>
            This usually means RLS isn’t configured yet for driver access to `waste_listings`.
          </Text>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.muted}>No jobs available right now.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(x) => x.id}
          contentContainerStyle={{ paddingVertical: 10, gap: 10 }}
          renderItem={({ item }) => {
            const mine = item.assigned_driver_id === userId;
            return (
              <Pressable style={[styles.card, mine && styles.cardMine]}>
                <Text style={styles.cardTitle}>
                  {item.waste_type} • {item.quantity}
                </Text>
                <Text style={styles.cardSub}>
                  {item.pickup_zip ? `Zip ${item.pickup_zip}` : "Pickup location on listing"}
                </Text>
                <Text style={styles.badge}>
                  {mine ? "Assigned to you" : "Available"} • {item.pickup_job_status}
                </Text>
              </Pressable>
            );
          }}
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
  cardMine: { borderColor: "rgba(91,140,255,0.55)", backgroundColor: "rgba(91,140,255,0.06)" },
  cardTitle: { fontWeight: "900" },
  cardSub: { opacity: 0.7, marginTop: 6 },
  badge: { marginTop: 10, opacity: 0.65, fontWeight: "800" },
});

