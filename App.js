import React, { useEffect } from "react";
import { AppRegistry, Image, View, StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text, Platform } from "react-native";
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

  const appContent = (
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

  if (Platform.OS === "web") {
    return (
      <View style={webStyles.outer}>
        <View style={webStyles.phone}>
          {appContent}
        </View>
      </View>
    );
  }

  return appContent;
};

const webStyles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: "#f5e6e0",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
  },
  phone: {
    width: 430,
    height: "100vh",
    overflow: "hidden",
    backgroundColor: "#fff0ec",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 0 },
  },
});

export default App;

// Register the main component
AppRegistry.registerComponent('main', () => App);



