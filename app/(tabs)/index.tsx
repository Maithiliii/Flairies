import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, ImageBackground, TouchableOpacity, Image, Animated } from "react-native";
import { useSelector } from "react-redux";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootState } from "../../store";
import type { AuthStackParamList } from "../../types/navigation";
import { API_URL } from "@env";

export default function HomeScreen() {
  const user = useSelector((state: RootState) => state.auth.user);
  const cartItems = useSelector((state: RootState) => state.cart.items);
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const [unreadCount, setUnreadCount] = useState(0);
  
  const cartItemCount = cartItems.reduce((total, item) => total + item.quantity, 0);
  
  const cards = [
    { id: "buy", source: require("../../assets/images/Buy.jpg"), route: "Buy" as const },
    { id: "rent", source: require("../../assets/images/Rent.jpg"), route: "Rent" as const },
  ];

  useEffect(() => {
    const startBounce = () => {
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -15,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: -8,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    };

    // Start bouncing every 5 seconds
    const interval = setInterval(startBounce, 5000);
    
    // Initial bounce after 1 second
    const timeout = setTimeout(startBounce, 1000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [bounceAnim]);

  // Fetch unread message count
  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        fetchUnreadCount();
        // Poll every 10 seconds
        const interval = setInterval(fetchUnreadCount, 10000);
        return () => clearInterval(interval);
      }
    }, [user])
  );

  const fetchUnreadCount = async () => {
    if (!user) return;
    
    try {
      const response = await fetch(`${API_URL}/api/conversations/?email=${encodeURIComponent(user.email)}`);
      
      // Check if response is JSON
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.log('Unread count: Server returned non-JSON response');
        return;
      }
      
      const data = await response.json();
      
      if (response.ok) {
        const total = data.reduce((sum: number, conv: any) => sum + (conv.unread_count || 0), 0);
        setUnreadCount(total);
      }
    } catch (error) {
      // Silently fail - don't spam console with errors
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.greeting}>Hi {user ? user.username : "there"}</Text>
        <Animated.View style={{ transform: [{ translateY: bounceAnim }] }}>
          <TouchableOpacity style={styles.cartIcon} onPress={() => (navigation as any).navigate('Cart')}>
            <Image 
              source={require("../../assets/images/cart.png")} 
              style={styles.cartIconImage}
              resizeMode="contain"
            />
            {cartItemCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cartItemCount > 99 ? '99+' : cartItemCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>
      <TouchableOpacity 
        style={styles.searchInput} 
        onPress={() => (navigation as any).navigate("Search")}
        activeOpacity={0.8}
      >
        <Text style={styles.searchPlaceholder}>Search looks, brands, vibes...</Text>
      </TouchableOpacity>
      <View style={styles.tilesRow}>
        {cards.map((card) => (
          <TouchableOpacity key={card.id} style={styles.tileWrapper} activeOpacity={0.85} onPress={() => navigation.navigate(card.route)}>
            <ImageBackground source={card.source} style={styles.squareTile} imageStyle={styles.tileImage}>
              {/* overlay label so tiles remain visible even if image fails to load */}
              <View style={styles.tileOverlay} pointerEvents="none">
                <Text style={styles.tileLabel}>{card.id === "buy" ? "Buy" : "Rent"}</Text>
              </View>
            </ImageBackground>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.rectangleWrap} activeOpacity={0.85} onPress={() => navigation.navigate("Accessories")}>
        <ImageBackground
          source={require("../../assets/images/Acc.jpg")}
          style={styles.rectangleTile}
          imageStyle={styles.rectangleImage}
        >
          <View style={styles.tileOverlay} pointerEvents="none">
            <Text style={styles.tileLabel}>Accessories</Text>
          </View>
        </ImageBackground>
      </TouchableOpacity>

      {/* Floating Chat Button */}
      <Animated.View style={[styles.floatingChatButton, { transform: [{ translateY: bounceAnim }] }]}>
        <TouchableOpacity 
          onPress={() => (navigation as any).navigate('ChatList')}
          activeOpacity={0.9}
        >
          <Image 
            source={require("../../assets/images/chat.png")} 
            style={styles.chatImage}
            resizeMode="contain"
          />
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffd6e7",
    alignItems: "center",
    paddingTop: 32,
  },
  headerRow: { width: '90%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 36 },
  greeting: { fontSize: 24, fontWeight: "700", color: "#ff1493" },
  cartIcon: { padding: 8 },
  cartIconImage: {
    width: 48,
    height: 48,
    marginTop: -8,
  },
  searchInput: {
    width: "90%",
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginTop: 12,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
    justifyContent: "center",
  },
  searchPlaceholder: {
    fontSize: 16,
    color: "#999",
  },
  tilesRow: {
    flexDirection: "row",
    width: "90%",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 24,
    paddingHorizontal: 0,
  },
  squareTile: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#f0e6ea",
  },
  rectangleTile: {
    width: "100%",
    height: 120,
    borderRadius: 20,
    overflow: "hidden",
  },
  tileImage: {
    borderRadius: 20,
    resizeMode: "cover",
  },
  rectangleImage: {
    borderRadius: 20,
    resizeMode: "cover",
  },
  tileOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.18)",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
  },
  tileLabel: { color: "#fff", fontSize: 18, fontWeight: "800" },
  tileWrapper: { width: "48%" },
  rectangleWrap: { 
    width: "90%",
    marginTop: 24,
    alignSelf: "center",
    paddingHorizontal: 0,
  },
  floatingChatButton: {
    position: "absolute",
    bottom: 100,
    right: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  chatImage: {
    width: 100,
    height: 100,
  },
  unreadBadge: {
    position: "absolute",
    top: 5,
    right: 5,
    backgroundColor: "#ff1493",
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: "#ffd6e7",
  },
  unreadText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  cartBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#ff1493",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: "#ffd6e7",
  },
  cartBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
});