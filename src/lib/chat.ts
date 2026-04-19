import { randomUuid } from "./randomUuid";
import { supabase } from "./supabase";

export type EnsureConversationResult =
  | { ok: true; conversationId: string }
  | { ok: false; message: string };

export async function ensureConversationId(listingId: string, buyerId: string): Promise<EnsureConversationResult> {
  const { data: existing, error: e1 } = await supabase
    .from("conversations")
    .select("id")
    .eq("listing_id", listingId)
    .eq("buyer_id", buyerId)
    .maybeSingle();
  if (e1) {
    return { ok: false, message: e1.message };
  }
  if (existing?.id) return { ok: true, conversationId: existing.id };

  const now = new Date().toISOString();
  const { data: created, error: e2 } = await supabase
    .from("conversations")
    .insert({
      id: randomUuid(),
      listing_id: listingId,
      buyer_id: buyerId,
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single();
  if (e2) {
    return { ok: false, message: e2.message };
  }
  if (!created?.id) return { ok: false, message: "No conversation id returned" };
  return { ok: true, conversationId: created.id };
}

/** Listing owner starts (or reopens) the buyer’s thread — requires `conversations_insert_participants` RLS. */
export async function ensureConversationForSeller(
  listingId: string,
  buyerId: string,
): Promise<EnsureConversationResult> {
  const { data: existing, error: e1 } = await supabase
    .from("conversations")
    .select("id")
    .eq("listing_id", listingId)
    .eq("buyer_id", buyerId)
    .maybeSingle();
  if (e1) return { ok: false, message: e1.message };
  if (existing?.id) return { ok: true, conversationId: existing.id };

  const now = new Date().toISOString();
  const { data: created, error: e2 } = await supabase
    .from("conversations")
    .insert({
      id: randomUuid(),
      listing_id: listingId,
      buyer_id: buyerId,
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single();
  if (e2) return { ok: false, message: e2.message };
  if (!created?.id) return { ok: false, message: "No conversation id returned" };
  return { ok: true, conversationId: created.id };
}
