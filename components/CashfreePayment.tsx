import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { WebView } from "react-native-webview";

interface CashfreePaymentProps {
  visible: boolean;
  amount: number;
  orderId: string;
  onSuccess: (paymentId: string) => void;
  onFailure: (error: string) => void;
  onClose: () => void;
}

const CashfreePayment: React.FC<CashfreePaymentProps> = ({
  visible,
  amount,
  orderId,
  onSuccess,
  onFailure,
  onClose,
}) => {
  const [loading, setLoading] = useState(true);
  const [paymentUrl, setPaymentUrl] = useState<string>("");

  // In production, you'll get this URL from your backend
  // For now, we'll simulate it
  const getPaymentUrl = () => {
    // This would be your backend endpoint that creates Cashfree order
    // and returns the payment URL
    return `https://sandbox.cashfree.com/pg/orders/${orderId}`;
  };

  const handleWebViewNavigationStateChange = (navState: any) => {
    const { url } = navState;

    // Check if payment is successful
    if (url.includes("payment-success") || url.includes("success")) {
      const paymentId = `CF${Date.now()}${Math.random().toString(36).substring(7).toUpperCase()}`;
      onSuccess(paymentId);
    }

    // Check if payment failed
    if (url.includes("payment-failed") || url.includes("failure")) {
      onFailure("Payment was cancelled or failed");
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Complete Payment</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Amount Display */}
          <View style={styles.amountCard}>
            <Text style={styles.amountLabel}>Amount to Pay</Text>
            <Text style={styles.amountValue}>₹{amount.toFixed(2)}</Text>
            <Text style={styles.orderId}>Order ID: {orderId}</Text>
          </View>

          {/* Payment Info */}
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>💳 Cashfree Payment</Text>
            <Text style={styles.infoText}>
              • Pay with UPI, Cards, Wallets, Net Banking
            </Text>
            <Text style={styles.infoText}>• Secure payment gateway</Text>
            <Text style={styles.infoText}>• Instant confirmation</Text>
          </View>

          {/* Test Mode Notice */}
          <View style={styles.testNotice}>
            <Text style={styles.testTitle}>🧪 Test Mode</Text>
            <Text style={styles.testText}>
              In production, this will open Cashfree payment page
            </Text>
            <Text style={styles.testText}>
              For now, click "Simulate Payment" to test
            </Text>
          </View>

          {/* Simulate Payment Button (for testing) */}
          <TouchableOpacity
            style={styles.payButton}
            onPress={() => {
              // Simulate successful payment
              setTimeout(() => {
                const paymentId = `CF${Date.now()}${Math.random().toString(36).substring(7).toUpperCase()}`;
                onSuccess(paymentId);
              }, 1500);
            }}
          >
            <Text style={styles.payButtonText}>Simulate Payment (Test)</Text>
          </TouchableOpacity>

          {/* Production Note */}
          <View style={styles.productionNote}>
            <Text style={styles.productionText}>
              📝 To enable real payments:
            </Text>
            <Text style={styles.productionText}>
              1. Sign up at cashfree.com
            </Text>
            <Text style={styles.productionText}>
              2. Get API keys
            </Text>
            <Text style={styles.productionText}>
              3. Add to backend
            </Text>
            <Text style={styles.productionText}>
              4. This will show real Cashfree checkout
            </Text>
          </View>

          {/* WebView for production (hidden in test mode) */}
          {paymentUrl && (
            <WebView
              source={{ uri: paymentUrl }}
              onNavigationStateChange={handleWebViewNavigationStateChange}
              onLoadStart={() => setLoading(true)}
              onLoadEnd={() => setLoading(false)}
              style={styles.webview}
            />
          )}

          {loading && paymentUrl && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#ff1493" />
              <Text style={styles.loadingText}>Loading payment page...</Text>
            </View>
          )}
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
  infoCard: {
    backgroundColor: "#f0f8ff",
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1565c0",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: "#1976d2",
    marginBottom: 4,
  },
  testNotice: {
    backgroundColor: "#fff3cd",
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  testTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#856404",
    marginBottom: 8,
  },
  testText: {
    fontSize: 12,
    color: "#856404",
    marginBottom: 4,
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
    marginBottom: 16,
  },
  payButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  productionNote: {
    backgroundColor: "#e8f5e9",
    marginHorizontal: 20,
    padding: 12,
    borderRadius: 12,
  },
  productionText: {
    fontSize: 11,
    color: "#2e7d32",
    marginBottom: 3,
  },
  webview: {
    flex: 1,
    marginTop: 20,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666",
  },
});

export default CashfreePayment;
