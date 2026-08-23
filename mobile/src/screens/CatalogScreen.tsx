import React, { useCallback, useEffect, useState } from "react";
import {
  FlatList, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as api from "../api/endpoints";
import type { AppliedPromotion, Category, Product } from "../api/types";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastContext";
import { C, F, GRADIENT, RADIUS, money } from "../theme";
import { Chip, ErrorNote, Loading, ProductSlot, ProgressBar, T } from "../components/ui";
import { useCutoff } from "../lib/useCutoff";

const SORTS = [
  { k: "pop", label: "Most joined" },
  { k: "price", label: "Lowest price" },
  { k: "save", label: "Biggest saving" },
];

export default function CatalogScreen({ navigation }: any) {
  const { community } = useAuth();
  const { add } = useCart();
  const flash = useToast();
  const countdown = useCutoff(community);

  const [products, setProducts] = useState<Product[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [basket, setBasket] = useState<AppliedPromotion[]>([]);
  const [cat, setCat] = useState("All");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("pop");
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, c, b] = await Promise.all([
        api.getProducts({ category: cat, q, sort }),
        api.getCategories().catch(() => [] as Category[]),
        api.getBasketPromotions().catch(() => [] as AppliedPromotion[]),
      ]);
      setProducts(p);
      if (c.length) setCats(c);
      setBasket(b);
      setState("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the sheet");
      setState("error");
    }
  }, [cat, q, sort]);

  useEffect(() => { void load(); }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (state === "loading") return <Loading label="Loading this week's sheet…" />;
  if (state === "error") return <ErrorNote message={error} onRetry={() => { setState("loading"); void load(); }} />;

  const tabs = cats.length ? cats.map((c) => c.name) : ["All"];

  return (
    <FlatList
      data={products}
      keyExtractor={(p) => p.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={C.violet} />}
      contentContainerStyle={{ padding: 18, paddingBottom: 30 }}
      ListHeaderComponent={
        <View>
          {/* Cutoff hero */}
          <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.hero}>
            <Text style={s.heroLabel}>{community?.label ?? "Your block"} · cycle {community?.cycleNo ?? "—"}</Text>
            <Text style={s.heroTitle}>This week's group buy</Text>
            <Text style={s.heroCount}>{countdown}</Text>
            <Text style={s.heroFoot}>
              Collect at {community?.collectPoint ?? "the collection point"}
              {community?.collectionWindow ? `, ${community.collectionWindow}` : ""}
            </Text>
          </LinearGradient>

          {/* Basket-wide promotions surface as a banner, not per line */}
          {basket.map((b) => (
            <View key={b.id} style={s.promoBanner}>
              <Text style={s.promoName}>{b.name}</Text>
              <Text style={s.promoValue}>{b.value}</Text>
            </View>
          ))}

          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search the sheet"
            placeholderTextColor={C.faint}
            style={s.search}
          />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
            <View style={{ flexDirection: "row", gap: 8, paddingRight: 18 }}>
              {tabs.map((name) => {
                const count = cats.find((c) => c.name === name)?.count;
                return (
                  <Chip
                    key={name}
                    label={count === undefined ? name : `${name} ${count}`}
                    on={cat === name}
                    onPress={() => setCat(name)}
                  />
                );
              })}
            </View>
          </ScrollView>

          <Pressable
            onPress={() => setSort(SORTS[(SORTS.findIndex((x) => x.k === sort) + 1) % SORTS.length].k)}
            style={{ marginTop: 14 }}
          >
            <Text style={s.sort}>
              {products.length} items · {SORTS.find((x) => x.k === sort)?.label}
            </Text>
          </Pressable>
        </View>
      }
      ListEmptyComponent={
        <View style={{ paddingVertical: 40 }}>
          <Text style={T.title}>Nothing on the sheet matches</Text>
          <Text style={[T.body, { marginTop: 6 }]}>
            Try another word, or ask for it on the Community wishlist.
          </Text>
        </View>
      }
      renderItem={({ item }) => (
        <Pressable style={s.card} onPress={() => navigation.navigate("Product", { id: item.id })}>
          {item.imageUrl
            ? <Image source={{ uri: item.imageUrl }} style={s.shot} resizeMode="cover" />
            : <ProductSlot label={item.imageSlot} height={128} />}

          <View style={{ padding: 14 }}>
            <Text style={T.title} numberOfLines={2}>{item.name}</Text>
            <Text style={[T.small, { marginTop: 3 }]}>
              {item.brand ? `${item.brand} · ` : ""}{item.size || item.unit}
            </Text>

            <View style={s.priceRow}>
              <Text style={s.price}>{money(item.price)}</Text>
              <Text style={s.was}>{money(item.retailPrice)}</Text>
              <Text style={s.save}>−{item.savePct}%</Text>
            </View>

            {item.promotion ? (
              <View style={s.promoTag}>
                <Text style={s.promoTagText}>{item.promotion.name} · {item.promotion.value}</Text>
              </View>
            ) : null}

            <View style={{ marginTop: 12 }}>
              <ProgressBar pct={Math.min(100, (item.joined / 100) * 100)} />
              <Text style={[T.small, { marginTop: 7 }]}>
                {item.progress.next
                  ? `${item.joined} of ${item.progress.next} units · ${item.progress.unitsToNext} more drops the price`
                  : "Deepest tier unlocked"}
              </Text>
            </View>

            <Pressable
              style={s.addBtn}
              onPress={() => { add(item.id); flash("Added to your order"); }}
            >
              <Text style={s.addText}>Add</Text>
            </Pressable>
          </View>
        </Pressable>
      )}
    />
  );
}

const s = StyleSheet.create({
  hero: { borderRadius: RADIUS.card, padding: 20 },
  heroLabel: { color: "rgba(255,255,255,0.78)", fontFamily: F.bold, fontSize: 11.5 },
  heroTitle: { color: "#fff", fontFamily: F.head, fontSize: 21, marginTop: 6 },
  heroCount: { color: "#fff", fontFamily: F.mono, fontSize: 22, marginTop: 10 },
  heroFoot: { color: "rgba(255,255,255,0.78)", fontFamily: F.body, fontSize: 12, marginTop: 8, lineHeight: 17 },
  promoBanner: {
    marginTop: 12, padding: 14, borderRadius: RADIUS.tile,
    backgroundColor: C.tintDeep, flexDirection: "row", alignItems: "center", gap: 10,
  },
  promoName: { flex: 1, fontFamily: F.bold, fontSize: 13, color: C.violet },
  promoValue: { fontFamily: F.mono, fontSize: 12.5, color: C.violet },
  search: {
    marginTop: 14, paddingVertical: 12, paddingHorizontal: 14, borderRadius: RADIUS.chip,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.line3,
    fontFamily: F.semi, fontSize: 14, color: C.ink,
  },
  sort: { fontFamily: F.bold, fontSize: 12.5, color: C.violet },
  card: {
    marginTop: 14, backgroundColor: C.surface, borderRadius: RADIUS.card,
    borderWidth: 1, borderColor: C.line, overflow: "hidden",
  },
  shot: { width: "100%", height: 128 },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: 8, marginTop: 10 },
  price: { fontFamily: F.mono, fontSize: 17, color: C.ink },
  was: { fontFamily: F.body, fontSize: 12, color: C.faint, textDecorationLine: "line-through" },
  save: { fontFamily: F.bold, fontSize: 12, color: C.green },
  promoTag: {
    marginTop: 8, alignSelf: "flex-start", paddingVertical: 5, paddingHorizontal: 10,
    borderRadius: RADIUS.pill, backgroundColor: C.tintDeep,
  },
  promoTagText: { fontFamily: F.bold, fontSize: 11, color: C.violet },
  addBtn: {
    marginTop: 14, paddingVertical: 12, borderRadius: RADIUS.chip,
    backgroundColor: C.ink, alignItems: "center",
  },
  addText: { color: "#fff", fontFamily: F.bold, fontSize: 13 },
});
