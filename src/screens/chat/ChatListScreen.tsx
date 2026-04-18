import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { supabase } from "../../lib/supabase";

type ConversationRow = {
  id: string;
  listing_id: string;
  buyer_id: string;
  updated_at: string;
};

export function ChatListScreen() {
  const nav = useNavigation<any>();
  const [items, setItems] = useState<ConversationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);

      // RLS must allow participants (buyer + seller via listing owner) to read.
      const { data, error } = await supabase
        .from("conversations")
        .select("id,listing_id,buyer_id,updated_at")
        .order("updated_at", { ascending: false })
        .limit(50);

      if (cancelled) return;
      if (error) {
        setError(error.message);
        setItems([]);
      } else {
        setItems((data as ConversationRow[]) ?? []);
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
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.muted}>Loading…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Can’t load conversations</Text>
          <Text style={styles.muted}>{error}</Text>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.muted}>No conversations yet.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(x) => x.id}
          contentContainerStyle={{ paddingVertical: 10, gap: 10 }}
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() =>
                nav.navigate("ChatThread", { conversationId: item.id, title: `Listing ${item.listing_id.slice(0, 6)}` })
              }
            >
              <Text style={styles.cardTitle}>Conversation</Text>
              <Text style={styles.cardSub}>Listing: {item.listing_id}</Text>
              <Text style={styles.cardSub}>Updated: {new Date(item.updated_at).toLocaleString()}</Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "white" },
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
});

