import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, ActivityIndicator, Alert } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useSelector } from "react-redux";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "../../types/navigation";
import { RootState } from "../../store";
import { API_URL } from "@env";
import ItemDetailModal from "../../components/ItemDetailModal";

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

const ClosetScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const user = useSelector((state: RootState) => state.auth.user);
  const [activeTab, setActiveTab] = useState<"Selling" | "Renting">("Selling");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const handleItemPress = (item: Item) => {
    setSelectedItem(item);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedItem(null);
  };

  const fetchUserItems = async () => {
    if (!user) {
      console.log("Closet: No user logged in");
      setLoading(false);
      return;
    }
    
    setLoading(true);
    const url = `${API_URL}/api/items/user/?email=${encodeURIComponent(user.email)}`;
    console.log("Closet: Fetching from URL:", url);
    console.log("Closet: User email:", user.email);
    
    try {
      const response = await fetch(url);
      console.log("Closet: Response status:", response.status);
      
      const data = await response.json();
      console.log("Closet: Response data:", JSON.stringify(data, null, 2));

      if (response.ok) {
        console.log("Closet: Setting items, count:", data.length);
        setItems(data);
        
        // If no items found, also fetch debug info
        if (data.length === 0) {
          console.log("Closet: No items found, fetching debug info...");
          try {
            const debugUrl = `${API_URL}/api/items/user/?email=${encodeURIComponent(user.email)}&debug=true`;
            const debugResponse = await fetch(debugUrl);
            const debugData = await debugResponse.json();
            console.log("Closet: Debug data:", JSON.stringify(debugData, null, 2));
          } catch (debugError) {
            console.error("Closet: Debug fetch failed:", debugError);
          }
        }
      } else {
        console.error('Closet: Fetch failed', response.status, data);
        setItems([]);
        Alert.alert('Error', `Failed to fetch items: ${JSON.stringify(data)}`);
      }
    } catch (error) {
      console.error("Closet: Network error:", error);
      setItems([]);
      Alert.alert('Network Error', `Cannot connect to server at ${API_URL}. Make sure Django is running.`);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchUserItems();
    }, [user])
  );

  const sellingItems = items.filter(item => 
    item.listing_type === "sell" || item.listing_type === "sell_accessories"
  );
  
  const rentingItems = items.filter(item => item.listing_type === "rent");

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Closet</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate("AddListing")}>
          <Text style={styles.addButtonText}>＋</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabRow}>
        {(["Selling", "Renting"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listingsContainer}>
        {loading ? (
          <ActivityIndicator size="large" color="#ff66b3" style={{ marginTop: 40 }} />
        ) : (
          <>
            {(activeTab === "Selling" ? sellingItems : rentingItems).length === 0 ? (
              <Text style={styles.emptyText}>No items yet. Add your first item!</Text>
            ) : (
              (activeTab === "Selling" ? sellingItems : rentingItems).map((item) => (
                <TouchableOpacity key={item.id} style={styles.card} onPress={() => handleItemPress(item)} activeOpacity={0.7}>
                  <View style={styles.cardImageContainer}>
                    {item.image ? (
                      <Image source={{ uri: `${API_URL}${item.image}` }} style={styles.cardImage} resizeMode="cover" />
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
                    {item.description ? (
                      <Text style={styles.cardDescription} numberOfLines={2}>{item.description}</Text>
                    ) : null}
                    <Text style={styles.cardPrice}>
                      {item.listing_type === "rent" 
                        ? `₹${item.rent_price} / day` 
                        : `₹${item.price}`}
                    </Text>
                    {item.listing_type !== "sell_accessories" && (
                      <Text style={styles.cardSize}>Size: {item.display_size}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))
            )}
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
    backgroundColor: "#fff5fb",
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1f0a1a",
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#ff66b3",
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonText: {
    fontSize: 28,
    color: "#fff",
    marginTop: -4,
  },
  tabRow: {
    flexDirection: "row",
    backgroundColor: "#ffe1ef",
    borderRadius: 999,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: "center",
  },
  tabButtonActive: {
    backgroundColor: "#fff",
  },
  tabLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#a13872",
  },
  tabLabelActive: {
    color: "#ff2f8f",
  },
  listingsContainer: {
    paddingVertical: 24,
    gap: 16,
    paddingBottom: 120,
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  cardImageContainer: {
    position: "relative",
    marginRight: 16,
  },
  cardImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
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
  cardMeta: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1e0a16",
  },
  cardDescription: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
    lineHeight: 18,
  },
  cardPrice: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ff2f8f",
    marginTop: 6,
  },
  cardSize: {
    fontSize: 14,
    color: "#555",
    marginTop: 4,
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
    marginTop: 40,
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
});

export default ClosetScreen;

