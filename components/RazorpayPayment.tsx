import React from "react";
import { Alert } from "react-native";
import { RAZORPAY_KEY_ID } from "@env";

// Conditionally import Razorpay
let RazorpayCheckout: any = null;

try {
  RazorpayCheckout = require("react-native-razorpay").default;
} catch (e) {
  console.log("Razorpay not available, using fallback");
}

interface RazorpayPaymentProps {
  amount: number; // Amount in rupees (e.g., 100 for ₹100)
  orderId: string;
  userEmail: string;
  userName: string;
  userPhone: string;
  onSuccess: (paymentData: any) => void;
  onFailure: (error: any) => void;
}

export const processRazorpayPayment = ({
  amount,
  orderId,
  userEmail,
  userName,
  userPhone,
  onSuccess,
  onFailure,
}: RazorpayPaymentProps) => {
  
  // Check if Razorpay is available
  if (!RazorpayCheckout) {
    Alert.alert(
      "Payment Not Available",
      "Razorpay is not available in Expo Go. Please use development build or try COD.",
      [
        { text: "Use COD", onPress: () => onFailure({ code: "razorpay_unavailable" }) },
        { text: "OK" }
      ]
    );
    return;
  }

  const options = {
    description: `Payment for Order ${orderId}`,
    image: "https://your-app-logo-url.com/logo.png", // Replace with your app logo
    currency: "INR",
    key: RAZORPAY_KEY_ID, // Your Razorpay Test Key ID from .env
    amount: amount * 100, // Razorpay expects amount in paise (₹100 = 10000 paise)
    name: "Flairies",
    order_id: orderId, // Optional: Use if you create order on backend
    prefill: {
      email: userEmail,
      contact: userPhone,
      name: userName,
    },
    theme: {
      color: "#ff1493", // Your app's primary color
    },
    modal: {
      ondismiss: () => {
        onFailure({ code: "payment_cancelled", description: "Payment was cancelled" });
      },
    },
  };

  RazorpayCheckout.open(options)
    .then((data: any) => {
      // Payment Success
      console.log("Razorpay Success:", data);
      onSuccess({
        paymentId: data.razorpay_payment_id,
        orderId: data.razorpay_order_id,
        signature: data.razorpay_signature,
      });
    })
    .catch((error: any) => {
      // Payment Failed
      console.log("Razorpay Error:", error);
      onFailure(error);
    });
};

// Razorpay Test Card Details for Testing
export const RAZORPAY_TEST_CARDS = {
  success: {
    number: "4111111111111111",
    expiry: "12/25",
    cvv: "123",
    name: "Test User",
  },
  failure: {
    number: "4000000000000002",
    expiry: "12/25", 
    cvv: "123",
    name: "Test User",
  },
};

// UPI Test IDs for Testing
export const RAZORPAY_TEST_UPI = {
  success: "success@razorpay",
  failure: "failure@razorpay",
};

export default { processRazorpayPayment, RAZORPAY_TEST_CARDS, RAZORPAY_TEST_UPI };