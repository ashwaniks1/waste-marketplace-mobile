import AsyncStorage from "@react-native-async-storage/async-storage";

const PREFIX = "wmp.chat.readAt.";

export async function getConversationReadAt(conversationId: string): Promise<string | null> {
  return AsyncStorage.getItem(PREFIX + conversationId);
}

export async function setConversationReadAt(conversationId: string, iso: string) {
  await AsyncStorage.setItem(PREFIX + conversationId, iso);
}

/** Mark conversation read “now” (call when user views the thread). */
export async function markConversationRead(conversationId: string) {
  await setConversationReadAt(conversationId, new Date().toISOString());
}

export function isConversationUnread(updatedAtIso: string, readAtIso: string | null): boolean {
  if (!readAtIso) return true;
  const u = Date.parse(updatedAtIso);
  const r = Date.parse(readAtIso);
  if (!Number.isFinite(u) || !Number.isFinite(r)) return true;
  return u > r;
}
