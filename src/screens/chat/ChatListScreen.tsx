import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { getConversationReadAt, isConversationUnread } from "../../lib/chatReadState";
import { notifyChatUnreadChanged } from "../../lib/chatUnreadBus";
import { supabase } from "../../lib/supabase";
import { useSession } from "../../providers/SessionProvider";
import { useTimeZone } from "../../providers/TimezoneProvider";
import { GlassCard } from "../../ui/GlassCard";
import { GradientScreen } from "../../ui/GradientScreen";

type ConversationRow = {
  id: string;
  listing_id: string;
  buyer_id: string;
  updated_at: string;
};

type ListingMini = {
  id: string;
  title: string | null;
  quantity: string;
  waste_type: string;
  user_id: string;
  images: string[] | null;
};

function listingHeadline(l: ListingMini | undefined) {
  if (!l) return "Listing";
  if (l.title?.trim()) return l.title.trim();
  return `${String(l.waste_type).replaceAll("_", " ")} · ${l.quantity}`;
}

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

export function ChatListScreen() {
  const nav = useNavigation<any>();
  const { state } = useSession();
  const me = state.status === "signed_in" ? state.session.user.id : null;
  const { formatDateTime } = useTimeZone();

  const [items, setItems] = useState<ConversationRow[]>([]);
  const [listings, setListings] = useState<Record<string, ListingMini>>({});
  const [profiles, setProfiles] = useState<Record<string, { name: string | null; avatar_url: string | null }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadById, setUnreadById] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: convErr } = await supabase
      .from("conversations")
      .select("id,listing_id,buyer_id,updated_at")
      .order("updated_at", { ascending: false })
      .limit(50);

    if (convErr) {
      setError(convErr.message);
      setItems([]);
      setUnreadById({});
      setLoading(false);
      return;
    }

    const rows = (data as ConversationRow[]) ?? [];
    setItems(rows);

    const unreadMap: Record<string, boolean> = {};
    for (const r of rows) {
      const readAt = await getConversationReadAt(r.id);
      unreadMap[r.id] = isConversationUnread(r.updated_at, readAt);
    }
    setUnreadById(unreadMap);

    const listingIds = [...new Set(rows.map((r) => r.listing_id))];
    if (listingIds.length) {
      const { data: ls } = await supabase
        .from("waste_listings")
        .select("id,title,quantity,waste_type,user_id,images")
        .in("id", listingIds);
      const map: Record<string, ListingMini> = {};
      for (const x of (ls as ListingMini[] | null) ?? []) map[x.id] = x;
      setListings(map);

      const peerIds = new Set<string>();
      for (const r of rows) {
        const l = map[r.listing_id];
        if (!l || !me) continue;
        peerIds.add(me === r.buyer_id ? l.user_id : r.buyer_id);
      }
      if (peerIds.size) {
        const { data: profs } = await supabase
          .from("user_public_profiles")
          .select("id,name,avatar_url")
          .in("id", [...peerIds]);
        const pm: Record<string, { name: string | null; avatar_url: string | null }> = {};
        for (const p of (profs as { id: string; name: string | null; avatar_url: string | null }[] | null) ?? []) {
          pm[p.id] = { name: p.name, avatar_url: p.avatar_url };
        }
        setProfiles(pm);
      } else {
        setProfiles({});
      }
    } else {
      setListings({});
      setProfiles({});
    }
    setLoading(false);
  }, [me, formatDateTime]);

  useFocusEffect(
    useCallback(() => {
      void load();
      notifyChatUnreadChanged();
    }, [load]),
  );

  const emptyHint = useMemo(
    () => "Open a listing and tap “Message seller” to start a private thread about materials and pickup.",
    [],
  );

  return (
    <GradientScreen decorated>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#bfffea" />
          <Text style={styles.muted}>Loading conversations…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errTitle}>Can’t load conversations</Text>
          <Text style={styles.muted}>{error}</Text>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="chatbubbles-outline" size={48} color="rgba(255,255,255,0.35)" />
          <Text style={styles.emptyTitle}>No chats yet</Text>
          <Text style={styles.muted}>{emptyHint}</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(x) => x.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 28, gap: 12 }}
          renderItem={({ item }) => {
            const l = listings[item.listing_id];
            const headline = listingHeadline(l);
            const peerId = me && l ? (me === item.buyer_id ? l.user_id : item.buyer_id) : item.buyer_id;
            const peer = profiles[peerId];
            const cover = l?.images?.[0];
            const icon = WASTE_ICON[l?.waste_type ?? ""] ?? "♻️";
            const unread = unreadById[item.id];

            return (
              <Pressable
                onPress={() =>
                  nav.navigate("ChatThread", {
                    conversationId: item.id,
                    title: headline,
                  })
                }
                style={({ pressed }) => [pressed && { opacity: 0.92 }]}
              >
                <GlassCard style={[styles.card, unread && styles.cardUnread]}>
                  <View style={styles.row}>
                    <View style={styles.thumbWrap}>
                      {cover ? (
                        <Image source={{ uri: cover }} style={styles.thumb} />
                      ) : (
                        <Text style={styles.thumbEmoji}>{icon}</Text>
                      )}
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.listingTitle} numberOfLines={2}>
                        {headline}
                      </Text>
                      <View style={styles.peerRow}>
                        {peer?.avatar_url ? (
                          <Image source={{ uri: peer.avatar_url }} style={styles.peerAvatar} />
                        ) : (
                          <View style={styles.peerAvatarPh}>
                            <Text style={styles.peerAvatarTx}>{(peer?.name ?? "?").slice(0, 1).toUpperCase()}</Text>
                          </View>
                        )}
                        <Text style={styles.peerName} numberOfLines={1}>
                          {peer?.name ?? "Participant"}
                        </Text>
                      </View>
                      <View style={styles.timeRow}>
                        <Text style={styles.time}>Updated {formatDateTime(item.updated_at)}</Text>
                        {unread ? (
                          <View style={styles.newPill}>
                            <Text style={styles.newPillTx}>New</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.45)" />
                  </View>
                </GlassCard>
              </Pressable>
            );
          }}
        />
      )}
    </GradientScreen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, paddingTop: 40, paddingHorizontal: 20, alignItems: "center", gap: 12 },
  muted: { color: "rgba(255,255,255,0.65)", textAlign: "center", fontWeight: "600", lineHeight: 20 },
  errTitle: { color: "#FFB4BD", fontWeight: "900", fontSize: 17 },
  emptyTitle: { color: "white", fontWeight: "900", fontSize: 18, marginTop: 8 },
  card: { padding: 14 },
  cardUnread: {
    borderWidth: 1.5,
    borderColor: "rgba(35,213,171,0.65)",
    backgroundColor: "rgba(35,213,171,0.12)",
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  thumbWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  thumb: { width: 52, height: 52 },
  thumbEmoji: { fontSize: 26 },
  listingTitle: { color: "white", fontWeight: "900", fontSize: 16 },
  peerRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  peerAvatar: { width: 22, height: 22, borderRadius: 8 },
  peerAvatarPh: {
    width: 22,
    height: 22,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  peerAvatarTx: { color: "white", fontSize: 10, fontWeight: "900" },
  peerName: { color: "rgba(255,255,255,0.78)", fontWeight: "700", flex: 1 },
  timeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" },
  time: { color: "rgba(255,255,255,0.45)", fontSize: 12, fontWeight: "600" },
  newPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "rgba(35,213,171,0.35)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(35,213,171,0.55)",
  },
  newPillTx: { color: "white", fontWeight: "900", fontSize: 11 },
});
