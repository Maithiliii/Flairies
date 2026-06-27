import React, { useEffect } from "react";
import { AppRegistry, Image, View, Text, StyleSheet, Dimensions, Platform } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import { PlayfairDisplay_400Regular, PlayfairDisplay_600SemiBold, PlayfairDisplay_700Bold } from "@expo-google-fonts/playfair-display";
import * as SplashScreen from "expo-splash-screen";

SplashScreen.preventAutoHideAsync();

// Remove browser default focus outline from all inputs on web
if (Platform.OS === "web" && typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = "input:focus, textarea:focus { outline: none !important; box-shadow: none !important; }";
  document.head.appendChild(style);
}
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Provider } from "react-redux";
import { store } from "./store";
import { NotificationProvider } from './contexts/NotificationContext';
// Cashfree doesn't need a provider like Stripe

import SignupScreen from "./app/signup";
import LoginScreen from "./app/login";
import AddressSetupScreen from "./app/address-setup";
import WelcomeScreen from "./app/welcome";
import HomeScreen from "./app/(tabs)/index";
import ClosetScreen from "./app/(tabs)/closet";
import ProfileScreen from "./app/(tabs)/profile";
import BuyScreen from "./app/buy";
import RentScreen from "./app/rent";
import AccessoriesScreen from "./app/accessories";
import AddListingScreen from "./app/add-listing";
import SearchScreen from "./app/search";
import CartScreen from "./app/cart";
import BankDetailsScreen from "./app/bank-details";
import CheckoutScreen from "./app/checkout-enhanced";
import OrdersScreen from "./app/orders";
import SellerProfileScreen from "./app/seller-profile";
import ChatListScreen from "./app/chat-list";
import ChatScreen from "./app/chat";
import MyEarningsScreen from "./app/my-earnings";
import ItemDetailScreen from "./app/item-detail";
import CategoryListingsScreen from "./app/category-listings";
import AboutScreen from "./app/about";
import AddDonationScreen from "./app/add-donation";
import FavoritesScreen from "./app/favorites";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TabsNavigator = () => {
  const insets = useSafeAreaInsets();
  
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: 65,
          paddingBottom: 2,
          paddingTop: 8,
          marginBottom: insets.bottom + 8,
          marginHorizontal: 16,
          borderRadius: 28,
          backgroundColor: "#ffffff",
          position: "absolute",
          borderWidth: 0,
          shadowColor: "#000",
          shadowOpacity: 0.12,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          marginTop: -2,
          fontWeight: "600",
          marginBottom: 2,
          paddingBottom: 0,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        },
      }}
    >
    <Tab.Screen
      name="HomeTab"
      component={HomeScreen}
      options={{
        title: "Home",
        tabBarIcon: ({ focused }) => (
          <Image
            source={focused ? require('./assets/images/Home1.png') : require('./assets/images/Home.png')}
            style={{ width: 24, height: 24, marginTop: -6 }}
            resizeMode="contain"
          />
        ),
      }}
    />
    <Tab.Screen
      name="ClosetTab"
      component={ClosetScreen}
      options={{
        title: "Closet",
        tabBarIcon: ({ focused }) => (
          <Image
            source={focused ? require('./assets/images/Closet1.png') : require('./assets/images/Closet.png')}
            style={{ width: 24, height: 24, marginTop: -6 }}
            resizeMode="contain"
          />
        ),
      }}
    />
    <Tab.Screen
      name="ProfileTab"
      component={ProfileScreen}
      options={{
        title: "Profile",
        tabBarIcon: ({ focused }) => (
          <Image
            source={focused ? require('./assets/images/Me1.png') : require('./assets/images/Me.png')}
            style={{ width: 24, height: 24, marginTop: -6 }}
            resizeMode="contain"
          />
        ),
      }}
    />
    </Tab.Navigator>
  );
};

const App = () => {
  const [fontsLoaded] = useFonts({
    Inter_400Regular, Inter_600SemiBold, Inter_700Bold,
    PlayfairDisplay_400Regular, PlayfairDisplay_600SemiBold, PlayfairDisplay_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  if (Platform.OS === "web") {
    const screenWidth = Dimensions.get("window").width;
    if (screenWidth > 500) {
      const url = typeof window !== "undefined" ? window.location.href : "https://flairies.vercel.app";
      return (
        <View style={webStyles.gate}>
          <Image source={require("./assets/images/icon.png")} style={webStyles.logo} resizeMode="contain" />
          <Text style={webStyles.brand}>Flairies</Text>
          <Text style={webStyles.heading}>Made for mobile.</Text>
          <Text style={webStyles.sub}>Scan the QR code with your phone to open the app.</Text>
          <View style={webStyles.qrBox}>
            <QRCode value={url} size={180} color="#1e0a16" backgroundColor="#fff" />
          </View>
          <Text style={webStyles.url}>{url}</Text>
        </View>
      );
    }
  }

  return (
    <Provider store={store}>
      <NotificationProvider>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
            <Stack.Screen name="AddressSetup" component={AddressSetupScreen} />
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Home" component={TabsNavigator} />
            <Stack.Screen name="Buy" component={BuyScreen} />
            <Stack.Screen name="Rent" component={RentScreen} />
            <Stack.Screen name="Accessories" component={AccessoriesScreen} />
            <Stack.Screen name="AddListing" component={AddListingScreen} />
            <Stack.Screen name="Search" component={SearchScreen} />
            <Stack.Screen name="Cart" component={CartScreen} />
            <Stack.Screen name="BankDetails" component={BankDetailsScreen} />
            <Stack.Screen name="Checkout" component={CheckoutScreen} />
            <Stack.Screen name="Orders" component={OrdersScreen} />
            <Stack.Screen name="SellerProfile" component={SellerProfileScreen} />
            <Stack.Screen name="ChatList" component={ChatListScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="MyEarnings" component={MyEarningsScreen} />
            <Stack.Screen name="ItemDetail" component={ItemDetailScreen} />
            <Stack.Screen name="CategoryListings" component={CategoryListingsScreen} />
            <Stack.Screen name="About" component={AboutScreen} />
            <Stack.Screen name="AddDonation" component={AddDonationScreen} />
            <Stack.Screen name="Favorites" component={FavoritesScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </NotificationProvider>
    </Provider>
  );
};

const webStyles = StyleSheet.create({
  gate: {
    flex: 1,
    backgroundColor: "#fff0ec",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    padding: 40,
  },
  logo: { width: 72, height: 72, marginBottom: 4 },
  brand: { fontSize: 32, fontWeight: "800", color: "#1e0a16", marginBottom: 4 },
  heading: { fontSize: 22, fontWeight: "700", color: "#fe95b4", marginBottom: 10 },
  sub: { fontSize: 15, color: "#888", textAlign: "center", maxWidth: 400, lineHeight: 22, marginBottom: 32 },
  qrBox: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    marginBottom: 20,
  },
  url: { fontSize: 12, color: "#bbb", textAlign: "center" },
});

export default App;

// Register the main component
AppRegistry.registerComponent('main', () => App);



