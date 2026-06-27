import React from "react";
import { TouchableOpacity, StyleSheet } from "react-native";
import { ChevronLeft } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function BackButton() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  return (
    <TouchableOpacity
      style={[styles.btn, { top: insets.top + 6 }]}
      onPress={() => navigation.goBack()}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      activeOpacity={0.7}
    >
      <ChevronLeft size={26} color="#fe95b4" strokeWidth={2} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    position: "absolute",
    left: 10,
    zIndex: 100,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
