import React, { useState } from "react";
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { C, F } from "../theme";
import { Card, Field, GradientButton, QuietButton, T } from "../components/ui";

export default function SignInScreen() {
  const { pending, signIn, backToPicker } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!username.trim() || !password) {
      setError("Enter the username and password from the property office.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await signIn(username.trim(), password);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
          <Image source={require("../../assets/img/logo.png")} style={s.logo} resizeMode="contain" />
          <Text style={[T.h2, { marginTop: 20 }]}>Sign in</Text>
          <Text style={[T.body, { marginTop: 6 }]}>
            Accounts for {pending?.label ?? "your community"} are created by the property office,
            which verifies your unit before you get access. No SMS codes.
          </Text>

          <Card style={{ marginTop: 18 }}>
            <Field
              label="USERNAME"
              value={username}
              onChangeText={(v) => { setUsername(v); setError(""); }}
              placeholder="given by the property office"
            />
            <Field
              label="PASSWORD"
              value={password}
              onChangeText={(v) => { setPassword(v); setError(""); }}
              placeholder="••••••••"
              secureTextEntry
            />
            {error ? <Text style={s.error}>{error}</Text> : null}
            <GradientButton
              label={busy ? "Signing in…" : `Sign in to ${pending?.name ?? "Gather"}`}
              onPress={submit}
              disabled={busy}
              style={{ marginTop: 18 }}
            />
            <QuietButton
              label="Choose another property"
              onPress={backToPicker}
              tone={C.muted}
              style={{ marginTop: 10 }}
            />
          </Card>

          <Text style={[T.small, { marginTop: 16 }]}>
            First sign-in? Use the temporary password from the office — you'll set your own next.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.wash },
  body: { padding: 20, paddingBottom: 40 },
  logo: { width: 104, height: 32 },
  error: { marginTop: 12, fontFamily: F.bold, fontSize: 12.5, color: C.coral },
});
