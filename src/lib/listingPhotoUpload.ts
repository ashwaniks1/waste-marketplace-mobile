import { supabase } from "./supabase";

const BUCKET = "listing-photos";

/**
 * Uploads a local image file to Supabase Storage and returns a public HTTPS URL.
 * Paths are scoped per user: `{userId}/{timestamp}-{random}.jpg`
 */
export async function uploadListingPhoto(userId: string, localUri: string): Promise<string> {
  const response = await fetch(localUri);
  const buf = await response.arrayBuffer();
  const lower = localUri.toLowerCase();
  const ext = lower.includes(".png") ? "png" : lower.includes(".webp") ? "webp" : "jpg";
  const contentType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, buf, {
    contentType,
    upsert: false,
  });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
