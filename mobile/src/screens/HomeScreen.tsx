import React, { useMemo, useState } from "react";
import { FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../context/AuthContext";
import { C, F, RADIUS } from "../theme";
import { T } from "../components/ui";

/** Community picker — the app's first screen, same as the web build. */
export default function HomeScreen() {
  const { communities, pickCommunity } = useAuth();
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t
      ? communities.filter((c) => `${c.label} ${c.address}`.toLowerCase().includes(t))
      : communities;
  }, [communities, q]);

  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
      <LinearGradient colors={[C.washTop, C.wash]} style={StyleSheet.absoluteFill} />
      <View style={s.body}>
        <Image source={require("../../assets/img/logo.png")} style={s.logo} resizeMode="contain" />
        <Text style={[T.h1, { marginTop: 22 }]}>Ordering together,{"\n"}block by block</Text>
        <Text style={[T.body, { marginTop: 10 }]}>
          Pick your community, then sign in with the account your property office gave you.
        </Text>

        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search condo, estate or street"
          placeholderTextColor={C.faint}
          style={s.search}
        />

        <FlatList
          style={{ marginTop: 14 }}
          data={rows}
          keyExtractor={(c) => c.id}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            <Text style={[T.small, { marginTop: 20 }]}>
              {communities.length
                ? "No property matches that search."
                : "Can't reach Gather — check the server is running."}
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable style={s.row} onPress={() => pickCommunity(item)}>
              <View style={s.abbr}>
                <Text style={s.abbrText}>{item.abbr}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={T.title}>{item.label}</Text>
                <Text style={[T.small, { marginTop: 2 }]} numberOfLines={1}>
                  {item.householdsCount ?? 0} households · cycle {item.cycleNo}
                </Text>
              </View>
              <Text style={[s.state, { color: item.isOpen ? C.green : C.coral }]}>
                {item.isOpen ? "Open" : "Filling"}
              </Text>
            </Pressable>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.wash },
  body: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },
  logo: { width: 116, height: 34 },
  search: {
    marginTop: 22, paddingVertical: 13, paddingHorizontal: 14,
    borderRadius: RADIUS.chip, backgroundColor: C.surface,
    borderWidth: 1, borderColor: C.line3, fontFamily: F.semi, fontSize: 14, color: C.ink,
  },
  row: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: C.surface, borderRadius: RADIUS.tile, padding: 14,
    borderWidth: 1, borderColor: C.line,
  },
  abbr: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: C.tintDeep,
    alignItems: "center", justifyContent: "center",
  },
  abbrText: { fontFamily: F.mono, fontSize: 11, color: C.indigo },
  state: { fontFamily: F.bold, fontSize: 12 },
});
