import { supabase } from "./supabase";

function appApiOrigin(): string | null {
  const raw = process.env.EXPO_PUBLIC_APP_API_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/$/, "");
}

/**
 * Provisions `public.users` via the Next.js `POST /api/ensure-profile` route (service data on server).
 * Set `EXPO_PUBLIC_APP_API_URL` to your deployed web origin (e.g. https://app.example.com).
 */
export async function ensureOwnUsersRow(userId: string): Promise<{ ok: boolean; message?: string }> {
  const { data: authData } = await supabase.auth.getSession();
  const session = authData.session;
  if (!session?.access_token || session.user.id !== userId) {
    return { ok: false, message: "Not signed in." };
  }

  const base = appApiOrigin();
  if (!base) {
    return {
      ok: false,
      message:
        "Missing EXPO_PUBLIC_APP_API_URL. Set it to your Next.js site URL so the app can create your profile securely.",
    };
  }

  const res = await fetch(`${base}/api/ensure-profile`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      Accept: "application/json",
    },
  });

  const body = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    return {
      ok: false,
      message: typeof body.error === "string" ? body.error : `Profile API error (${res.status})`,
    };
  }
  return { ok: true };
}
