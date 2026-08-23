import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { C, F } from "../theme";
import { Avatar } from "./ui";

/** Sticky app header: logo, avatar (-> Account), cart with its count badge. */
export function AppHeader({ onAccount, onCart }: { onAccount: () => void; onCart: () => void }) {
  const { user } = useAuth();
  const { count } = useCart();
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.wrap, { paddingTop: insets.top + 8 }]}>
      <Image source={require("../../assets/img/logo.png")} style={s.logo} resizeMode="contain" />
      <View style={{ flex: 1 }} />
      <Pressable onPress={onAccount}>
        <Avatar name={user?.displayName ?? "You"} index={user?.avatarIndex ?? 0} photo={user?.avatarPhoto} size={40} />
      </Pressable>
      <Pressable onPress={onCart} style={s.cart}>
        <View style={s.bag} />
        {count > 0 ? (
          <View style={s.badge}>
            <Text style={s.badgeText}>{count}</Text>
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}

/** Sub-screen header with a back chevron and a title. */
export function SubHeader({ title, onBack }: { title: string; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.wrap, { paddingTop: insets.top + 8 }]}>
      <Pressable onPress={onBack} style={s.backBtn}>
        <View style={s.chev} />
      </Pressable>
      <Text style={s.subTitle} numberOfLines={1}>{title}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 18, paddingBottom: 12,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderBottomWidth: 1, borderBottomColor: C.line,
  },
  logo: { width: 92, height: 24 },
  cart: {
    width: 42, height: 42, borderRadius: 13, borderWidth: 1, borderColor: C.line2,
    backgroundColor: C.tint, alignItems: "center", justifyContent: "center",
  },
  bag: {
    width: 15, height: 13, borderWidth: 2, borderColor: C.ink,
    borderTopWidth: 0, borderBottomLeftRadius: 4, borderBottomRightRadius: 4,
  },
  badge: {
    position: "absolute", top: -5, right: -5, minWidth: 20, height: 20,
    paddingHorizontal: 5, borderRadius: 10, backgroundColor: C.coral,
    alignItems: "center", justifyContent: "center", borderWidth: 2.5, borderColor: "#fff",
  },
  badgeText: { color: "#fff", fontFamily: F.extra, fontSize: 11 },
  backBtn: {
    width: 38, height: 38, borderRadius: 12, borderWidth: 1, borderColor: C.line2,
    backgroundColor: C.tint, alignItems: "center", justifyContent: "center",
  },
  chev: {
    width: 9, height: 9, borderLeftWidth: 2, borderBottomWidth: 2,
    borderColor: C.ink, transform: [{ rotate: "45deg" }], marginLeft: 3,
  },
  subTitle: { fontFamily: F.head, fontSize: 16, color: C.ink, flex: 1 },
});
