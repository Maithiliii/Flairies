import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator, TouchableOpacity, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { API_URL } from "@env";
import ItemDetailModal from "../components/ItemDetailModal";
import { useDispatch, useSelector } from 'react-redux';
import { addToCart } from '../slices/cartSlice';
import { useFocusEffect } from '@react-navigation/native';
import { RootState } from '../store';

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
  user_email?: string;
  user_profile_picture?: string;
}

const BuyScreen = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const currentUser = useSelector((state: RootState) => state.auth.user);

  const handleItemPress = (item: Item) => {
    setSelectedItem(item);
    setModalVisible(true);
  };

  const handleSellerPress = (item: Item) => {
    console.log('Buy Screen: Navigating to seller profile with:', {
      sellerEmail: item.user_email,
      sellerName: item.username,
      sellerProfilePic: item.user_profile_picture
    });
    (navigation as any).navigate('SellerProfile', { 
      sellerEmail: item.user_email,
      sellerName: item.username,
      sellerProfilePic: item.user_profile_picture
    });
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedItem(null);
  };

  const fetchItems = async () => {
    setLoading(true);
    try {
      console.log('Buy Screen: Fetching items from:', `${API_URL}/api/items/?listing_type=sell`);
      const response = await fetch(`${API_URL}/api/items/?listing_type=sell`);
      const data = await response.json();
      
      console.log('Buy Screen: Response status:', response.status);
      console.log('Buy Screen: Items received:', data.length);
      
      if (response.ok) {
        // Filter out current user's own items
        const filteredItems = currentUser 
          ? data.filter((item: Item) => item.user_email !== currentUser.email)
          : data;
        setItems(filteredItems);
      } else {
        console.error('Buy Screen: Failed to fetch items:', data);
      }
    } catch (error) {
      console.error("Buy Screen: Network error:", error);
      Alert.alert('Network Error', `Cannot connect to server at ${API_URL}. Make sure Django is running.`);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchItems();
    }, [])
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Shop the latest</Text>
      <Text style={styles.subheading}>Curated drops from Flairies community.</Text>
      
      {loading ? (
        <ActivityIndicator size="large" color="#ff1493" style={{ marginTop: 40 }} />
      ) : items.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Stay tuned ✨</Text>
          <Text style={styles.cardCopy}>No items available yet. Check back soon!</Text>
        </View>
      ) : (
        <View style={styles.itemsGrid}>
          {items.map((item) => (
            <TouchableOpacity key={item.id} style={styles.itemCard} onPress={() => handleItemPress(item)} activeOpacity={0.7}>
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
              </View>
              <View style={styles.itemInfo}>
                <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.itemPrice}>₹{item.price}</Text>
                <Text style={styles.itemSize}>Size: {item.display_size}</Text>
                <TouchableOpacity onPress={() => handleSellerPress(item)}>
                  <Text style={styles.itemSeller}>Posted by <Text style={styles.sellerName}>{item.username}</Text></Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ marginTop: 8, backgroundColor: '#ff1493', paddingVertical: 8, borderRadius: 8, alignItems: 'center' }}
                  onPress={() => {
                    dispatch(addToCart({ id: item.id, title: item.title, price: item.price, rent_price: item.rent_price, listing_type: item.listing_type, image: item.image || null, quantity: 1 }));
                    // quick feedback
                    // eslint-disable-next-line no-undef
                    alert('Added to cart');
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '800' }}>Add to cart</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <ItemDetailModal visible={modalVisible} item={selectedItem} onClose={handleCloseModal} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingTop: 80,
    paddingHorizontal: 24,
    backgroundColor: "#fff9fd",
    paddingBottom: 40,
  },
  heading: {
    fontSize: 32,
    fontWeight: "800",
    color: "#12060d",
  },
  subheading: {
    fontSize: 16,
    color: "#5e4a54",
    marginTop: 8,
    marginBottom: 24,
  },
  card: {
    marginTop: 32,
    backgroundColor: "#ffe1ef",
    borderRadius: 24,
    padding: 24,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#7c1041",
  },
  cardCopy: {
    fontSize: 16,
    color: "#41202f",
    marginTop: 8,
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
  placeholderImage: {
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    color: "#999",
    fontSize: 12,
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
  sellerName: {
    color: "#ff1493",
    fontWeight: "700",
  },
});

export default BuyScreen;
