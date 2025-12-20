import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";
import { useDispatch } from "react-redux";
import { setUser } from "../slices/authSlice";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "../types/navigation";
import type { AppDispatch } from "../store";

type Props = NativeStackScreenProps<AuthStackParamList, "Welcome">;

export default function WelcomeScreen({ navigation, route }: Props) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const dispatch = useDispatch<AppDispatch>();
  const userFromRoute = route.params?.user;

  useEffect(() => {
    if (userFromRoute) {
      dispatch(setUser(userFromRoute));
    }

    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 3, useNativeDriver: true }),
      ]),
      Animated.timing(fadeAnim, { toValue: 0, duration: 800, delay: 500, useNativeDriver: true }),
    ]).start(() => navigation.replace("Home"));
  }, [dispatch, navigation, userFromRoute]);

  return (
    <View style={styles.container}>
      <Animated.Text style={[styles.text, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        Welcome to Flairies ✨
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffd6e7", alignItems: "center", justifyContent: "center" },
  text: { fontSize: 28, fontWeight: "700", color: "#ff3399" },
});
