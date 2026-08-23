import React, { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text } from "react-native";
import * as api from "../api/endpoints";
import type { Alert } from "../api/types";
import { useAuth } from "../context/AuthContext";
import { C, F } from "../theme";
import { Card, ErrorNote, Loading, T } from "../components/ui";

const when = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 60) return `${Math.max(1, mins)} min ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

/** Published announcements written by the property office. Drafts never appear. */
export default function UpdatesScreen() {
  const { community } = useAuth();
  const [items, setItems] = useState<Alert[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems(await api.getAlerts());
      setState("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load updates");
      setState("error");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (state === "loading") return <Loading label="Loading updates…" />;
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
      <Text style={T.h2}>Updates</Text>
      <Text style={[T.small, { marginTop: 4 }]}>
        Price drops, cutoffs and collection notices for {community?.label ?? "your block"}
      </Text>

      {items.length === 0 ? (
        <Text style={[T.body, { marginTop: 22 }]}>Nothing from the office yet.</Text>
      ) : (
        items.map((a) => (
          <Card key={a.id} style={{ marginTop: 14 }}>
            <Text style={s.when}>{when(a.createdAt)}</Text>
            <Text style={[T.title, { marginTop: 6 }]}>{a.title}</Text>
            <Text style={[T.body, { marginTop: 6 }]}>{a.body}</Text>
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  when: { fontFamily: F.bold, fontSize: 11, color: C.faint },
});
