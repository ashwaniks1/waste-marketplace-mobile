import { supabase } from "./supabase";

export type OwnUserProfileRow = {
  id: string;
  name: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  address: string | null;
  country_code: string | null;
  currency: string | null;
  role: string;
  avatar_url: string | null;
  zip_code: string | null;
};

const FULL_SELECT = "id,name,first_name,last_name,email,phone,address,country_code,currency,role,avatar_url,zip_code";
const LEGACY_SELECT = "id,name,email,phone,address,country_code,currency,role,avatar_url,zip_code";

function splitNameForLegacy(name: string): { first_name: string; last_name: string } {
  const nm = name.trim();
  const sp = nm.indexOf(" ");
  if (sp > 0) {
    return { first_name: nm.slice(0, sp).trim(), last_name: nm.slice(sp + 1).trim() };
  }
  return { first_name: nm || "Member", last_name: nm || "Member" };
}

export async function fetchOwnUserProfile(userId: string): Promise<{
  user: OwnUserProfileRow | null;
  error: { message: string; code?: string } | null;
}> {
  const { data, error } = await supabase
    .from("users")
    .select(FULL_SELECT)
    .eq("id", userId)
    .maybeSingle();

  if (!error && data) {
    return { user: data as OwnUserProfileRow, error: null };
  }

  const msg = error?.message ?? "";
  if (error && /first_name|last_name|country_code|currency|column .* does not exist/i.test(msg)) {
    const r2 = await supabase.from("users").select(LEGACY_SELECT).eq("id", userId).maybeSingle();
    if (r2.error) return { user: null, error: { message: r2.error.message, code: r2.error.code } };
    if (!r2.data) return { user: null, error: null };
    const d = r2.data as Omit<OwnUserProfileRow, "first_name" | "last_name">;
    const split = splitNameForLegacy(String(d.name ?? ""));
    return { user: { ...d, ...split }, error: null };
  }

  if (error) return { user: null, error: { message: error.message, code: error.code } };
  return { user: null, error: null };
}
