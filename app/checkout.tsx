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
import { processRazorpayPayment } from "../components/RazorpayPayment";
import LocationPicker from "../components/LocationPicker";
import RadioButton from "../components/RadioButton";

const CheckoutScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const cartItems = useSelector((state: RootState) => state.cart.items);

  // Get item from route params (single item checkout) or use cart
  const { item: singleItem } = (route.params as any) || {};
  const items = singleItem ? [singleItem] : cartItems;

  const [name, setName] = useState(user?.username || "");
  const [phone, setPhone] = useState(user?.phone_number || "");
  const [address, setAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"online" | "cod">("online");
  const [loading, setLoading] = useState(false);
  const [platformSettings, setPlatformSettings] = useState<any>(null);
  const [showPaymentGateway, setShowPaymentGateway] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<string>("");
  const [useRazorpay, setUseRazorpay] = useState(true); // Toggle between Razorpay and Mock
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [addressMethod, setAddressMethod] = useState<"map" | "manual">("map"); // Track selected method
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
    address?: any;
  } | null>(null);

  useEffect(() => {
    fetchPlatformSettings();
    loadSavedAddress();
  }, []);

  const loadSavedAddress = async () => {
    // Load saved address from backend if user has one
    if (user?.email) {
      try {
        const response = await fetch(`${API_URL}/api/profile/address/?email=${user.email}`);
        if (response.ok) {
          const data = await response.json();
          if (data.address) {
            setAddress(data.address);
            if (data.latitude && data.longitude) {
              setSelectedLocation({
                latitude: data.latitude,
                longitude: data.longitude,
                address: null // Will be filled when location picker is used
              });
              setAddressMethod("map"); // Set to map method if location exists
            } else {
              setAddressMethod("manual"); // Set to manual if no coordinates
            }
          }
        }
      } catch (error) {
        console.error("Failed to load saved address:", error);
      }
    }
  };

  const handleLocationSelect = (location: {
    latitude: number;
    longitude: number;
    address?: any;
  }) => {
    setSelectedLocation(location);
    
    // Auto-fill address from the selected location
    if (location.address) {
      const addr = location.address;
      const fullAddress = `${addr.name ? addr.name + ", " : ""}${addr.street ? addr.street + ", " : ""}${addr.city ? addr.city + ", " : ""}${addr.region ? addr.region + " " : ""}${addr.postalCode ? "- " + addr.postalCode : ""}`;
      setAddress(fullAddress.trim());
    }
  };

  const openLocationPicker = () => {
    setShowLocationPicker(true);
  };

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
      // For now, we'll process one item at a time
      // In production, you'd handle multiple items in a single order
      const item = items[0];

      if (paymentMethod === "online") {
        // Razorpay Integration
        await processOnlinePayment(item);
      } else {
        // COD Order
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
      console.log('Checkout: Creating order for item:', item.id);
      
      // Create order in backend
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
      console.log('Checkout: Order response:', orderData);

      if (!orderResponse.ok) {
        throw new Error(orderData.error || "Failed to create order");
      }

      console.log('Checkout: Order created:', orderData.order_id);
      
      // Store order ID
      setCurrentOrderId(orderData.order_id);
      setLoading(false);
      
      if (useRazorpay) {
        // Use Real Razorpay
        processRazorpayPayment({
          amount: total,
          orderId: orderData.order_id,
          userEmail: user?.email || "",
          userName: name,
          userPhone: phone,
          onSuccess: handleRazorpaySuccess,
          onFailure: handleRazorpayFailure,
        });
      } else {
        // Use Mock Payment Gateway
        setShowPaymentGateway(true);
      }
      
    } catch (error: any) {
      console.error('Checkout: Error:', error);
      Alert.alert("Error", error.message || "Failed to process payment");
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async (paymentId: string) => {
    setShowPaymentGateway(false);
    
    // Update order with payment ID
    try {
      console.log('Updating payment status for order:', currentOrderId);
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
      console.log('Payment update response:', data);
      
      if (!response.ok) {
        console.error('Failed to update payment:', data);
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

  const handleRazorpaySuccess = async (paymentData: any) => {
    console.log("Razorpay Payment Success:", paymentData);
    
    // Update order with Razorpay payment details
    try {
      const response = await fetch(`${API_URL}/api/orders/update-payment/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: currentOrderId,
          payment_id: paymentData.paymentId,
          payment_status: "paid",
          razorpay_order_id: paymentData.orderId,
          razorpay_signature: paymentData.signature,
        }),
      });
      
      const data = await response.json();
      console.log('Razorpay payment update response:', data);
      
    } catch (error) {
      console.error("Failed to update Razorpay payment:", error);
    }
    
    Alert.alert("Payment Successful! 🎉", `Payment ID: ${paymentData.paymentId}\nYour order has been placed successfully.`, [
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

  const handleRazorpayFailure = (error: any) => {
    console.log("Razorpay Payment Failed:", error);
    
    if (error.code === "razorpay_unavailable") {
      // Razorpay not available, offer alternatives
      Alert.alert(
        "Payment Method Not Available",
        "Razorpay is not available in Expo Go. Please choose an alternative:",
        [
          {
            text: "Use Mock Payment",
            onPress: () => {
              setUseRazorpay(false);
              setShowPaymentGateway(true);
            },
          },
          {
            text: "Cash on Delivery",
            onPress: () => {
              setPaymentMethod("cod");
            },
          },
          { text: "Cancel" },
        ]
      );
    } else if (error.code === "payment_cancelled") {
      Alert.alert("Payment Cancelled", "You cancelled the payment. You can try again or choose COD.");
    } else {
      Alert.alert("Payment Failed", error.description || "Payment failed. Please try again.");
    }
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

  // Show location picker screen
  if (showLocationPicker) {
    return (
      <View style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setShowLocationPicker(false)}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select Delivery Location</Text>
        </View>
        <LocationPicker
          onLocationSelect={handleLocationSelect}
          initialLocation={selectedLocation}
        />
        <TouchableOpacity
          style={styles.doneButton}
          onPress={() => setShowLocationPicker(false)}
        >
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>
    );
  }

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
        
        {/* Address Method Selection */}
        <View style={styles.methodSelection}>
          <RadioButton
            selected={addressMethod === "map"}
            onPress={() => setAddressMethod("map")}
            title="Use Saved Location"
            subtitle={selectedLocation ? "Location confirmed" : "Select on map"}
            icon="📍"
          />
          
          <RadioButton
            selected={addressMethod === "manual"}
            onPress={() => setAddressMethod("manual")}
            title="Enter Address Manually"
            subtitle="Type or edit address"
            icon="✏️"
          />
        </View>

        {/* Map Location Section */}
        {addressMethod === "map" && (
          <View style={styles.mapSection}>
            <TouchableOpacity
              style={styles.locationButton}
              onPress={openLocationPicker}
            >
              <Text style={styles.locationIcon}>📍</Text>
              <Text style={styles.locationButtonText}>
                {selectedLocation ? "Change Location" : "Select Location on Map"}
              </Text>
            </TouchableOpacity>

            {/* Selected Location Display */}
            {selectedLocation && (
              <View style={styles.selectedLocationContainer}>
                <View style={styles.locationHeader}>
                  <Text style={styles.selectedLocationTitle}>📍 Location Confirmed</Text>
                  <TouchableOpacity 
                    style={styles.changeLocationButton}
                    onPress={openLocationPicker}
                  >
                    <Text style={styles.changeLocationText}>Change</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.selectedAddressText}>
                  {address}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Manual Address Entry */}
        {addressMethod === "manual" && (
          <View style={styles.manualSection}>
            <Text style={styles.manualEntryLabel}>Enter Complete Address</Text>
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
        )}

        {/* Confirm Section */}
        <View style={styles.confirmSection}>
          <Text style={styles.confirmNote}>
            {addressMethod === "map" 
              ? selectedLocation 
                ? "✓ Delivery location confirmed" 
                : "Please select your delivery location on the map"
              : address.trim() 
                ? "✓ Address entered" 
                : "Please enter your complete delivery address"
            }
          </Text>
        </View>
      </View>

      {/* Payment Method */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Method</Text>
        
        {/* Payment Method Selection with Radio Buttons */}
        <View style={styles.paymentMethodSelection}>
          <RadioButton
            selected={paymentMethod === "online"}
            onPress={() => setPaymentMethod("online")}
            title="Online Payment"
            subtitle="Cards, UPI, Net Banking, Wallets"
            icon="💳"
          />
          
          <RadioButton
            selected={paymentMethod === "cod"}
            onPress={() => setPaymentMethod("cod")}
            title="Cash on Delivery"
            subtitle="Pay when your order arrives"
            icon="💵"
          />
        </View>

        {/* Online Payment Options */}
        {paymentMethod === "online" && (
          <View style={styles.onlinePaymentSection}>
            <Text style={styles.onlinePaymentTitle}>Choose Payment Gateway</Text>
            
            <View style={styles.gatewaySelection}>
              <RadioButton
                selected={useRazorpay}
                onPress={() => setUseRazorpay(true)}
                title="Razorpay (Recommended)"
                subtitle="Cards • UPI • Net Banking • Wallets"
                icon="🏦"
              />
              
              <RadioButton
                selected={!useRazorpay}
                onPress={() => setUseRazorpay(false)}
                title="Mock Payment (Testing)"
                subtitle="For development testing only"
                icon="🧪"
              />
            </View>

            {/* Razorpay Payment Options Preview */}
            {useRazorpay && (
              <View style={styles.paymentOptionsPreview}>
                <Text style={styles.previewTitle}>Available Payment Methods:</Text>
                <View style={styles.paymentMethodsGrid}>
                  <View style={styles.paymentMethodItem}>
                    <Text style={styles.paymentMethodIcon}>💳</Text>
                    <Text style={styles.paymentMethodText}>Cards</Text>
                  </View>
                  <View style={styles.paymentMethodItem}>
                    <Text style={styles.paymentMethodIcon}>📱</Text>
                    <Text style={styles.paymentMethodText}>UPI</Text>
                  </View>
                  <View style={styles.paymentMethodItem}>
                    <Text style={styles.paymentMethodIcon}>🏦</Text>
                    <Text style={styles.paymentMethodText}>Net Banking</Text>
                  </View>
                  <View style={styles.paymentMethodItem}>
                    <Text style={styles.paymentMethodIcon}>💰</Text>
                    <Text style={styles.paymentMethodText}>Wallets</Text>
                  </View>
                </View>
                <Text style={styles.testModeNote}>
                  🧪 Test Mode: Use test cards or UPI IDs for safe testing
                </Text>
              </View>
            )}
          </View>
        )}
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
            Platform Fee ({paymentMethod === "cod" ? platformSettings?.cod_commission_rate : platformSettings?.commission_rate}%)
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
            Seller will receive ₹{sellerEarnings.toFixed(2)} after platform commission
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
  paymentToggle: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
  },
  toggleOptions: {
    flexDirection: "row",
    gap: 8,
  },
  toggleOption: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: "#fff",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  toggleOptionActive: {
    backgroundColor: "#e8f5e9",
    borderColor: "#4caf50",
  },
  toggleText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "600",
  },
  toggleTextActive: {
    fontSize: 12,
    color: "#2e7d32",
    fontWeight: "700",
  },
  locationButton: {
    flexDirection: "row",
    backgroundColor: "#ff1493",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#ff1493",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  locationIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  locationButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  selectedLocationContainer: {
    backgroundColor: "#e8f5e9",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  locationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  selectedLocationTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2e7d32",
  },
  changeLocationButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#ff1493",
    borderRadius: 6,
  },
  changeLocationText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  selectedAddressText: {
    fontSize: 14,
    color: "#2e7d32",
    lineHeight: 20,
  },
  orContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#e0e0e0",
  },
  orText: {
    marginHorizontal: 16,
    fontSize: 14,
    fontWeight: "600",
    color: "#999",
  },
  manualEntryLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4b2a36",
    marginBottom: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    paddingTop: 60,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: "#ff1493",
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f0a1a",
    marginLeft: 16,
  },
  doneButton: {
    backgroundColor: "#ff1493",
    margin: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#ff1493",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  doneButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  methodSelection: {
    marginBottom: 16,
  },
  mapSection: {
    marginBottom: 16,
  },
  manualSection: {
    marginBottom: 16,
  },
  confirmSection: {
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#ff1493",
  },
  confirmNote: {
    fontSize: 12,
    color: "#333",
    fontWeight: "500",
    textAlign: "center",
  },
  paymentMethodSelection: {
    marginBottom: 16,
  },
  onlinePaymentSection: {
    marginTop: 16,
    padding: 16,
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  onlinePaymentTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f0a1a",
    marginBottom: 12,
  },
  gatewaySelection: {
    marginBottom: 16,
  },
  paymentOptionsPreview: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  paymentMethodsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 12,
  },
  paymentMethodItem: {
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 8,
    minWidth: 70,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  paymentMethodIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  paymentMethodText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#666",
  },
  testModeNote: {
    fontSize: 11,
    color: "#666",
    fontStyle: "italic",
    textAlign: "center",
    backgroundColor: "#fff3cd",
    padding: 8,
    borderRadius: 6,
  },
});

export default CheckoutScreen;
