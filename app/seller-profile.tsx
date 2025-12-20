import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator, TouchableOpacity } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { API_URL } from "@env";

interface Item {
  id: number;
  title: string;
  image?: string;
  price?: string;
  rent_price?: string;
  listing_type: string;
  image_count: number;
}

const SellerProfileScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { sellerEmail, sellerName, sellerProfilePic } = route.params as any;
  
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSellerItems();
  }, []);

  const fetchSellerItems = async () => {
    try {
      const response = await fetch(`${API_URL}/api/items/user/?email=${encodeURIComponent(sellerEmail)}`);
      const data = await response.json();
      
      if (response.ok) {
        setItems(data);
      }
    } catch (error) {
      console.error("Failed to fetch seller items:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleContactSeller = () => {
    (navigation as any).navigate('Chat', { 
      recipientEmail: sellerEmail, 
      recipientName: sellerName,
      recipientProfilePic: sellerProfilePic
    });
  };

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.header}>
        {sellerProfilePic ? (
          <Image source={{ uri: `${API_URL}${sellerProfilePic}` }} style={styles.profilePic} />
        ) : (
          <View style={styles.profilePicPlaceholder}>
            <Text style={styles.profileInitial}>
              {sellerName && sellerName.length > 0 ? sellerName.charAt(0).toUpperCase() : '?'}
            </Text>
          </View>
        )}
        <View style={styles.nameRatingContainer}>
          <Text style={styles.name}>{sellerName || 'Unknown Seller'}</Text>
          <View style={styles.ratingContainer}>
            <Text style={styles.starIcon}>⭐</Text>
            <Text style={styles.ratingText}>4.8</Text>
            <Text style={styles.ratingCount}>(24)</Text>
          </View>
        </View>
        
        {/* Contact Details Section */}
        <View style={styles.contactDetails}>
          <Text style={styles.sectionLabel}>Contact Details</Text>
          <Text style={styles.email}>{sellerEmail}</Text>
        </View>
        
        {/* Contact Seller Button */}
        <TouchableOpacity style={styles.contactButton} onPress={handleContactSeller}>
          <Text style={styles.contactButtonText}>💬 Contact Seller</Text>
        </TouchableOpacity>
      </View>

      {/* Seller's Items */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Items by {sellerName}</Text>
        
        {loading ? (
          <ActivityIndicator size="large" color="#ff1493" style={{ marginTop: 20 }} />
        ) : items.length === 0 ? (
          <Text style={styles.emptyText}>No items listed yet</Text>
        ) : (
          <View style={styles.itemsGrid}>
            {items.map((item) => (
              <TouchableOpacity key={item.id} style={styles.itemCard}>
                {item.image ? (
                  <Image source={{ uri: `${API_URL}${item.image}` }} style={styles.itemImage} />
                ) : (
                  <View style={[styles.itemImage, styles.placeholderImage]}>
                    <Text style={styles.placeholderText}>No Image</Text>
                  </View>
                )}
                {item.image_count > 1 && (
                  <View style={styles.imageCountBadge}>
                    <Text style={styles.imageCountText}>+{item.image_count - 1} 📷</Text>
                  </View>
                )}
                <View style={styles.itemInfo}>
                  <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.itemPrice}>
                    {item.listing_type === "rent" ? `₹${item.rent_price}/day` : `₹${item.price}`}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    backgroundColor: "#fff",
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  profilePic: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  profilePicPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#ff1493",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  profileInitial: {
    color: "#fff",
    fontSize: 40,
    fontWeight: "700",
  },
  nameRatingContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1f0a1a",
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  starIcon: {
    fontSize: 16,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
  },
  ratingCount: {
    fontSize: 14,
    color: "#999",
    marginLeft: 2,
  },
  contactDetails: {
    alignItems: "center",
    marginBottom: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    width: "100%",
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#999",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  email: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  contactButton: {
    backgroundColor: "#ff1493",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 24,
    shadowColor: "#ff1493",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  contactButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f0a1a",
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    marginTop: 20,
  },
  itemsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  itemCard: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  itemImage: {
    width: "100%",
    height: 140,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
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
  },
  imageCountText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  itemInfo: {
    padding: 12,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ff1493",
  },
});

export default SellerProfileScreen;
