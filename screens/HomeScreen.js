import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useSelector } from "react-redux";

export default function HomeScreen() {
  // Get user from Redux store
  const user = useSelector((state) => state.auth.user);

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>
        Hi {user ? user.username : "there"}
      </Text>
      <Text style={styles.subtext}>Welcome to your magical world!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffd6e7",
    justifyContent: "center",
    alignItems: "center",
  },
  greeting: {
    position: "absolute",
    top: 60,
    left: 25,
    fontSize: 24,
    fontWeight: "700",
    color: "#ff1493",
  },
  subtext: {
    fontSize: 18,
    color: "#333",
  },
});
