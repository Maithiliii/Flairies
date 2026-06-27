import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Alert,
} from "react-native";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";
import ScreenHeader from "../components/ScreenHeader";
import { supabase, getImageUrl } from "../lib/supabase";
import { addToCart } from "../slices/cartSlice";
import { RootState } from "../store";

const { width } = Dimensions.get("window");
const CARD_WIDTH = Math.floor((width - 40 - 12) / 2);

export default function CategoryListingsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  const currentUser = useSelector((state: RootState) => state.auth.user);

  const { title, listingTypes, categoryValue } = route.params as {
    title: string;
    listingTypes: string[];
    categoryValue: string | null;
  };

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("items")
        .select("id, user_id, title, price, rent_price, listing_type, image_url, category, custom_category")
        .in("listing_type", listingTypes)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (categoryValue) {
        query = (query as any).or(
          `category.eq.${categoryValue},custom_category.eq.${categoryValue}`
        );
      }

      const { data, error } = await query;
      if (error) throw error;

      const filtered = (data || []).filter(
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
        profiles: { name: profileMap[item.user_id]?.name || "" },
      })));
    } catch (err: any) {
      console.error("CategoryListings fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [listingTypes, categoryValue, currentUser]);

  useFocusEffect(fetchItems);

  const handleItemPress = (item: any) => {
    (navigation as any).navigate("ItemDetail", { itemId: item.id });
  };

  const handleAddToCart = (item: any) => {
    if (!currentUser) {
      Alert.alert("Login required", "Please log in to add items to cart");
      return;
    }
    dispatch(
      addToCart({
        id: item.id,
        user_id: item.user_id,
        title: item.title,
        price: item.price ?? undefined,
        rent_price: item.rent_price ?? undefined,
        listing_type: item.listing_type,
        image_url: getImageUrl(item.image_url),
        quantity: 1,
      })
    );
  };

  const getPrice = (item: any) => {
    if (item.listing_type === "rent") return `₹${item.rent_price}/day`;
    if (item.listing_type === "donate") return "Free";
    return `₹${item.price}`;
  };

  return (
    <View style={styles.wrapper}>
      <ScreenHeader title={title} showCart />

      {loading ? (
        <ActivityIndicator size="large" color="#fe95b4" style={{ marginTop: 48 }} />
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No items here yet</Text>
          <Text style={styles.emptySubtext}>Be the first to list something!</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.grid}
        >
          {items.map((item) => {
            const imageUrl = getImageUrl(item.image_url);
            const sellerName = item.profiles?.name ?? "";
            const isRent = item.listing_type === "rent";
            const isDonate = item.listing_type === "donate";

            return (
              <TouchableOpacity
                key={item.id}
                style={styles.card}
                onPress={() => handleItemPress(item)}
                activeOpacity={0.88}
              >
                {/* Image */}
                <View style={styles.imageBox}>
                  {imageUrl ? (
                    <Image
                      source={{ uri: imageUrl }}
                      style={styles.image}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.image, styles.imagePlaceholder]}>
                      <Text style={styles.placeholderText}>No image</Text>
                    </View>
                  )}

                  {/* Quick add-to-cart button */}
                  {!isDonate && (
                    <TouchableOpacity
                      style={styles.addBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleAddToCart(item);
                      }}
                      activeOpacity={0.8}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Text style={styles.addBtnText}>+</Text>
                    </TouchableOpacity>
                  )}

                  {/* Rent badge */}
                  {isRent && (
                    <View style={styles.rentBadge}>
                      <Text style={styles.rentBadgeText}>RENT</Text>
                    </View>
                  )}
                </View>

                {/* Info */}
                <View style={styles.info}>
                  <Text style={styles.itemTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  {sellerName ? (
                    <Text style={styles.sellerName} numberOfLines={1}>
                      {sellerName}
                    </Text>
                  ) : null}
                  <Text style={styles.price}>{getPrice(item)}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: "#fff0ec" },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 20,
    paddingTop: 16,
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
  imageBox: {
    position: "relative",
    width: "100%",
    height: CARD_WIDTH,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    backgroundColor: "#f0e8ec",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: { fontSize: 12, color: "#bbb" },
  addBtn: {
    position: "absolute",
    bottom: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#fe95b4",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#fe95b4",
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  addBtnText: { color: "#fff", fontSize: 18, fontWeight: "700", lineHeight: 22 },
  rentBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(4,72,97,0.85)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  rentBadgeText: { color: "#fff", fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  info: { padding: 10, gap: 2 },
  itemTitle: { fontSize: 13, fontWeight: "700", color: "#1f0a1a", lineHeight: 18 },
  sellerName: { fontSize: 11, color: "#aaa", marginTop: 1 },
  price: { fontSize: 15, fontWeight: "800", color: "#1f0a1a", marginTop: 4 },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 80,
    gap: 8,
  },
  emptyText: { fontSize: 18, fontWeight: "700", color: "#666" },
  emptySubtext: { fontSize: 14, color: "#aaa" },
});
