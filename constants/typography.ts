import { TextStyle } from "react-native";

export const Typography = {
  screenHeading: {
    fontSize: 22,
    fontFamily: "Inter_600SemiBold",
    color: "#1f0a1a",
  } as TextStyle,

  screenSubheading: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#555",
    marginTop: 8,
  } as TextStyle,

  bodyRegular: {
    fontFamily: "Inter_400Regular",
  } as TextStyle,

  bodyBold: {
    fontFamily: "Inter_700Bold",
  } as TextStyle,

  // Playfair Display — editorial / vintage serif
  displayHeading: {
    fontFamily: "PlayfairDisplay_700Bold",
    color: "#1f0a1a",
  } as TextStyle,

  displayLabel: {
    fontFamily: "PlayfairDisplay_600SemiBold",
    color: "#1f0a1a",
    letterSpacing: 1.5,
  } as TextStyle,
};
