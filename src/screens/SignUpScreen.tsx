import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ensureOwnUsersRow } from "../lib/ensureOwnUsersRow";
import { supabase } from "../lib/supabase";
import type { RootStackParamList } from "../navigation/types";
import { colors } from "../ui/theme";
import {
  combinedDisplayName,
  validateConfirmPassword,
  validateEmail,
  validatePassword,
  validatePersonName,
} from "../utils/profileValidation";

type Nav = NativeStackNavigationProp<RootStackParamList, "SignUp">;

export function SignUpScreen() {
  const navigation = useNavigation<Nav>();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const fieldErrors = useMemo(() => {
    const e: Record<string, string> = {};
    const fn = validatePersonName("First name", firstName);
    const ln = validatePersonName("Last name", lastName);
    const em = validateEmail(email);
    const pw = validatePassword(password);
    const cp = validateConfirmPassword(password, confirmPassword);
    if (fn) e.firstName = fn;
    if (ln) e.lastName = ln;
    if (em) e.email = em;
    if (pw) e.password = pw;
    if (cp) e.confirmPassword = cp;
    return e;
  }, [firstName, lastName, email, password, confirmPassword]);

  const canSubmit = useMemo(() => Object.keys(fieldErrors).length === 0, [fieldErrors]);

  async function signUp() {
    if (!canSubmit || busy) return;
    setBusy(true);
    try {
      const display = combinedDisplayName(firstName, lastName);
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            name: display,
          },
        },
      });
      if (error) {
        Alert.alert("Sign up failed", error.message);
        return;
      }

      const uid = data.user?.id;
      if (uid && data.session) {
        const { data: row } = await supabase.from("users").select("id").eq("id", uid).maybeSingle();
        if (!row) {
          const ensured = await ensureOwnUsersRow(uid);
          if (!ensured.ok) {
            Alert.alert(
              "Profile setup",
              ensured.message ??
                "Your account was created but the profile could not be saved. Set EXPO_PUBLIC_APP_API_URL to your web API, then try again.",
            );
            return;
          }
        }
      }

      if (data.session) {
        Alert.alert("Welcome", "Your account is ready.");
      } else {
        Alert.alert("Check your email", "Confirm your address if required, then sign in.", [
          { text: "OK", onPress: () => navigation.navigate("Login") },
        ]);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: "padding", android: undefined })}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => navigation.navigate("Login")} style={styles.backRow} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color={colors.textDim} />
          <Text style={styles.backText}>Back to sign in</Text>
        </Pressable>
        <View style={styles.hero}>
          <Text style={styles.brand}>Create account</Text>
          <Text style={styles.tagline}>Join with your work email. All fields are required.</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.row2}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>First name *</Text>
              <TextInput
                value={firstName}
                onChangeText={setFirstName}
                autoComplete="given-name"
                textContentType="givenName"
                placeholder="Jane"
                placeholderTextColor="rgba(255,255,255,0.45)"
                style={[styles.input, fieldErrors.firstName ? styles.inputErr : null]}
              />
              {fieldErrors.firstName ? <Text style={styles.err}>{fieldErrors.firstName}</Text> : null}
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Last name *</Text>
              <TextInput
                value={lastName}
                onChangeText={setLastName}
                autoComplete="family-name"
                textContentType="familyName"
                placeholder="Doe"
                placeholderTextColor="rgba(255,255,255,0.45)"
                style={[styles.input, fieldErrors.lastName ? styles.inputErr : null]}
              />
              {fieldErrors.lastName ? <Text style={styles.err}>{fieldErrors.lastName}</Text> : null}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Email *</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              keyboardType="email-address"
              textContentType="username"
              placeholder="you@company.com"
              placeholderTextColor="rgba(255,255,255,0.45)"
              style={[styles.input, fieldErrors.email ? styles.inputErr : null]}
            />
            {fieldErrors.email ? <Text style={styles.err}>{fieldErrors.email}</Text> : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password *</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
              placeholder="••••••••"
              placeholderTextColor="rgba(255,255,255,0.45)"
              style={[styles.input, fieldErrors.password ? styles.inputErr : null]}
            />
            <Text style={styles.hint}>At least 8 characters, one uppercase letter, one number.</Text>
            {fieldErrors.password ? <Text style={styles.err}>{fieldErrors.password}</Text> : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Confirm password *</Text>
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
              placeholder="••••••••"
              placeholderTextColor="rgba(255,255,255,0.45)"
              style={[styles.input, fieldErrors.confirmPassword ? styles.inputErr : null]}
            />
            {fieldErrors.confirmPassword ? <Text style={styles.err}>{fieldErrors.confirmPassword}</Text> : null}
          </View>

          <Pressable
            onPress={() => void signUp()}
            disabled={!canSubmit || busy}
            style={({ pressed }) => [
              styles.primaryButton,
              (!canSubmit || busy) && styles.buttonDisabled,
              pressed && canSubmit && !busy && styles.buttonPressed,
            ]}
          >
            <LinearGradient
              colors={[colors.primary, colors.primary2]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.primaryButtonBg}
            >
              <Text style={styles.primaryButtonText}>{busy ? "Creating account…" : "Create account"}</Text>
            </LinearGradient>
          </Pressable>

          <Pressable onPress={() => navigation.navigate("Login")} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Already have an account? Sign in</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 20, paddingTop: 48, paddingBottom: 32 },
  backRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 12, alignSelf: "flex-start" },
  backText: { color: colors.textDim, fontWeight: "700", fontSize: 15 },
  hero: { marginBottom: 16 },
  brand: { color: colors.text, fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  tagline: { marginTop: 8, color: colors.textDim, fontSize: 14, lineHeight: 20, maxWidth: 360 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
  },
  row2: { flexDirection: "row", gap: 10 },
  field: { marginBottom: 12 },
  label: { color: colors.textDim, marginBottom: 6, fontWeight: "600" },
  input: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.18)",
  },
  inputErr: { borderColor: "rgba(255,100,120,0.85)" },
  err: { color: "#FFB4BD", marginTop: 6, fontSize: 12, fontWeight: "700" },
  hint: { color: colors.textFaint, marginTop: 6, fontSize: 12 },
  primaryButton: { marginTop: 8, borderRadius: 12, overflow: "hidden" },
  primaryButtonBg: { paddingVertical: 12, alignItems: "center" },
  primaryButtonText: { color: "white", fontWeight: "800" },
  secondaryButton: { paddingVertical: 14, alignItems: "center" },
  secondaryButtonText: { color: "rgba(255,255,255,0.9)", fontWeight: "700" },
  buttonDisabled: { opacity: 0.5 },
  buttonPressed: { transform: [{ scale: 0.99 }] },
});
