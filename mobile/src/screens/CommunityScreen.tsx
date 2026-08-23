import React, { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as api from "../api/endpoints";
import type { Activity, Split, Wishlist } from "../api/types";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { C, F, RADIUS } from "../theme";
import { Avatar, Card, ErrorNote, Loading, T } from "../components/ui";

export default function CommunityScreen() {
  const { community } = useAuth();
  const flash = useToast();
  const [splits, setSplits] = useState<Split[]>([]);
  const [wishes, setWishes] = useState<Wishlist[]>([]);
  const [feed, setFeed] = useState<Activity[]>([]);
  const [wish, setWish] = useState("");
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, w, a] = await Promise.all([api.getSplits(), api.getWishlist(), api.getActivity()]);
      setSplits(s); setWishes(w); setFeed(a);
      setState("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the community");
      setState("error");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (state === "loading") return <Loading label="Loading your block…" />;
  if (state === "error") return <ErrorNote message={error} onRetry={() => { setState("loading"); void load(); }} />;

  const toggleSplit = async (sp: Split) => {
    try {
      await api.joinSplit(sp.id);
      flash(sp.joinedByMe ? "Left the split" : "You joined the split");
      void load();
    } catch { flash("Could not update that split"); }
  };

  const vote = async (w: Wishlist) => {
    try { await api.voteWishlistItem(w.id); void load(); }
    catch { flash("Could not vote"); }
  };

  const addWish = async () => {
    if (!wish.trim()) return;
    const name = wish.trim();
    setWish("");
    try {
      await api.addWishlistItem(name, "asked by a neighbour");
      flash("Added to the wishlist");
      void load();
    } catch { flash("Could not add that"); }
  };

  return (
    <ScrollView
      contentContainerStyle={{ padding: 18, paddingBottom: 30 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} tintColor={C.violet}
          onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />
      }
    >
      <Text style={T.h2}>{community?.label ?? "Your block"}</Text>
      <Text style={[T.small, { marginTop: 4 }]}>
        {community?.householdsCount ?? 0} households · cycle {community?.cycleNo ?? "—"}
      </Text>

      <Text style={[T.label, { marginTop: 22 }]}>SPLITS OPEN ON THE BLOCK</Text>
      {splits.length === 0 ? (
        <Text style={[T.body, { marginTop: 8 }]}>No splits open right now.</Text>
      ) : splits.map((sp) => (
        <Card key={sp.id} style={{ marginTop: 10 }}>
          <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
            <Avatar name={sp.initiatorName} index={sp.id.charCodeAt(0) % 8} size={36} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={T.title} numberOfLines={1}>{sp.productName ?? "Shared item"}</Text>
              <Text style={[T.small, { marginTop: 2 }]} numberOfLines={1}>
                {sp.initiatorName} · {sp.detail}
              </Text>
            </View>
            <Pressable onPress={() => toggleSplit(sp)} style={[s.join, sp.joinedByMe && s.joined]}>
              <Text style={[s.joinText, sp.joinedByMe && { color: C.green }]}>
                {sp.joinedByMe ? "Joined" : "Join"}
              </Text>
            </Pressable>
          </View>
        </Card>
      ))}

      <Text style={[T.label, { marginTop: 26 }]}>WISHLIST FOR THE NEXT SHEET</Text>
      <Card style={{ marginTop: 10 }}>
        {wishes.map((w) => (
          <View key={w.id} style={s.wishRow}>
            <Pressable onPress={() => vote(w)} style={[s.vote, w.votedByMe && s.votedOn]}>
              <Text style={[s.voteText, w.votedByMe && { color: C.violet }]}>{w.votes}</Text>
            </Pressable>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.wishName}>{w.name}</Text>
              <Text style={T.small} numberOfLines={1}>{w.note}</Text>
            </View>
          </View>
        ))}
        <View style={{ flexDirection: "row", gap: 9, marginTop: 14 }}>
          <TextInput
            value={wish} onChangeText={setWish}
            placeholder="Suggest an item…" placeholderTextColor={C.faint}
            style={s.wishInput}
          />
          <Pressable onPress={addWish} style={s.addBtn}>
            <Text style={s.addText}>Add</Text>
          </Pressable>
        </View>
      </Card>

      <Text style={[T.label, { marginTop: 26 }]}>LIVE FROM THE BLOCK</Text>
      {feed.map((a) => (
        <View key={a.id} style={s.feedRow}>
          <Avatar name={a.user?.displayName ?? "Neighbour"} index={a.user?.avatarIndex ?? 0} size={28} />
          <Text style={[T.body, { flex: 1 }]}>{a.text}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  join: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: RADIUS.pill, backgroundColor: C.ink },
  joined: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.green },
  joinText: { color: "#fff", fontFamily: F.bold, fontSize: 12 },
  wishRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line },
  vote: { width: 46, paddingVertical: 7, borderRadius: RADIUS.chip, borderWidth: 1, borderColor: C.line3, alignItems: "center" },
  votedOn: { borderColor: C.violet, backgroundColor: C.tintDeep },
  voteText: { fontFamily: F.mono, fontSize: 12, color: C.muted },
  wishName: { fontFamily: F.bold, fontSize: 13, color: C.ink },
  wishInput: {
    flex: 1, paddingVertical: 11, paddingHorizontal: 13, borderRadius: RADIUS.chip,
    borderWidth: 1, borderColor: C.line3, fontFamily: F.body, fontSize: 13, color: C.ink,
  },
  addBtn: { paddingHorizontal: 16, justifyContent: "center", borderRadius: RADIUS.chip, backgroundColor: C.ink },
  addText: { color: "#fff", fontFamily: F.bold, fontSize: 12.5 },
  feedRow: { flexDirection: "row", gap: 12, alignItems: "center", marginTop: 12 },
});
