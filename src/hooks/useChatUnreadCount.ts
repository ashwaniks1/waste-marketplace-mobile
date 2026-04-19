import { useCallback, useEffect, useState } from "react";
import { getConversationReadAt, isConversationUnread } from "../lib/chatReadState";
import { subscribeChatUnreadRefresh } from "../lib/chatUnreadBus";
import { supabase } from "../lib/supabase";

export function useChatUnreadCount(userId: string | null) {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!userId) {
      setCount(0);
      return;
    }
    const { data, error } = await supabase
      .from("conversations")
      .select("id,updated_at")
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error || !data?.length) {
      setCount(0);
      return;
    }
    const rows = data as { id: string; updated_at: string }[];
    const flags = await Promise.all(
      rows.map(async (row) => {
        const readAt = await getConversationReadAt(row.id);
        return isConversationUnread(row.updated_at, readAt);
      }),
    );
    setCount(flags.filter(Boolean).length);
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`conv-tab:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        () => void refresh(),
      )
      .subscribe();
    const unsub = subscribeChatUnreadRefresh(() => void refresh());
    return () => {
      unsub();
      void supabase.removeChannel(ch);
    };
  }, [userId, refresh]);

  return { count, refresh };
}
