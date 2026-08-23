import React, { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as api from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { AVATARS, C, F, RADIUS } from "../theme";
import { Avatar, Card, Field, GradientButton, QuietButton, T } from "../components/ui";

export default function AccountScreen() {
  const { user, community, refresh, signOut } = useAuth();
  const flash = useToast();

  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [username, setUsername] = useState(user?.username ?? "");
  const [avatarIndex, setAvatarIndex] = useState(user?.avatarIndex ?? 0);
  const [photo, setPhoto] = useState<string | null>(user?.avatarPhoto ?? null);
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { flash("Photo access is off in Settings"); return; }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"], quality: 0.6, base64: true, allowsEditing: true, aspect: [1, 1],
    });
    if (res.canceled || !res.assets?.[0]?.base64) return;
    setPhoto(`data:image/jpeg;base64,${res.assets[0].base64}`);
  };

  const saveProfile = async () => {
    try {
      await api.updateProfile({
        displayName: displayName.trim(), username: username.trim(), avatarIndex, avatarPhoto: photo,
      });
      await refresh();
      flash("Account updated");
    } catch (e) {
      flash(e instanceof Error ? e.message : "Could not save");
    }
  };

  const savePassword = async () => {
    if (!pw1 || pw1 !== pw2) { flash("Enter the same password twice"); return; }
    try {
      await api.updatePassword(pw1);
      setPw1(""); setPw2("");
      flash("Password updated");
    } catch { flash("Could not update the password"); }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }}>
      <Text style={T.h2}>Account</Text>

      <Card style={{ marginTop: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <Avatar name={displayName || username} index={avatarIndex} photo={photo} size={56} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={T.title}>{displayName || "You"}</Text>
            <Text style={[T.small, { marginTop: 3 }]}>
              @{username} · {user?.block} #{user?.unit}
            </Text>
            {user?.verified ? (
              <Text style={s.verified}>✓ Verified by the {community?.label ?? "property"} office</Text>
            ) : (
              <Text style={s.unverified}>Awaiting office verification</Text>
            )}
          </View>
        </View>

        <View style={s.grid}>
          {AVATARS.map((_, i) => (
            <Pressable
              key={i}
              onPress={() => { setAvatarIndex(i); setPhoto(null); }}
              style={[s.slot, avatarIndex === i && !photo && s.slotOn]}
            >
              <Avatar name={displayName || username} index={i} size={38} />
            </Pressable>
          ))}
          <Pressable onPress={pickPhoto} style={[s.slot, s.photoSlot, !!photo && s.slotOn]}>
            {photo
              ? <Image source={{ uri: photo }} style={{ width: 38, height: 38, borderRadius: 19 }} />
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
        <GradientButton label="Save changes" onPress={saveProfile} style={{ marginTop: 16 }} />
      </Card>

      <Card style={{ marginTop: 16 }}>
        <Text style={T.label}>YOUR UNIT</Text>
        <Text style={[T.body, { marginTop: 8 }]}>
          {community?.label} · {user?.block} #{user?.unit}
          {user?.phone ? `\n${user.phone}` : ""}
        </Text>
        <Text style={[T.small, { marginTop: 8 }]}>
          Your unit was verified by the property office. Ask them to change it if you move.
        </Text>
      </Card>

      <Card style={{ marginTop: 16 }}>
        <Text style={T.label}>CHANGE PASSWORD</Text>
        <Field label="NEW PASSWORD" value={pw1} onChangeText={setPw1} secureTextEntry placeholder="at least 8 characters" />
        <Field label="CONFIRM" value={pw2} onChangeText={setPw2} secureTextEntry placeholder="repeat it" />
        <QuietButton label="Update password" onPress={savePassword} style={{ marginTop: 16 }} />
      </Card>

      <QuietButton label="Sign out" tone={C.coral} onPress={signOut} style={{ marginTop: 20 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  verified: { marginTop: 4, fontFamily: F.bold, fontSize: 11.5, color: C.green },
  unverified: { marginTop: 4, fontFamily: F.bold, fontSize: 11.5, color: C.amber },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 9, marginTop: 16 },
  slot: { borderRadius: 22, padding: 2, borderWidth: 2, borderColor: "transparent" },
  slotOn: { borderColor: C.violet },
  photoSlot: {
    width: 42, height: 42, borderRadius: 21, borderWidth: 1.5, borderStyle: "dashed",
    borderColor: C.line3, alignItems: "center", justifyContent: "center",
  },
  photoText: { fontFamily: F.bold, fontSize: 9, color: C.faint },
  remove: { marginTop: 10, fontFamily: F.bold, fontSize: 12, color: C.violet },
});
