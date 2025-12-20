import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Image,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "../types/navigation";
import { API_URL } from "@env";
import ItemDetailModal from "../components/ItemDetailModal";
import { useDispatch } from 'react-redux';
import { addToCart } from '../slices/cartSlice';

interface ItemImage {
  id: number;
  image: string;
  order: number;
}

interface Item {
  id: number;
  title: string;
  description: string;
  listing_type: string;
  price?: string;
  rent_price?: string;
  deposit?: string;
  display_size: string;
  display_category: string;
  condition: string;
  image?: string;
  additional_images: ItemImage[];
  image_count: number;
  username: string;
}

const SearchScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const route = useRoute();
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const dispatch = useDispatch();
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    fetchAllItems();
  }, []);

  useEffect(() => {
    filterItems();
  }, [searchQuery, items]);

  const fetchAllItems = async () => {
    setLoading(true);
    try {
      // Fetch items from all three categories
      const [buyRes, rentRes, accRes] = await Promise.all([
        fetch(`${API_URL}/api/items/?listing_type=sell`),
        fetch(`${API_URL}/api/items/?listing_type=rent`),
        fetch(`${API_URL}/api/items/?listing_type=sell_accessories`),
      ]);

      const [buyData, rentData, accData] = await Promise.all([
        buyRes.json(),
        rentRes.json(),
        accRes.json(),
      ]);

      const allItems = [...buyData, ...rentData, ...accData];
      setItems(allItems);
      setFilteredItems(allItems);
    } catch (error) {
      console.error("Failed to fetch items:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterItems = () => {
    if (!searchQuery.trim()) {
      setFilteredItems(items);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = items.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.display_category.toLowerCase().includes(query) ||
        item.username.toLowerCase().includes(query)
    );
    setFilteredItems(filtered);
  };

  const handleItemPress = (item: Item) => {
    setSelectedItem(item);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedItem(null);
  };

  const getCategoryBadge = (listingType: string) => {
    switch (listingType) {
      case "sell":
        return { label: "Buy", color: "#ff2f8f" };
      case "rent":
        return { label: "Rent", color: "#044861" };
      case "sell_accessories":
        return { label: "Accessory", color: "#48208f" };
      default:
        return { label: "Item", color: "#999" };
    }
  };

  return (
    <View style={styles.container}>
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Search</Text>
      </View>

      {/* Search input */}
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

      {/* Results */}
      <ScrollView contentContainerStyle={styles.resultsContainer}>
        {loading ? (
          <ActivityIndicator size="large" color="#ff1493" style={{ marginTop: 40 }} />
        ) : filteredItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {searchQuery ? "No items found" : "Start typing to search"}
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.resultCount}>
              {filteredItems.length} {filteredItems.length === 1 ? "item" : "items"} found
            </Text>
            <View style={styles.itemsGrid}>
              {filteredItems.map((item) => {
                const badge = getCategoryBadge(item.listing_type);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.itemCard}
                    onPress={() => handleItemPress(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.imageWrapper}>
                      {item.image ? (
                        <Image source={{ uri: `${API_URL}${item.image}` }} style={styles.itemImage} />
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
                            <Text style={styles.itemTitle} numberOfLines={1}>
                              {item.title}
                            </Text>
                            <Text style={styles.itemPrice}>
                              {item.listing_type === "rent"
                                ? `₹${item.rent_price} / day`
                                : `₹${item.price}`}
                            </Text>
                            {item.listing_type !== "sell_accessories" && (
                              <Text style={styles.itemSize}>Size: {item.display_size}</Text>
                            )}
                            <Text style={styles.itemSeller}>by @{item.username}</Text>
                            <TouchableOpacity
                              style={{ marginTop: 8, backgroundColor: '#ff1493', paddingVertical: 8, borderRadius: 8, alignItems: 'center' }}
                              onPress={() => {
                                dispatch(addToCart({ id: item.id, title: item.title, price: item.price, rent_price: item.rent_price, listing_type: item.listing_type, image: item.image || null, quantity: 1 }));
                                // eslint-disable-next-line no-undef
                                alert('Added to cart');
                              }}
                            >
                              <Text style={{ color: '#fff', fontWeight: '800' }}>Add to cart</Text>
                            </TouchableOpacity>
                          </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      <ItemDetailModal visible={modalVisible} item={selectedItem} onClose={handleCloseModal} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff9fd",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  backButtonText: {
    fontSize: 28,
    color: "#ff1493",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1e0a16",
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
  },
  searchInput: {
    backgroundColor: "#f8f8f8",
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
    fontSize: 16,
    color: "#111",
    borderWidth: 2,
    borderColor: "#ff1493",
  },
  resultsContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  resultCount: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
  },
  itemsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  itemCard: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  imageWrapper: {
    position: "relative",
  },
  itemImage: {
    width: "100%",
    height: 180,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  placeholderImage: {
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    color: "#999",
    fontSize: 12,
  },
  imageCountBadge: {
    position: "absolute",
    bottom: 6,
    right: 6,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  imageCountText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  categoryBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  itemInfo: {
    padding: 12,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e0a16",
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ff2f8f",
    marginTop: 4,
  },
  itemSize: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  itemSeller: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
});

export default SearchScreen;
