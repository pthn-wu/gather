import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { C, F, RADIUS, money } from "../theme";
import { Card, GradientButton, QuietButton, T } from "../components/ui";

export default function OrderPlacedScreen({ route, navigation }: any) {
  const order = route.params.order;
  const { community } = useAuth();

  const steps = [
    `Cutoff — Capital Retail confirms final tier prices for the block.`,
    `${community?.deliveryLabel ?? "Delivery day"}${community?.collectionWindow ? `, ${community.collectionWindow}` : ""} — collect at ${community?.collectPoint ?? "the collection point"}.`,
    "Show your name or unit at the table; the office ticks you off the sheet.",
  ];

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 40 }}>
      <Text style={s.kicker}>ORDER PLACED</Text>
      <Text style={[T.h1, { marginTop: 10 }]}>You're in the{"\n"}next drop</Text>
      <Text style={[T.body, { marginTop: 10 }]}>
        Your order is locked in. Prices can still fall until cutoff — if they do, the difference
        comes back to you at the table.
      </Text>

      <Card style={{ marginTop: 22 }}>
        <View style={s.grid}>
          <View style={s.cell}>
            <Text style={T.small}>Order</Text>
            <Text style={s.mono}>{order?.code ?? "—"}</Text>
          </View>
          <View style={s.cell}>
            <Text style={T.small}>Items</Text>
            <Text style={s.val}>{order?.lines?.length ?? 0}</Text>
          </View>
          <View style={s.cell}>
            <Text style={T.small}>Total</Text>
            <Text style={s.mono}>{money(order?.total ?? 0)}</Text>
          </View>
          <View style={s.cell}>
            <Text style={T.small}>Payment</Text>
            <Text style={s.val}>
              {order?.paid ? "Paid · MMQR" : "Pay at collection"}
            </Text>
          </View>
        </View>

        <View style={{ marginTop: 20, paddingTop: 18, borderTopWidth: 1, borderTopColor: C.line, gap: 12 }}>
          {steps.map((t, i) => (
            <View key={i} style={{ flexDirection: "row", gap: 10 }}>
              <View style={s.dot} />
              <Text style={[T.body, { flex: 1 }]}>{t}</Text>
            </View>
          ))}
        </View>
      </Card>

      <GradientButton
        label="Track this order"
        onPress={() => navigation.navigate("Orders")}
        style={{ marginTop: 20 }}
      />
      <QuietButton
        label="Keep shopping"
        onPress={() => navigation.navigate("Shop")}
        style={{ marginTop: 10 }}
      />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  kicker: { fontFamily: F.extra, fontSize: 11.5, letterSpacing: 1, color: C.green },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: "50%", paddingVertical: 8 },
  mono: { fontFamily: F.mono, fontSize: 14, color: C.ink, marginTop: 4 },
  val: { fontFamily: F.bold, fontSize: 14, color: C.ink, marginTop: 4 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.ink, marginTop: 7 },
});
