import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { supabase } from "../../lib/supabase";
import { useSession } from "../../providers/SessionProvider";
import { GlassCard } from "../../ui/GlassCard";
import { GradientScreen } from "../../ui/GradientScreen";

type Tx = { id: string; amount: string | number; currency: string; status: string; type: string };

export function DriverEarningsScreen() {
  const { state } = useSession();
  const me = state.status === "signed_in" ? state.session.user.id : null;
  const [rows, setRows] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!me) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("transactions")
        .select("id,amount,currency,status,type")
        .eq("payee_id", me)
        .order("created_at", { ascending: false })
        .limit(100);
      if (!cancelled) setRows((data as Tx[]) ?? []);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [me]);

  const totals = useMemo(() => {
    let paid = 0;
    for (const r of rows) {
      if (r.status === "paid") paid += Number(r.amount);
    }
    return { paid };
  }, [rows]);

  return (
    <GradientScreen>
      <View style={{ padding: 16, gap: 12 }}>
        <GlassCard>
          <Text style={styles.h1}>Earnings</Text>
          <Text style={styles.muted}>Totals are based on paid transactions where you are the payee.</Text>
          <Text style={styles.big}>${totals.paid.toFixed(2)}</Text>
          <Text style={styles.muted}>{loading ? "Loading…" : `${rows.length} transactions loaded`}</Text>
        </GlassCard>

        <Text style={styles.section}>Recent</Text>
        {rows.slice(0, 12).map((t) => (
          <GlassCard key={t.id}>
            <Text style={styles.rowTitle}>
              {t.type} • {t.status}
            </Text>
            <Text style={styles.rowAmt}>
              {String(t.amount)} {t.currency}
            </Text>
          </GlassCard>
        ))}
      </View>
    </GradientScreen>
  );
}

const styles = StyleSheet.create({
  h1: { color: "white", fontSize: 22, fontWeight: "900" },
  muted: { color: "rgba(255,255,255,0.65)", marginTop: 8, fontWeight: "600" },
  big: { color: "white", fontSize: 34, fontWeight: "900", marginTop: 12 },
  section: { color: "white", fontWeight: "900", marginTop: 6 },
  rowTitle: { color: "rgba(255,255,255,0.75)", fontWeight: "800" },
  rowAmt: { color: "white", fontWeight: "900", marginTop: 8, fontSize: 16 },
});
