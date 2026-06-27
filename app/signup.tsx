import React, { useState } from "react";
import { View, TextInput, TouchableOpacity, StyleSheet, Image, Text, ActivityIndicator } from "react-native";
import BackButton from "../components/BackButton";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "../types/navigation";
import { supabase } from "../lib/supabase";
import CountryPicker, { DEFAULT_COUNTRY, type Country } from "../components/CountryPicker";

type Props = NativeStackScreenProps<AuthStackParamList, "Signup">;

export default function SignupScreen({ navigation }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [number, setNumber] = useState("");
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  const handleSignup = async () => {
    setErrorMsg("");

    if (!name || !email || !password) {
      setErrorMsg("Full name, email and password are required.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }

    const fullPhone = number ? `${country.dialCode}${number}` : "";
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, phone_number: fullPhone },
        },
      });

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      if (data.user) {
        // Always save the profile row immediately (no RLS blocking this yet)
        await supabase.from("profiles").upsert({
          id: data.user.id,
          email: data.user.email ?? email,
          name,
          phone_number: fullPhone || null,
        });

        if (!data.session) {
          // Email confirmation is required — stay on this page and prompt user
          setEmailSent(true);
        } else {
          // Email confirmation is disabled — go straight to address setup
          navigation.replace("AddressSetup", {
            user: {
              id: data.user.id,
              email: data.user.email ?? email,
              name,
              phone_number: fullPhone,
              profile_picture_url: null,
            },
          });
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <View style={styles.container}>
        <Image source={require("../assets/images/Logo.png")} style={styles.logo} resizeMode="contain" />
        <View style={styles.confirmBox}>
          <Text style={styles.confirmTitle}>Check your email</Text>
          <Text style={styles.confirmMsg}>
            We sent a confirmation link to{"\n"}
            <Text style={styles.confirmEmail}>{email}</Text>
            {"\n\n"}Click the link in that email to activate your account — it will open a new tab where you can log in directly.
          </Text>
        </View>
        <TouchableOpacity style={styles.button} onPress={() => navigation.replace("Login")}>
          <Text style={styles.buttonText}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <BackButton />
      <Image source={require("../assets/images/Logo.png")} style={styles.logo} resizeMode="contain" />

      <TextInput style={styles.input} placeholder="Full Name" placeholderTextColor="#555" value={name} onChangeText={setName} />
      <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#555" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />

      <View style={styles.phoneRow}>
        <CountryPicker selected={country} onSelect={setCountry} />
        <View style={styles.phoneDivider} />
        <TextInput
          style={styles.phoneInput}
          placeholder="Phone Number"
          placeholderTextColor="#555"
          value={number}
          onChangeText={setNumber}
          keyboardType="phone-pad"
        />
      </View>

      <TextInput style={styles.input} placeholder="Password (min 6 characters)" placeholderTextColor="#555" value={password} onChangeText={setPassword} secureTextEntry />
      <TextInput style={styles.input} placeholder="Confirm Password" placeholderTextColor="#555" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />

      {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

      <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleSignup} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign Up</Text>}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate("Login")}>
        <Text style={styles.switchText}>Already have an account? Log in</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff0ec", alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  logo: { width: 150, height: 150, marginBottom: 30 },
  input: { width: "90%", backgroundColor: "#fff", padding: 12, borderRadius: 10, marginBottom: 15 },
  phoneRow: {
    width: "90%",
    backgroundColor: "#fff",
    borderRadius: 10,
    marginBottom: 15,
    flexDirection: "row",
    alignItems: "center",
  },
  phoneDivider: { width: 1, height: 24, backgroundColor: "#ddd" },
  phoneInput: { flex: 1, padding: 12, fontSize: 15, color: "#333" },
  errorText: { width: "90%", color: "#cc0000", fontSize: 13, marginBottom: 10, textAlign: "center" },
  button: { backgroundColor: "#fe95b4", padding: 14, borderRadius: 10, width: "90%", alignItems: "center", marginTop: 10 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  switchText: { marginTop: 15, color: "#333" },
  confirmBox: {
    width: "90%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    marginBottom: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  confirmTitle: { fontSize: 20, fontWeight: "700", color: "#1e0a16", marginBottom: 14, textAlign: "center" },
  confirmMsg: { fontSize: 14, color: "#555", lineHeight: 22, textAlign: "center" },
  confirmEmail: { fontWeight: "700", color: "#fe95b4" },
});
