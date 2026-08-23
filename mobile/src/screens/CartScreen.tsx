import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as api from "../api/endpoints";
import type { AppliedPromotion, Product } from "../api/types";
import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import { C, F, RADIUS, money } from "../theme";
import { Card, GradientButton, Loading, QuietButton, T } from "../components/ui";

export default function CartScreen({ navigation }: any) {
  const { cart, add, dec, remove, count } = useCart();
  const { community } = useAuth();
  const flash = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [basket, setBasket] = useState<AppliedPromotion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [p, b] = await Promise.all([
          api.getProducts(),
          api.getBasketPromotions().catch(() => [] as AppliedPromotion[]),
        ]);
        if (!alive) return;
        setProducts(p);
        setBasket(b);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  if (loading) return <Loading label="Loading your order…" />;

  const lines = Object.entries(cart)
    .map(([id, qty]) => ({ product: products.find((p) => p.id === id), qty }))
    .filter((l): l is { product: Product; qty: number } => !!l.product);

  const subtotal = lines.reduce((a, l) => a + l.product.price * l.qty, 0);
  const retail = lines.reduce((a, l) => a + l.product.retailPrice * l.qty, 0);

  if (!lines.length) {
    return (
      <View style={{ padding: 24, paddingTop: 60 }}>
        <Text style={T.h2}>Your order is empty</Text>
        <Text style={[T.body, { marginTop: 8 }]}>
          Add anything from this week's sheet before cutoff and it arrives with the next drop.
        </Text>
        <QuietButton
          label="Browse the sheet"
          tone={C.violet}
          style={{ marginTop: 16 }}
          onPress={() => navigation.navigate("Shop")}
        />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }}>
      <Text style={T.h2}>Your order</Text>
      <Text style={[T.small, { marginTop: 4 }]}>{count} items · cutoff before the next drop</Text>

      {lines.map(({ product, qty }) => (
        <Card key={product.id} style={{ marginTop: 14 }}>
          <Text style={T.title}>{product.name}</Text>
          <Text style={[T.small, { marginTop: 2 }]}>
            {product.size || product.unit} · {money(product.price)} each
          </Text>
          {product.promotion ? (
            <Text style={s.promo}>{product.promotion.name} · {product.promotion.value}</Text>
          ) : null}
          <View style={s.row}>
            <View style={s.stepper}>
              <Pressable onPress={() => dec(product.id)} style={s.stepBtn}>
                <Text style={s.stepText}>−</Text>
              </Pressable>
              <Text style={s.qty}>{qty}</Text>
              <Pressable onPress={() => add(product.id)} style={s.stepBtn}>
                <Text style={s.stepText}>+</Text>
              </Pressable>
            </View>
            <View style={{ flex: 1 }} />
            <Text style={s.lineTotal}>{money(product.price * qty)}</Text>
          </View>
          <Pressable onPress={() => { remove(product.id); flash(`${product.name} removed`); }}>
            <Text style={s.remove}>Remove</Text>
          </Pressable>
        </Card>
      ))}

      {basket.map((b) => (
        <View key={b.id} style={s.banner}>
          <Text style={s.bannerName}>{b.name}</Text>
          <Text style={s.bannerValue}>{b.value}</Text>
        </View>
      ))}

      <Card style={{ marginTop: 18 }}>
        <View style={s.sumRow}>
          <Text style={T.body}>Retail value</Text>
          <Text style={[s.sumVal, { color: C.faint, textDecorationLine: "line-through" }]}>{money(retail)}</Text>
        </View>
        <View style={s.sumRow}>
          <Text style={[T.body, { color: C.green }]}>Group saving</Text>
          <Text style={[s.sumVal, { color: C.green }]}>−{money(retail - subtotal)}</Text>
        </View>
        <View style={[s.sumRow, s.total]}>
          <Text style={T.title}>Total</Text>
          <Text style={s.totalVal}>{money(subtotal)}</Text>
        </View>
        <Text style={[T.small, { marginTop: 10 }]}>
          Collect at {community?.collectPoint ?? "the collection point"}
          {community?.collectionWindow ? `, ${community.collectionWindow}` : ""}. Prices can still
          fall if more neighbours join before cutoff — you pay the lower price.
        </Text>
        <GradientButton
          label="Continue to payment"
          onPress={() => navigation.navigate("Checkout")}
          style={{ marginTop: 16 }}
        />
      </Card>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", marginTop: 14 },
  stepper: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: C.line3, borderRadius: RADIUS.chip, overflow: "hidden" },
  stepBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  stepText: { fontFamily: F.semi, fontSize: 17, color: C.ink },
  qty: { width: 40, textAlign: "center", fontFamily: F.mono, fontSize: 14, color: C.ink },
  lineTotal: { fontFamily: F.mono, fontSize: 16, color: C.ink },
  remove: { marginTop: 12, fontFamily: F.bold, fontSize: 12, color: C.faint },
  promo: { marginTop: 6, fontFamily: F.bold, fontSize: 11.5, color: C.violet },
  banner: { marginTop: 14, padding: 14, borderRadius: RADIUS.tile, backgroundColor: C.tintDeep, flexDirection: "row", gap: 10 },
  bannerName: { flex: 1, fontFamily: F.bold, fontSize: 13, color: C.violet },
  bannerValue: { fontFamily: F.mono, fontSize: 12.5, color: C.violet },
  sumRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginTop: 8 },
  sumVal: { fontFamily: F.mono, fontSize: 13 },
  total: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.line },
  totalVal: { fontFamily: F.mono, fontSize: 19, color: C.ink },
});
