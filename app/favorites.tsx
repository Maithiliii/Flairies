import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, Image,
  TouchableOpacity, ActivityIndicator,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft, Heart } from "lucide-react-native";
import { useSelector } from "react-redux";
import { RootState } from "../store";
import { supabase, getImageUrl } from "../lib/supabase";

interface FavItem {
  id: number;
  title: string;
  image_url: string | null;
  price: string | null;
  rent_price: string | null;
  listing_type: string;
}

const LABEL: Record<string, string> = {
  sell: "BUY", rent: "RENT", sell_accessories: "BUY", donate: "FREE",
};

export default function FavoritesScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const user = useSelector((state: RootState) => state.auth.user);
  const [items, setItems] = useState<FavItem[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (user) fetchFavorites();
    }, [user])
  );

  const removeFavorite = async (itemId: number) => {
    if (!user) return;
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    await supabase.from("favorites").delete()
      .eq("user_id", user.id).eq("item_id", itemId);
  };

  const fetchFavorites = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("favorites")
        .select("item_id, items(id, title, image_url, price, rent_price, listing_type)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      setItems(
        (data || [])
          .filter((row: any) => row.items)
          .map((row: any) => ({
            id: row.items.id,
            title: row.items.title,
            image_url: getImageUrl(row.items.image_url),
            price: row.items.price != null ? String(row.items.price) : null,
            rent_price: row.items.rent_price != null ? String(row.items.rent_price) : null,
            listing_type: row.items.listing_type,
          }))
      );
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  };

  const displayPrice = (item: FavItem) => {
    if (item.listing_type === "rent") return `₹${item.rent_price}/day`;
    if (item.listing_type === "donate") return "Free";
    return `₹${item.price}`;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color="#1f0a1a" strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={styles.title}>FAVORITES</Text>
        <View style={styles.backBtn} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#fe95b4" style={{ marginTop: 60 }} />
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <Heart size={52} color="#fe95b4" strokeWidth={1.5} />
          <Text style={styles.emptyTitle}>No favorites yet</Text>
          <Text style={styles.emptyText}>Tap the heart on any item to save it here</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {items.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.card}
              activeOpacity={0.85}
              onPress={() => (navigation as any).navigate("ItemDetail", { itemId: item.id })}
            >
              {item.image_url ? (
                <Image source={{ uri: item.image_url }} style={styles.cardImage} resizeMode="cover" />
              ) : (
                <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
                  <Text style={styles.placeholderText}>No Image</Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.heartBtn}
                onPress={() => removeFavorite(item.id)}
                activeOpacity={0.8}
              >
                <Heart size={16} color="#fe95b4" fill="#fe95b4" strokeWidth={2} />
              </TouchableOpacity>
              <View style={styles.typeBadge}>
                <Text style={styles.typeBadgeText}>{LABEL[item.listing_type] ?? "BUY"}</Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.cardPrice}>{displayPrice(item)}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff0ec" },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    letterSpacing: 1.5,
    color: "#1f0a1a",
  },

  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#1f0a1a" },
  emptyText: { fontSize: 14, color: "#999", textAlign: "center", lineHeight: 20 },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
  },
  card: {
    width: "47.5%",
    backgroundColor: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  cardImage: { width: "100%", aspectRatio: 1 },
  cardImagePlaceholder: { backgroundColor: "#f5e8ee", justifyContent: "center", alignItems: "center" },
  placeholderText: { color: "#bbb", fontSize: 12 },
  heartBtn: {
    position: "absolute", top: 8, left: 8,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  typeBadge: {
    position: "absolute", top: 8, right: 8,
    backgroundColor: "#ffe8f0",
    paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6,
  },
  typeBadgeText: {
    fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 1.2, color: "#fe95b4",
  },
  cardInfo: { padding: 10 },
  cardTitle: { fontSize: 13, fontWeight: "700", color: "#1f0a1a", marginBottom: 4 },
  cardPrice: { fontSize: 13, fontWeight: "700", color: "#fe95b4" },
});
