import { useNavigation } from "@react-navigation/native";
import React, { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { deviceIanaTimeZone, useTimeZone } from "../../providers/TimezoneProvider";
import { GlassCard } from "../../ui/GlassCard";
import { GradientScreen } from "../../ui/GradientScreen";

const COMMON_IANA = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
  "America/Toronto",
  "America/Vancouver",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Madrid",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Australia/Sydney",
];

export function TimeZonePickScreen() {
  const navigation = useNavigation();
  const { timeZone, setPreferredTimeZone } = useTimeZone();
  const deviceTz = deviceIanaTimeZone();
  const [busy, setBusy] = useState<string | null>(null);

  async function pick(tz: string | null) {
    setBusy(tz ?? "device");
    await setPreferredTimeZone(tz);
    setBusy(null);
    navigation.goBack();
  }

  return (
    <GradientScreen decorated>
      <FlatList
        data={[{ id: "device", label: `Use device (${deviceTz})`, tz: null as string | null }, ...COMMON_IANA.map((tz) => ({ id: tz, label: tz, tz }))]}
        keyExtractor={(x) => x.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 10 }}
        ListHeaderComponent={
          <GlassCard style={{ marginBottom: 8 }}>
            <Text style={styles.title}>Time zone</Text>
            <Text style={styles.muted}>
              Times in chat, offers, and tracking use this zone. Pick a city or default to this device’s region (
              {deviceTz}). Current: <Text style={styles.bold}>{timeZone}</Text>
            </Text>
          </GlassCard>
        }
        renderItem={({ item }) => (
          <Pressable
            disabled={busy !== null}
            onPress={() => void pick(item.tz)}
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }, busy === (item.tz ?? "device") && { opacity: 0.5 }]}
          >
            <Text style={styles.rowText}>{item.label}</Text>
            {(item.tz == null ? timeZone === deviceTz : item.tz === timeZone) ? <Text style={styles.pill}>Active</Text> : null}
          </Pressable>
        )}
      />
    </GradientScreen>
  );
}

const styles = StyleSheet.create({
  title: { color: "white", fontWeight: "900", fontSize: 18 },
  muted: { color: "rgba(255,255,255,0.7)", marginTop: 8, fontWeight: "600", lineHeight: 20 },
  bold: { color: "white", fontWeight: "900" },
  row: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: "rgba(0,0,0,0.28)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.14)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowText: { color: "white", fontWeight: "800", flex: 1 },
  pill: { color: "#23D5AB", fontWeight: "900", fontSize: 12 },
});
