import React from "react";
import { AppRegistry, Image } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text, Platform } from "react-native";
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

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TabsNavigator = () => {
  const insets = useSafeAreaInsets();
  
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: 65, // Reduced height back down
          paddingBottom: 2, // Minimal bottom padding to prevent cutoff
          paddingTop: 8, // Reduced top padding
          marginBottom: Platform.OS === "android" ? 49 : 45, // Moved up by additional 0.3cm (9px)
          marginHorizontal: 16,
          borderRadius: 28, // More rounded for better floating effect
          backgroundColor: "#ffffff",
          position: "absolute",
          borderWidth: 0,
          shadowColor: "#000",
          shadowOpacity: 0.12, // Enhanced shadow
          shadowRadius: 12, // Larger shadow radius
          shadowOffset: { width: 0, height: 6 }, // More prominent shadow
          elevation: 8, // Higher elevation for Android
        },
        tabBarLabelStyle: { 
          fontSize: 12, 
          marginTop: -2, // Reduced negative margin
          fontWeight: "600",
          marginBottom: 2, // Reduced bottom margin
          paddingBottom: 0, // Remove any internal padding
        },
      }}
    >
    <Tab.Screen
      name="HomeTab"
      component={HomeScreen}
      options={{
        title: "Home",
        tabBarIcon: () => (
          <Image 
            source={require('./assets/images/home.png')} 
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
        tabBarIcon: () => (
          <Image 
            source={require('./assets/images/closet.png')} 
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
        title: "Me",
        tabBarIcon: () => (
          <Image 
            source={require('./assets/images/me.png')} 
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
          </Stack.Navigator>
        </NavigationContainer>
      </NotificationProvider>
    </Provider>
  );
};

export default App;

// Register the main component
AppRegistry.registerComponent('main', () => App);



