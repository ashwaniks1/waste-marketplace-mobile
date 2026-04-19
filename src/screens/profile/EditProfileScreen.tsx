import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ensureOwnUsersRow } from "../../lib/ensureOwnUsersRow";
import { fetchOwnUserProfile } from "../../lib/fetchOwnUserProfile";
import { supabase } from "../../lib/supabase";
import { useSession } from "../../providers/SessionProvider";
import { GlassCard } from "../../ui/GlassCard";
import { GradientScreen } from "../../ui/GradientScreen";
import { combinedDisplayName, validatePersonName } from "../../utils/profileValidation";
import { currencyForCountry, normalizeCountryCode } from "../../lib/currency";

export function EditProfileScreen() {
  const navigation = useNavigation();
  const { state, refreshRole } = useSession();
  const userId = state.status === "signed_in" ? state.session.user.id : null;

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoading(true);
      let { user: row, error } = await fetchOwnUserProfile(userId);
      if (!row && !error) {
        const ensured = await ensureOwnUsersRow(userId);
        if (!ensured.ok) {
          Alert.alert("Load failed", ensured.message ?? "Could not create profile.");
          setLoading(false);
          return;
        }
        await refreshRole();
        const again = await fetchOwnUserProfile(userId);
        row = again.user;
        error = again.error;
      }
      if (error) {
        Alert.alert("Load failed", error.message);
        setLoading(false);
        return;
      }
      if (row) {
        const fn = String(row.first_name ?? "").trim();
        const ln = String(row.last_name ?? "").trim();
        if (fn || ln) {
          setFirstName(fn);
          setLastName(ln);
        } else {
          const legacy = String(row.name ?? "").trim();
          const sp = legacy.indexOf(" ");
          if (sp > 0) {
            setFirstName(legacy.slice(0, sp).trim());
            setLastName(legacy.slice(sp + 1).trim());
          } else {
            setFirstName(legacy);
            setLastName("");
          }
        }
        setPhone(String(row.phone ?? ""));
        setAddress(String(row.address ?? ""));
        setZipCode(String(row.zip_code ?? ""));
        setCountryCode(String((row as any).country_code ?? ""));
        setCurrency(String((row as any).currency ?? "USD"));
        setAvatarUrl(String(row.avatar_url ?? ""));
      }
      setLoading(false);
    })();
  }, [userId, refreshRole]);

  useEffect(() => {
    setCurrency(currencyForCountry(countryCode));
  }, [countryCode]);

  async function pickAndUpload() {
    if (!userId) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Photos", "Please allow photo library access to set your avatar.");
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (picked.canceled || !picked.assets[0]) return;
    const uri = picked.assets[0].uri;
    setUploading(true);
    try {
      const response = await fetch(uri);
      const buf = await response.arrayBuffer();
      const ext = uri.split(".").pop()?.toLowerCase().includes("png") ? "png" : "jpg";
      const path = `avatars/${userId}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, buf, {
        contentType: ext === "png" ? "image/png" : "image/jpeg",
        upsert: true,
      });
      if (upErr) {
        Alert.alert("Upload failed", upErr.message);
        return;
      }
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = pub.publicUrl;
      setAvatarUrl(url);
      Alert.alert("Photo ready", "Tap “Save changes” to apply this photo to your profile.");
    } catch (e: any) {
      Alert.alert("Upload failed", e?.message ?? "Unknown error");
    } finally {
      setUploading(false);
    }
  }

  async function removeAvatar() {
    setAvatarUrl("");
  }

  async function save() {
    if (!userId) return;
    const fnErr = validatePersonName("First name", firstName);
    const lnErr = validatePersonName("Last name", lastName);
    if (fnErr || lnErr) {
      Alert.alert("Check your name", [fnErr, lnErr].filter(Boolean).join("\n"));
      return;
    }
    const display = combinedDisplayName(firstName, lastName);
    const normalizedCountry = normalizeCountryCode(countryCode);
    const nextCurrency = currencyForCountry(normalizedCountry);
    setBusy(true);
    const { error } = await supabase
      .from("users")
      .update({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        name: display,
        phone: phone.trim() || null,
        address: address.trim() || null,
        zip_code: zipCode.trim() || null,
        avatar_url: avatarUrl.trim() || null,
        country_code: normalizedCountry,
        currency: nextCurrency,
      })
      .eq("id", userId);
    setBusy(false);
    if (error) {
      Alert.alert("Save failed", error.message);
      return;
    }
    Alert.alert("Saved", "Your profile was updated.", [{ text: "OK", onPress: () => navigation.goBack() }]);
  }

  if (loading) {
    return (
      <GradientScreen decorated>
        <View style={styles.center}>
          <ActivityIndicator color="#bfffea" />
          <Text style={styles.muted}>Loading profile…</Text>
        </View>
      </GradientScreen>
    );
  }

  return (
    <GradientScreen decorated>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <GlassCard>
          <Text style={styles.label}>Profile photo</Text>
          <View style={styles.avatarRow}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarPreview} />
            ) : (
              <View style={styles.avatarPh}>
                <Ionicons name="person" size={36} color="rgba(255,255,255,0.45)" />
              </View>
            )}
            <View style={{ flex: 1, gap: 10 }}>
              <Pressable style={styles.secondaryBtn} onPress={() => void pickAndUpload()} disabled={uploading}>
                {uploading ? <ActivityIndicator color="white" /> : <Text style={styles.secondaryBtnText}>Choose photo</Text>}
              </Pressable>
              {avatarUrl ? (
                <Pressable onPress={() => void removeAvatar()}>
                  <Text style={styles.remove}>Remove photo</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </GlassCard>

        <GlassCard style={{ marginTop: 12 }}>
          <Text style={styles.label}>First name *</Text>
          <TextInput
            value={firstName}
            onChangeText={setFirstName}
            autoComplete="given-name"
            textContentType="givenName"
            placeholder="First name"
            placeholderTextColor="rgba(255,255,255,0.45)"
            style={styles.input}
          />
          <Text style={[styles.label, styles.mt]}>Last name *</Text>
          <TextInput
            value={lastName}
            onChangeText={setLastName}
            autoComplete="family-name"
            textContentType="familyName"
            placeholder="Last name"
            placeholderTextColor="rgba(255,255,255,0.45)"
            style={styles.input}
          />

          <Text style={[styles.label, styles.mt]}>Phone</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="Optional"
            placeholderTextColor="rgba(255,255,255,0.45)"
            style={styles.input}
          />

          <Text style={[styles.label, styles.mt]}>Address</Text>
          <TextInput
            value={address}
            onChangeText={setAddress}
            multiline
            placeholder="Optional"
            placeholderTextColor="rgba(255,255,255,0.45)"
            style={[styles.input, styles.tall]}
          />

          <Text style={[styles.label, styles.mt]}>ZIP / postal code</Text>
          <TextInput
            value={zipCode}
            onChangeText={setZipCode}
            placeholder="Optional"
            placeholderTextColor="rgba(255,255,255,0.45)"
            style={styles.input}
          />

          <Text style={[styles.label, styles.mt]}>Country</Text>
          <TextInput
            value={countryCode}
            onChangeText={setCountryCode}
            autoCapitalize="characters"
            placeholder="e.g. US, CA, GB"
            placeholderTextColor="rgba(255,255,255,0.45)"
            style={styles.input}
            maxLength={2}
          />
          <Text style={styles.mutedSmall}>Currency will be set automatically: {currency}</Text>
        </GlassCard>

        <Pressable style={[styles.save, busy && { opacity: 0.6 }]} disabled={busy} onPress={() => void save()}>
          {busy ? <ActivityIndicator color="#04120E" /> : <Text style={styles.saveText}>Save changes</Text>}
        </Pressable>
      </ScrollView>
    </GradientScreen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  muted: { color: "rgba(255,255,255,0.65)", fontWeight: "600" },
  mutedSmall: { color: "rgba(255,255,255,0.55)", fontWeight: "700", marginTop: 10, fontSize: 12 },
  container: { padding: 16, paddingBottom: 40 },
  label: { color: "white", fontWeight: "900" },
  mt: { marginTop: 14 },
  input: {
    marginTop: 8,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "rgba(0,0,0,0.28)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.14)",
    color: "white",
    fontWeight: "700",
  },
  tall: { minHeight: 88, textAlignVertical: "top" },
  avatarRow: { flexDirection: "row", gap: 14, alignItems: "center", marginTop: 10 },
  avatarPreview: { width: 88, height: 88, borderRadius: 22, backgroundColor: "rgba(0,0,0,0.25)" },
  avatarPh: {
    width: 88,
    height: 88,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.14)",
  },
  secondaryBtn: {
    borderRadius: 14,
    paddingVertical: 12,
    backgroundColor: "rgba(91,140,255,0.95)",
    alignItems: "center",
  },
  secondaryBtnText: { color: "white", fontWeight: "900" },
  remove: { color: "#FFB4BD", fontWeight: "900", fontSize: 13 },
  save: {
    marginTop: 20,
    borderRadius: 16,
    paddingVertical: 16,
    backgroundColor: "rgba(35,213,171,0.95)",
    alignItems: "center",
  },
  saveText: { color: "#04120E", fontWeight: "900", fontSize: 16 },
});
