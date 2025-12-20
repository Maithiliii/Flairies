import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Pressable,
  Alert,
  Share,
  Linking,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { useNavigation } from "@react-navigation/native";
import { addToCart } from "../slices/cartSlice";
import { API_URL } from "@env";
import { RootState } from "../store";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH * 0.9;

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
  user_profile_picture?: string | null;
  user_email?: string;
}

interface Props {
  visible: boolean;
  item: Item | null;
  onClose: () => void;
}

const ItemDetailModal: React.FC<Props> = ({ visible, item, onClose }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const dispatch = useDispatch();
  const navigation = useNavigation();
  const currentUser = useSelector((state: RootState) => state.auth.user);

  if (!item) return null;

  // Check if this is the current user's own item
  const isOwnItem = currentUser && item.username === currentUser.username;

  // Combine main image and additional images
  const allImages = [
    ...(item.image ? [item.image] : []),
    ...item.additional_images.map((img) => img.image),
  ];

  const handleNextImage = () => {
    if (currentImageIndex < allImages.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
    }
  };

  const handlePrevImage = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
    }
  };

  const getConditionDisplay = (condition: string) => {
    const conditionMap: Record<string, string> = {
      new: "New",
      like_new: "Like New",
      good: "Good",
      used: "Used",
    };
    return conditionMap[condition] || condition;
  };

  const getPriceDisplay = () => {
    if (item.listing_type === "rent") {
      return `₹${item.rent_price} / day`;
    } else if (item.listing_type === "donate") {
      return "Free (Donation)";
    } else {
      return `₹${item.price}`;
    }
  };

  const handleAddToCart = () => {
    if (item.listing_type === "donate") {
      Alert.alert("Cannot Add", "Donation items cannot be added to cart");
      return;
    }

    dispatch(addToCart({
      id: item.id,
      title: item.title,
      price: item.price,
      rent_price: item.rent_price,
      listing_type: item.listing_type,
      image: item.image,
      quantity: 1,
    }));

    Alert.alert("Added to Cart", `${item.title} has been added to your cart`);
  };

  const handleShare = async () => {
    try {
      const priceText = item.listing_type === "rent" 
        ? `₹${item.rent_price}/day` 
        : item.listing_type === "donate" 
        ? "Free (Donation)" 
        : `₹${item.price}`;

      // Create a shareable link (you can customize this URL)
      const itemLink = `https://flairies.app/item/${item.id}`;

      const message = `Check out this item on Flairies! 🛍️\n\n` +
        `${item.title}\n` +
        `${item.description ? item.description + '\n\n' : '\n'}` +
        `💰 Price: ${priceText}\n` +
        `📏 Size: ${item.display_size}\n` +
        `✨ Condition: ${getConditionDisplay(item.condition)}\n` +
        `📦 Category: ${item.display_category}\n\n` +
        `Posted by ${item.username}\n\n` +
        `View item: ${itemLink}`;

      const result = await Share.share({
        message: message,
        title: `Check out this item on Flairies`,
        url: itemLink, // This works on iOS
      });

      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          console.log('Shared via:', result.activityType);
        } else {
          console.log('Shared successfully');
        }
      }
    } catch (error) {
      console.error('Error sharing:', error);
      Alert.alert('Error', 'Failed to share item');
    }
  };

  const handleContactSeller = () => {
    if (item.user_email && item.username) {
      (navigation as any).navigate('Chat', { 
        recipientEmail: item.user_email, 
        recipientName: item.username,
        recipientProfilePic: item.user_profile_picture
      });
    } else {
      Alert.alert('Error', 'Unable to contact seller');
    }
  };

  const handleViewSellerProfile = () => {
    if (item.user_email && item.username) {
      (navigation as any).navigate('SellerProfile', {
        sellerEmail: item.user_email,
        sellerName: item.username,
        sellerProfilePic: item.user_profile_picture
      });
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          {/* Header buttons */}
          <View style={styles.headerButtons}>
            <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
              <Text style={styles.shareButtonText}>↗</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={true}>
            {/* Image carousel */}
            <View style={styles.imageContainer} pointerEvents="box-none">
              {allImages.length > 0 ? (
                <>
                  <Image
                    source={{ uri: `${API_URL}${allImages[currentImageIndex]}` }}
                    style={styles.image}
                    resizeMode="cover"
                  />
                  {allImages.length > 1 && (
                    <>
                      {/* Image indicator dots */}
                      <View style={styles.dotsContainer} pointerEvents="none">
                        {allImages.map((_, index) => (
                          <View
                            key={index}
                            style={[styles.dot, index === currentImageIndex && styles.dotActive]}
                          />
                        ))}
                      </View>
                      {/* Navigation arrows - small and at edges */}
                      <View style={styles.arrowsContainer} pointerEvents="box-none">
                        {currentImageIndex > 0 && (
                          <TouchableOpacity style={styles.leftArrow} onPress={handlePrevImage} activeOpacity={0.8}>
                            <Text style={styles.arrowText}>‹</Text>
                          </TouchableOpacity>
                        )}
                        {currentImageIndex < allImages.length - 1 && (
                          <TouchableOpacity style={styles.rightArrow} onPress={handleNextImage} activeOpacity={0.8}>
                            <Text style={styles.arrowText}>›</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </>
                  )}
                </>
              ) : (
                <View style={[styles.image, styles.placeholderImage]}>
                  <Text style={styles.placeholderText}>No Image</Text>
                </View>
              )}
            </View>

            {/* Scroll indicator hint */}
            <View style={styles.scrollHint}>
              <View style={styles.scrollBar} />
              <Text style={styles.scrollText}>Scroll for details</Text>
            </View>

            {/* Item details */}
            <View style={styles.detailsContainer}>
              <Text style={styles.title}>{item.title}</Text>
              
              {item.description ? (
                <Text style={styles.description}>{item.description}</Text>
              ) : null}

              <Text style={styles.price}>{getPriceDisplay()}</Text>

              {item.listing_type === "rent" && item.deposit && parseFloat(item.deposit) > 0 && (
                <Text style={styles.deposit}>Security Deposit: ₹{item.deposit}</Text>
              )}

              <View style={styles.infoGrid}>
                {item.listing_type !== "sell_accessories" && (
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Size</Text>
                    <Text style={styles.infoValue}>{item.display_size}</Text>
                  </View>
                )}
                
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Category</Text>
                  <Text style={styles.infoValue}>{item.display_category}</Text>
                </View>

                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Condition</Text>
                  <Text style={styles.infoValue}>{getConditionDisplay(item.condition)}</Text>
                </View>
              </View>

              {/* Action Buttons - Only show if not own item */}
              {!isOwnItem && (
                <>
                  <View style={styles.actionButtons}>
                    {item.listing_type !== "donate" && (
                      <TouchableOpacity style={styles.addToCartButton} onPress={handleAddToCart} activeOpacity={0.8}>
                        <Text style={styles.addToCartText}>Add to Cart</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.contactButton} onPress={handleContactSeller} activeOpacity={0.8}>
                      <Text style={styles.contactButtonText}>Contact Seller</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Posted by */}
                  <TouchableOpacity style={styles.footer} onPress={handleViewSellerProfile} activeOpacity={0.7}>
                    {item.user_profile_picture ? (
                      <Image 
                        source={{ uri: `${API_URL}${item.user_profile_picture}` }} 
                        style={styles.profilePic}
                      />
                    ) : (
                      <View style={styles.profilePicPlaceholder}>
                        <Text style={styles.profilePicInitial}>
                          {item.username.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <Text style={styles.postedBy}>Posted by {item.username}</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    width: CARD_WIDTH,
    maxHeight: "85%",
    backgroundColor: "#fff",
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  headerButtons: {
    position: "absolute",
    top: 16,
    right: 16,
    flexDirection: "row",
    gap: 8,
    zIndex: 10,
  },
  shareButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 20, 147, 0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  shareButtonText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
  imageContainer: {
    position: "relative",
    width: "100%",
    height: 400,
    backgroundColor: "#f0f0f0",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  placeholderImage: {
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    color: "#999",
    fontSize: 16,
  },
  arrowsContainer: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  leftArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  rightArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  arrowText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
  },
  dotsContainer: {
    position: "absolute",
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
  },
  dotActive: {
    backgroundColor: "#fff",
    width: 24,
  },
  scrollHint: {
    alignItems: "center",
    paddingVertical: 12,
    backgroundColor: "#f8f8f8",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  scrollBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#ddd",
    marginBottom: 6,
  },
  scrollText: {
    fontSize: 11,
    color: "#999",
    fontWeight: "600",
  },
  detailsContainer: {
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1e0a16",
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: "#666",
    lineHeight: 24,
    marginBottom: 16,
  },
  price: {
    fontSize: 28,
    fontWeight: "700",
    color: "#ff2f8f",
    marginBottom: 8,
  },
  deposit: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginTop: 16,
  },
  infoItem: {
    minWidth: "30%",
  },
  infoLabel: {
    fontSize: 12,
    color: "#999",
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: "#333",
    fontWeight: "600",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  addToCartButton: {
    flex: 1,
    backgroundColor: "#ff1493",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#ff1493",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  addToCartText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  contactButton: {
    flex: 1,
    backgroundColor: "#fff",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#ff1493",
  },
  contactButtonText: {
    color: "#ff1493",
    fontSize: 15,
    fontWeight: "700",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  profilePic: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  profilePicPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#ff1493",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  profilePicInitial: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  postedBy: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
});

export default ItemDetailModal;
