import React, { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as api from "../api/endpoints";
import type { Order } from "../api/types";
import { useToast } from "../context/ToastContext";
import { C, F, RADIUS, money } from "../theme";
import { Card, Chip, ErrorNote, Loading, T } from "../components/ui";

const FILTERS = [
  { k: "all", label: "All" },
  { k: "awaiting", label: "Not received" },
  { k: "ready", label: "Ready now" },
  { k: "collected", label: "Received" },
  { k: "unpaid", label: "Unpaid" },
];

/** The 4-stage timeline, driven by the real stages the back office advances. */
const STAGES: { k: Order["status"]; label: string }[] = [
  { k: "placed", label: "Order in" },
  { k: "packing", label: "Packing" },
  { k: "ready", label: "Ready" },
  { k: "collected", label: "Received" },
];
const stageIndex = (s: Order["status"]) => STAGES.findIndex((x) => x.k === s);

export default function OrdersScreen() {
  const flash = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setOrders(await api.getOrders({ filter, query: q }));
      setState("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load your orders");
      setState("error");
    }
  }, [filter, q]);

  useEffect(() => { void load(); }, [load]);

  const pay = async (o: Order) => {
    try {
      await api.payOrder(o.id);
      flash(`${o.code} marked paid`);
      void load();
    } catch {
      flash("Could not record that payment");
    }
  };

  if (state === "loading") return <Loading label="Loading your orders…" />;
  if (state === "error") return <ErrorNote message={error} onRetry={() => { setState("loading"); void load(); }} />;

  return (
    <ScrollView
      contentContainerStyle={{ padding: 18, paddingBottom: 30 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor={C.violet}
          onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }}
        />
      }
    >
      <Text style={T.h2}>Your orders</Text>
      <TextInput
        value={q}
        onChangeText={setQ}
        placeholder="Search code or item"
        placeholderTextColor={C.faint}
        style={s.search}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
        <View style={{ flexDirection: "row", gap: 8, paddingRight: 18 }}>
          {FILTERS.map((f) => (
            <Chip key={f.k} label={f.label} on={filter === f.k} onPress={() => setFilter(f.k)} />
          ))}
        </View>
      </ScrollView>

      {orders.length === 0 ? (
        <Text style={[T.body, { marginTop: 24 }]}>Nothing in this view yet.</Text>
      ) : (
        orders.map((o) => {
          const idx = stageIndex(o.status);
          return (
            <Card key={o.id} style={{ marginTop: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "baseline" }}>
                <Text style={s.code}>{o.code}</Text>
                <View style={{ flex: 1 }} />
                <Text style={[s.pay, { color: o.paid ? C.green : C.coral }]}>
                  {o.paid ? "Paid" : "Payment due"}
                </Text>
              </View>

              <Text style={[T.body, { marginTop: 8 }]} numberOfLines={2}>
                {o.lines.map((l) => l.product?.name ?? "Item").join(", ")}
              </Text>

              {/* stage rail */}
              <View style={s.rail}>
                {STAGES.map((st, i) => (
                  <View key={st.k} style={{ flex: 1, alignItems: "center" }}>
                    <View style={[s.railDot, i <= idx && s.railDotOn]} />
                    <Text style={[s.railLabel, i <= idx && { color: C.ink }]}>{st.label}</Text>
                  </View>
                ))}
              </View>

              <View style={{ flexDirection: "row", alignItems: "baseline", marginTop: 14 }}>
                <Text style={T.small}>{o.collectLabel}</Text>
                <View style={{ flex: 1 }} />
                <Text style={s.total}>{money(o.total)}</Text>
              </View>

              {!o.paid ? (
                <Pressable style={s.payBtn} onPress={() => pay(o)}>
                  <Text style={s.payBtnText}>Pay now with MMQR</Text>
                </Pressable>
              ) : null}
            </Card>
          );
        })
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  search: {
    marginTop: 14, paddingVertical: 12, paddingHorizontal: 14, borderRadius: RADIUS.chip,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.line3,
    fontFamily: F.semi, fontSize: 14, color: C.ink,
  },
  code: { fontFamily: F.mono, fontSize: 13, color: C.ink },
  pay: { fontFamily: F.bold, fontSize: 12 },
  rail: { flexDirection: "row", marginTop: 16 },
  railDot: { width: 9, height: 9, borderRadius: 5, borderWidth: 1.5, borderColor: C.line3, backgroundColor: "transparent" },
  railDotOn: { backgroundColor: C.violet, borderColor: C.violet },
  railLabel: { marginTop: 6, fontFamily: F.body, fontSize: 10.5, color: C.faint, textAlign: "center" },
  total: { fontFamily: F.mono, fontSize: 16, color: C.ink },
  payBtn: { marginTop: 14, paddingVertical: 12, borderRadius: RADIUS.chip, backgroundColor: C.ink, alignItems: "center" },
  payBtnText: { color: "#fff", fontFamily: F.bold, fontSize: 13 },
});
