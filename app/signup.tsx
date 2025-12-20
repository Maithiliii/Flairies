import React, { useState } from "react";
import { View, TextInput, TouchableOpacity, StyleSheet, Alert, Image, Text } from "react-native";
import { useDispatch } from "react-redux";
import { setUser } from "../slices/authSlice";
import { API_URL } from "@env";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AppDispatch } from "../store";
import type { User } from "../slices/authSlice";
import type { AuthStackParamList } from "../types/navigation";

type Props = NativeStackScreenProps<AuthStackParamList, "Signup">;

export default function SignupScreen({ navigation }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [number, setNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const dispatch = useDispatch<AppDispatch>();

  const handleSignup = async () => {
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/signup/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: name,
          email,
          phone_number: number,
          password,
          password2: confirmPassword,
        }),
      });

      const data: User = await res.json();

      if (res.ok) {
        dispatch(setUser(data));
        navigation.replace("AddressSetup", { user: data });
      } else {
        // Handle specific error messages
        let errorMessage = "Something went wrong";
        
        if (data.email && Array.isArray(data.email)) {
          errorMessage = data.email[0];
        } else if (typeof data === 'object') {
          // Get the first error message from the response
          const firstError = Object.values(data)[0];
          if (Array.isArray(firstError)) {
            errorMessage = firstError[0];
          } else if (typeof firstError === 'string') {
            errorMessage = firstError;
          }
        }
        
        Alert.alert("Error", errorMessage);
      }
    } catch {
      Alert.alert("Network Error", "Something went wrong");
    }
  };

  return (
    <View style={styles.container}>
      <Image source={require("../assets/images/Logo.png")} style={styles.logo} resizeMode="contain" />
      <TextInput style={styles.input} placeholder="Name" placeholderTextColor="#555" value={name} onChangeText={setName} />
      <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#555" value={email} onChangeText={setEmail} keyboardType="email-address" />
      <TextInput style={styles.input} placeholder="Phone Number" placeholderTextColor="#555" value={number} onChangeText={setNumber} keyboardType="phone-pad" />
      <TextInput style={styles.input} placeholder="Password" placeholderTextColor="#555" value={password} onChangeText={setPassword} secureTextEntry />
      <TextInput style={styles.input} placeholder="Confirm Password" placeholderTextColor="#555" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
      <TouchableOpacity style={styles.button} onPress={handleSignup}>
        <Text style={styles.buttonText}>Sign Up</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate("Login")}>
        <Text style={styles.switchText}>Already have an account? Log in</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffd6e7", alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  logo: { width: 150, height: 150, marginBottom: 30 },
  input: { width: "90%", backgroundColor: "#fff", padding: 12, borderRadius: 10, marginBottom: 15 },
  button: { backgroundColor: "#ff66b3", padding: 14, borderRadius: 10, width: "90%", alignItems: "center", marginTop: 10 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  switchText: { marginTop: 15, color: "#333" },
});
