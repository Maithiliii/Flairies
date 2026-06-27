import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { CheckCircle, Package, ArrowRight } from "lucide-react-native";

const OrderSuccessScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { cartId, amount, itemCount } = (route.params as any) || {};

  const scale = useRef(new Animated.Value(0)).current;
  const fadeUp = useRef(new Animated.Value(30)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 60,
        friction: 6,
      }),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(fadeUp, { toValue: 0, duration: 350, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const shortCartId = cartId ? cartId.slice(-8).toUpperCase() : "—";

  return (
    <View style={styles.wrapper}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Animation placeholder — swap this View with your Lottie/animation later */}
        <Animated.View style={[styles.iconWrap, { transform: [{ scale }] }]}>
          <View style={styles.iconCircle}>
            <CheckCircle size={72} color="#4caf50" strokeWidth={1.8} />
          </View>
        </Animated.View>

        <Animated.View style={{ opacity, transform: [{ translateY: fadeUp }] }}>
          <Text style={styles.title}>Payment Successful!</Text>
          <Text style={styles.subtitle}>
            Your order is confirmed. Each seller will ship their item to you directly.
          </Text>

          {/* Order summary card */}
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Order ref</Text>
              <Text style={styles.cardValue}>#{shortCartId}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>
                {itemCount === 1 ? "Item" : "Items"}
              </Text>
              <Text style={styles.cardValue}>
                {itemCount} {itemCount === 1 ? "item" : "items"}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Amount paid</Text>
              <Text style={[styles.cardValue, styles.amountText]}>
                ₹{Number(amount || 0).toFixed(0)}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Package size={16} color="#fe95b4" strokeWidth={2} />
            <Text style={styles.infoText}>
              You'll get notified once your order is shipped.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate("Orders" as never)}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>View My Orders</Text>
            <ArrowRight size={18} color="#fff" strokeWidth={2.5} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => navigation.navigate("Home" as never)}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryBtnText}>Continue Shopping</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: "#fff0ec",
  },
  container: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 48,
  },
  iconWrap: {
    marginBottom: 28,
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#e8f5e9",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#4caf50",
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1f0a1a",
    textAlign: "center",
    marginBottom: 10,
    fontFamily: "PlayfairDisplay_700Bold",
  },
  subtitle: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  card: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
  },
  cardLabel: {
    fontSize: 14,
    color: "#888",
  },
  cardValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1f0a1a",
  },
  amountText: {
    color: "#fe95b4",
    fontSize: 17,
  },
  divider: {
    height: 1,
    backgroundColor: "#f5f5f5",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 32,
    paddingHorizontal: 4,
  },
  infoText: {
    fontSize: 13,
    color: "#888",
    flex: 1,
    lineHeight: 18,
  },
  primaryBtn: {
    width: "100%",
    backgroundColor: "#fe95b4",
    paddingVertical: 16,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 12,
    shadowColor: "#fe95b4",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
  secondaryBtn: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#fe95b4",
  },
  secondaryBtnText: {
    color: "#fe95b4",
    fontSize: 15,
    fontWeight: "700",
  },
});

export default OrderSuccessScreen;
