import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator, TouchableOpacity } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft, MessageCircle } from "lucide-react-native";
import { supabase, getImageUrl } from "../lib/supabase";

interface Item {
  id: number;
  title: string;
  image_url?: string | null;
  price?: string;
  rent_price?: string;
  listing_type: string;
}

const LISTING_LABEL: Record<string, string> = {
  sell: "BUY",
  rent: "RENT",
  sell_accessories: "BUY",
  donate: "FREE",
};

const BADGE_BG: Record<string, string> = {
  rent: "rgba(4,72,97,0.85)",
};

const SellerProfileScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { sellerId: routeSellerId, sellerName, sellerProfilePic } = route.params as any;

  const [items, setItems] = useState<Item[]>([]);
  const [soldCount, setSoldCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchSellerData(); }, []);

  const fetchSellerData = async () => {
    if (!routeSellerId) { setLoading(false); return; }
    try {
      // Fetch listings and sold count in parallel using ID directly — no email lookup needed
      const [listingsRes, soldRes] = await Promise.all([
        supabase
          .from("items")
          .select("id, title, image_url, price, rent_price, listing_type")
          .eq("user_id", routeSellerId)
          .eq("is_active", true)
          .neq("listing_type", "donate")
          .order("created_at", { ascending: false }),
        supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .eq("seller_id", routeSellerId)
          .eq("payment_status", "paid"),
      ]);

      setItems(
        (listingsRes.data || []).map((raw) => ({
          id: raw.id,
          title: raw.title,
          image_url: getImageUrl(raw.image_url),
          price: raw.price != null ? String(raw.price) : undefined,
          rent_price: raw.rent_price != null ? String(raw.rent_price) : undefined,
          listing_type: raw.listing_type,
        }))
      );
      setSoldCount(soldRes.count ?? 0);
    } catch (err) {
      console.error("Failed to fetch seller data:", err);
    } finally {
      setLoading(false);
    }
  };

  const profilePicUri = sellerProfilePic?.startsWith("http")
    ? sellerProfilePic
    : getImageUrl(sellerProfilePic);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color="#1f0a1a" strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Seller Profile</Text>
        <TouchableOpacity
          style={styles.chatBtn}
          onPress={() =>
            (navigation as any).navigate("Chat", {
              recipientId: routeSellerId,
              recipientName: sellerName,
              recipientProfilePic: sellerProfilePic,
            })
          }
        >
          <MessageCircle size={22} color="#fe95b4" strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        {/* Profile header */}
        <View style={styles.profileSection}>
          {profilePicUri ? (
            <Image source={{ uri: profilePicUri }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>{sellerName?.charAt(0)?.toUpperCase() || "?"}</Text>
            </View>
          )}
          <Text style={styles.name}>{sellerName || "Unknown Seller"}</Text>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{items.length}</Text>
              <Text style={styles.statLabel}>Listings</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{soldCount}</Text>
              <Text style={styles.statLabel}>Sold</Text>
            </View>
          </View>
        </View>

        {/* Listings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {items.length > 0 ? `${items.length} item${items.length !== 1 ? "s" : ""} listed` : "No listings yet"}
          </Text>

          {loading ? (
            <ActivityIndicator size="large" color="#fe95b4" style={{ marginTop: 24 }} />
          ) : items.length === 0 ? (
            <Text style={styles.emptyText}>This seller has no active listings</Text>
          ) : (
            <View style={styles.grid}>
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
                  {/* Type badge */}
                  <View style={[
                    styles.typeBadge,
                    BADGE_BG[item.listing_type] ? { backgroundColor: BADGE_BG[item.listing_type] } : null,
                  ]}>
                    <Text style={[
                      styles.typeBadgeText,
                      BADGE_BG[item.listing_type] ? { color: "#fff" } : null,
                    ]}>{LISTING_LABEL[item.listing_type] ?? "BUY"}</Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.cardPrice}>
                      {item.listing_type === "rent"
                        ? `₹${item.rent_price}/day`
                        : item.listing_type === "donate"
                        ? "Free"
                        : `₹${item.price}`}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff0ec" },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#fff0ec",
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  topBarTitle: { fontSize: 16, fontWeight: "700", color: "#1f0a1a" },
  chatBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ffe8f0",
    alignItems: "center",
    justifyContent: "center",
  },

  profileSection: {
    alignItems: "center",
    paddingVertical: 28,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  avatar: { width: 88, height: 88, borderRadius: 44, marginBottom: 14 },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#fe95b4",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  avatarInitial: { color: "#fff", fontSize: 36, fontWeight: "700" },
  name: { fontSize: 22, fontWeight: "700", color: "#1f0a1a", marginBottom: 20 },

  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
  },
  statBox: { alignItems: "center", paddingHorizontal: 32 },
  statNum: { fontSize: 24, fontWeight: "800", color: "#fe95b4" },
  statLabel: { fontSize: 12, color: "#999", fontWeight: "600", marginTop: 2, textTransform: "uppercase", letterSpacing: 0.5 },
  statDivider: { width: 1, height: 36, backgroundColor: "#f0e0e8" },

  section: { paddingHorizontal: 16, marginTop: 24 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#1f0a1a", marginBottom: 14 },
  emptyText: { fontSize: 14, color: "#999", textAlign: "center", marginTop: 20 },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card: {
    width: "47.5%",
    backgroundColor: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  cardImage: { width: "100%", aspectRatio: 1 },
  cardImagePlaceholder: { backgroundColor: "#f5e8ee", justifyContent: "center", alignItems: "center" },
  placeholderText: { color: "#bbb", fontSize: 12 },
  typeBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#ffe8f0",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 9,
    letterSpacing: 1.2,
    color: "#fe95b4",
  },
  cardInfo: { padding: 10 },
  cardTitle: { fontSize: 13, fontWeight: "700", color: "#1f0a1a", marginBottom: 4 },
  cardPrice: { fontSize: 13, fontWeight: "700", color: "#fe95b4" },
});

export default SellerProfileScreen;
