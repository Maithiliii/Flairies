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
import PaymentGateway from "../components/PaymentGateway";
import * as Location from "expo-location";

// Conditionally import MapView
let MapView: any = null;
let Marker: any = null;
let PROVIDER_GOOGLE: any = null;

try {
  const Maps = require("react-native-maps");
  MapView = Maps.default;
  Marker = Maps.Marker;
  PROVIDER_GOOGLE = Maps.PROVIDER_GOOGLE;
} catch (e) {
  console.log("Maps not available");
}

const CheckoutScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const cartItems = useSelector((state: RootState) => state.cart.items);

  const { item: singleItem } = (route.params as any) || {};
  const items = singleItem ? [singleItem] : cartItems;

  const [name, setName] = useState(user?.username || "");
  const [phone, setPhone] = useState(user?.phone_number || "");
  
  // Address fields
  const [houseNo, setHouseNo] = useState("");
  const [street, setStreet] = useState("");
  const [landmark, setLandmark] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  
  const [paymentMethod, setPaymentMethod] = useState<"online" | "cod">("online");
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [platformSettings, setPlatformSettings] = useState<any>(null);
  const [showPaymentGateway, setShowPaymentGateway] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<string>("");
  const [showMap, setShowMap] = useState(false);
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const [confirmedAddress, setConfirmedAddress] = useState("");

  // Map state
  const [region, setRegion] = useState({
    latitude: 19.076,
    longitude: 72.8777,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const [markerPosition, setMarkerPosition] = useState({
    latitude: 19.076,
    longitude: 72.8777,
  });

  useEffect(() => {
    fetchPlatformSettings();
    fetchSavedAddress();
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

  const fetchSavedAddress = async () => {
    if (!user?.email) return;
    
    try {
      const response = await fetch(`${API_URL}/api/profile/address/?email=${user.email}`);
      if (response.ok) {
        const data = await response.json();
        if (data.address) {
          // Set as confirmed address if it exists
          setConfirmedAddress(data.address);
          setLocationConfirmed(true);
          
          // Also parse into individual fields for editing if needed
          const parts = data.address.split(", ");
          if (parts.length >= 4) {
            setHouseNo(parts[0] || "");
            setStreet(parts[1] || "");
            const cityState = parts[parts.length - 1].split(" - ");
            setPincode(cityState[1] || "");
            setState(cityState[0] || "");
            setCity(parts[parts.length - 2] || "");
            if (parts.length > 4) {
              setLandmark(parts[2] || "");
            }
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch saved address:", error);
    }
  };

  const getCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location permission is required");
        setLocationLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      setRegion({
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      setMarkerPosition({ latitude, longitude });

      // Reverse geocode
      const addresses = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (addresses.length > 0) {
        const addr = addresses[0];
        setStreet(addr.street || "");
        setCity(addr.city || "");
        setState(addr.region || "");
        setPincode(addr.postalCode || "");
        setLandmark(addr.subregion || "");
      }

      setShowMap(true);
    } catch (error) {
      console.error("Error getting location:", error);
      Alert.alert("Error", "Failed to get current location");
    } finally {
      setLocationLoading(false);
    }
  };

  const handleMapPress = async (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setMarkerPosition({ latitude, longitude });
    
    // Reverse geocode the new position
    try {
      const addresses = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (addresses.length > 0) {
        const addr = addresses[0];
        setStreet(addr.street || "");
        setCity(addr.city || "");
        setState(addr.region || "");
        setPincode(addr.postalCode || "");
        setLandmark(addr.subregion || "");
      }
    } catch (error) {
      console.error("Error reverse geocoding:", error);
    }
  };

  const confirmLocation = async () => {
    try {
      // Get the full address from Google Maps
      const addresses = await Location.reverseGeocodeAsync({
        latitude: markerPosition.latitude,
        longitude: markerPosition.longitude,
      });

      if (addresses.length > 0) {
        const addr = addresses[0];
        const fullAddress = [
          houseNo || "Building",
          addr.street,
          addr.subregion,
          addr.city,
          addr.region,
          addr.postalCode
        ].filter(Boolean).join(", ");

        setConfirmedAddress(fullAddress);
        setLocationConfirmed(true);

        // Save to database
        if (user?.email) {
          try {
            await fetch(`${API_URL}/api/profile/address/`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: user.email,
                address: fullAddress,
                latitude: markerPosition.latitude,
                longitude: markerPosition.longitude,
              }),
            });
          } catch (error) {
            console.error("Failed to save address:", error);
          }
        }

        Alert.alert(
          "Location Confirmed!",
          "Your delivery address has been set from your current location.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.error("Error confirming location:", error);
      Alert.alert("Error", "Failed to confirm location. Please try again.");
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

  const getFullAddress = () => {
    if (locationConfirmed && confirmedAddress) {
      return confirmedAddress;
    }
    return `${houseNo}, ${street}, ${landmark ? landmark + ", " : ""}${city}, ${state} - ${pincode}`;
  };

  const handlePayment = async () => {
    if (!user) {
      Alert.alert("Error", "Please login to continue");
      return;
    }

    if (!name.trim() || !phone.trim()) {
      Alert.alert("Error", "Please fill name and phone");
      return;
    }

    if (!locationConfirmed && (!houseNo || !street || !city || !state || !pincode)) {
      Alert.alert("Error", "Please confirm your location or fill all address fields");
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
          delivery_address: getFullAddress(),
        }),
      });

      const orderData = await orderResponse.json();

      if (!orderResponse.ok) {
        throw new Error(orderData.error || "Failed to create order");
      }

      setCurrentOrderId(orderData.order_id);
      setLoading(false);
      setShowPaymentGateway(true);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to process payment");
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async (paymentId: string) => {
    setShowPaymentGateway(false);

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
    setShowPaymentGateway(false);
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
          delivery_address: getFullAddress(),
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
                  ₹{item.listing_type === "rent" ? item.rent_price : item.price}
                </Text>
              </View>
            </View>
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
        </View>

        {/* Delivery Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Address</Text>

          {/* Location Button */}
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

          {/* OR Divider */}
          {!showMap && (
            <View style={styles.orContainer}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>OR</Text>
              <View style={styles.orLine} />
            </View>
          )}

          {/* Map View */}
          {showMap && MapView && (
            <View style={styles.mapContainer}>
              <MapView
                provider={PROVIDER_GOOGLE}
                style={styles.map}
                region={region}
                onPress={handleMapPress}
              >
                <Marker
                  coordinate={markerPosition}
                  draggable
                  onDragEnd={handleMapPress}
                />
              </MapView>
              <Text style={styles.mapHint}>Tap or drag pin to adjust location</Text>
              
              {/* Confirm Location Button */}
              <TouchableOpacity
                style={styles.confirmLocationButton}
                onPress={confirmLocation}
              >
                <Text style={styles.confirmLocationText}>✓ Confirm This Location</Text>
              </TouchableOpacity>
            </View>
          )}

          {showMap && !MapView && (
            <View style={styles.mapFallback}>
              <Text style={styles.mapFallbackText}>Location detected</Text>
              <Text style={styles.mapFallbackSubtext}>
                Lat: {markerPosition.latitude.toFixed(4)}, Lng: {markerPosition.longitude.toFixed(4)}
              </Text>
              
              {/* Confirm Location Button for Fallback */}
              <TouchableOpacity
                style={styles.confirmLocationButton}
                onPress={confirmLocation}
              >
                <Text style={styles.confirmLocationText}>✓ Confirm This Location</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Location Confirmed Display */}
          {locationConfirmed && (
            <View style={styles.confirmedLocationContainer}>
              <Text style={styles.confirmedLocationTitle}>
                {confirmedAddress.includes("Building") ? "Current Location" : "✓ Saved Address"}
              </Text>
              <Text style={styles.confirmedLocationText}>{confirmedAddress}</Text>
              <TouchableOpacity
                style={styles.changeLocationButton}
                onPress={() => {
                  setLocationConfirmed(false);
                  setConfirmedAddress("");
                  setShowMap(false);
                }}
              >
                <Text style={styles.changeLocationText}>Use Different Address</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Manual Entry Section */}
          {!showMap && !locationConfirmed && (
            <Text style={styles.manualEntryTitle}>Enter Address Manually</Text>
          )}
          
          {/* Address Fields - Only show if location not confirmed */}
          {!locationConfirmed && (
            <>
              <Text style={styles.label}>House/Flat No. *</Text>
          <TextInput
            style={styles.input}
            value={houseNo}
            onChangeText={setHouseNo}
            placeholder="Enter house/flat number"
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>Street/Area *</Text>
          <TextInput
            style={styles.input}
            value={street}
            onChangeText={setStreet}
            placeholder="Enter street/area"
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>Landmark (Optional)</Text>
          <TextInput
            style={styles.input}
            value={landmark}
            onChangeText={setLandmark}
            placeholder="Enter landmark"
            placeholderTextColor="#999"
          />

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.label}>City *</Text>
              <TextInput
                style={styles.input}
                value={city}
                onChangeText={setCity}
                placeholder="City"
                placeholderTextColor="#999"
              />
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.label}>State *</Text>
              <TextInput
                style={styles.input}
                value={state}
                onChangeText={setState}
                placeholder="State"
                placeholderTextColor="#999"
              />
            </View>
          </View>

              <Text style={styles.label}>Pincode *</Text>
              <TextInput
                style={styles.input}
                value={pincode}
                onChangeText={setPincode}
                placeholder="Enter pincode"
                placeholderTextColor="#999"
                keyboardType="numeric"
                maxLength={6}
              />
            </>
          )}
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
                💳 Online Payment
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
          {paymentMethod === "cod" && (
            <Text style={styles.note}>
              ✓ No commission on COD orders.
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
              {paymentMethod === "online" ? "Pay Now" : "Place Order"}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Payment Gateway Modal */}
      <PaymentGateway
        visible={showPaymentGateway}
        amount={total}
        orderId={currentOrderId}
        onSuccess={handlePaymentSuccess}
        onFailure={handlePaymentFailure}
        onClose={() => setShowPaymentGateway(false)}
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
  locationButton: {
    flexDirection: "row",
    backgroundColor: "#ff1493",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },

  locationButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  mapContainer: {
    marginBottom: 16,
  },
  map: {
    width: "100%",
    height: 200,
    borderRadius: 12,
  },
  mapHint: {
    fontSize: 11,
    color: "#999",
    textAlign: "center",
    marginTop: 6,
  },
  mapFallback: {
    backgroundColor: "#e8f5e9",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 16,
  },
  mapFallbackText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2e7d32",
    marginBottom: 4,
  },
  mapFallbackSubtext: {
    fontSize: 11,
    color: "#4caf50",
  },
  row: {
    flexDirection: "row",
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
  orContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  orLine: {
    flex: 1,
    height: 2,
    backgroundColor: "#d0d0d0",
  },
  orText: {
    marginHorizontal: 20,
    fontSize: 16,
    fontWeight: "700",
    color: "#666",
    backgroundColor: "#f8f9fa",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  manualEntryTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#666",
    marginBottom: 12,
    marginTop: 4,
  },
  confirmLocationButton: {
    backgroundColor: "#4caf50",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 12,
  },
  confirmLocationText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  confirmedLocationContainer: {
    backgroundColor: "#e8f5e9",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#4caf50",
  },
  confirmedLocationTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2e7d32",
    marginBottom: 8,
  },
  confirmedLocationText: {
    fontSize: 14,
    color: "#2e7d32",
    lineHeight: 20,
    marginBottom: 12,
  },
  changeLocationButton: {
    backgroundColor: "#ff1493",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  changeLocationText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
});

export default CheckoutScreen;
