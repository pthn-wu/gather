import React from "react";
import {
  ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View, ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { AVATARS, C, F, GRADIENT, GRADIENT_LOCS, RADIUS, initialsOf } from "../theme";

export const T = {
  h1: { fontFamily: F.head, fontSize: 26, color: C.ink, letterSpacing: -0.5 },
  h2: { fontFamily: F.head, fontSize: 19, color: C.ink, letterSpacing: -0.3 },
  title: { fontFamily: F.bold, fontSize: 15, color: C.ink },
  body: { fontFamily: F.body, fontSize: 13.5, color: C.muted, lineHeight: 20 },
  small: { fontFamily: F.body, fontSize: 12, color: C.faint },
  label: { fontFamily: F.bold, fontSize: 11.5, color: C.faint, letterSpacing: 0.4 },
  mono: { fontFamily: F.mono, fontSize: 14, color: C.ink },
} as const;

/** The signature gradient button. */
export function GradientButton({
  label, onPress, disabled, style,
}: { label: string; onPress: () => void; disabled?: boolean; style?: ViewStyle }) {
  return (
    <Pressable onPress={disabled ? undefined : onPress} style={[{ opacity: disabled ? 0.5 : 1 }, style]}>
      <LinearGradient
        colors={GRADIENT}
        locations={GRADIENT_LOCS}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.gradBtn}
      >
        <Text style={s.gradBtnText}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

export function QuietButton({
  label, onPress, style, tone = C.ink,
}: { label: string; onPress: () => void; style?: ViewStyle; tone?: string }) {
  return (
    <Pressable onPress={onPress} style={[s.quietBtn, style]}>
      <Text style={[s.quietBtnText, { color: tone }]}>{label}</Text>
    </Pressable>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function Avatar({
  name, index = 0, photo, size = 42,
}: { name: string; index?: number; photo?: string | null; size?: number }) {
  const pair = AVATARS[index % AVATARS.length];
  if (photo) {
    return <Image source={{ uri: photo }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  return (
    <LinearGradient
      colors={pair}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius: size / 2, alignItems: "center", justifyContent: "center" }}
    >
      <Text style={{ color: "#fff", fontFamily: F.extra, fontSize: size * 0.31 }}>
        {initialsOf(name)}
      </Text>
    </LinearGradient>
  );
}

export function Field({
  label, value, onChangeText, placeholder, secureTextEntry, autoCapitalize = "none", keyboardType,
}: {
  label: string; value: string; onChangeText: (v: string) => void; placeholder?: string;
  secureTextEntry?: boolean; autoCapitalize?: "none" | "sentences" | "words";
  keyboardType?: "default" | "numeric";
}) {
  return (
    <View style={{ marginTop: 14 }}>
      <Text style={T.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.faint}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        style={s.input}
      />
    </View>
  );
}

/** Tier progress bar — the design's "bar" treatment. */
export function ProgressBar({ pct }: { pct: number }) {
  return (
    <View style={s.track}>
      <LinearGradient
        colors={GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ width: `${Math.max(2, Math.min(100, pct))}%`, height: "100%", borderRadius: 3 }}
      />
    </View>
  );
}

export function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.chip, on && s.chipOn]}>
      <Text style={[s.chipText, on && s.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <View style={{ paddingVertical: 48, alignItems: "center", gap: 12 }}>
      <ActivityIndicator color={C.violet} />
      <Text style={T.small}>{label}</Text>
    </View>
  );
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={{ paddingVertical: 40, paddingHorizontal: 18, gap: 8 }}>
      <Text style={[T.title, { color: C.coral }]}>Can't load that</Text>
      <Text style={T.body}>{message}</Text>
      {onRetry ? <QuietButton label="Try again" onPress={onRetry} tone={C.violet} style={{ marginTop: 6 }} /> : null}
    </View>
  );
}

/** Striped placeholder used whenever a product has no photo yet. */
export function ProductSlot({ label, height = 150 }: { label: string; height?: number }) {
  return (
    <View style={[s.slot, { height }]}>
      <Text style={{ fontFamily: F.mono, fontSize: 10.5, color: C.faint }}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  gradBtn: { paddingVertical: 15, borderRadius: RADIUS.tile, alignItems: "center" },
  gradBtnText: { color: "#fff", fontFamily: F.bold, fontSize: 14 },
  quietBtn: {
    paddingVertical: 14, borderRadius: RADIUS.tile, alignItems: "center",
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.line3,
  },
  quietBtnText: { fontFamily: F.bold, fontSize: 13 },
  card: {
    backgroundColor: C.surface, borderRadius: RADIUS.card,
    borderWidth: 1, borderColor: C.line, padding: 18,
  },
  input: {
    marginTop: 7, paddingVertical: 13, paddingHorizontal: 14,
    borderRadius: RADIUS.chip, borderWidth: 1, borderColor: C.line3,
    backgroundColor: C.surface, fontFamily: F.semi, fontSize: 14, color: C.ink,
  },
  track: { height: 6, borderRadius: 3, backgroundColor: C.line2, overflow: "hidden" },
  chip: {
    paddingVertical: 9, paddingHorizontal: 14, borderRadius: RADIUS.pill,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.line3,
  },
  chipOn: { backgroundColor: C.ink, borderColor: C.ink },
  chipText: { fontFamily: F.bold, fontSize: 12.5, color: C.muted },
  chipTextOn: { color: "#fff" },
  slot: {
    backgroundColor: C.tintDeep, borderRadius: RADIUS.tile,
    alignItems: "center", justifyContent: "center",
  },
});

export const styles = s;
