import React, { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

export function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const canSubmit = useMemo(() => email.trim().length > 3 && password.length >= 6, [email, password]);

  async function signIn() {
    if (!canSubmit || busy) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) Alert.alert("Sign in failed", error.message);
    } finally {
      setBusy(false);
    }
  }

  async function signUp() {
    if (!canSubmit || busy) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (error) Alert.alert("Sign up failed", error.message);
      else Alert.alert("Check your email", "If email confirmation is enabled, confirm your email then sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: "padding", android: undefined })}
      style={styles.container}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Waste Marketplace</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            keyboardType="email-address"
            textContentType="username"
            placeholder="you@company.com"
            style={styles.input}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
            textContentType="password"
            placeholder="••••••••"
            style={styles.input}
          />
        </View>

        <Pressable
          onPress={signIn}
          disabled={!canSubmit || busy}
          style={({ pressed }) => [
            styles.primaryButton,
            (!canSubmit || busy) && styles.buttonDisabled,
            pressed && canSubmit && !busy && styles.buttonPressed,
          ]}
        >
          <Text style={styles.primaryButtonText}>{busy ? "Working…" : "Sign in"}</Text>
        </Pressable>

        <Pressable onPress={signUp} disabled={!canSubmit || busy} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Create account</Text>
        </Pressable>

        <Text style={styles.hint}>
          Configure Supabase keys in <Text style={styles.mono}>.env</Text> (see{" "}
          <Text style={styles.mono}>.env.example</Text>).
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: "center", backgroundColor: "#0B1220" },
  card: {
    backgroundColor: "#111A2E",
    borderRadius: 16,
    padding: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.12)",
  },
  title: { color: "white", fontSize: 28, fontWeight: "700" },
  subtitle: { color: "rgba(255,255,255,0.75)", marginTop: 6, marginBottom: 18 },
  field: { marginBottom: 12 },
  label: { color: "rgba(255,255,255,0.75)", marginBottom: 6, fontWeight: "600" },
  input: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "white",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.14)",
  },
  primaryButton: {
    marginTop: 8,
    backgroundColor: "#4F8CFF",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryButtonText: { color: "white", fontWeight: "700" },
  secondaryButton: { paddingVertical: 12, alignItems: "center" },
  secondaryButtonText: { color: "rgba(255,255,255,0.85)", fontWeight: "600" },
  buttonDisabled: { opacity: 0.5 },
  buttonPressed: { transform: [{ scale: 0.99 }] },
  hint: { color: "rgba(255,255,255,0.6)", marginTop: 10, fontSize: 12, lineHeight: 16 },
  mono: { fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }) },
});

