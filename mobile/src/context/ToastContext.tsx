import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { Animated, StyleSheet, Text } from "react-native";
import { C, F, RADIUS } from "../theme";

const Ctx = createContext<(m: string) => void>(() => {});
export const useToast = () => useContext(Ctx);

/** The design's toast: pinned above the tab bar, slides up, clears after 2.2s. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slide = useRef(new Animated.Value(10)).current;
  const fade = useRef(new Animated.Value(0)).current;

  const flash = useCallback(
    (m: string) => {
      setMsg(m);
      slide.setValue(10);
      fade.setValue(0);
      Animated.parallel([
        Animated.timing(slide, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        Animated.timing(fade, { toValue: 0, duration: 200, useNativeDriver: true }).start(() =>
          setMsg("")
        );
      }, 2200);
    },
    [fade, slide]
  );

  return (
    <Ctx.Provider value={flash}>
      {children}
      {msg ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.toast, { opacity: fade, transform: [{ translateY: slide }] }]}
        >
          <Text style={styles.text}>{msg}</Text>
        </Animated.View>
      ) : null}
    </Ctx.Provider>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute", left: 18, right: 18, bottom: 96,
    paddingVertical: 13, paddingHorizontal: 16,
    borderRadius: RADIUS.tile, backgroundColor: C.ink,
    shadowColor: C.ink, shadowOpacity: 0.45, shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 }, elevation: 8, zIndex: 40,
  },
  text: { color: "#fff", fontSize: 13, fontFamily: F.semi },
});
