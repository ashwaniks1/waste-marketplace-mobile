import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

const LEGACY_OVERRIDE_KEY = "display_timezone_override";

export function deviceIanaTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC";
  } catch {
    return "UTC";
  }
}

type TimezoneContextValue = {
  timeZone: string;
  /** Persist on `users.timezone` (null = use this device’s detected zone). Clears legacy local-only overrides. */
  setPreferredTimeZone: (iana: string | null) => Promise<void>;
  formatDateTime: (iso: string) => string;
  formatTime: (iso: string) => string;
};

const TimezoneContext = createContext<TimezoneContextValue | null>(null);

export function TimezoneProvider({ userId, children }: { userId: string | null; children: React.ReactNode }) {
  const [serverTz, setServerTz] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setServerTz(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data } = await supabase.from("users").select("timezone").eq("id", userId).maybeSingle();
      if (!cancelled) setServerTz((data as { timezone?: string | null } | null)?.timezone?.trim() || null);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const timeZone = useMemo(() => {
    if (serverTz?.trim()) return serverTz.trim();
    return deviceIanaTimeZone();
  }, [serverTz]);

  const setPreferredTimeZone = useCallback(
    async (iana: string | null) => {
      await AsyncStorage.removeItem(LEGACY_OVERRIDE_KEY).catch(() => {});
      if (!userId) return;
      const tz = iana?.trim() || null;
      const { error } = await supabase.from("users").update({ timezone: tz }).eq("id", userId);
      if (!error) setServerTz(tz);
    },
    [userId],
  );

  const formatDateTime = useCallback(
    (iso: string) => {
      try {
        return new Intl.DateTimeFormat(undefined, {
          timeZone,
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date(iso));
      } catch {
        return new Date(iso).toLocaleString();
      }
    },
    [timeZone],
  );

  const formatTime = useCallback(
    (iso: string) => {
      try {
        return new Intl.DateTimeFormat(undefined, {
          timeZone,
          timeStyle: "short",
        }).format(new Date(iso));
      } catch {
        return new Date(iso).toLocaleTimeString();
      }
    },
    [timeZone],
  );

  const value = useMemo(
    () => ({ timeZone, setPreferredTimeZone, formatDateTime, formatTime }),
    [timeZone, setPreferredTimeZone, formatDateTime, formatTime],
  );

  return <TimezoneContext.Provider value={value}>{children}</TimezoneContext.Provider>;
}

export function useTimeZone(): TimezoneContextValue {
  const ctx = useContext(TimezoneContext);
  if (!ctx) {
    const tz = deviceIanaTimeZone();
    return {
      timeZone: tz,
      setPreferredTimeZone: async () => {},
      formatDateTime: (iso: string) => new Date(iso).toLocaleString(),
      formatTime: (iso: string) => new Date(iso).toLocaleTimeString(),
    };
  }
  return ctx;
}
