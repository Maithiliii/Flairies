import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { ChevronLeft, Heart } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { useSelector } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RootState } from "../store";

interface Props {
  title: string;
  showCart?: boolean;
}

export default function ScreenHeader({ title, showCart = false }: Props) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const cartItems = useSelector((state: RootState) => state.cart.items);
  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);

  return (
    <View style={[styles.row, { paddingTop: insets.top + 8 }]}>
      <TouchableOpacity
        style={styles.back}
        onPress={() => navigation.goBack()}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        activeOpacity={0.7}
      >
        <ChevronLeft size={26} color="#fe95b4" strokeWidth={2} />
      </TouchableOpacity>

      <Text style={styles.title}>{title.toUpperCase()}</Text>

      {showCart ? (
        <View style={styles.rightRow}>
          <TouchableOpacity
            style={styles.heartBtn}
            onPress={() => (navigation as any).navigate("Favorites")}
            activeOpacity={0.8}
          >
            <Heart size={20} color="#fe95b4" strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cartBtn}
            onPress={() => (navigation as any).navigate("Cart")}
            activeOpacity={0.8}
          >
            <Image
              source={require("../assets/images/cart.png")}
              style={styles.cartImg}
              resizeMode="contain"
            />
            {cartCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>
                  {cartCount > 99 ? "99+" : cartCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.spacer} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingBottom: 12,
  },
  back:   { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  spacer: { width: 44 },
  title: {
    flex: 1,
    textAlign: "center",
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    letterSpacing: 1.5,
    color: "#1f0a1a",
  },
  rightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
  },
  heartBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cartBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  cartImg: { width: 28, height: 28 },
  cartBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#fe95b4",
    borderRadius: 9,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: "#fff0ec",
  },
  cartBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontFamily: "Inter_700Bold",
  },
});
