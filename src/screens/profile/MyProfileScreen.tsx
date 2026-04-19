import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useCallback, useEffect, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { SettingsStackParamList } from "../../navigation/SettingsStack";
import { ensureOwnUsersRow } from "../../lib/ensureOwnUsersRow";
import { fetchOwnUserProfile, type OwnUserProfileRow } from "../../lib/fetchOwnUserProfile";
import { supabase } from "../../lib/supabase";
import { useSession } from "../../providers/SessionProvider";
import { GlassCard } from "../../ui/GlassCard";
import { GradientScreen } from "../../ui/GradientScreen";
import { combinedDisplayName } from "../../utils/profileValidation";

type Nav = NativeStackNavigationProp<SettingsStackParamList>;

type UserRow = OwnUserProfileRow;

export function MyProfileScreen() {
  const navigation = useNavigation<Nav>();
  const { state, refreshRole } = useSession();
  const userId = state.status === "signed_in" ? state.session.user.id : null;

  const [user, setUser] = useState<UserRow | null>(null);
  const [soldDone, setSoldDone] = useState<number | null>(null);
  const [boughtDone, setBoughtDone] = useState<number | null>(null);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      setUser(null);
      setLoadError(null);
      return;
    }
    setLoading(true);
    setLoadError(null);

    let { user: u, error: fetchErr } = await fetchOwnUserProfile(userId);
    if (!u && !fetchErr) {
      const ensured = await ensureOwnUsersRow(userId);
      if (!ensured.ok) {
        setLoadError(ensured.message ?? "Could not create your profile row.");
        setUser(null);
        setLoading(false);
        return;
      }
      await refreshRole();
      const again = await fetchOwnUserProfile(userId);
      u = again.user;
      fetchErr = again.error;
    }

    if (fetchErr) {
      setLoadError(fetchErr.message);
      setUser(null);
      setLoading(false);
      return;
    }

    setUser(u);

    const [{ count: c1 }, { count: c2 }, { data: revs }] = await Promise.all([
      supabase.from("waste_listings").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "completed"),
      supabase.from("waste_listings").select("id", { count: "exact", head: true }).eq("accepted_by", userId).eq("status", "completed"),
      supabase.from("reviews").select("score").eq("to_user_id", userId).limit(500),
    ]);
    setSoldDone(typeof c1 === "number" ? c1 : null);
    setBoughtDone(typeof c2 === "number" ? c2 : null);
    const list = (revs as { score: number }[] | null) ?? [];
    setReviewCount(list.length);
    if (list.length) {
      const sum = list.reduce((s, r) => s + r.score, 0);
      setAvgRating(sum / list.length);
    } else {
      setAvgRating(null);
    }
    setLoading(false);
  }, [userId, refreshRole]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <GradientScreen decorated>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <Pressable style={styles.editBtn} onPress={() => navigation.navigate("EditProfile")}>
          <Ionicons name="create-outline" size={18} color="white" />
          <Text style={styles.editBtnText}>Edit profile</Text>
        </Pressable>

        {loading ? <Text style={styles.muted}>Loading…</Text> : null}
        {!loading && loadError ? (
          <View style={{ marginTop: 12, gap: 10 }}>
            <Text style={styles.err}>{loadError}</Text>
            <Text style={styles.muted}>
              If you recently joined, apply pending database migrations in Supabase (including first/last name and the
              auth trigger), then pull to refresh this screen.
            </Text>
            <Pressable style={styles.retryBtn} onPress={() => void load()}>
              <Text style={styles.retryBtnText}>Try again</Text>
            </Pressable>
          </View>
        ) : null}
        {!loading && !loadError && !user ? (
          <Text style={styles.err}>Could not load profile. Pull to refresh or sign out and back in.</Text>
        ) : null}

        {user ? (
          <GlassCard style={{ marginTop: 12 }}>
            <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
              {user.avatar_url ? (
                <Image source={{ uri: user.avatar_url }} style={styles.avatarImg} />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {(user.first_name?.trim() || user.name || "?").slice(0, 1).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>
                  {user.first_name?.trim() && user.last_name?.trim()
                    ? combinedDisplayName(user.first_name, user.last_name)
                    : user.name}
                </Text>
                <Text style={styles.muted}>Role: {user.role}</Text>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={16} color="#FFD36A" />
                  <Text style={styles.ratingText}>{avgRating != null ? `${avgRating.toFixed(1)} avg` : "No reviews yet"}</Text>
                  <Text style={styles.muted}> • {reviewCount} reviews</Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            <Row icon="mail-outline" label="Email" value={user.email} />
            <Row icon="call-outline" label="Phone" value={user.phone ?? "—"} />
            <Row icon="location-outline" label="Address" value={user.address ?? "—"} />
            <Row icon="navigate-outline" label="ZIP" value={user.zip_code ?? "—"} />
            <Row icon="flag-outline" label="Country" value={(user as any).country_code ?? "—"} />
            <Row icon="cash-outline" label="Currency" value={(user as any).currency ?? "USD"} />
            <Row icon="bag-check-outline" label="Completed as seller" value={soldDone != null ? String(soldDone) : "—"} />
            <Row icon="cart-outline" label="Completed as buyer" value={boughtDone != null ? String(boughtDone) : "—"} />
          </GlassCard>
        ) : null}
      </ScrollView>
    </GradientScreen>
  );
}

function Row({ icon, label, value }: { icon: React.ComponentProps<typeof Ionicons>["name"]; label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={18} color="rgba(255,255,255,0.7)" />
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: "rgba(91,140,255,0.95)",
  },
  editBtnText: { color: "white", fontWeight: "900", fontSize: 15 },
  muted: { color: "rgba(255,255,255,0.65)", marginTop: 10, fontWeight: "600" },
  err: { color: "#FFB4BD", fontWeight: "900", marginTop: 10 },
  retryBtn: {
    alignSelf: "flex-start",
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.2)",
  },
  retryBtnText: { color: "white", fontWeight: "900" },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.18)",
  },
  avatarImg: { width: 64, height: 64, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.2)" },
  avatarText: { color: "white", fontWeight: "900", fontSize: 22 },
  name: { color: "white", fontSize: 22, fontWeight: "900" },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  ratingText: { color: "white", fontWeight: "900" },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: "rgba(255,255,255,0.12)", marginVertical: 14 },
  row: { flexDirection: "row", alignItems: "flex-start", marginBottom: 14 },
  rowLabel: { color: "rgba(255,255,255,0.55)", fontWeight: "800", fontSize: 12 },
  rowValue: { color: "white", fontWeight: "700", marginTop: 4, lineHeight: 20 },
});
