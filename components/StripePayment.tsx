import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { CardField, useStripe } from "@stripe/stripe-react-native";

interface StripePaymentProps {
  amount: number;
  orderId: string;
  onSuccess: (paymentId: string) => void;
  onFailure: (error: string) => void;
}

const StripePayment: React.FC<StripePaymentProps> = ({
  amount,
  orderId,
  onSuccess,
  onFailure,
}) => {
  const { confirmPayment } = useStripe();
  const [processing, setProcessing] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);

  const handlePayment = async () => {
    if (!cardComplete) {
      onFailure("Please enter complete card details");
      return;
    }

    setProcessing(true);

    try {
      // In test mode, we'll simulate the payment
      // In production, you'd call your backend to create a payment intent
      
      // Simulate payment processing
      setTimeout(() => {
        // Generate mock payment ID
        const paymentId = `pi_${Date.now()}${Math.random().toString(36).substring(7)}`;
        setProcessing(false);
        onSuccess(paymentId);
      }, 2000);

    } catch (error: any) {
      setProcessing(false);
      onFailure(error.message || "Payment failed");
    }
  };

  return (
    <View style={styles.container}>
      {/* Amount Display */}
      <View style={styles.amountCard}>
        <Text style={styles.amountLabel}>Amount to Pay</Text>
        <Text style={styles.amountValue}>₹{amount.toFixed(2)}</Text>
        <Text style={styles.orderId}>Order ID: {orderId}</Text>
      </View>

      {/* Card Input */}
      <View style={styles.cardSection}>
        <Text style={styles.sectionTitle}>Card Details</Text>
        <CardField
          postalCodeEnabled={false}
          placeholders={{
            number: "4242 4242 4242 4242",
          }}
          cardStyle={styles.card}
          style={styles.cardField}
          onCardChange={(cardDetails) => {
            setCardComplete(cardDetails.complete);
          }}
        />
      </View>

      {/* Test Card Info */}
      <View style={styles.testInfo}>
        <Text style={styles.testInfoTitle}>💳 Test Cards (Stripe Test Mode)</Text>
        <Text style={styles.testInfoText}>• 4242 4242 4242 4242 - Success</Text>
        <Text style={styles.testInfoText}>• 4000 0025 0000 3155 - 3D Secure</Text>
        <Text style={styles.testInfoText}>• Any future date, any 3-digit CVC</Text>
      </View>

      {/* Security Notice */}
      <View style={styles.securityNotice}>
        <Text style={styles.securityIcon}>🔒</Text>
        <Text style={styles.securityText}>
          Secured by Stripe • PCI DSS Compliant
        </Text>
      </View>

      {/* Pay Button */}
      <TouchableOpacity
        style={[styles.payButton, (processing || !cardComplete) && styles.payButtonDisabled]}
        onPress={handlePayment}
        disabled={processing || !cardComplete}
      >
        {processing ? (
          <View style={styles.processingContainer}>
            <ActivityIndicator color="#fff" size="small" />
            <Text style={styles.payButtonText}>Processing...</Text>
          </View>
        ) : (
          <Text style={styles.payButtonText}>Pay ₹{amount.toFixed(2)}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  amountCard: {
    backgroundColor: "#ff1493",
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 24,
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
  cardSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f0a1a",
    marginBottom: 12,
  },
  cardField: {
    width: "100%",
    height: 50,
  },
  card: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
  },
  testInfo: {
    backgroundColor: "#e3f2fd",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  testInfoTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1565c0",
    marginBottom: 8,
  },
  testInfoText: {
    fontSize: 12,
    color: "#1976d2",
    marginBottom: 4,
  },
  securityNotice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e8f5e9",
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
    shadowOpacity: 0,
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
});

export default StripePayment;
