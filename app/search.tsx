import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TextInput, ScrollView, Image, ActivityIndicator, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "../types/navigation";
import ScreenHeader from "../components/ScreenHeader";
import { supabase, getImageUrl } from "../lib/supabase";

interface ItemImage { id: number; image_url: string | null; order: number; }
interface Item {
  id: number; user_id: string; title: string; description: string; listing_type: string;
  price?: string; rent_price?: string; deposit?: string;
  display_size: string; display_category: string; condition: string;
  image_url?: string | null; additional_images: ItemImage[]; image_count: number;
  name: string; user_email?: string; user_profile_picture?: string | null;
}

function mapItem(raw: any): Item {
  return {
    id: raw.id, user_id: raw.user_id, title: raw.title, description: raw.description || "",
    listing_type: raw.listing_type,
    price: raw.price != null ? String(raw.price) : undefined,
    rent_price: raw.rent_price != null ? String(raw.rent_price) : undefined,
    deposit: raw.deposit != null ? String(raw.deposit) : undefined,
    display_size: raw.custom_size || raw.size || "",
    display_category: raw.custom_category || raw.category || "",
    condition: raw.condition, image_url: getImageUrl(raw.image_url),
    additional_images: (raw.item_images || []).map((img: any) => ({ id: img.id, image_url: getImageUrl(img.image_url), order: img.sort_order || 0 })),
    image_count: (raw.item_images?.length || 0) + (raw.image_url ? 1 : 0),
    name: raw.profiles?.name || "", user_email: raw.profiles?.email || "",
    user_profile_picture: getImageUrl(raw.profiles?.profile_picture_url),
  };
}

const SearchScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetchAllItems(); }, []);
  useEffect(() => { filterItems(); }, [searchQuery, items]);

  const fetchAllItems = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("items")
        .select("*, profiles!user_id(name, email, profile_picture_url), item_images(id, image_url, sort_order)")
        .eq("is_active", true)
        .eq("is_available", true)
        .neq("listing_type", "donate")
        .order("created_at", { ascending: false });

      if (error) throw error;
      const mapped = (data || []).map(mapItem);
      setItems(mapped);
      setFilteredItems(mapped);
    } catch (error) {
      console.error("Search fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterItems = () => {
    if (!searchQuery.trim()) { setFilteredItems(items); return; }
    const query = searchQuery.toLowerCase();
    setFilteredItems(items.filter((item) =>
      item.title.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query) ||
      item.display_category.toLowerCase().includes(query) ||
      item.name.toLowerCase().includes(query)
    ));
  };

  const handleItemPress = (item: Item) => {
    (navigation as any).navigate("ItemDetail", { itemId: item.id });
  };

  const getCategoryBadge = (listingType: string) => {
    switch (listingType) {
      case "sell": return { label: "Buy", color: "#ff2f8f" };
      case "rent": return { label: "Rent", color: "#044861" };
      case "sell_accessories": return { label: "Accessory", color: "#48208f" };
      case "donate": return { label: "Free", color: "#4caf50" };
      default: return { label: "Item", color: "#999" };
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Search" />

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search looks, brands, vibes..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoFocus
        />
      </View>

      <ScrollView contentContainerStyle={styles.resultsContainer}>
        {loading ? (
          <ActivityIndicator size="large" color="#fe95b4" style={{ marginTop: 40 }} />
        ) : filteredItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>{searchQuery ? "No items found" : "Start typing to search"}</Text>
          </View>
        ) : (
          <>
            <Text style={styles.resultCount}>{filteredItems.length} {filteredItems.length === 1 ? "item" : "items"} found</Text>
            <View style={styles.itemsGrid}>
              {filteredItems.map((item) => {
                const badge = getCategoryBadge(item.listing_type);
                return (
                  <TouchableOpacity key={item.id} style={styles.itemCard} onPress={() => handleItemPress(item)} activeOpacity={0.7}>
                    <View style={styles.imageWrapper}>
                      {item.image_url ? (
                        <Image source={{ uri: item.image_url }} style={styles.itemImage} />
                      ) : (
                        <View style={[styles.itemImage, styles.placeholderImage]}>
                          <Text style={styles.placeholderText}>No Image</Text>
                        </View>
                      )}
                      {item.image_count > 1 && (
                        <View style={styles.imageCountBadge}>
                          <Text style={styles.imageCountText}>+{item.image_count - 1}</Text>
                          <Text style={styles.imageCountText}>📷</Text>
                        </View>
                      )}
                      <View style={[styles.categoryBadge, { backgroundColor: badge.color }]}>
                        <Text style={styles.categoryBadgeText}>{badge.label}</Text>
                      </View>
                    </View>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                      <Text style={styles.itemPrice}>
                        {item.listing_type === "rent" ? `₹${item.rent_price} / day` : item.listing_type === "donate" ? "Free" : `₹${item.price}`}
                      </Text>
                      {item.listing_type !== "sell_accessories" && (
                        <Text style={styles.itemSize}>Size: {item.display_size}</Text>
                      )}
                      <Text style={styles.itemSeller}>by @{item.name}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff0ec" },
  searchContainer: { paddingHorizontal: 20, paddingVertical: 16 },
  searchInput: { backgroundColor: "#f8f8f8", borderRadius: 16, paddingHorizontal: 20, paddingVertical: 14, fontSize: 16, color: "#111", borderWidth: 2, borderColor: "#fe95b4" },
  resultsContainer: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },
  resultCount: { fontSize: 14, color: "#666", marginBottom: 16, fontWeight: "600" },
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyText: { fontSize: 16, color: "#999" },
  itemsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  itemCard: { width: "48%", backgroundColor: "#fff", borderRadius: 16, marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  imageWrapper: { position: "relative" },
  itemImage: { width: "100%", height: 180, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  placeholderImage: { backgroundColor: "#f0f0f0", justifyContent: "center", alignItems: "center" },
  placeholderText: { color: "#999", fontSize: 12 },
  imageCountBadge: { position: "absolute", bottom: 6, right: 6, backgroundColor: "rgba(0, 0, 0, 0.7)", borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4, flexDirection: "row", alignItems: "center", gap: 4 },
  imageCountText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  categoryBadge: { position: "absolute", top: 8, left: 8, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  categoryBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  itemInfo: { padding: 12 },
  itemTitle: { fontSize: 16, fontWeight: "700", color: "#1e0a16" },
  itemPrice: { fontSize: 16, fontWeight: "600", color: "#ff2f8f", marginTop: 4 },
  itemSize: { fontSize: 13, color: "#666", marginTop: 2 },
  itemSeller: { fontSize: 12, color: "#999", marginTop: 4 },
});

export default SearchScreen;

