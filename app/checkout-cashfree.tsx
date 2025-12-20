import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { useNavigation, useRoute } from "@react-navigation/native";
import { RootState } from "../store";
import { clearCart } from "../slices/cartSlice";
import { API_URL } from "@env";
import CashfreePayment from "../components/CashfreePayment";

const CheckoutCashfreeScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const cartItems = useSelector((state: RootState) => state.cart.items);

  const { item: singleItem } = (route.params as any) || {};
  const items = singleItem ? [singleItem] : cartItems;

  const [name, setName] = useState(user?.username || "");
  const [phone, setPhone] = useState(user?.phone_number || "");
  const [address, setAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"online" | "cod">("online");
  const [loading, setLoading] = useState(false);
  const [platformSettings, setPlatformSettings] = useState<any>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<string>("");

  useEffect(() => {
    fetchPlatformSettings();
  }, []);

  const fetchPlatformSettings = async () => {
    try {
      const response = await fetch(`${API_URL}/api/settings/`);
      const data = await response.json();
      if (response.ok) {
        setPlatformSettings(data);
      }
    } catch (error) {
      console.error("Failed to fetch platform settings:", error);
    }
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => {
      const price =
        item.listing_type === "rent"
          ? parseFloat(item.rent_price || "0")
          : parseFloat(item.price || "0");
      return sum + price;
    }, 0);
  };

  const calculateCommission = () => {
    if (!platformSettings) return 0;
    const total = calculateTotal();
    const rate =
      paymentMethod === "cod"
        ? parseFloat(platformSettings.cod_commission_rate)
        : parseFloat(platformSettings.commission_rate);
    return (total * rate) / 100;
  };

  const total = calculateTotal();
  const commission = calculateCommission();
  const sellerEarnings = total - commission;

  const handlePayment = async () => {
    if (!user) {
      Alert.alert("Error", "Please login to continue");
      return;
    }

    if (!name.trim() || !phone.trim() || !address.trim()) {
      Alert.alert("Error", "Please fill all delivery details");
      return;
    }

    if (items.length === 0) {
      Alert.alert("Error", "Your cart is empty");
      return;
    }

    setLoading(true);

    try {
      const item = items[0];

      if (paymentMethod === "online") {
        await processOnlinePayment(item);
      } else {
        await processCODOrder(item);
      }
    } catch (error) {
      console.error("Payment error:", error);
      Alert.alert("Error", "Payment failed. Please try again.");
      setLoading(false);
    }
  };

  const processOnlinePayment = async (item: any) => {
    try {
      const orderResponse = await fetch(`${API_URL}/api/orders/create/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyer_email: user?.email,
          item_id: item.id,
          payment_method: "online",
          buyer_name: name,
          buyer_phone: phone,
          delivery_address: address,
        }),
      });

      const orderData = await orderResponse.json();

      if (!orderResponse.ok) {
        throw new Error(orderData.error || "Failed to create order");
      }

      setCurrentOrderId(orderData.order_id);
      setLoading(false);
      setShowPaymentModal(true);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to process payment");
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async (paymentId: string) => {
    setShowPaymentModal(false);

    try {
      const response = await fetch(`${API_URL}/api/orders/update-payment/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: currentOrderId,
          payment_id: paymentId,
          payment_status: "paid",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Failed to update payment:", data);
      }
    } catch (error) {
      console.error("Failed to update payment status:", error);
    }

    Alert.alert("Success!", "Payment successful! Your order has been placed.", [
      {
        text: "View Orders",
        onPress: () => {
          dispatch(clearCart());
          navigation.navigate("Orders" as never);
        },
      },
      {
        text: "Continue Shopping",
        onPress: () => {
          dispatch(clearCart());
          navigation.navigate("Home" as never);
        },
      },
    ]);
  };

  const handlePaymentFailure = (error: string) => {
    setShowPaymentModal(false);
    Alert.alert("Payment Failed", error);
  };

  const processCODOrder = async (item: any) => {
    try {
      const response = await fetch(`${API_URL}/api/orders/create/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyer_email: user?.email,
          item_id: item.id,
          payment_method: "cod",
          buyer_name: name,
          buyer_phone: phone,
          delivery_address: address,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert(
          "Order Placed!",
          `Your order ${data.order_id} has been placed successfully. Pay ₹${data.item_price} on delivery.`,
          [
            {
              text: "OK",
              onPress: () => {
                dispatch(clearCart());
                navigation.navigate("Home" as never);
              },
            },
          ]
        );
      } else {
        throw new Error(data.error || "Failed to create order");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to place order");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.header}>Checkout</Text>

        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          {items.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              {item.image && (
                <Image
                  source={{ uri: `${API_URL}${item.image}` }}
                  style={styles.itemImage}
                />
              )}
              <View style={styles.itemDetails}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.itemPrice}>
                  ₹
                  {item.listing_type === "rent"
                    ? item.rent_price
                    : item.price}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Delivery Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Details</Text>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="Enter phone number"
            placeholderTextColor="#999"
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Delivery Address</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={address}
            onChangeText={setAddress}
            placeholder="Enter complete address with PIN code"
            placeholderTextColor="#999"
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <View style={styles.paymentOptions}>
            <TouchableOpacity
              style={[
                styles.paymentOption,
                paymentMethod === "online" && styles.paymentOptionActive,
              ]}
              onPress={() => setPaymentMethod("online")}
            >
              <Text
                style={
                  paymentMethod === "online"
                    ? styles.paymentOptionTextActive
                    : styles.paymentOptionText
                }
              >
                💳 Cashfree Payment
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.paymentOption,
                paymentMethod === "cod" && styles.paymentOptionActive,
              ]}
              onPress={() => setPaymentMethod("cod")}
            >
              <Text
                style={
                  paymentMethod === "cod"
                    ? styles.paymentOptionTextActive
                    : styles.paymentOptionText
                }
              >
                💵 Cash on Delivery
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Price Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Price Breakdown</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Item Total</Text>
            <Text style={styles.priceValue}>₹{total.toFixed(2)}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>
              Platform Fee (
              {paymentMethod === "cod"
                ? platformSettings?.cod_commission_rate
                : platformSettings?.commission_rate}
              %)
            </Text>
            <Text style={styles.priceValue}>
              {paymentMethod === "cod" ? "₹0.00" : `₹${commission.toFixed(2)}`}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.priceRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>₹{total.toFixed(2)}</Text>
          </View>
          {paymentMethod === "online" && (
            <Text style={styles.note}>
              Seller will receive ₹{sellerEarnings.toFixed(2)} after platform
              commission
            </Text>
          )}
          {paymentMethod === "cod" && (
            <Text style={styles.note}>
              ✓ No commission on COD orders. Seller receives full amount.
            </Text>
          )}
        </View>

        {/* Place Order Button */}
        <TouchableOpacity
          style={[
            styles.placeOrderButton,
            loading && styles.placeOrderButtonDisabled,
          ]}
          onPress={handlePayment}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.placeOrderText}>
              {paymentMethod === "online" ? "Pay with Cashfree" : "Place Order"}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Cashfree Payment Modal */}
      <CashfreePayment
        visible={showPaymentModal}
        amount={total}
        orderId={currentOrderId}
        onSuccess={handlePaymentSuccess}
        onFailure={handlePaymentFailure}
        onClose={() => setShowPaymentModal(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
    backgroundColor: "#f8f9fa",
  },
  header: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1f0a1a",
    marginBottom: 24,
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f0a1a",
    marginBottom: 16,
  },
  itemRow: {
    flexDirection: "row",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  itemDetails: {
    flex: 1,
    justifyContent: "center",
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ff1493",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4b2a36",
    marginTop: 12,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    padding: 14,
    borderRadius: 10,
    fontSize: 15,
    backgroundColor: "#fafafa",
    color: "#333",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  paymentOptions: {
    flexDirection: "row",
    gap: 12,
  },
  paymentOption: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#e0e0e0",
  },
  paymentOptionActive: {
    backgroundColor: "#ffe8f5",
    borderColor: "#ff1493",
  },
  paymentOptionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  paymentOptionTextActive: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ff1493",
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  priceLabel: {
    fontSize: 14,
    color: "#666",
  },
  priceValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  divider: {
    height: 1,
    backgroundColor: "#e0e0e0",
    marginVertical: 12,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f0a1a",
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#ff1493",
  },
  note: {
    fontSize: 12,
    color: "#666",
    marginTop: 8,
    fontStyle: "italic",
  },
  placeOrderButton: {
    backgroundColor: "#ff1493",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#ff1493",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  placeOrderButtonDisabled: {
    backgroundColor: "#ccc",
    shadowOpacity: 0,
  },
  placeOrderText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
  },
});

export default CheckoutCashfreeScreen;
