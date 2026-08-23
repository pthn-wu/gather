import React, { useCallback, useEffect, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as api from "../api/endpoints";
import type { ProductDetail } from "../api/types";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastContext";
import { C, F, RADIUS, money } from "../theme";
import {
  Avatar, Card, ErrorNote, GradientButton, Loading, ProductSlot, QuietButton, T,
} from "../components/ui";

export default function ProductScreen({ route, navigation }: any) {
  const id: string = route.params.id;
  const { community } = useAuth();
  const { add } = useCart();
  const flash = useToast();

  const [p, setP] = useState<ProductDetail | null>(null);
  const [qty, setQty] = useState(1);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setP(await api.getProduct(id));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load this item");
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  if (error) return <ErrorNote message={error} onRetry={load} />;
  if (!p) return <Loading label="Loading item…" />;

  const post = async () => {
    if (!draft.trim()) return;
    const text = draft.trim();
    setDraft("");
    try {
      await api.postComment(p.id, text);
      flash("Posted to the block");
      void load();
    } catch {
      flash("Could not post — try again");
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }}>
      {p.imageUrl
        ? <Image source={{ uri: p.imageUrl }} style={s.shot} resizeMode="cover" />
        : <ProductSlot label={p.imageSlot} height={200} />}

      <Text style={[T.h2, { marginTop: 18 }]}>{p.name}</Text>
      <Text style={[T.small, { marginTop: 4 }]}>
        {[p.brand, p.size || p.unit, p.grossWeight].filter(Boolean).join(" · ")}
      </Text>
      <Text style={[T.small, { marginTop: 2 }]}>{p.category} · supplied by Capital Retail</Text>

      <View style={s.priceRow}>
        <Text style={s.price}>{money(p.price)}</Text>
        <Text style={s.was}>{money(p.retailPrice)}</Text>
        <Text style={s.save}>−{p.savePct}%</Text>
      </View>

      {p.promotion ? (
        <View style={s.promo}>
          <Text style={s.promoText}>{p.promotion.name} · {p.promotion.value}</Text>
        </View>
      ) : null}

      {p.details ? <Text style={[T.body, { marginTop: 14 }]}>{p.details}</Text> : null}

      <Text style={[T.body, { marginTop: 12 }]}>
        {p.progress.next
          ? `${community?.label ?? "This block"} has ${p.joined} units this cycle. ${p.progress.unitsToNext} more and the price drops for everyone who ordered — including you.`
          : "The block already unlocked the deepest tier for this cycle."}
      </Text>

      {/* Tier ladder */}
      <Card style={{ marginTop: 18 }}>
        <Text style={T.label}>PRICE TIERS THIS CYCLE</Text>
        {p.tiers.map((t) => (
          <View key={t.index} style={s.tier}>
            <View style={[s.dot, { backgroundColor: t.unlocked ? C.violet : "transparent", borderColor: t.unlocked ? C.violet : C.line3 }]} />
            <Text style={[s.tierLabel, { color: t.unlocked ? C.ink : C.faint }]}>{t.label}</Text>
            <Text style={[s.tierPrice, { color: t.unlocked ? C.ink : C.faint }]}>{money(t.price)}</Text>
          </View>
        ))}
      </Card>

      {/* Quantity + add */}
      <View style={s.qtyRow}>
        <View style={s.stepper}>
          <Pressable onPress={() => setQty((q) => Math.max(1, q - 1))} style={s.stepBtn}>
            <Text style={s.stepText}>−</Text>
          </Pressable>
          <Text style={s.qty}>{qty}</Text>
          <Pressable onPress={() => setQty((q) => q + 1)} style={s.stepBtn}>
            <Text style={s.stepText}>+</Text>
          </Pressable>
        </View>
        <View style={{ flex: 1, alignItems: "flex-end" }}>
          <Text style={T.small}>Line total</Text>
          <Text style={s.lineTotal}>{money(p.price * qty)}</Text>
        </View>
      </View>

      <GradientButton
        label="Add to your order"
        onPress={() => { add(p.id, qty); flash("Added to your order"); }}
        style={{ marginTop: 14 }}
      />
      <QuietButton
        label="Offer to split this"
        tone={C.violet}
        style={{ marginTop: 10 }}
        onPress={async () => {
          try {
            await api.addSplit({ productId: p.id, detail: "Looking for neighbours to split this with", neededCount: 1 });
            flash("Split offered — neighbours will see it on Community");
          } catch {
            flash("Could not offer that split");
          }
        }}
      />

      {/* Neighbour Q&A */}
      <Text style={[T.label, { marginTop: 26 }]}>NEIGHBOURS ON THIS ITEM</Text>
      {p.comments.length === 0 ? (
        <Text style={[T.small, { marginTop: 10 }]}>No questions yet — be the first to ask.</Text>
      ) : (
        p.comments.map((c) => (
          <View key={c.id} style={s.comment}>
            <Avatar name={c.authorName} index={c.authorAvatarIndex} photo={c.authorAvatarPhoto} size={32} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.who}>
                {c.authorName} <Text style={{ color: C.faint }}>{c.authorUnit}</Text>
              </Text>
              <Text style={[T.body, { marginTop: 2 }]}>{c.text}</Text>
            </View>
          </View>
        ))
      )}

      <View style={s.askRow}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Ask the block a question…"
          placeholderTextColor={C.faint}
          style={s.ask}
        />
        <Pressable onPress={post} style={s.postBtn}>
          <Text style={s.postText}>Post</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  shot: { width: "100%", height: 200, borderRadius: RADIUS.tile },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: 10, marginTop: 14 },
  price: { fontFamily: F.mono, fontSize: 24, color: C.ink },
  was: { fontFamily: F.body, fontSize: 13, color: C.faint, textDecorationLine: "line-through" },
  save: { fontFamily: F.bold, fontSize: 13, color: C.green },
  promo: {
    marginTop: 10, alignSelf: "flex-start", paddingVertical: 6, paddingHorizontal: 12,
    borderRadius: RADIUS.pill, backgroundColor: C.tintDeep,
  },
  promoText: { fontFamily: F.bold, fontSize: 12, color: C.violet },
  tier: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line },
  dot: { width: 9, height: 9, borderRadius: 5, borderWidth: 1.5 },
  tierLabel: { flex: 1, fontFamily: F.semi, fontSize: 13 },
  tierPrice: { fontFamily: F.mono, fontSize: 13 },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 20 },
  stepper: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: C.line3, borderRadius: RADIUS.chip, overflow: "hidden" },
  stepBtn: { width: 42, height: 44, alignItems: "center", justifyContent: "center", backgroundColor: C.surface },
  stepText: { fontFamily: F.semi, fontSize: 18, color: C.ink },
  qty: { width: 44, textAlign: "center", fontFamily: F.mono, fontSize: 15, color: C.ink },
  lineTotal: { fontFamily: F.mono, fontSize: 17, color: C.ink, marginTop: 2 },
  comment: { flexDirection: "row", gap: 12, marginTop: 14 },
  who: { fontFamily: F.bold, fontSize: 12.5, color: C.ink },
  askRow: { flexDirection: "row", gap: 9, marginTop: 18 },
  ask: {
    flex: 1, paddingVertical: 12, paddingHorizontal: 13, borderRadius: RADIUS.chip,
    borderWidth: 1, borderColor: C.line3, backgroundColor: C.surface,
    fontFamily: F.body, fontSize: 13, color: C.ink,
  },
  postBtn: { paddingHorizontal: 18, justifyContent: "center", borderRadius: RADIUS.chip, backgroundColor: C.ink },
  postText: { color: "#fff", fontFamily: F.bold, fontSize: 13 },
});
