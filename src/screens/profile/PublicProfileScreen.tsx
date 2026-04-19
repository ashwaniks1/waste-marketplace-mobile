import { Ionicons } from "@expo/vector-icons";
import { type RouteProp, useRoute } from "@react-navigation/native";
import React, { useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { supabase } from "../../lib/supabase";
import type { BuyerHomeStackParamList } from "../../navigation/home/BuyerHomeStack";
import type { DriverHomeStackParamList } from "../../navigation/home/DriverHomeStack";
import type { SellerHomeStackParamList } from "../../navigation/home/SellerHomeStack";
import { GlassCard } from "../../ui/GlassCard";
import { GradientScreen } from "../../ui/GradientScreen";

type AnyRoute = RouteProp<BuyerHomeStackParamList | SellerHomeStackParamList | DriverHomeStackParamList, "PublicProfile">;

type ReviewRow = { id: string; score: number; body: string | null; created_at: string; from_user_id: string };

export function PublicProfileScreen() {
  const route = useRoute<AnyRoute>();
  const id = route.params.id;

  const [profile, setProfile] = useState<any | null>(null);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const avg = useMemo(() => {
    if (!reviews.length) return null;
    const sum = reviews.reduce((s, r) => s + r.score, 0);
    return sum / reviews.length;
  }, [reviews]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const { data: p, error: e1 } = await supabase.from("user_public_profiles").select("*").eq("id", id).maybeSingle();
      const { data: rs, error: e2 } = await supabase
        .from("reviews")
        .select("id,score,body,created_at,from_user_id")
        .eq("to_user_id", id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (cancelled) return;
      if (e1) setError(e1.message);
      if (e2) setError(e2.message);
      setProfile(p);
      setReviews((rs as ReviewRow[]) ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <GradientScreen>
      <FlatList
        data={reviews}
        keyExtractor={(x) => x.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 28, gap: 12 }}
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 8 }}>
            {loading ? <Text style={styles.muted}>Loading…</Text> : null}
            {error ? <Text style={styles.err}>{error}</Text> : null}
            <GlassCard>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{(profile?.name ?? "?").slice(0, 1).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{profile?.name ?? "User"}</Text>
                  <Text style={styles.muted}>Role: {String(profile?.role ?? "—")}</Text>
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={16} color="#FFD36A" />
                    <Text style={styles.ratingText}>{avg ? `${avg.toFixed(1)} avg` : "No reviews yet"}</Text>
                    <Text style={styles.muted}> • {reviews.length} reviews</Text>
                  </View>
                </View>
              </View>
            </GlassCard>
            <GlassCard>
              <Text style={styles.section}>About</Text>
              <Text style={styles.muted}>Trust profile is powered by marketplace activity and peer reviews.</Text>
            </GlassCard>
            <Text style={styles.section}>Reviews</Text>
          </View>
        }
        renderItem={({ item }) => (
          <GlassCard>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={styles.score}>{item.score}★</Text>
              <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>
            </View>
            {item.body ? <Text style={styles.body}>{item.body}</Text> : <Text style={styles.muted}>No written review.</Text>}
          </GlassCard>
        )}
      />
    </GradientScreen>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.18)",
  },
  avatarText: { color: "white", fontWeight: "900", fontSize: 18 },
  name: { color: "white", fontSize: 20, fontWeight: "900" },
  muted: { color: "rgba(255,255,255,0.65)", marginTop: 6, fontWeight: "600", lineHeight: 18 },
  err: { color: "#FFB4BD", fontWeight: "900" },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  ratingText: { color: "white", fontWeight: "900" },
  section: { color: "white", fontWeight: "900", fontSize: 16 },
  score: { color: "white", fontWeight: "900" },
  date: { color: "rgba(255,255,255,0.55)", fontWeight: "700" },
  body: { color: "rgba(255,255,255,0.86)", marginTop: 10, lineHeight: 20, fontWeight: "600" },
});
