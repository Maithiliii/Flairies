import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image } from "react-native";
import { useDispatch } from "react-redux";
import { setUser } from "../slices/authSlice";
import { API_URL } from "@env";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AppDispatch } from "../store";
import type { User } from "../slices/authSlice";
import type { AuthStackParamList } from "../types/navigation";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const dispatch = useDispatch<AppDispatch>();

  const handleLogin = async () => {
    try {
      const res = await fetch(`${API_URL}/api/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data: User = await res.json();

      if (res.ok) {
        dispatch(setUser(data));
        navigation.replace("Welcome", { user: data });
      } else {
        Alert.alert("Error", JSON.stringify(data));
      }
    } catch {
      Alert.alert("Network Error", "Something went wrong");
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
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#555"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate("Signup")}>
        <Text style={styles.switchText}>Don't have an account? Sign up</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffd6e7", alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  logo: { width: 120, height: 120, marginBottom: 20 },
  title: { fontSize: 26, fontWeight: "600", marginBottom: 30, color: "#333" },
  input: { width: "90%", backgroundColor: "#fff", padding: 12, borderRadius: 10, marginBottom: 15 },
  button: { backgroundColor: "#ff66b3", padding: 14, borderRadius: 10, width: "90%", alignItems: "center", marginTop: 10 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  switchText: { marginTop: 15, color: "#333" },
});
