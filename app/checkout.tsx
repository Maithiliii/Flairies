import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, Image } from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { useNavigation, useRoute } from "@react-navigation/native";
import { RootState } from "../store";
import { clearCart } from "../slices/cartSlice";
import PaymentGateway from "../components/PaymentGateway";
import { processRazorpayPayment } from "../components/RazorpayPayment";
import LocationPicker from "../components/LocationPicker";
import RadioButton from "../components/RadioButton";
import { supabase } from "../lib/supabase";

const CheckoutScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const cartItems = useSelector((state: RootState) => state.cart.items);

  const { item: singleItem } = (route.params as any) || {};
  const items = singleItem ? [singleItem] : cartItems;

  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone_number || "");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [platformSettings, setPlatformSettings] = useState<any>(null);
  const [showPaymentGateway, setShowPaymentGateway] = useState(false);
  const [currentOrderDbId, setCurrentOrderDbId] = useState<number>(0);
  const [currentOrderId, setCurrentOrderId] = useState<string>("");
  const [useRazorpay, setUseRazorpay] = useState(true);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [addressMethod, setAddressMethod] = useState<"map" | "manual">("map");
  const [selectedLocation, setSelectedLocation] = useState<{ latitude: number; longitude: number; address?: any } | null>(null);

  useEffect(() => {
    fetchPlatformSettings();
    loadSavedAddress();
  }, []);

  const loadSavedAddress = async () => {
    if (!user) return;
    try {
      const { data } = await supabase.from("profiles").select("address, latitude, longitude").eq("id", user.id).single();
      if (data?.address) {
        setAddress(data.address);
        if (data.latitude && data.longitude) {
          setSelectedLocation({ latitude: data.latitude, longitude: data.longitude });
          setAddressMethod("map");
        } else {
          setAddressMethod("manual");
        }
      }
    } catch { /* ignore */ }
  };

  const handleLocationSelect = (location: { latitude: number; longitude: number; address?: any }) => {
    setSelectedLocation(location);
    if (location.address) {
      const addr = location.address;
      setAddress(`${addr.name ? addr.name + ", " : ""}${addr.street ? addr.street + ", " : ""}${addr.city ? addr.city + ", " : ""}${addr.region ? addr.region + " " : ""}${addr.postalCode ? "- " + addr.postalCode : ""}`.trim());
    }
  };

  const fetchPlatformSettings = async () => {
    try {
      const { data } = await supabase.from("platform_settings").select("*").limit(1).single();
      if (data) setPlatformSettings(data);
    } catch { /* use defaults */ }
  };

  const calculateTotal = () => items.reduce((sum, item) => {
    const price = item.listing_type === "rent" ? parseFloat(item.rent_price || "0") : parseFloat(item.price || "0");
    return sum + price;
  }, 0);

  const calculateCommission = () => {
    if (!platformSettings) return 0;
    const total = calculateTotal();
    const rate = parseFloat(platformSettings.commission_rate || "15");
    return (total * rate) / 100;
  };

  const total = calculateTotal();
  const commission = calculateCommission();
  const sellerEarnings = total - commission;

  const createOrder = async (item: any) => {
    const orderId = `FLR-${Date.now()}`;
    const { data, error } = await supabase.from("orders").insert({
      order_id: orderId,
      item_id: item.id,
      buyer_id: user!.id,
      seller_id: item.user_id,
      payment_method: "online",
      payment_status: "pending",
      order_status: "processing",
      buyer_name: name,
      buyer_phone: phone,
      delivery_address: address,
      platform_commission: commission,
      seller_earnings: sellerEarnings,
    }).select("id, order_id").single();

    if (error) throw error;
    return data;
  };

  const handlePayment = async () => {
    if (!user) { Alert.alert("Error", "Please login to continue"); return; }
    if (!name.trim() || !phone.trim() || !address.trim()) { Alert.alert("Error", "Please fill all delivery details"); return; }
    if (items.length === 0) { Alert.alert("Error", "Your cart is empty"); return; }

    setLoading(true);
    try {
      const item = items[0];
      const orderData = await createOrder(item);
      setCurrentOrderDbId(orderData.id);
      setCurrentOrderId(orderData.order_id);
      setLoading(false);
      if (useRazorpay) {
        processRazorpayPayment({ amount: total, orderId: orderData.order_id, userEmail: user.email, userName: name, userPhone: phone, onSuccess: handleRazorpaySuccess, onFailure: handleRazorpayFailure });
      } else {
        setShowPaymentGateway(true);
      }
    } catch (error: any) {
      console.error("Payment error:", error);
      Alert.alert("Error", error.message || "Payment failed. Please try again.");
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async (paymentId: string) => {
    setShowPaymentGateway(false);
    try {
      await supabase.from("orders").update({ payment_status: "paid", razorpay_payment_id: paymentId }).eq("id", currentOrderDbId);
      if (items[0]) await supabase.from("items").update({ is_active: false }).eq("id", items[0].id);
    } catch (error) { console.error("Failed to update payment:", error); }
    Alert.alert("Success!", "Payment successful! Your order has been placed.", [
      { text: "View Orders", onPress: () => { dispatch(clearCart()); navigation.navigate("Orders" as never); } },
      { text: "Continue Shopping", onPress: () => { dispatch(clearCart()); navigation.navigate("Home" as never); } },
    ]);
  };

  const handlePaymentFailure = (error: string) => { setShowPaymentGateway(false); Alert.alert("Payment Failed", error); };

  const handleRazorpaySuccess = async (paymentData: any) => {
    try {
      await supabase.from("orders").update({ payment_status: "paid", razorpay_payment_id: paymentData.paymentId, razorpay_order_id: paymentData.orderId, razorpay_signature: paymentData.signature }).eq("id", currentOrderDbId);
      if (items[0]) await supabase.from("items").update({ is_active: false }).eq("id", items[0].id);
    } catch (error) { console.error("Failed to update Razorpay payment:", error); }
    Alert.alert("Payment Successful! 🎉", `Payment ID: ${paymentData.paymentId}\nYour order has been placed.`, [
      { text: "View Orders", onPress: () => { dispatch(clearCart()); navigation.navigate("Orders" as never); } },
      { text: "Continue Shopping", onPress: () => { dispatch(clearCart()); navigation.navigate("Home" as never); } },
    ]);
  };

  const handleRazorpayFailure = (error: any) => {
    if (error.code === "razorpay_unavailable") {
      Alert.alert("Payment Method Not Available", "Razorpay is not available in Expo Go. Use a dev build or mock payment:", [
        { text: "Use Mock Payment", onPress: () => { setUseRazorpay(false); setShowPaymentGateway(true); } },
        { text: "Cancel" },
      ]);
    } else if (error.code === "payment_cancelled") {
      Alert.alert("Payment Cancelled", "You cancelled the payment. Please try again.");
    } else {
      Alert.alert("Payment Failed", error.description || "Payment failed. Please try again.");
    }
  };

  if (showLocationPicker) {
    return (
      <View style={{ flex: 1 }}>
        <View style={styles.locationHeader}>
          <TouchableOpacity style={styles.backButton} onPress={() => setShowLocationPicker(false)}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select Delivery Location</Text>
        </View>
        <LocationPicker onLocationSelect={handleLocationSelect} initialLocation={selectedLocation} />
        <TouchableOpacity style={styles.doneButton} onPress={() => setShowLocationPicker(false)}>
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.header}>Checkout</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          {items.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              {item.image_url && <Image source={{ uri: item.image_url }} style={styles.itemImage} />}
              <View style={styles.itemDetails}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.itemPrice}>₹{item.listing_type === "rent" ? item.rent_price : item.price}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Details</Text>
          <Text style={styles.label}>Full Name</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Enter your name" placeholderTextColor="#999" />
          <Text style={styles.label}>Phone Number</Text>
          <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="Enter phone number" placeholderTextColor="#999" keyboardType="phone-pad" />
          <Text style={styles.label}>Delivery Address</Text>
          <View style={styles.methodSelection}>
            <RadioButton selected={addressMethod === "map"} onPress={() => setAddressMethod("map")} title="Use Saved Location" subtitle={selectedLocation ? "Location confirmed" : "Select on map"} icon="📍" />
            <RadioButton selected={addressMethod === "manual"} onPress={() => setAddressMethod("manual")} title="Enter Address Manually" subtitle="Type or edit address" icon="✏️" />
          </View>
          {addressMethod === "map" && (
            <View style={styles.mapSection}>
              <TouchableOpacity style={styles.locationButton} onPress={() => setShowLocationPicker(true)}>
                <Text style={styles.locationIcon}>📍</Text>
                <Text style={styles.locationButtonText}>{selectedLocation ? "Change Location" : "Select Location on Map"}</Text>
              </TouchableOpacity>
              {selectedLocation && (
                <View style={styles.selectedLocationContainer}>
                  <Text style={styles.selectedLocationTitle}>📍 Location Confirmed</Text>
                  <Text style={styles.selectedAddressText}>{address}</Text>
                </View>
              )}
            </View>
          )}
          {addressMethod === "manual" && (
            <TextInput style={[styles.input, styles.textArea]} value={address} onChangeText={setAddress} placeholder="Enter complete address with PIN code" placeholderTextColor="#999" multiline numberOfLines={4} />
          )}
          <View style={styles.confirmSection}>
            <Text style={styles.confirmNote}>
              {addressMethod === "map" ? (selectedLocation ? "✓ Delivery location confirmed" : "Please select your delivery location") : (address.trim() ? "✓ Address entered" : "Please enter your complete delivery address")}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <View style={styles.onlinePaymentSection}>
            <Text style={styles.onlinePaymentTitle}>Choose Payment Gateway</Text>
            <View style={styles.gatewaySelection}>
              <RadioButton selected={useRazorpay} onPress={() => setUseRazorpay(true)} title="Razorpay (Recommended)" subtitle="Cards • UPI • Net Banking • Wallets" icon="🏦" />
              <RadioButton selected={!useRazorpay} onPress={() => setUseRazorpay(false)} title="Mock Payment (Testing)" subtitle="For development testing only" icon="🧪" />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Price Breakdown</Text>
          <View style={styles.priceRow}><Text style={styles.priceLabel}>Item Total</Text><Text style={styles.priceValue}>₹{total.toFixed(2)}</Text></View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Platform Fee ({platformSettings?.commission_rate ?? 15}%)</Text>
            <Text style={styles.priceValue}>₹{commission.toFixed(2)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.priceRow}><Text style={styles.totalLabel}>Total Amount</Text><Text style={styles.totalValue}>₹{total.toFixed(2)}</Text></View>
          <Text style={styles.note}>Seller will receive ₹{sellerEarnings.toFixed(2)} after platform commission</Text>
        </View>

        <TouchableOpacity style={[styles.placeOrderButton, loading && styles.placeOrderButtonDisabled]} onPress={handlePayment} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.placeOrderText}>Pay Now</Text>}
        </TouchableOpacity>
      </ScrollView>

      <PaymentGateway visible={showPaymentGateway} amount={total} orderId={currentOrderId} onSuccess={handlePaymentSuccess} onFailure={handlePaymentFailure} onClose={() => setShowPaymentGateway(false)} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 60, paddingBottom: 40, backgroundColor: "#f8f9fa" },
  header: { fontSize: 28, fontWeight: "800", color: "#1f0a1a", marginBottom: 24 },
  section: { backgroundColor: "#fff", borderRadius: 16, padding: 20, marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#1f0a1a", marginBottom: 16 },
  itemRow: { flexDirection: "row", marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  itemImage: { width: 60, height: 60, borderRadius: 8, marginRight: 12 },
  itemDetails: { flex: 1, justifyContent: "center" },
  itemTitle: { fontSize: 15, fontWeight: "600", color: "#333", marginBottom: 4 },
  itemPrice: { fontSize: 16, fontWeight: "700", color: "#fe95b4" },
  label: { fontSize: 14, fontWeight: "600", color: "#4b2a36", marginTop: 12, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: "#e0e0e0", padding: 14, borderRadius: 10, fontSize: 15, backgroundColor: "#fafafa", color: "#333" },
  textArea: { height: 100, textAlignVertical: "top" },
  methodSelection: { marginBottom: 16 },
  mapSection: { marginBottom: 16 },
  locationButton: { flexDirection: "row", backgroundColor: "#fe95b4", padding: 16, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 16, shadowColor: "#fe95b4", shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  locationIcon: { fontSize: 20, marginRight: 8 },
  locationButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  selectedLocationContainer: { backgroundColor: "#e8f5e9", padding: 16, borderRadius: 12 },
  selectedLocationTitle: { fontSize: 16, fontWeight: "700", color: "#2e7d32", marginBottom: 8 },
  selectedAddressText: { fontSize: 14, color: "#2e7d32", lineHeight: 20 },
  confirmSection: { backgroundColor: "#f8f9fa", padding: 12, borderRadius: 8, marginTop: 12, borderLeftWidth: 4, borderLeftColor: "#fe95b4" },
  confirmNote: { fontSize: 12, color: "#333", fontWeight: "500", textAlign: "center" },
  paymentMethodSelection: { marginBottom: 16 },
  onlinePaymentSection: { marginTop: 16, padding: 16, backgroundColor: "#f8f9fa", borderRadius: 12, borderWidth: 1, borderColor: "#e0e0e0" },
  onlinePaymentTitle: { fontSize: 16, fontWeight: "600", color: "#1f0a1a", marginBottom: 12 },
  gatewaySelection: { marginBottom: 8 },
  priceRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  priceLabel: { fontSize: 14, color: "#666" },
  priceValue: { fontSize: 14, fontWeight: "600", color: "#333" },
  divider: { height: 1, backgroundColor: "#e0e0e0", marginVertical: 12 },
  totalLabel: { fontSize: 18, fontWeight: "700", color: "#1f0a1a" },
  totalValue: { fontSize: 18, fontWeight: "800", color: "#fe95b4" },
  note: { fontSize: 12, color: "#666", marginTop: 8, fontStyle: "italic" },
  placeOrderButton: { backgroundColor: "#fe95b4", paddingVertical: 16, borderRadius: 12, alignItems: "center", marginTop: 8, shadowColor: "#fe95b4", shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  placeOrderButtonDisabled: { backgroundColor: "#ccc", shadowOpacity: 0 },
  placeOrderText: { color: "#fff", fontSize: 18, fontWeight: "800" },
  locationHeader: { flexDirection: "row", alignItems: "center", padding: 20, paddingTop: 60, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e0e0e0" },
  backButton: { padding: 8 },
  backButtonText: { fontSize: 16, color: "#fe95b4", fontWeight: "600" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#1f0a1a", marginLeft: 16 },
  doneButton: { backgroundColor: "#fe95b4", margin: 20, padding: 16, borderRadius: 12, alignItems: "center", shadowColor: "#fe95b4", shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  doneButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});

export default CheckoutScreen;
