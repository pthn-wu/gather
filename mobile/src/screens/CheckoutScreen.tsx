import React, { useEffect, useState } from "react";
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as api from "../api/endpoints";
import type { PaymentMethod, Product } from "../api/types";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastContext";
import { C, F, RADIUS, money } from "../theme";
import { Card, GradientButton, Loading, QuietButton, T } from "../components/ui";

const OPTIONS: { k: PaymentMethod; label: string; note: string }[] = [
  { k: "mmqr", label: "MMQR now", note: "One QR for every bank and wallet, settled by CTZPay" },
  { k: "collection", label: "Pay on collection", note: "Cash or MMQR at the collection table" },
];

export default function CheckoutScreen({ navigation }: any) {
  const { cart, clear, count } = useCart();
  const { community, user } = useAuth();
  const flash = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [pay, setPay] = useState<PaymentMethod>("mmqr");
  const [note, setNote] = useState("");
  const [qr, setQr] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getProducts().then(setProducts).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  const lines = Object.entries(cart)
    .map(([id, qty]) => ({ product: products.find((p) => p.id === id), qty }))
    .filter((l): l is { product: Product; qty: number } => !!l.product);
  const subtotal = lines.reduce((a, l) => a + l.product.price * l.qty, 0);

  const place = async () => {
    if (!lines.length) { flash("Your order is empty"); return; }
    setBusy(true);
    try {
      const order = await api.createOrder({
        lines: lines.map((l) => ({ productId: l.product.id, qty: l.qty })),
        paymentMethod: pay,
        note,
      });
      if (pay === "mmqr") await api.payOrder(order.id).catch(() => undefined);
      clear();
      setQr(false);
      navigation.replace("OrderPlaced", { order });
    } catch (e) {
      flash(e instanceof Error ? e.message : "Could not place the order");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }}>
        <Text style={T.h2}>Checkout</Text>

        <Card style={{ marginTop: 16 }}>
          <Text style={T.label}>COLLECTION</Text>
          <Text style={[T.title, { marginTop: 8 }]}>{community?.collectPoint ?? "—"}</Text>
          <Text style={[T.small, { marginTop: 3 }]}>
            {community?.label} · {user?.block} #{user?.unit}
          </Text>
          <Text style={[T.small, { marginTop: 6 }]}>
            {community?.deliveryLabel ?? "Next drop"}
            {community?.collectionWindow ? `, ${community.collectionWindow}` : ""}
          </Text>
        </Card>

        <Card style={{ marginTop: 16 }}>
          <Text style={T.label}>PAYMENT</Text>
          {OPTIONS.map((o) => (
            <Pressable key={o.k} onPress={() => setPay(o.k)} style={s.opt}>
              <View style={[s.radio, pay === o.k && s.radioOn]} />
              <View style={{ flex: 1 }}>
                <Text style={[s.optLabel, { color: pay === o.k ? C.ink : C.muted }]}>{o.label}</Text>
                <Text style={[T.small, { marginTop: 2 }]}>{o.note}</Text>
              </View>
            </Pressable>
          ))}
        </Card>

        <Card style={{ marginTop: 16 }}>
          <Text style={T.label}>NOTE FOR THE COLLECTION TABLE</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="e.g. my husband will collect"
            placeholderTextColor={C.faint}
            style={s.note}
          />
        </Card>

        <Card style={{ marginTop: 16 }}>
          <Text style={T.label}>{count} ITEMS</Text>
          {lines.map(({ product, qty }) => (
            <View key={product.id} style={s.sumRow}>
              <Text style={[T.body, { flex: 1 }]} numberOfLines={1}>
                {qty} × {product.name}
              </Text>
              <Text style={s.sumVal}>{money(product.price * qty)}</Text>
            </View>
          ))}
          <View style={[s.sumRow, s.total]}>
            <Text style={T.title}>To pay</Text>
            <Text style={s.totalVal}>{money(subtotal)}</Text>
          </View>
          <GradientButton
            label={pay === "mmqr" ? `Pay ${money(subtotal)} with MMQR` : "Place order, pay at collection"}
            onPress={() => (pay === "mmqr" ? setQr(true) : place())}
            disabled={busy}
            style={{ marginTop: 16 }}
          />
        </Card>
      </ScrollView>

      {/* MMQR sheet — native modal presentation */}
      <Modal visible={qr} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setQr(false)}>
        <SafeAreaView style={s.sheet} edges={["top", "bottom"]}>
          <ScrollView contentContainerStyle={{ padding: 24, alignItems: "center" }}>
            <Text style={T.h2}>Scan to pay</Text>
            <Text style={[T.body, { marginTop: 6, textAlign: "center" }]}>
              One MMQR code, settled through CTZPay. Works with any bank or wallet app.
            </Text>
            <Image source={require("../../assets/img/mmqr.png")} style={s.qr} resizeMode="contain" />
            <Text style={s.amount}>{money(subtotal)}</Text>
            <Text style={[T.small, { marginTop: 4 }]}>{count} items · {community?.label}</Text>
            <GradientButton
              label={busy ? "Confirming…" : "I've paid"}
              onPress={place}
              disabled={busy}
              style={{ marginTop: 24, alignSelf: "stretch" }}
            />
            <QuietButton label="Cancel" tone={C.muted} onPress={() => setQr(false)} style={{ marginTop: 10, alignSelf: "stretch" }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  opt: { flexDirection: "row", gap: 12, alignItems: "flex-start", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.line },
  radio: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: C.line3, marginTop: 2 },
  radioOn: { borderColor: C.violet, backgroundColor: C.violet },
  optLabel: { fontFamily: F.bold, fontSize: 13.5 },
  note: {
    marginTop: 12, paddingVertical: 12, paddingHorizontal: 13, borderRadius: RADIUS.chip,
    borderWidth: 1, borderColor: C.line3, fontFamily: F.body, fontSize: 13, color: C.ink,
  },
  sumRow: { flexDirection: "row", alignItems: "baseline", gap: 10, marginTop: 10 },
  sumVal: { fontFamily: F.mono, fontSize: 13, color: C.ink },
  total: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.line },
  totalVal: { fontFamily: F.mono, fontSize: 19, color: C.ink },
  sheet: { flex: 1, backgroundColor: C.wash },
  qr: { width: 220, height: 238, marginTop: 24 },
  amount: { fontFamily: F.mono, fontSize: 26, color: C.ink, marginTop: 18 },
});
