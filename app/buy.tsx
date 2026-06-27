import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, Image,
  ActivityIndicator, TouchableOpacity, Dimensions,
} from "react-native";
import ScreenHeader from "../components/ScreenHeader";
import { useNavigation } from "@react-navigation/native";
import { useSelector, useDispatch } from "react-redux";
import { useFocusEffect } from "@react-navigation/native";
import { RootState } from "../store";
import { supabase, getImageUrl } from "../lib/supabase";
import { addToCart, clearCart } from "../slices/cartSlice";
import ConfirmationModal from "../components/ConfirmationModal";

const { width } = Dimensions.get("window");
const CARD_WIDTH = Math.floor((width - 40 - 12) / 2);

const BuyScreen = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConflict, setShowConflict] = useState(false);
  const [pendingCart, setPendingCart] = useState<any>(null);
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const cartItems = useSelector((state: RootState) => state.cart.items);

  const handleItemPress = (item: any) => {
    (navigation as any).navigate("ItemDetail", { itemId: item.id });
  };

  const handleAddToCart = (item: any) => {
    const payload = {
      id: item.id, user_id: item.user_id, title: item.title,
      price: item.price ?? undefined, listing_type: item.listing_type,
      image_url: getImageUrl(item.image_url), quantity: 1,
      size: item.custom_size || item.size || null,
      condition: item.condition || null,
    };
    const existingKind = cartItems.length > 0
      ? (cartItems[0].listing_type === "rent" ? "rent" : "buy") : null;
    const newKind = item.listing_type === "rent" ? "rent" : "buy";
    if (existingKind && existingKind !== newKind) {
      setPendingCart(payload);
      setShowConflict(true);
      return;
    }
    dispatch(addToCart(payload));
  };

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const { data: itemsData, error } = await supabase
        .from("items")
        .select("id, user_id, title, price, listing_type, image_url, size, custom_size, condition")
        .eq("listing_type", "sell")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const filtered = (itemsData || []).filter(
        (item: any) => !currentUser || item.user_id !== currentUser.id
      );

      const userIds = [...new Set(filtered.map((i: any) => i.user_id))] as string[];
      let profileMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, name")
          .in("id", userIds);
        profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.id, p]));
      }

      setItems(filtered.map((item: any) => ({
        ...item,
        sellerName: profileMap[item.user_id]?.name || "",
      })));
    } catch (err) {
      console.error("Buy fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useFocusEffect(fetchItems);

  return (
    <View style={styles.container}>
      <ScreenHeader title="Buy" showCart />
      <Text style={styles.subheading}>Pre-loved pieces straight from the community</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#fe95b4" style={{ marginTop: 40 }} />
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No items available right now</Text>
          <Text style={styles.emptySubtext}>Be the first to list something!</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.grid}>
          {items.map((item) => {
            const imageUrl = getImageUrl(item.image_url);
            return (
              <TouchableOpacity
                key={item.id}
                style={styles.card}
                onPress={() => handleItemPress(item)}
                activeOpacity={0.88}
              >
                <View style={styles.imageBox}>
                  {imageUrl ? (
                    <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
                  ) : (
                    <View style={[styles.image, styles.imagePlaceholder]}>
                      <Text style={styles.placeholderText}>No image</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.addBtn}
                    onPress={(e) => { e.stopPropagation(); handleAddToCart(item); }}
                    activeOpacity={0.8}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Text style={styles.addBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.info}>
                  <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
                  {item.sellerName ? (
                    <Text style={styles.sellerName} numberOfLines={1}>{item.sellerName}</Text>
                  ) : null}
                  <Text style={styles.price}>₹{item.price}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
      <ConfirmationModal
        visible={showConflict}
        title="Replace cart?"
        message="Your cart has a rental. Replace with this buy item?"
        confirmText="Replace"
        cancelText="Keep cart"
        confirmColor="#fe95b4"
        onConfirm={() => {
          setShowConflict(false);
          if (pendingCart) { dispatch(clearCart()); dispatch(addToCart(pendingCart)); }
          setPendingCart(null);
        }}
        onCancel={() => { setShowConflict(false); setPendingCart(null); }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff0ec" },
  subheading: {
    fontFamily: "Inter_400Regular", fontSize: 14, color: "#888",
    paddingHorizontal: 20, marginTop: 4, marginBottom: 16,
  },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 80, gap: 8 },
  emptyText: { fontSize: 18, fontWeight: "700", color: "#666" },
  emptySubtext: { fontSize: 14, color: "#aaa" },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 120,
    gap: 12,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  imageBox: { position: "relative", width: "100%", height: CARD_WIDTH },
  image: { width: "100%", height: "100%" },
  imagePlaceholder: {
    backgroundColor: "#f0e8ec", justifyContent: "center", alignItems: "center",
  },
  placeholderText: { fontSize: 12, color: "#bbb" },
  addBtn: {
    position: "absolute", bottom: 10, right: 10,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: "#fe95b4",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#fe95b4", shadowOpacity: 0.4, shadowRadius: 4, elevation: 4,
  },
  addBtnText: { color: "#fff", fontSize: 18, fontWeight: "700", lineHeight: 22 },
  info: { padding: 10, gap: 2 },
  itemTitle: { fontSize: 13, fontWeight: "700", color: "#1f0a1a", lineHeight: 18 },
  sellerName: { fontSize: 11, color: "#aaa", marginTop: 1 },
  price: { fontSize: 15, fontWeight: "800", color: "#1f0a1a", marginTop: 4 },
});

export default BuyScreen;
