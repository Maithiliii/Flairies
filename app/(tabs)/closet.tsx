import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, ActivityIndicator } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useSelector } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "../../types/navigation";
import { RootState } from "../../store";
import { supabase, getImageUrl } from "../../lib/supabase";
import { ChevronLeft } from "lucide-react-native";

interface ItemImage { id: number; image_url: string | null; order: number; }
interface Item {
  id: number; user_id: string; title: string; description: string; listing_type: string;
  price?: string; rent_price?: string; deposit?: string;
  display_size: string; display_category: string; condition: string;
  image_url?: string | null; additional_images: ItemImage[]; image_count: number;
  name: string; user_email?: string; user_profile_picture?: string | null;
}

function mapItem(raw: any, name: string): Item {
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
    name, user_email: "", user_profile_picture: null,
  };
}

const ClosetScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const user = useSelector((state: RootState) => state.auth.user);
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<"Selling" | "Renting">("Selling");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const handleItemPress = (item: Item) => {
    (navigation as any).navigate("ItemDetail", { itemId: item.id });
  };

  const fetchUserItems = async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("items")
        .select("*, item_images(id, image_url, sort_order)")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setItems((data || []).map((raw) => mapItem(raw, user.name)));
    } catch (error) {
      console.error("Closet fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(React.useCallback(() => { fetchUserItems(); }, [user]));

  const sellingItems = items.filter((item) => item.listing_type === "sell" || item.listing_type === "sell_accessories");
  const rentingItems = items.filter((item) => item.listing_type === "rent");

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate("HomeTab" as never)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} activeOpacity={0.7}>
          <ChevronLeft size={26} color="#fe95b4" strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>CLOSET</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate("AddListing")}>
          <Text style={styles.addButtonText}>＋</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabRow}>
        {(["Selling", "Renting"] as const).map((tab) => (
          <TouchableOpacity key={tab} style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]} onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listingsContainer}>
        {loading ? (
          <ActivityIndicator size="large" color="#fe95b4" style={{ marginTop: 40 }} />
        ) : (
          <>
            {(activeTab === "Selling" ? sellingItems : rentingItems).length === 0 ? (
              <Text style={styles.emptyText}>No items yet. Add your first item!</Text>
            ) : (
              (activeTab === "Selling" ? sellingItems : rentingItems).map((item) => (
                <TouchableOpacity key={item.id} style={styles.card} onPress={() => handleItemPress(item)} activeOpacity={0.7}>
                  <View style={styles.cardImageContainer}>
                    {item.image_url ? (
                      <Image source={{ uri: item.image_url }} style={styles.cardImage} resizeMode="cover" />
                    ) : (
                      <View style={[styles.cardImage, styles.placeholderImage]}>
                        <Text style={styles.placeholderText}>No Image</Text>
                      </View>
                    )}
                    {item.image_count > 1 && (
                      <View style={styles.imageCountBadge}>
                        <Text style={styles.imageCountText}>+{item.image_count - 1}</Text>
                        <Text style={styles.imageCountText}>📷</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.cardMeta}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    {item.description ? <Text style={styles.cardDescription} numberOfLines={2}>{item.description}</Text> : null}
                    <Text style={styles.cardPrice}>{item.listing_type === "rent" ? `₹${item.rent_price} / day` : `₹${item.price}`}</Text>
                    {item.listing_type !== "sell_accessories" && <Text style={styles.cardSize}>Size: {item.display_size}</Text>}
                  </View>
                </TouchableOpacity>
              ))
            )}
          </>
        )}
      </ScrollView>

    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff0ec" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingBottom: 12 },
  backButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, textAlign: "center", fontFamily: "Inter_700Bold", fontSize: 13, letterSpacing: 1.5, color: "#1f0a1a" },
  addButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#fe95b4", alignItems: "center", justifyContent: "center" },
  addButtonText: { fontSize: 20, color: "#fff", marginTop: -1 },
  tabRow: { flexDirection: "row", backgroundColor: "#ffe1ef", borderRadius: 999, padding: 4, marginHorizontal: 20 },
  tabButton: { flex: 1, paddingVertical: 10, borderRadius: 999, alignItems: "center" },
  tabButtonActive: { backgroundColor: "#fff" },
  tabLabel: { fontSize: 16, fontWeight: "600", color: "#a13872" },
  tabLabelActive: { color: "#ff2f8f" },
  listingsContainer: { paddingHorizontal: 20, paddingVertical: 24, gap: 16, paddingBottom: 120 },
  card: { flexDirection: "row", backgroundColor: "#fff", borderRadius: 20, padding: 12, alignItems: "center", shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  cardImageContainer: { position: "relative", marginRight: 16 },
  cardImage: { width: 100, height: 100, borderRadius: 12 },
  imageCountBadge: { position: "absolute", bottom: 6, right: 6, backgroundColor: "rgba(0, 0, 0, 0.7)", borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4, flexDirection: "row", alignItems: "center", gap: 4 },
  imageCountText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  cardMeta: { flex: 1 },
  cardTitle: { fontSize: 17, fontWeight: "700", color: "#1e0a16" },
  cardDescription: { fontSize: 14, color: "#666", marginTop: 4, lineHeight: 18 },
  cardPrice: { fontSize: 16, fontWeight: "600", color: "#ff2f8f", marginTop: 6 },
  cardSize: { fontSize: 14, color: "#555", marginTop: 4 },
  emptyText: { fontSize: 16, color: "#999", textAlign: "center", marginTop: 40 },
  placeholderImage: { backgroundColor: "#f0f0f0", justifyContent: "center", alignItems: "center" },
  placeholderText: { color: "#999", fontSize: 12 },
});

export default ClosetScreen;

