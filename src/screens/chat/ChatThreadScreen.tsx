import { type RouteProp, useRoute } from "@react-navigation/native";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";
import type { ChatStackParamList } from "../../navigation/chat/ChatStack";
import { useSession } from "../../providers/SessionProvider";

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export function ChatThreadScreen() {
  const route = useRoute<RouteProp<ChatStackParamList, "ChatThread">>();
  const { state } = useSession();
  const userId = state.status === "signed_in" ? state.session.user.id : null;

  const conversationId = route.params.conversationId;
  const [items, setItems] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const canSend = useMemo(() => text.trim().length > 0, [text]);
  const [profiles, setProfiles] = useState<Record<string, { name: string | null }>>({});

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from("messages")
        .select("id,conversation_id,sender_id,body,created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(200);

      if (cancelled) return;
      if (error) {
        setError(error.message);
        setItems([]);
      } else {
        setItems((data as MessageRow[]) ?? []);
      }
      setLoading(false);
    }

    void load();

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const row = payload.new as MessageRow;
          setItems((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [conversationId]);

  useEffect(() => {
    const ids = [...new Set(items.map((m) => m.sender_id))];
    if (!ids.length) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("user_public_profiles").select("id,name").in("id", ids);
      if (cancelled) return;
      const next: Record<string, { name: string | null }> = {};
      for (const p of (data as { id: string; name: string | null }[] | null) ?? []) {
        next[p.id] = { name: p.name };
      }
      setProfiles((prev) => ({ ...prev, ...next }));
    })();
    return () => {
      cancelled = true;
    };
  }, [items]);

  async function send() {
    if (!userId || !canSend) return;
    const body = text.trim();
    setText("");
    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: userId,
      body,
    });
    if (error) {
      setText(body);
      setError(error.message);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.select({ ios: "padding", android: undefined })}
      keyboardVerticalOffset={Platform.select({ ios: 90, android: 0 })}
    >
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.muted}>Loading…</Text>
        </View>
      ) : error ? (
        <View style={styles.errorBar}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <FlatList
        data={items}
        keyExtractor={(x) => x.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        renderItem={({ item }) => {
          const mine = item.sender_id === userId;
          const name = profiles[item.sender_id]?.name ?? "User";
          const initial = name.slice(0, 1).toUpperCase();
          return (
            <View style={[styles.row, { alignSelf: mine ? "flex-end" : "flex-start" }]}>
              {!mine ? (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initial}</Text>
                </View>
              ) : null}
              <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                {!mine ? <Text style={styles.sender}>{name}</Text> : null}
                <Text style={[styles.body, mine ? styles.bodyMine : styles.bodyTheirs]}>{item.body}</Text>
                <Text style={styles.time}>{new Date(item.created_at).toLocaleTimeString()}</Text>
              </View>
              {mine ? (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>Me</Text>
                </View>
              ) : null}
            </View>
          );
        }}
      />

      <View style={styles.composer}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Message…"
          placeholderTextColor="rgba(0,0,0,0.45)"
          style={styles.input}
        />
        <Pressable onPress={send} disabled={!canSend} style={[styles.send, !canSend && styles.sendDisabled]}>
          <Text style={styles.sendText}>Send</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white" },
  center: { paddingTop: 30, alignItems: "center", gap: 10 },
  muted: { opacity: 0.65, textAlign: "center" },
  errorBar: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: "rgba(255,91,110,0.12)" },
  errorText: { color: "#B00020", fontWeight: "800" },
  row: { flexDirection: "row", alignItems: "flex-end", gap: 10, maxWidth: "100%" },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.06)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.10)",
    marginBottom: 2,
  },
  avatarText: { fontSize: 10, fontWeight: "900", color: "rgba(0,0,0,0.65)" },
  bubble: { maxWidth: "78%", borderRadius: 16, padding: 12, borderWidth: StyleSheet.hairlineWidth },
  bubbleMine: { backgroundColor: "rgba(91,140,255,0.10)", borderColor: "rgba(91,140,255,0.35)" },
  bubbleTheirs: { backgroundColor: "rgba(0,0,0,0.04)", borderColor: "rgba(0,0,0,0.10)" },
  sender: { color: "rgba(0,0,0,0.55)", fontSize: 12, fontWeight: "900", marginBottom: 6 },
  body: { fontSize: 15 },
  bodyMine: { fontWeight: "700" },
  bodyTheirs: { fontWeight: "600" },
  time: { marginTop: 6, opacity: 0.5, fontSize: 11 },
  composer: {
    flexDirection: "row",
    gap: 10,
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,0,0,0.12)",
  },
  input: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.04)",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  send: { paddingHorizontal: 14, borderRadius: 14, backgroundColor: "#111A2E", justifyContent: "center" },
  sendDisabled: { opacity: 0.5 },
  sendText: { color: "white", fontWeight: "900" },
});

