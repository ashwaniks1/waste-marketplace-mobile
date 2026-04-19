import { type Session } from "@supabase/supabase-js";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { normalizeRole, type UserRole } from "../types/roles";

type SessionState =
  | { status: "loading" }
  | { status: "signed_out" }
  | {
      status: "signed_in";
      session: Session;
      role: UserRole | null;
    };

const SessionContext = createContext<{
  state: SessionState;
  signOut: () => Promise<void>;
  /** Re-read role from public.users (e.g. after client inserts a missing profile row). */
  refreshRole: () => Promise<void>;
}>({
  state: { status: "loading" },
  signOut: async () => {},
  refreshRole: async () => {},
});

async function fetchUserRole(userId: string): Promise<UserRole | null> {
  // NOTE: This assumes a `public.users` profile table keyed by auth.users.id (your Prisma schema).
  // Once RLS is enabled, policies must allow the signed-in user to read their own row.
  const { data, error } = await supabase
    .from("users")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (error) return null;
  return normalizeRole(data?.role);
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SessionState>({ status: "loading" });

  const refreshRole = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const session = data.session ?? null;
    if (!session) return;
    const role = await fetchUserRole(session.user.id);
    setState({ status: "signed_in", session, role });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      const { data } = await supabase.auth.getSession();
      const session = data.session ?? null;

      if (!session) {
        if (!cancelled) setState({ status: "signed_out" });
        return;
      }

      const role = await fetchUserRole(session.user.id);
      if (!cancelled) setState({ status: "signed_in", session, role });
    }

    void boot();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session) {
        setState({ status: "signed_out" });
        return;
      }
      setState({ status: "signed_in", session, role: null });
      const role = await fetchUserRole(session.user.id);
      setState({ status: "signed_in", session, role });
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({
      state,
      signOut: async () => {
        await supabase.auth.signOut();
      },
      refreshRole,
    }),
    [state, refreshRole],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  return useContext(SessionContext);
}

