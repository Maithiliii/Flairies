import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Image,
} from "react-native";

interface PaymentGatewayProps {
  visible: boolean;
  amount: number;
  orderId: string;
  onSuccess: (paymentId: string) => void;
  onFailure: (error: string) => void;
  onClose: () => void;
}

const PaymentGateway: React.FC<PaymentGatewayProps> = ({
  visible,
  amount,
  orderId,
  onSuccess,
  onFailure,
  onClose,
}) => {
  const [cardNumber, setCardNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [processing, setProcessing] = useState(false);

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\s/g, "");
    const formatted = cleaned.match(/.{1,4}/g)?.join(" ") || cleaned;
    return formatted.substring(0, 19); // 16 digits + 3 spaces
  };

  const formatExpiryDate = (text: string) => {
    const cleaned = text.replace(/\D/g, "");
    if (cleaned.length >= 2) {
      return cleaned.substring(0, 2) + "/" + cleaned.substring(2, 4);
    }
    return cleaned;
  };

  const handlePayment = async () => {
    // Validate inputs
    if (!cardNumber || !expiryDate || !cvv || !cardHolder) {
      onFailure("Please fill all card details");
      return;
    }

    if (cardNumber.replace(/\s/g, "").length !== 16) {
      onFailure("Invalid card number");
      return;
    }

    if (cvv.length !== 3) {
      onFailure("Invalid CVV");
      return;
    }

    setProcessing(true);

    // Simulate payment processing (2-3 seconds)
    setTimeout(() => {
      // Generate a mock payment ID
      const paymentId = `PAY${Date.now()}${Math.random().toString(36).substring(7).toUpperCase()}`;
      
      setProcessing(false);
      onSuccess(paymentId);
      
      // Reset form
      setCardNumber("");
      setExpiryDate("");
      setCvv("");
      setCardHolder("");
    }, 2500);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Secure Payment</Text>
              <TouchableOpacity onPress={onClose} disabled={processing}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Amount Display */}
            <View style={styles.amountCard}>
              <Text style={styles.amountLabel}>Amount to Pay</Text>
              <Text style={styles.amountValue}>₹{amount.toFixed(2)}</Text>
              <Text style={styles.orderId}>Order ID: {orderId}</Text>
            </View>

            {/* Payment Method */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Payment Method</Text>
              <View style={styles.paymentMethodCard}>
                <Image
                  source={{ uri: "https://upload.wikimedia.org/wikipedia/commons/0/04/Visa.svg" }}
                  style={styles.cardLogo}
                  resizeMode="contain"
                />
                <Text style={styles.paymentMethodText}>Credit/Debit Card</Text>
              </View>
            </View>

            {/* Card Details Form */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Card Details</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Card Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="1234 5678 9012 3456"
                  keyboardType="numeric"
                  value={cardNumber}
                  onChangeText={(text) => setCardNumber(formatCardNumber(text))}
                  maxLength={19}
                  editable={!processing}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Cardholder Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="JOHN DOE"
                  value={cardHolder}
                  onChangeText={setCardHolder}
                  autoCapitalize="characters"
                  editable={!processing}
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 12 }]}>
                  <Text style={styles.inputLabel}>Expiry Date</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="MM/YY"
                    keyboardType="numeric"
                    value={expiryDate}
                    onChangeText={(text) => setExpiryDate(formatExpiryDate(text))}
                    maxLength={5}
                    editable={!processing}
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>CVV</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="123"
                    keyboardType="numeric"
                    value={cvv}
                    onChangeText={(text) => setCvv(text.replace(/\D/g, "").substring(0, 3))}
                    maxLength={3}
                    secureTextEntry
                    editable={!processing}
                  />
                </View>
              </View>
            </View>

            {/* Security Notice */}
            <View style={styles.securityNotice}>
              <Text style={styles.securityIcon}>🔒</Text>
              <Text style={styles.securityText}>
                Your payment is secured with 256-bit SSL encryption
              </Text>
            </View>

            {/* Pay Button */}
            <TouchableOpacity
              style={[styles.payButton, processing && styles.payButtonDisabled]}
              onPress={handlePayment}
              disabled={processing}
            >
              {processing ? (
                <View style={styles.processingContainer}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.payButtonText}>Processing Payment...</Text>
                </View>
              ) : (
                <Text style={styles.payButtonText}>Pay ₹{amount.toFixed(2)}</Text>
              )}
            </TouchableOpacity>

            {/* Demo Notice */}
            <View style={styles.demoNotice}>
              <Text style={styles.demoText}>
                💡 Demo Mode: Use any 16-digit card number for testing
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    paddingBottom: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f0a1a",
  },
  closeButton: {
    fontSize: 24,
    color: "#999",
    fontWeight: "700",
  },
  amountCard: {
    backgroundColor: "#ff1493",
    margin: 20,
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
  },
  amountLabel: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 8,
  },
  amountValue: {
    fontSize: 36,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 8,
  },
  orderId: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.7)",
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f0a1a",
    marginBottom: 12,
  },
  paymentMethodCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#ff1493",
  },
  cardLogo: {
    width: 40,
    height: 24,
    marginRight: 12,
  },
  paymentMethodText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  row: {
    flexDirection: "row",
  },
  securityNotice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e8f5e9",
    marginHorizontal: 20,
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  securityIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  securityText: {
    flex: 1,
    fontSize: 12,
    color: "#2e7d32",
    fontWeight: "600",
  },
  payButton: {
    backgroundColor: "#ff1493",
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#ff1493",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  payButtonDisabled: {
    backgroundColor: "#ccc",
  },
  processingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  payButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  demoNotice: {
    marginHorizontal: 20,
    marginTop: 16,
    padding: 12,
    backgroundColor: "#fff3cd",
    borderRadius: 12,
  },
  demoText: {
    fontSize: 12,
    color: "#856404",
    textAlign: "center",
  },
});

export default PaymentGateway;
