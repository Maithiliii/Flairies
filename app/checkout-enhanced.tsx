import React, { useState, useEffect, useRef } from "react";
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
  Animated,
} from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { useNavigation, useRoute } from "@react-navigation/native";
import { RootState } from "../store";
import { clearCart } from "../slices/cartSlice";
import { supabase } from "../lib/supabase";
import ScreenHeader from "../components/ScreenHeader";
import LocationPicker from "../components/LocationPicker";
import * as Location from "expo-location";
// @ts-ignore
import RazorpayCheckout from "react-native-razorpay";
// @ts-ignore
import { RAZORPAY_KEY_ID } from "@env";

const DELIVERY_FEE = 49;

const AddressSkeleton = () => {
  const opacity = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={{ opacity }}>
      <View style={skeletonStyles.bar} />
      <View style={[skeletonStyles.bar, { width: "70%", marginTop: 10 }]} />
      <View style={[skeletonStyles.bar, { width: "50%", marginTop: 10, marginBottom: 4 }]} />
    </Animated.View>
  );
};

const skeletonStyles = StyleSheet.create({
  bar: { height: 14, borderRadius: 7, backgroundColor: "#f0dde6", width: "100%" },
});
const FREE_DELIVERY_THRESHOLD = 500;
const DELIVERY_GST_RATE = 0.18;


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

  const [loading, setLoading] = useState(false);
  const payingRef = useRef(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const [confirmedAddress, setConfirmedAddress] = useState("");
  const [initialLocation, setInitialLocation] = useState<{ latitude: number; longitude: number } | undefined>(undefined);
  const [selectedLocation, setSelectedLocation] = useState<{ latitude: number; longitude: number; address?: any } | null>(null);
  const [addressLoading, setAddressLoading] = useState(true);

  useEffect(() => {
    if (user) fetchSavedAddress();
  }, [user?.id]);

  const fetchSavedAddress = async () => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("address, latitude, longitude")
        .eq("id", user!.id)
        .single();

      if (!data?.address) return;

      setConfirmedAddress(data.address);
      setLocationConfirmed(true);

      if (data.latitude && data.longitude) {
        setInitialLocation({ latitude: data.latitude, longitude: data.longitude });
        setSelectedLocation({ latitude: data.latitude, longitude: data.longitude });
      }
    } finally {
      setAddressLoading(false);
    }
  };

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

  const deliveryFee = total >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
  const deliveryGst = Math.round(deliveryFee * DELIVERY_GST_RATE);
  const grandTotal = total + deliveryFee + deliveryGst;

  const addressReady = locationConfirmed || (!!houseNo.trim() && !!street.trim() && !!city.trim() && !!addressState.trim() && !!pincode.trim());
  const canPay = !addressLoading && !!name.trim() && !!phone.trim() && addressReady;

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
      const loc = await Location.getCurrentPositionAsync({});
      setInitialLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      setShowMap(true);
    } catch {
      Alert.alert("Error", "Failed to get current location");
    } finally {
      setLocationLoading(false);
    }
  };

  const handleLocationSelect = (loc: { latitude: number; longitude: number; address?: any }) => {
    setSelectedLocation(loc);
    if (loc.address) {
      const addr = loc.address;
      setStreet(addr.street || "");
      setCity(addr.city || "");
      setAddressState(addr.region || "");
      setPincode(addr.postalCode || "");
      setLandmark(addr.subregion || "");
    }
  };

  const confirmLocation = () => {
    if (!selectedLocation) {
      Alert.alert("No location selected", "Please tap on the map to pin your location.");
      return;
    }
    const addr = selectedLocation.address || {};
    const fullAddress = [
      houseNo || addr.name,
      addr.street,
      addr.subregion,
      addr.city,
      addr.region,
      addr.postalCode,
    ].filter(Boolean).join(", ");
    // Use geocoded result; if pin wasn't moved (pre-filled from profile), fall back to saved address string
    setConfirmedAddress(fullAddress || confirmedAddress || "Location confirmed");
    setLocationConfirmed(true);
    setShowMap(false);
  };

  const handlePayment = async () => {
    if (payingRef.current) return;
    if (!user) { Alert.alert("Error", "Please login to continue"); return; }
    if (!name.trim() || !phone.trim()) { Alert.alert("Error", "Please fill name and phone"); return; }
    if (!locationConfirmed && (!houseNo || !street || !city || !addressState || !pincode)) {
      Alert.alert("Error", "Please confirm your location or fill all address fields");
      return;
    }
    if (items.length === 0) { Alert.alert("Error", "Your cart is empty"); return; }

    payingRef.current = true;
    setLoading(true);
    try {
      await processOnlinePayment(items);
    } catch (error: any) {
      Alert.alert("Payment Error", error?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
      payingRef.current = false;
    }
  };

  const verifyAndComplete = async (
    paymentData: any,
    cartId: string,
    orderMeta: { amount: number; itemCount: number }
  ) => {
    const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
      "verify-razorpay-payment",
      {
        body: {
          razorpay_payment_id: paymentData.razorpay_payment_id,
          razorpay_order_id: paymentData.razorpay_order_id,
          razorpay_signature: paymentData.razorpay_signature,
          cart_id: cartId,
        },
      }
    );
    if (verifyError || verifyData?.error) {
      Alert.alert(
        "Verification Issue",
        "Payment received but verification failed. Contact support with ref: " + cartId
      );
      return;
    }
    dispatch(clearCart());
    navigation.navigate("OrderSuccess" as never, {
      cartId,
      amount: orderMeta.amount,
      itemCount: orderMeta.itemCount,
    } as never);
  };

  const processOnlinePayment = async (cartItems: any[]) => {
    const { data, error } = await supabase.functions.invoke("create-razorpay-order", {
      body: {
        cart_items: cartItems.map((i) => ({ id: i.id, days: i.rent_days || 1 })),
        buyer_name: name,
        buyer_phone: phone,
        delivery_address: getFullAddress(),
        payment_method: "online",
        delivery_fee: deliveryFee,
        gst_amount: deliveryGst,
      },
    });

    if (error || data?.error) {
      const msg = data?.error || (error as any)?.message || "Failed to create order";
      console.error("[Checkout] Edge function error:", msg);
      Alert.alert("Error", msg);
      return;
    }

    console.log("[Checkout] Order created:", data?.razorpay_order_id, "amount_paise:", data?.amount_in_paise);

    const options = {
      description: `Flairies — ${data.item_count} item${data.item_count > 1 ? "s" : ""}`,
      currency: "INR",
      key: data.key_id || RAZORPAY_KEY_ID,
      amount: data.amount_in_paise,
      name: "Flairies",
      order_id: data.razorpay_order_id,
      prefill: { email: user!.email, contact: phone, name },
      theme: { color: "#fe95b4" },
    };

    const useNative = RazorpayCheckout && typeof RazorpayCheckout.open === "function";

    const orderMeta = { amount: data.amount, itemCount: data.item_count };

    if (useNative) {
      RazorpayCheckout.open(options)
        .then((paymentData: any) => verifyAndComplete(paymentData, data.cart_id, orderMeta))
        .catch((err: any) => Alert.alert("Payment Failed", err?.description || "Payment was cancelled"));
    } else {
      // Web: load Razorpay checkout.js and open modal
      await new Promise<void>((resolve, reject) => {
        const openRzp = () => {
          try {
            console.log("[Checkout] Opening Razorpay modal...");
            const rzp = new (window as any).Razorpay({
              ...options,
              handler: async (paymentData: any) => {
                try {
                  await verifyAndComplete(paymentData, data.cart_id, orderMeta);
                } catch (e: any) {
                  Alert.alert("Error", e.message || "Verification failed");
                }
                resolve();
              },
              modal: { ondismiss: () => resolve() },
            });
            rzp.open();
            console.log("[Checkout] Razorpay modal launched");
          } catch (e: any) {
            console.error("[Checkout] Razorpay constructor error:", e);
            reject(new Error("Payment gateway failed to open: " + (e?.message || "unknown error")));
          }
        };

        if ((window as any).Razorpay) {
          openRzp();
        } else {
          console.log("[Checkout] Loading checkout.js...");
          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.async = true;
          script.onload = () => { console.log("[Checkout] checkout.js loaded"); openRzp(); };
          script.onerror = () => reject(new Error("Could not load payment gateway. Check your internet connection."));
          document.head.appendChild(script);
        }
      });
    }
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
                  {item.listing_type !== "rent" && (item.size || item.condition) && (
                    <View style={styles.tagsRow}>
                      {item.size ? (
                        <View style={styles.tag}><Text style={styles.tagText}>{item.size}</Text></View>
                      ) : null}
                      {item.condition ? (
                        <View style={styles.tag}>
                          <Text style={styles.tagText}>
                            {{ new: "New", like_new: "Like New", good: "Good", used: "Used" }[item.condition as string] ?? item.condition}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  )}
                  <Text style={styles.itemPrice}>
                    {item.listing_type === "rent"
                      ? `₹${(parseFloat(item.rent_price || "0") * (item.rent_days || 1)).toFixed(0)} (₹${item.rent_price}/day × ${item.rent_days || 1}d)`
                      : `₹${item.price}`}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Contact Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Details</Text>
          <Text style={styles.label}>Full Name <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
            placeholderTextColor="#555"
          />
          <Text style={styles.label}>Phone Number <Text style={styles.required}>*</Text></Text>
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

          {addressLoading ? (
            <AddressSkeleton />
          ) : (
            <>
              {!showMap && !locationConfirmed && (
                <>
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

                  <View style={styles.orContainer}>
                    <View style={styles.orLine} />
                    <Text style={styles.orText}>OR</Text>
                    <View style={styles.orLine} />
                  </View>
                </>
              )}

              {showMap && (
                <View>
                  <View style={styles.mapContainer}>
                    <LocationPicker
                      initialLocation={initialLocation}
                      onLocationSelect={handleLocationSelect}
                    />
                  </View>
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
                    onPress={() => { setLocationConfirmed(false); setConfirmedAddress(""); setShowMap(false); setSelectedLocation(null); setInitialLocation(undefined); }}
                  >
                    <Text style={styles.changeLocationText}>Change Address</Text>
                  </TouchableOpacity>
                </View>
              )}

              {!locationConfirmed && !showMap && (
                <>
                  <Text style={styles.manualEntryTitle}>Enter Address Manually</Text>
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
            </>
          )}
        </View>

        {/* Price Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Price Breakdown</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Item Total</Text>
            <Text style={styles.priceValue}>₹{total.toFixed(0)}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Delivery Charges</Text>
            <Text style={deliveryFee === 0 ? styles.priceValueFree : styles.priceValue}>
              {deliveryFee === 0 ? "Free" : `₹${deliveryFee}`}
            </Text>
          </View>
          {deliveryGst > 0 && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>GST (18% on delivery)</Text>
              <Text style={styles.priceValue}>₹{deliveryGst}</Text>
            </View>
          )}
          <View style={styles.divider} />
          <View style={styles.priceRow}>
            <Text style={styles.totalLabel}>You Pay</Text>
            <Text style={styles.totalValue}>₹{grandTotal.toFixed(0)}</Text>
          </View>
          {total < FREE_DELIVERY_THRESHOLD && (
            <Text style={styles.note}>Add ₹{(FREE_DELIVERY_THRESHOLD - total).toFixed(0)} more for free delivery</Text>
          )}
        </View>

        <TouchableOpacity
          style={[styles.placeOrderButton, (!canPay || loading) && styles.placeOrderButtonDisabled]}
          onPress={handlePayment}
          disabled={!canPay || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.placeOrderText}>Pay Now</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

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
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 4, marginBottom: 4 },
  tag: { backgroundColor: "#fff0ec", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  tagText: { fontSize: 11, fontWeight: "600", color: "#b06080" },
  itemPrice: { fontSize: 13, fontWeight: "700", color: "#fe95b4", marginBottom: 4 },
  label: { fontSize: 14, fontWeight: "600", color: "#4b2a36", marginTop: 12, marginBottom: 8 },
  required: { color: "#e53935", fontWeight: "700" },
  input: { borderWidth: 1, borderColor: "#e0e0e0", padding: 14, borderRadius: 10, fontSize: 15, backgroundColor: "#fafafa", color: "#333" },
  locationButton: { backgroundColor: "#fe95b4", padding: 14, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  locationButtonText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  orContainer: { flexDirection: "row", alignItems: "center", marginVertical: 20 },
  orLine: { flex: 1, height: 2, backgroundColor: "#d0d0d0" },
  orText: { marginHorizontal: 16, fontSize: 14, fontWeight: "700", color: "#999" },
  mapContainer: { height: 300, borderRadius: 14, overflow: "hidden", marginBottom: 12 },
  confirmLocationButton: { backgroundColor: "#4caf50", paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, alignItems: "center" },
  confirmLocationText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  confirmedLocationContainer: { backgroundColor: "#e8f5e9", padding: 16, borderRadius: 12, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: "#4caf50" },
  confirmedLocationTitle: { fontSize: 15, fontWeight: "700", color: "#2e7d32", marginBottom: 8 },
  confirmedLocationText: { fontSize: 14, color: "#2e7d32", lineHeight: 20, marginBottom: 12 },
  changeLocationButton: { backgroundColor: "#4caf50", paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, alignSelf: "flex-start" },
  changeLocationText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  manualEntryTitle: { fontSize: 15, fontWeight: "700", color: "#666", marginBottom: 12 },
  row: { flexDirection: "row" },
  priceRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  priceLabel: { fontSize: 14, color: "#666" },
  priceValue: { fontSize: 14, fontWeight: "600", color: "#333" },
  priceValueFree: { fontSize: 14, fontWeight: "700", color: "#4caf50" },
  divider: { height: 1, backgroundColor: "#e0e0e0", marginVertical: 12 },
  totalLabel: { fontSize: 18, fontWeight: "700", color: "#1f0a1a" },
  totalValue: { fontSize: 18, fontWeight: "800", color: "#fe95b4" },
  note: { fontSize: 12, color: "#666", marginTop: 8, fontStyle: "italic" },
  placeOrderButton: { backgroundColor: "#fe95b4", paddingVertical: 16, borderRadius: 12, alignItems: "center", marginTop: 8, shadowColor: "#fe95b4", shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  placeOrderButtonDisabled: { backgroundColor: "#ccc", shadowOpacity: 0 },
  placeOrderText: { color: "#fff", fontSize: 18, fontWeight: "800" },
});

export default CheckoutScreen;
