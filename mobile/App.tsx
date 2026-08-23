import React, { useCallback } from "react";
import { StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useFonts } from "expo-font";
import { Poppins_600SemiBold } from "@expo-google-fonts/poppins";
import {
  PlusJakartaSans_400Regular, PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold,
} from "@expo-google-fonts/plus-jakarta-sans";
import { JetBrainsMono_400Regular } from "@expo-google-fonts/jetbrains-mono";

import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { CartProvider, useCart } from "./src/context/CartContext";
import { ToastProvider } from "./src/context/ToastContext";
import { AppHeader, SubHeader } from "./src/components/AppHeader";
import { Loading } from "./src/components/ui";
import { C, F } from "./src/theme";

import HomeScreen from "./src/screens/HomeScreen";
import SignInScreen from "./src/screens/SignInScreen";
import SetupScreen from "./src/screens/SetupScreen";
import CatalogScreen from "./src/screens/CatalogScreen";
import ProductScreen from "./src/screens/ProductScreen";
import CartScreen from "./src/screens/CartScreen";
import CheckoutScreen from "./src/screens/CheckoutScreen";
import OrderPlacedScreen from "./src/screens/OrderPlacedScreen";
import OrdersScreen from "./src/screens/OrdersScreen";
import UpdatesScreen from "./src/screens/UpdatesScreen";
import CommunityScreen from "./src/screens/CommunityScreen";
import AccountScreen from "./src/screens/AccountScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

/** Simple geometric tab icons, in the spirit of the design's hand-drawn set. */
function TabIcon({ name, color }: { name: string; color: string }) {
  const base = { borderColor: color, borderWidth: 2 } as const;
  if (name === "Shop") {
    return <View style={[styles.icon, base, { borderRadius: 4 }]} />;
  }
  if (name === "Orders") {
    return <View style={[styles.icon, base, { borderRadius: 3 }]}>
      <View style={[styles.line, { backgroundColor: color }]} />
      <View style={[styles.line, { backgroundColor: color, width: 6 }]} />
    </View>;
  }
  if (name === "Updates") {
    return <View style={[styles.icon, base, { borderTopLeftRadius: 9, borderTopRightRadius: 9 }]} />;
  }
  return (
    <View style={{ flexDirection: "row", gap: 3, alignItems: "center" }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: color, opacity: 0.55 }} />
    </View>
  );
}

function Tabs({ navigation }: any) {
  const { count } = useCart();
  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>
      <AppHeader
        onAccount={() => navigation.navigate("Account")}
        onCart={() => navigation.navigate("Cart")}
      />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: C.violet,
          tabBarInactiveTintColor: C.faint,
          tabBarLabelStyle: { fontFamily: F.bold, fontSize: 10.5 },
          tabBarStyle: { backgroundColor: C.surface, borderTopColor: C.line },
          tabBarIcon: ({ color }) => <TabIcon name={route.name} color={color} />,
        })}
      >
        <Tab.Screen name="Shop" component={CatalogScreen} />
        <Tab.Screen
          name="Orders"
          component={OrdersScreen}
          options={{ tabBarBadge: count || undefined }}
        />
        <Tab.Screen name="Updates" component={UpdatesScreen} />
        <Tab.Screen name="Community" component={CommunityScreen} />
      </Tab.Navigator>
    </View>
  );
}

const subHeader = (title: string) => ({
  header: ({ navigation }: any) => <SubHeader title={title} onBack={() => navigation.goBack()} />,
});

function AppStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
      <Stack.Screen name="Product" component={ProductScreen} options={subHeader("Item")} />
      <Stack.Screen name="Cart" component={CartScreen} options={subHeader("Your order")} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} options={subHeader("Checkout")} />
      <Stack.Screen name="OrderPlaced" component={OrderPlacedScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Account" component={AccountScreen} options={subHeader("Account")} />
    </Stack.Navigator>
  );
}

function Root() {
  const { phase } = useAuth();
  if (phase === "loading") return <View style={styles.center}><Loading label="Starting Gather…" /></View>;
  if (phase === "picker") return <HomeScreen />;
  if (phase === "signin") return <SignInScreen />;
  if (phase === "setup") return <SetupScreen />;
  return (
    <NavigationContainer>
      <AppStack />
    </NavigationContainer>
  );
}

export default function App() {
  const [loaded] = useFonts({
    Poppins_600SemiBold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    JetBrainsMono_400Regular,
  });

  if (!loaded) {
    return (
      <View style={styles.center}>
        <Text>Loading…</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <CartProvider>
          <ToastProvider>
            <StatusBar style="dark" />
            <Root />
          </ToastProvider>
        </CartProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.wash },
  icon: { width: 16, height: 18, alignItems: "center", justifyContent: "center", gap: 2 },
  line: { width: 8, height: 2, borderRadius: 1 },
});
