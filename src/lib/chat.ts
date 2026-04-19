import { supabase } from "./supabase";

export async function ensureConversationId(listingId: string, buyerId: string): Promise<string | null> {
  const { data: existing, error: e1 } = await supabase
    .from("conversations")
    .select("id")
    .eq("listing_id", listingId)
    .eq("buyer_id", buyerId)
    .maybeSingle();
  if (e1) return null;
  if (existing?.id) return existing.id;

  const { data: created, error: e2 } = await supabase
    .from("conversations")
    .insert({ listing_id: listingId, buyer_id: buyerId })
    .select("id")
    .single();
  if (e2) return null;
  return created?.id ?? null;
}
