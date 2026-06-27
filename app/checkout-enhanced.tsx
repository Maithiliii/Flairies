import React, { useState } from "react";
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
import ConfirmationModal from "../components/ConfirmationModal";
import { useSelector, useDispatch } from "react-redux";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Trash2 } from "lucide-react-native";
import { RootState } from "../store";
import { clearCart, removeFromCart, CartItem } from "../slices/cartSlice";
import { supabase } from "../lib/supabase";
import ScreenHeader from "../components/ScreenHeader";
import * as Location from "expo-location";
// @ts-ignore
import RazorpayCheckout from "react-native-razorpay";

const PLATFORM_COMMISSION_RATE = 0.15; // 15% on online payments

let MapView: any = null;
let Marker: any = null;
let PROVIDER_GOOGLE: any = null;
try {
  const Maps = require("react-native-maps");
  MapView = Maps.default;
  Marker = Maps.Marker;
  PROVIDER_GOOGLE = Maps.PROVIDER_GOOGLE;
} catch (e) {}

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

  const [houseNo, setHouseNo] = useState("");
  const [street, setStreet] = useState("");
  const [landmark, setLandmark] = useState("");
  const [city, setCity] = useState("");
  const [addressState, setAddressState] = useState("");
  const [pincode, setPincode] = useState("");

  const [paymentMethod, setPaymentMethod] = useState<"online" | "cod">("online");
  const [deleteTarget, setDeleteTarget] = useState<CartItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const [confirmedAddress, setConfirmedAddress] = useState("");

  const [region, setRegion] = useState({
    latitude: 19.076, longitude: 72.8777, latitudeDelta: 0.01, longitudeDelta: 0.01,
  });
  const [markerPosition, setMarkerPosition] = useState({
    latitude: 19.076, longitude: 72.8777,
  });

  const total = items.reduce((sum, item) => {
    const price = item.listing_type === "rent"
      ? parseFloat(item.rent_price || "0") * (item.rent_days || 1)
      : parseFloat(item.price || "0");
    return sum + price;
  }, 0);

  function typeBadgeLabel(listingType: string) {
    if (listingType === "rent") return "RENT";
    if (listingType === "sell_accessories") return "ACCESSORIES";
    return "BUY";
  }

  const commission = paymentMethod === "online" ? total * PLATFORM_COMMISSION_RATE : 0;
  const sellerEarnings = total - commission;

  const getFullAddress = () => {
    if (locationConfirmed && confirmedAddress) return confirmedAddress;
    return [houseNo, street, landmark, city, addressState, pincode]
      .filter(Boolean)
      .join(", ");
  };

  const getCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location permission is required");
        return;
      }
      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      setRegion({ latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 });
      setMarkerPosition({ latitude, longitude });
      const addresses = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (addresses.length > 0) {
        const addr = addresses[0];
        setStreet(addr.street || "");
        setCity(addr.city || "");
        setAddressState(addr.region || "");
        setPincode(addr.postalCode || "");
        setLandmark(addr.subregion || "");
      }
      setShowMap(true);
    } catch {
      Alert.alert("Error", "Failed to get current location");
    } finally {
      setLocationLoading(false);
    }
  };

  const handleMapPress = async (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setMarkerPosition({ latitude, longitude });
    try {
      const addresses = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (addresses.length > 0) {
        const addr = addresses[0];
        setStreet(addr.street || "");
        setCity(addr.city || "");
        setAddressState(addr.region || "");
        setPincode(addr.postalCode || "");
        setLandmark(addr.subregion || "");
      }
    } catch {}
  };

  const confirmLocation = async () => {
    try {
      const addresses = await Location.reverseGeocodeAsync({
        latitude: markerPosition.latitude,
        longitude: markerPosition.longitude,
      });
      if (addresses.length > 0) {
        const addr = addresses[0];
        const fullAddress = [
          houseNo || addr.name,
          addr.street,
          addr.subregion,
          addr.city,
          addr.region,
          addr.postalCode,
        ]
          .filter(Boolean)
          .join(", ");
        setConfirmedAddress(fullAddress);
        setLocationConfirmed(true);
        Alert.alert("Location Confirmed", "Delivery address set from your location.", [{ text: "OK" }]);
      }
    } catch {
      Alert.alert("Error", "Failed to confirm location. Please try again.");
    }
  };

  const handlePayment = async () => {
    if (!user) { Alert.alert("Error", "Please login to continue"); return; }
    if (!name.trim() || !phone.trim()) { Alert.alert("Error", "Please fill name and phone"); return; }
    if (!locationConfirmed && (!houseNo || !street || !city || !addressState || !pincode)) {
      Alert.alert("Error", "Please confirm your location or fill all address fields");
      return;
    }
    if (items.length === 0) { Alert.alert("Error", "Your cart is empty"); return; }

    setLoading(true);
    try {
      if (paymentMethod === "online") {
        await processOnlinePayment(items);
      } else {
        await processCODOrder(items);
      }
    } catch (error) {
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const processOnlinePayment = async (cartItems: any[]) => {
    const { data, error } = await supabase.functions.invoke("create-razorpay-order", {
      body: {
        cart_items: cartItems.map((i) => ({ id: i.id, days: i.rent_days || 1 })),
        buyer_name: name,
        buyer_phone: phone,
        delivery_address: getFullAddress(),
        payment_method: "online",
      },
    });

    if (error || data?.error) {
      Alert.alert("Error", data?.error || error?.message || "Failed to create order");
      return;
    }

    const options = {
      description: `Flairies — ${data.item_count} item${data.item_count > 1 ? "s" : ""}`,
      currency: "INR",
      key: data.key_id,
      amount: data.amount_in_paise,
      name: "Flairies",
      order_id: data.razorpay_order_id,
      prefill: { email: user!.email, contact: phone, name },
      theme: { color: "#fe95b4" },
    };

    RazorpayCheckout.open(options)
      .then(async (paymentData: any) => {
        const { data: verifyData, error: verifyError } =
          await supabase.functions.invoke("verify-razorpay-payment", {
            body: {
              razorpay_payment_id: paymentData.razorpay_payment_id,
              razorpay_order_id: paymentData.razorpay_order_id,
              razorpay_signature: paymentData.razorpay_signature,
              cart_id: data.cart_id,
            },
          });

        if (verifyError || verifyData?.error) {
          Alert.alert(
            "Verification Issue",
            "Payment received but verification failed. Contact support with cart ID: " + data.cart_id
          );
          return;
        }

        dispatch(clearCart());
        Alert.alert("Payment Successful!", "Your order has been placed. Items ship separately from each seller.", [
          { text: "View Orders", onPress: () => navigation.navigate("Orders" as never) },
          { text: "Continue Shopping", onPress: () => navigation.navigate("Home" as never) },
        ]);
      })
      .catch((err: any) => {
        Alert.alert("Payment Failed", err?.description || "Payment was cancelled");
      });
  };

  const processCODOrder = async (cartItems: any[]) => {
    const { data, error } = await supabase.functions.invoke("create-razorpay-order", {
      body: {
        cart_items: cartItems.map((i) => ({ id: i.id, days: i.rent_days || 1 })),
        buyer_name: name,
        buyer_phone: phone,
        delivery_address: getFullAddress(),
        payment_method: "cod",
      },
    });

    if (error || data?.error) {
      Alert.alert("Error", data?.error || error?.message || "Failed to place order");
      return;
    }

    dispatch(clearCart());
    Alert.alert(
      "Order Placed!",
      `${data.item_count} item${data.item_count > 1 ? "s" : ""} confirmed.\nPay ₹${data.amount.toFixed(2)} on delivery.`,
      [{ text: "OK", onPress: () => navigation.navigate("Home" as never) }]
    );
  };

  return (
    <View style={styles.wrapper}>
      <ScreenHeader title="Checkout" />
      <ScrollView contentContainerStyle={styles.container}>

        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          {items.map((item, index) => (
            <TouchableOpacity
              key={index}
              activeOpacity={0.85}
              onPress={() => (navigation as any).navigate("ItemDetail", { itemId: item.id })}
            >
              <View style={[styles.itemRow, index < items.length - 1 && styles.itemRowBorder]}>
                {item.image_url && (
                  <Image source={{ uri: item.image_url }} style={styles.itemImage} />
                )}
                <View style={styles.itemDetails}>
                  <View style={styles.itemTopRow}>
                    <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
                    <View style={styles.typeBadge}>
                      <Text style={styles.typeBadgeText}>{typeBadgeLabel(item.listing_type)}</Text>
                    </View>
                  </View>
                  <Text style={styles.itemPrice}>
                    {item.listing_type === "rent"
                      ? `₹${(parseFloat(item.rent_price || "0") * (item.rent_days || 1)).toFixed(0)} (₹${item.rent_price}/day × ${item.rent_days || 1}d)`
                      : `₹${item.price}`}
                  </Text>
                  <View style={styles.itemBottomRow}>
                    <View />
                    <TouchableOpacity
                      onPress={(e) => { e.stopPropagation(); setDeleteTarget(item as CartItem); }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Trash2 size={16} color="#e53935" strokeWidth={2} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Contact Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Details</Text>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
            placeholderTextColor="#555"
          />
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="Enter phone number"
            placeholderTextColor="#555"
            keyboardType="phone-pad"
          />
        </View>

        {/* Delivery Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Address</Text>

          <TouchableOpacity
            style={styles.locationButton}
            onPress={getCurrentLocation}
            disabled={locationLoading}
          >
            {locationLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.locationButtonText}>Use Current Location</Text>
            )}
          </TouchableOpacity>

          {!showMap && (
            <View style={styles.orContainer}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>OR</Text>
              <View style={styles.orLine} />
            </View>
          )}

          {showMap && MapView && (
            <View style={styles.mapContainer}>
              <MapView
                provider={PROVIDER_GOOGLE}
                style={styles.map}
                region={region}
                onPress={handleMapPress}
              >
                <Marker coordinate={markerPosition} draggable onDragEnd={handleMapPress} />
              </MapView>
              <Text style={styles.mapHint}>Tap or drag pin to adjust location</Text>
              <TouchableOpacity style={styles.confirmLocationButton} onPress={confirmLocation}>
                <Text style={styles.confirmLocationText}>Confirm This Location</Text>
              </TouchableOpacity>
            </View>
          )}

          {showMap && !MapView && (
            <View style={styles.mapFallback}>
              <Text style={styles.mapFallbackText}>Location detected</Text>
              <TouchableOpacity style={styles.confirmLocationButton} onPress={confirmLocation}>
                <Text style={styles.confirmLocationText}>Confirm This Location</Text>
              </TouchableOpacity>
            </View>
          )}

          {locationConfirmed && (
            <View style={styles.confirmedLocationContainer}>
              <Text style={styles.confirmedLocationTitle}>Delivery Address</Text>
              <Text style={styles.confirmedLocationText}>{confirmedAddress}</Text>
              <TouchableOpacity
                style={styles.changeLocationButton}
                onPress={() => { setLocationConfirmed(false); setConfirmedAddress(""); setShowMap(false); }}
              >
                <Text style={styles.changeLocationText}>Change Address</Text>
              </TouchableOpacity>
            </View>
          )}

          {!locationConfirmed && (
            <>
              {!showMap && <Text style={styles.manualEntryTitle}>Enter Address Manually</Text>}
              <Text style={styles.label}>House/Flat No. *</Text>
              <TextInput style={styles.input} value={houseNo} onChangeText={setHouseNo} placeholder="House/flat number" placeholderTextColor="#555" />
              <Text style={styles.label}>Street/Area *</Text>
              <TextInput style={styles.input} value={street} onChangeText={setStreet} placeholder="Street or area" placeholderTextColor="#555" />
              <Text style={styles.label}>Landmark (Optional)</Text>
              <TextInput style={styles.input} value={landmark} onChangeText={setLandmark} placeholder="Nearby landmark" placeholderTextColor="#555" />
              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.label}>City *</Text>
                  <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="City" placeholderTextColor="#555" />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.label}>State *</Text>
                  <TextInput style={styles.input} value={addressState} onChangeText={setAddressState} placeholder="State" placeholderTextColor="#555" />
                </View>
              </View>
              <Text style={styles.label}>Pincode *</Text>
              <TextInput style={styles.input} value={pincode} onChangeText={setPincode} placeholder="6-digit pincode" placeholderTextColor="#555" keyboardType="numeric" maxLength={6} />
            </>
          )}
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <View style={styles.paymentOptions}>
            <TouchableOpacity
              style={[styles.paymentOption, paymentMethod === "online" && styles.paymentOptionActive]}
              onPress={() => setPaymentMethod("online")}
            >
              <Text style={paymentMethod === "online" ? styles.paymentOptionTextActive : styles.paymentOptionText}>
                Online Payment
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.paymentOption, paymentMethod === "cod" && styles.paymentOptionActive]}
              onPress={() => setPaymentMethod("cod")}
            >
              <Text style={paymentMethod === "cod" ? styles.paymentOptionTextActive : styles.paymentOptionText}>
                Cash on Delivery
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
              Platform Fee {paymentMethod === "online" ? "(15%)" : ""}
            </Text>
            <Text style={styles.priceValue}>
              {paymentMethod === "online" ? `₹${commission.toFixed(2)}` : "₹0.00"}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.priceRow}>
            <Text style={styles.totalLabel}>You Pay</Text>
            <Text style={styles.totalValue}>₹{total.toFixed(2)}</Text>
          </View>
          {paymentMethod === "online" && (
            <Text style={styles.note}>
              Sellers receive ₹{sellerEarnings.toFixed(2)} total after 15% platform fee. Items ship separately from each seller.
            </Text>
          )}
          {paymentMethod === "cod" && (
            <Text style={styles.note}>No platform fee on COD orders</Text>
          )}
        </View>

        <TouchableOpacity
          style={[styles.placeOrderButton, loading && styles.placeOrderButtonDisabled]}
          onPress={handlePayment}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.placeOrderText}>
              {paymentMethod === "online" ? "Pay Now" : "Place Order"}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <ConfirmationModal
        visible={!!deleteTarget}
        title="Remove Item"
        message="This item will be removed from your cart."
        confirmText="Remove"
        cancelText="Cancel"
        confirmColor="#e53935"
        onConfirm={() => {
          if (deleteTarget) dispatch(removeFromCart(deleteTarget.id));
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: "#fff0ec" },
  container: { paddingHorizontal: 20, paddingBottom: 40 },
  section: { backgroundColor: "#fff", borderRadius: 16, padding: 20, marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#1f0a1a", marginBottom: 16 },
  itemRow: { flexDirection: "row", paddingVertical: 12 },
  itemRowBorder: { borderBottomWidth: 1, borderBottomColor: "#f5f5f5" },
  itemImage: { width: 64, height: 64, borderRadius: 10, marginRight: 12 },
  itemDetails: { flex: 1 },
  itemTopRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 4 },
  itemTitle: { flex: 1, fontSize: 14, fontWeight: "600", color: "#333", lineHeight: 18 },
  typeBadge: {
    backgroundColor: "#ffe8f0", paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: 6, alignSelf: "flex-start",
  },
  typeBadgeText: {
    fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 1.2, color: "#fe95b4",
  },
  itemPrice: { fontSize: 13, fontWeight: "700", color: "#fe95b4", marginBottom: 6 },
  itemBottomRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  label: { fontSize: 14, fontWeight: "600", color: "#4b2a36", marginTop: 12, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: "#e0e0e0", padding: 14, borderRadius: 10, fontSize: 15, backgroundColor: "#fafafa", color: "#333" },
  locationButton: { backgroundColor: "#fe95b4", padding: 14, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  locationButtonText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  orContainer: { flexDirection: "row", alignItems: "center", marginVertical: 20 },
  orLine: { flex: 1, height: 2, backgroundColor: "#d0d0d0" },
  orText: { marginHorizontal: 16, fontSize: 14, fontWeight: "700", color: "#999" },
  mapContainer: { marginBottom: 16 },
  map: { width: "100%", height: 200, borderRadius: 12 },
  mapHint: { fontSize: 11, color: "#999", textAlign: "center", marginTop: 6, marginBottom: 8 },
  mapFallback: { backgroundColor: "#e8f5e9", padding: 16, borderRadius: 12, alignItems: "center", marginBottom: 16 },
  mapFallbackText: { fontSize: 14, fontWeight: "700", color: "#2e7d32", marginBottom: 12 },
  confirmLocationButton: { backgroundColor: "#4caf50", paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, alignItems: "center" },
  confirmLocationText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  confirmedLocationContainer: { backgroundColor: "#e8f5e9", padding: 16, borderRadius: 12, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: "#4caf50" },
  confirmedLocationTitle: { fontSize: 15, fontWeight: "700", color: "#2e7d32", marginBottom: 8 },
  confirmedLocationText: { fontSize: 14, color: "#2e7d32", lineHeight: 20, marginBottom: 12 },
  changeLocationButton: { backgroundColor: "#fe95b4", paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, alignSelf: "flex-start" },
  changeLocationText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  manualEntryTitle: { fontSize: 15, fontWeight: "700", color: "#666", marginBottom: 12 },
  row: { flexDirection: "row" },
  paymentOptions: { flexDirection: "row", gap: 12 },
  paymentOption: { flex: 1, paddingVertical: 14, paddingHorizontal: 12, borderRadius: 10, backgroundColor: "#f5f5f5", alignItems: "center", borderWidth: 2, borderColor: "#e0e0e0" },
  paymentOptionActive: { backgroundColor: "#ffe8f5", borderColor: "#fe95b4" },
  paymentOptionText: { fontSize: 14, fontWeight: "600", color: "#666" },
  paymentOptionTextActive: { fontSize: 14, fontWeight: "700", color: "#fe95b4" },
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
});

export default CheckoutScreen;
