import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from "react-native";
import ScreenHeader from "../components/ScreenHeader";
import { useSelector } from "react-redux";
import { useNavigation } from "@react-navigation/native";
import { RootState } from "../store";
import { supabase } from "../lib/supabase";

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
    if (!user) { setLoading(false); return; }

    try {
      const { data } = await supabase
        .from("profiles")
        .select("account_holder_name, account_number, ifsc_code, upi_id")
        .eq("id", user.id)
        .single();

      if (data) {
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

    const hasAnyBankField = accountHolderName.trim() || accountNumber.trim() || ifscCode.trim();
    const hasUpi = upiId.trim();
    if (!hasAnyBankField && !hasUpi) {
      Alert.alert("Required", "Fill in bank account details or a UPI ID to continue.");
      return;
    }
    if (hasAnyBankField) {
      if (!accountHolderName.trim()) { Alert.alert("Required", "Enter account holder name."); return; }
      if (!accountNumber.trim()) { Alert.alert("Required", "Enter account number."); return; }
      if (!ifscCode.trim()) { Alert.alert("Required", "Enter IFSC code."); return; }
    }

    setSaving(true);
    try {
      const { error, count } = await supabase
        .from("profiles")
        .update({
          account_holder_name: accountHolderName.trim(),
          account_number: accountNumber.trim(),
          ifsc_code: ifscCode.trim().toUpperCase(),
          upi_id: upiId.trim(),
        })
        .eq("id", user.id)
        .select();

      if (error) {
        console.error("Bank details save error:", error);
        Alert.alert("Error", error.message || "Failed to save bank details");
        return;
      }

      Alert.alert("Saved!", "Your payment details have been saved.");
      navigation.goBack();
    } catch (err: any) {
      console.error("Bank details exception:", err);
      Alert.alert("Error", err.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fe95b4" />
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <ScreenHeader title="Bank Details" />
      <Text style={styles.subheader}>Add your bank details to receive payments from online orders</Text>
      <ScrollView contentContainerStyle={styles.container}>

      {/* Bank Account Section */}
      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>Bank Account</Text>

        <Text style={styles.label}>Account Holder Name <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={styles.input}
          value={accountHolderName}
          onChangeText={setAccountHolderName}
          placeholder="Enter name as per bank account"
          placeholderTextColor="#555"
        />

        <Text style={styles.label}>Account Number <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={styles.input}
          value={accountNumber}
          onChangeText={setAccountNumber}
          placeholder="Enter account number"
          placeholderTextColor="#555"
          keyboardType="numeric"
        />

        <Text style={styles.label}>IFSC Code <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={styles.input}
          value={ifscCode}
          onChangeText={setIfscCode}
          placeholder="e.g., SBIN0001234"
          placeholderTextColor="#555"
          autoCapitalize="characters"
        />
      </View>

      {/* Divider */}
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>OR</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* UPI Section */}
      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>UPI ID</Text>

        <Text style={styles.label}>UPI ID <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={styles.input}
          value={upiId}
          onChangeText={setUpiId}
          placeholder="yourname@paytm / yourname@phonepe"
          placeholderTextColor="#555"
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      {/* Save Button */}
      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.saveButtonText}>{saving ? "Saving..." : "Save & Continue"}</Text>
      </TouchableOpacity>

    </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: "#fff0ec" },
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff0ec",
  },
  subheader: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "#888",
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 20,
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f0a1a",
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4b2a36",
    marginTop: 12,
    marginBottom: 8,
  },
  required: { color: "#fe95b4", fontWeight: "700" },
  input: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    padding: 14,
    borderRadius: 10,
    fontSize: 15,
    backgroundColor: "#fafafa",
    color: "#333",
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
    backgroundColor: "#fe95b4",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#fe95b4",
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
});

export default BankDetailsScreen;

