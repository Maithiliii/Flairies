import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from "react-native";
import { useSelector } from "react-redux";
import { useNavigation } from "@react-navigation/native";
import { RootState } from "../store";
import { API_URL } from "@env";

const BankDetailsScreen = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const navigation = useNavigation();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accountHolderName, setAccountHolderName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [upiId, setUpiId] = useState("");

  useEffect(() => {
    fetchBankDetails();
  }, []);

  const fetchBankDetails = async () => {
    if (!user) return;
    
    try {
      const response = await fetch(`${API_URL}/api/profile/bank-details/?email=${encodeURIComponent(user.email)}`);
      const data = await response.json();
      
      if (response.ok) {
        setAccountHolderName(data.account_holder_name || "");
        setAccountNumber(data.account_number || "");
        setIfscCode(data.ifsc_code || "");
        setUpiId(data.upi_id || "");
      }
    } catch (error) {
      console.error("Failed to fetch bank details:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/profile/bank-details/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          account_holder_name: accountHolderName,
          account_number: accountNumber,
          ifsc_code: ifscCode,
          upi_id: upiId,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert("Success", "Bank details saved successfully!", [
          {
            text: "OK",
            onPress: () => navigation.goBack(),
          },
        ]);
      } else {
        Alert.alert("Error", JSON.stringify(data));
      }
    } catch (error) {
      Alert.alert("Network Error", "Failed to save bank details");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff1493" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Bank Details</Text>
      <Text style={styles.subheader}>Add your bank details to receive payments from online orders</Text>

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Text style={styles.infoBannerIcon}>🔒</Text>
        <View style={styles.infoBannerContent}>
          <Text style={styles.infoBannerTitle}>Your details are safe</Text>
          <Text style={styles.infoBannerText}>We use bank-grade encryption to protect your information</Text>
        </View>
      </View>

      {/* Bank Account Section */}
      <View style={styles.formCard}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>🏦 Bank Account</Text>
          <Text style={styles.recommendedBadge}>Recommended</Text>
        </View>

        <Text style={styles.label}>Account Holder Name</Text>
        <TextInput
          style={styles.input}
          value={accountHolderName}
          onChangeText={setAccountHolderName}
          placeholder="Enter name as per bank account"
          placeholderTextColor="#999"
        />

        <Text style={styles.label}>Account Number</Text>
        <TextInput
          style={styles.input}
          value={accountNumber}
          onChangeText={setAccountNumber}
          placeholder="Enter account number"
          placeholderTextColor="#999"
          keyboardType="numeric"
        />

        <Text style={styles.label}>IFSC Code</Text>
        <TextInput
          style={styles.input}
          value={ifscCode}
          onChangeText={setIfscCode}
          placeholder="e.g., SBIN0001234"
          placeholderTextColor="#999"
          autoCapitalize="characters"
        />

        <Text style={styles.helperText}>
          💡 Find your IFSC code on your bank passbook or cheque
        </Text>
      </View>

      {/* Divider */}
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>OR</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* UPI Section */}
      <View style={styles.formCard}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>⚡ UPI ID</Text>
          <Text style={styles.fastBadge}>Instant</Text>
        </View>

        <Text style={styles.label}>UPI ID</Text>
        <TextInput
          style={styles.input}
          value={upiId}
          onChangeText={setUpiId}
          placeholder="yourname@paytm / yourname@phonepe"
          placeholderTextColor="#999"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.helperText}>
          💡 Payments will be transferred instantly to your UPI ID
        </Text>
      </View>

      {/* Save Button */}
      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.saveButtonText}>{saving ? "Saving..." : "Save & Continue"}</Text>
      </TouchableOpacity>

      {/* Test Mode Note */}
      <View style={styles.testModeNote}>
        <Text style={styles.testModeText}>
          🧪 Test Mode: You can enter any values for testing. In production, these would be verified by Razorpay.
        </Text>
      </View>
    </ScrollView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
  header: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1f0a1a",
    marginBottom: 8,
  },
  subheader: {
    fontSize: 15,
    color: "#666",
    marginBottom: 20,
    lineHeight: 22,
  },
  infoBanner: {
    flexDirection: "row",
    backgroundColor: "#e8f5e9",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#4caf50",
  },
  infoBannerIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  infoBannerContent: {
    flex: 1,
  },
  infoBannerTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#2e7d32",
    marginBottom: 4,
  },
  infoBannerText: {
    fontSize: 13,
    color: "#558b2f",
    lineHeight: 18,
  },
  formCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f0a1a",
  },
  recommendedBadge: {
    backgroundColor: "#e3f2fd",
    color: "#1976d2",
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  fastBadge: {
    backgroundColor: "#fff3e0",
    color: "#f57c00",
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
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
  helperText: {
    fontSize: 12,
    color: "#666",
    marginTop: 8,
    lineHeight: 18,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#e0e0e0",
  },
  dividerText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#999",
    marginHorizontal: 16,
  },
  saveButton: {
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
  saveButtonDisabled: {
    backgroundColor: "#ccc",
    shadowOpacity: 0,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
  testModeNote: {
    backgroundColor: "#fff9e6",
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#ffb347",
  },
  testModeText: {
    fontSize: 13,
    color: "#8b5a00",
    lineHeight: 20,
  },
});

export default BankDetailsScreen;
