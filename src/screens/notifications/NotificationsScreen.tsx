import { Ionicons } from "@expo/vector-icons";
import { CommonActions, useNavigation } from "@react-navigation/native";
import React, { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import * as Notifications from "expo-notifications";
import { supabase } from "../../lib/supabase";
import { useSession } from "../../providers/SessionProvider";
import { useTimeZone } from "../../providers/TimezoneProvider";
import { GlassCard } from "../../ui/GlassCard";
import { GradientScreen } from "../../ui/GradientScreen";

type Row = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  read_at: string | null;
  listing_id: string | null;
  conversation_id: string | null;
  created_at: string;
};

export function NotificationsScreen() {
  const navigation = useNavigation<any>();
  const { state } = useSession();
  const me = state.status === "signed_in" ? state.session.user.id : null;
  const { formatDateTime } = useTimeZone();

  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!me) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("notifications")
      .select("id,type,title,body,read_at,listing_id,conversation_id,created_at")
      .eq("user_id", me)
      .order("created_at", { ascending: false })
      .limit(100);
    if (!error) {
      const rows = (data as Row[]) ?? [];
      setItems(rows);
      const unread = rows.filter((r) => !r.read_at).length;
      void Notifications.setBadgeCountAsync(unread);
    }
    setLoading(false);
  }, [me]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!me) return;
    const ch = supabase
      .channel(`notif:${me}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${me}` },
        (payload) => {
          const row = payload.new as Row;
          setItems((prev) => {
            const next = [row, ...prev.filter((x) => x.id !== row.id)];
            const unread = next.filter((x) => !x.read_at).length;
            void Notifications.setBadgeCountAsync(unread);
            return next;
          });
          void Notifications.scheduleNotificationAsync({
            content: { title: row.title, body: row.body ?? undefined },
            trigger: null,
          });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [me]);

  async function markRead(id: string) {
    const now = new Date().toISOString();
    await supabase.from("notifications").update({ read_at: now }).eq("id", id);
    setItems((prev) => {
      const next = prev.map((x) => (x.id === id ? { ...x, read_at: now } : x));
      const unread = next.filter((x) => !x.read_at).length;
      void Notifications.setBadgeCountAsync(unread);
      return next;
    });
  }

  return (
    <GradientScreen decorated>
      <FlatList
        data={items}
        keyExtractor={(x) => x.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 10 }}
        ListHeaderComponent={
          loading ? (
            <Text style={styles.muted}>Loading…</Text>
          ) : items.length === 0 ? (
            <Text style={styles.muted}>No notifications yet. You’ll see new offers and chat messages here.</Text>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => {
              void markRead(item.id);
              if (item.conversation_id) {
                navigation.dispatch(
                  CommonActions.navigate({
                    name: "Messages",
                    params: {
                      screen: "ChatThread",
                      params: { conversationId: item.conversation_id, title: item.title },
                    },
                  }),
                );
              } else if (item.listing_id) {
                navigation.dispatch(
                  CommonActions.navigate({
                    name: "Home",
                    params: {
                      screen: "ListingDetail",
                      params: { id: item.listing_id },
                    },
                  }),
                );
              }
            }}
          >
            <GlassCard style={{ padding: 14, opacity: item.read_at ? 0.72 : 1 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                <Text style={styles.title}>{item.title}</Text>
                {!item.read_at ? <View style={styles.dot} /> : null}
              </View>
              {item.body ? <Text style={styles.body}>{item.body}</Text> : null}
              <Text style={styles.time}>{formatDateTime(item.created_at)}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 }}>
                <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.5)" />
                <Text style={styles.openHint}>
                  {item.conversation_id ? "Open chat" : item.listing_id ? "Open listing" : "Tap to mark read"}
                </Text>
              </View>
            </GlassCard>
          </Pressable>
        )}
      />
    </GradientScreen>
  );
}

const styles = StyleSheet.create({
  muted: { color: "rgba(255,255,255,0.65)", marginBottom: 12, fontWeight: "600" },
  title: { color: "white", fontWeight: "900", fontSize: 16, flex: 1 },
  body: { color: "rgba(255,255,255,0.82)", marginTop: 8, fontWeight: "600", lineHeight: 20 },
  time: { color: "rgba(255,255,255,0.45)", marginTop: 8, fontSize: 12, fontWeight: "600" },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#5B8CFF", marginTop: 4 },
  openHint: { color: "rgba(255,255,255,0.55)", fontWeight: "700", fontSize: 13 },
});
