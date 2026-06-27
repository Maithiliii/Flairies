import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  Animated, ScrollView, Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Search } from "lucide-react-native";
import { RootState } from "../../store";
import type { AuthStackParamList } from "../../types/navigation";
import { supabase } from "../../lib/supabase";

const { width } = Dimensions.get("window");
const CIRCLE_SIZE = Math.floor((width - 40 - 56) / 3);
const COL_WIDTH   = Math.floor((width - 40 - 10) / 2);

const BROWSE = [
  { id: "buy",         label: "BUY",         source: require("../../assets/images/Buy.png"),   route: "Buy"         as const },
  { id: "rent",        label: "RENT",        source: require("../../assets/images/Rent.png"),        route: "Rent"        as const },
  { id: "accessories", label: "ACCESSORIES", source: require("../../assets/images/Accessories.png"), route: "Accessories" as const },
];

const LEFT_CATS = [
  { id: "tops",    label: "TOPS",    height: 160, source: require("../../assets/images/Tops.png"),    listingTypes: ["sell", "rent"], categoryValue: "Tops"     },
  { id: "dresses", label: "DRESSES", height: 190, source: require("../../assets/images/Dresses.png"), listingTypes: ["sell", "rent"], categoryValue: "Dresses"  },
  { id: "shoes",   label: "SHOES",   height: 150, source: require("../../assets/images/Shoes.png"),   listingTypes: ["sell_accessories"], categoryValue: "Footwear" },
  { id: "bags",    label: "BAGS",    height: 160, source: require("../../assets/images/Bags.png"),    listingTypes: ["sell_accessories"], categoryValue: "Bags"    },
];

const RIGHT_CATS = [
  { id: "bottoms",   label: "BOTTOMS",              height: 280, source: require("../../assets/images/Bottoms.png"),  listingTypes: ["sell", "rent"],      categoryValue: "Bottoms"   },
  { id: "coordsets", label: "ONE PIECE & CO-ORDS",  height: 160, source: require("../../assets/images/Coordset.png"), listingTypes: ["sell", "rent"],      categoryValue: "One Piece" },
  { id: "access",    label: "ACCESSORIES",           height: 210, source: require("../../assets/images/Access.png"),   listingTypes: ["sell_accessories"],  categoryValue: null        },
];

export default function HomeScreen() {
  const insets     = useSafeAreaInsets();
  const user       = useSelector((state: RootState) => state.auth.user);
  const cartItems  = useSelector((state: RootState) => state.cart.items);
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const chatBounce = useRef(new Animated.Value(0)).current;
  const [unreadCount, setUnreadCount] = useState(0);

  const cartItemCount = cartItems.reduce((total, item) => total + item.quantity, 0);
  const firstName     = user?.name?.split(" ")[0] ?? "there";

  useEffect(() => {
    const bounce = () => {
      Animated.sequence([
        Animated.timing(chatBounce, { toValue: -12, duration: 280, useNativeDriver: true }),
        Animated.timing(chatBounce, { toValue: 0,   duration: 280, useNativeDriver: true }),
        Animated.timing(chatBounce, { toValue: -6,  duration: 180, useNativeDriver: true }),
        Animated.timing(chatBounce, { toValue: 0,   duration: 180, useNativeDriver: true }),
      ]).start();
    };
    const timeout  = setTimeout(bounce, 1200);
    const interval = setInterval(bounce, 5000);
    return () => { clearTimeout(timeout); clearInterval(interval); };
  }, [chatBounce]);

  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        fetchUnreadCount();
        const iv = setInterval(fetchUnreadCount, 10000);
        return () => clearInterval(iv);
      }
    }, [user])
  );

  const fetchUnreadCount = async () => {
    if (!user) return;
    try {
      const { data: convData } = await supabase
        .from("conversations")
        .select("id")
        .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`);
      if (!convData || convData.length === 0) { setUnreadCount(0); return; }
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("is_read", false)
        .neq("sender_id", user.id)
        .in("conversation_id", convData.map((c) => c.id));
      setUnreadCount(count || 0);
    } catch { /* silent */ }
  };

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 20, paddingBottom: 140 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Greeting + Cart ── */}
        <View style={styles.header}>
          <View style={styles.greetingWrap}>
            <Text style={styles.greeting}>
              Hi, <Text style={styles.greetingName}>{firstName}</Text>
            </Text>
            <Text style={styles.greetingSub}>What will you wear today?</Text>
          </View>

          <TouchableOpacity style={styles.cartBtn} onPress={() => (navigation as any).navigate("Cart")}>
            <Image source={require("../../assets/images/cart.png")} style={styles.cartImg} resizeMode="contain" />
            {cartItemCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cartItemCount > 99 ? "99+" : cartItemCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Search bar ── */}
        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => (navigation as any).navigate("Search")}
          activeOpacity={0.85}
        >
          <Search size={16} color="#aaa" />
          <Text style={styles.searchText}>Search looks, brands, vibes...</Text>
        </TouchableOpacity>

        {/* ── Browse circles ── */}
        <Text style={styles.sectionLabel}>Browse</Text>

        <View style={styles.circleRow}>
          {BROWSE.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={styles.circleTile}
              onPress={() => navigation.navigate(cat.route)}
              activeOpacity={0.82}
            >
              <View style={[styles.circleFrame, { width: CIRCLE_SIZE, height: CIRCLE_SIZE, borderRadius: CIRCLE_SIZE / 2 }]}>
                <Image source={cat.source} style={styles.circleImg} />
              </View>
              <Text style={styles.circleLabel}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Categories masonry ── */}
        <Text style={[styles.sectionLabel, { marginTop: 32 }]}>Categories</Text>

        <View style={styles.masonry}>
          {/* Left column */}
          <View style={styles.masonryCol}>
            {LEFT_CATS.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={styles.catTile}
                onPress={() => (navigation as any).navigate("CategoryListings", { title: cat.label, listingTypes: cat.listingTypes, categoryValue: cat.categoryValue })}
                activeOpacity={0.85}
              >
                <Image
                  source={cat.source}
                  style={[styles.catImg, { height: cat.height }]}
                />
                <Text style={styles.catLabel}>{cat.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Right column — offset to create staggered effect */}
          <View style={styles.masonryCol}>
            {RIGHT_CATS.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={styles.catTile}
                onPress={() => (navigation as any).navigate("CategoryListings", { title: cat.label, listingTypes: cat.listingTypes, categoryValue: cat.categoryValue })}
                activeOpacity={0.85}
              >
                <Image
                  source={cat.source}
                  style={[styles.catImg, { height: cat.height }]}
                  resizeMode="cover"
                />
                <Text style={styles.catLabel}>{cat.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* ── Floating chat button ── */}
      <Animated.View
        style={[
          styles.chatBtn,
          { bottom: 100 + insets.bottom / 2, transform: [{ translateY: chatBounce }] },
        ]}
      >
        <TouchableOpacity onPress={() => (navigation as any).navigate("ChatList")} activeOpacity={0.9}>
          <Image source={require("../../assets/images/chat.png")} style={styles.chatImg} resizeMode="contain" />
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{unreadCount > 99 ? "99+" : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:          { flex: 1, backgroundColor: "#fff0ec" },
  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },

  // Header
  header:       { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  greetingWrap: { flex: 1 },
  greeting:     { fontFamily: "Inter_600SemiBold", fontSize: 24, color: "#1f0a1a" },
  greetingName: { fontFamily: "Inter_700Bold", fontSize: 24, color: "#1f0a1a" },
  greetingSub:  { fontSize: 14, fontFamily: "Inter_400Regular", color: "#888", marginTop: 4 },
  cartBtn:      { padding: 4, position: "relative" },
  cartImg:      { width: 44, height: 44 },
  cartBadge: {
    position: "absolute", top: 0, right: 0,
    backgroundColor: "#fe95b4", borderRadius: 10,
    minWidth: 18, height: 18, alignItems: "center", justifyContent: "center",
    paddingHorizontal: 4, borderWidth: 2, borderColor: "#fff0ec",
  },
  cartBadgeText: { color: "#fff", fontSize: 10, fontFamily: "Inter_700Bold" },

  // Search
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#fff", borderRadius: 14,
    paddingHorizontal: 14, height: 37,
    marginBottom: 30,
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 }, elevation: 3,
  },
  searchText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#bbb" },

  // Section label
  sectionLabel: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: "#1f0a1a", marginBottom: 22 },

  // Browse circles
  circleRow:   { flexDirection: "row", justifyContent: "space-around", alignItems: "flex-start" },
  circleTile:  { alignItems: "center", gap: 10 },
  circleFrame: { overflow: "hidden", backgroundColor: "#e8c8d8", shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  circleImg:   { width: "100%", height: "100%", resizeMode: "cover" },
  circleLabel: { fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 1.2, color: "#1f0a1a", textAlign: "center" },

  // Categories masonry
  masonry:    { flexDirection: "row", gap: 10 },
  masonryCol: { width: COL_WIDTH, gap: 10 },
  catTile:    {},
  catImg: {
    width: COL_WIDTH,
    borderRadius: 12,
    resizeMode: "cover",
    backgroundColor: "#e8d0d8",
  },
  catLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    letterSpacing: 1.2,
    color: "#1f0a1a",
    marginTop: 8,
    marginBottom: 4,
  },

  // Chat
  chatBtn: { position: "absolute", right: 12 },
  chatImg: { width: 90, height: 90, marginTop: 19 },
  unreadBadge: {
    position: "absolute", top: 16, right: 10,
    backgroundColor: "#fe95b4", borderRadius: 12,
    minWidth: 22, height: 22, alignItems: "center", justifyContent: "center",
    paddingHorizontal: 5, borderWidth: 2, borderColor: "#fff0ec",
  },
  unreadText: { color: "#fff", fontSize: 11, fontFamily: "Inter_700Bold" },
});
