import React, { useState } from "react";
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import * as api from "../api/endpoints";
import { AVATARS, C, F } from "../theme";
import { Avatar, Card, Field, GradientButton, QuietButton, T } from "../components/ui";

/** First-run: pick an avatar, set your own username, display name and password. */
export default function SetupScreen() {
  const { user, completeSetup, skipSetup } = useAuth();
  const flash = useToast();

  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [username, setUsername] = useState(user?.username ?? "");
  const [avatarIndex, setAvatarIndex] = useState(user?.avatarIndex ?? 0);
  const [photo, setPhoto] = useState<string | null>(user?.avatarPhoto ?? null);
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);

  const match = pw1.length > 0 && pw1 === pw2;

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { flash("Photo access is off in Settings"); return; }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"], quality: 0.6, base64: true, allowsEditing: true, aspect: [1, 1],
    });
    if (res.canceled || !res.assets?.[0]?.base64) return;
    setPhoto(`data:image/jpeg;base64,${res.assets[0].base64}`);
  };

  const save = async () => {
    if (!match) { flash("Enter the same password twice to continue"); return; }
    setBusy(true);
    try {
      const res = await api.setupAccount({
        displayName: displayName.trim(), username: username.trim(),
        password: pw1, avatarIndex, avatarPhoto: photo,
      });
      completeSetup(res.user);
      flash("You're all set");
    } catch (e) {
      flash(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
          <Image source={require("../../assets/img/logo.png")} style={s.logo} resizeMode="contain" />
          <Text style={[T.h2, { marginTop: 20 }]}>Set up your account</Text>
          <Text style={[T.body, { marginTop: 6 }]}>
            Choose an avatar, then set the username and password you will use from now on.
          </Text>

          <Card style={{ marginTop: 18 }}>
            <Text style={T.label}>PICK AN AVATAR</Text>
            <View style={s.grid}>
              {AVATARS.map((_, i) => (
                <Pressable
                  key={i}
                  onPress={() => { setAvatarIndex(i); setPhoto(null); }}
                  style={[s.avatarSlot, avatarIndex === i && !photo && s.avatarOn]}
                >
                  <Avatar name={displayName || username} index={i} size={44} />
                </Pressable>
              ))}
              <Pressable onPress={pickPhoto} style={[s.avatarSlot, s.photoSlot, !!photo && s.avatarOn]}>
                {photo
                  ? <Image source={{ uri: photo }} style={{ width: 44, height: 44, borderRadius: 22 }} />
                  : <Text style={s.photoText}>photo</Text>}
              </Pressable>
            </View>
            {photo ? (
              <Pressable onPress={() => setPhoto(null)}>
                <Text style={s.remove}>Remove photo</Text>
              </Pressable>
            ) : null}

            <Field label="DISPLAY NAME" value={displayName} onChangeText={setDisplayName} autoCapitalize="words" />
            <Field label="USERNAME" value={username} onChangeText={setUsername} />
            <Field label="NEW PASSWORD" value={pw1} onChangeText={setPw1} placeholder="at least 8 characters" secureTextEntry />
            <Field label="CONFIRM PASSWORD" value={pw2} onChangeText={setPw2} placeholder="repeat it" secureTextEntry />
            <Text style={[s.note, { color: pw2.length === 0 ? C.faint : match ? C.green : C.coral }]}>
              {pw2.length === 0
                ? "Use something you can remember at the collection table."
                : match ? "Passwords match." : "Passwords do not match yet."}
            </Text>

            <GradientButton
              label={busy ? "Saving…" : "Save and start ordering"}
              onPress={save}
              disabled={busy}
              style={{ marginTop: 16 }}
            />
            <QuietButton label="Do this later" onPress={skipSetup} tone={C.muted} style={{ marginTop: 10 }} />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.wash },
  body: { padding: 20, paddingBottom: 40 },
  logo: { width: 104, height: 32 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },
  avatarSlot: { borderRadius: 24, padding: 2, borderWidth: 2, borderColor: "transparent" },
  avatarOn: { borderColor: C.violet },
  photoSlot: {
    width: 48, height: 48, borderRadius: 24, borderWidth: 1.5, borderStyle: "dashed",
    borderColor: C.line3, alignItems: "center", justifyContent: "center",
  },
  photoText: { fontFamily: F.bold, fontSize: 10, color: C.faint },
  remove: { marginTop: 10, fontFamily: F.bold, fontSize: 12, color: C.violet },
  note: { marginTop: 12, fontFamily: F.bold, fontSize: 12 },
});
