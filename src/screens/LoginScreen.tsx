import { Video, ResizeMode } from "expo-av";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo, useRef, useState } from "react";
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
import { colors } from "../ui/theme";

export function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const videoRef = useRef<Video>(null);

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
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Video
          ref={videoRef}
          source={{ uri: "https://cdn.coverr.co/videos/coverr-pouring-recycled-materials-2421/1080p.mp4" }}
          style={StyleSheet.absoluteFill}
          resizeMode={ResizeMode.COVER}
          isLooping
          shouldPlay
          isMuted
        />
        <LinearGradient
          colors={["rgba(7,11,21,0.35)", "rgba(7,11,21,0.85)", colors.bg]}
          locations={[0, 0.55, 1]}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <View style={styles.hero}>
        <Text style={styles.brand}>Waste Marketplace</Text>
        <Text style={styles.tagline}>Sell. Buy. Deliver. Track every pickup in real time.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to your business account</Text>

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
            placeholderTextColor="rgba(255,255,255,0.45)"
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
            placeholderTextColor="rgba(255,255,255,0.45)"
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
          <LinearGradient
            colors={[colors.primary, colors.primary2]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.primaryButtonBg}
          >
            <Text style={styles.primaryButtonText}>{busy ? "Signing in…" : "Sign in"}</Text>
          </LinearGradient>
        </Pressable>

        <Pressable onPress={signUp} disabled={!canSubmit || busy} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Create account</Text>
        </Pressable>

        <Text style={styles.hint}>
          Tip: your data access is protected by Supabase RLS policies (configured on the backend).
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: "center", backgroundColor: colors.bg },
  hero: { marginBottom: 16 },
  brand: { color: colors.text, fontSize: 34, fontWeight: "800", letterSpacing: -0.6 },
  tagline: { marginTop: 8, color: colors.textDim, fontSize: 14, lineHeight: 20, maxWidth: 360 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
  },
  cardTitle: { color: colors.text, fontSize: 20, fontWeight: "800" },
  subtitle: { color: colors.textDim, marginTop: 6, marginBottom: 18 },
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
  primaryButton: {
    marginTop: 8,
    borderRadius: 12,
    overflow: "hidden",
  },
  primaryButtonBg: {
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryButtonText: { color: "white", fontWeight: "800" },
  secondaryButton: { paddingVertical: 12, alignItems: "center" },
  secondaryButtonText: { color: "rgba(255,255,255,0.9)", fontWeight: "700" },
  buttonDisabled: { opacity: 0.5 },
  buttonPressed: { transform: [{ scale: 0.99 }] },
  hint: { color: colors.textFaint, marginTop: 10, fontSize: 12, lineHeight: 16 },
});

