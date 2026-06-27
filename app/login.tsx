import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from "react-native";
import { useDispatch } from "react-redux";
import { setUser } from "../slices/authSlice";
import { setCart } from "../slices/cartSlice";
import { loadCartFromDb } from "../lib/cartSync";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AppDispatch } from "../store";
import type { AuthStackParamList } from "../types/navigation";
import { supabase } from "../lib/supabase";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const dispatch = useDispatch<AppDispatch>();

  const handleLogin = async () => {
    setErrorMsg("");

    if (!email || !password) {
      setErrorMsg("Email and password are required.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        if (error.message.toLowerCase().includes("email not confirmed")) {
          setErrorMsg("Please confirm your email before logging in, or ask your admin to disable email confirmation.");
        } else {
          setErrorMsg(error.message);
        }
        return;
      }

      if (data.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("name, phone_number, profile_picture_url, address")
          .eq("id", data.user.id)
          .single();

        const user = {
          id: data.user.id,
          email: data.user.email ?? email,
          name: profile?.name ?? "",
          phone_number: profile?.phone_number ?? "",
          profile_picture_url: profile?.profile_picture_url ?? null,
        };

        dispatch(setUser(user));

        // Restore cart from DB
        const savedCart = await loadCartFromDb(user.id);
        if (savedCart.length > 0) dispatch(setCart(savedCart));

        if (!profile?.address) {
          navigation.replace("AddressSetup", { user });
        } else {
          navigation.replace("Welcome", { user });
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Image source={require("../assets/images/Logo.png")} style={styles.logo} resizeMode="contain" />
      <Text style={styles.title}>Welcome Back</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#555"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#555"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

      <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleLogin} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Login</Text>}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate("Signup")}>
        <Text style={styles.switchText}>Don't have an account? Sign up</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff0ec", alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  logo: { width: 120, height: 120, marginBottom: 20 },
  title: { fontSize: 26, fontWeight: "600", marginBottom: 30, color: "#333" },
  input: { width: "90%", backgroundColor: "#fff", padding: 12, borderRadius: 10, marginBottom: 15 },
  errorText: { width: "90%", color: "#cc0000", fontSize: 13, marginBottom: 10, textAlign: "center" },
  button: { backgroundColor: "#fe95b4", padding: 14, borderRadius: 10, width: "90%", alignItems: "center", marginTop: 10 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  switchText: { marginTop: 15, color: "#333" },
});
