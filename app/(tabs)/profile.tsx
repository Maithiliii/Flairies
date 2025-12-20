import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert } from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { useNavigation } from "@react-navigation/native";
import { setUser, logout } from "../../slices/authSlice";
import { RootState } from "../../store";
import { API_URL } from "@env";
import ItemDetailModal from "../../components/ItemDetailModal";
import ConfirmationModal from "../../components/ConfirmationModal";
// @ts-ignore
import * as ImagePicker from "expo-image-picker";

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
  is_claimed: boolean;
}

const ProfileScreen = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const [donations, setDonations] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    if (user) {
      fetchDonations();
      // Load profile picture from user data
      if (user.profile_picture) {
        setProfileImage(`${API_URL}${user.profile_picture}`);
      }
    }
  }, [user]);

  const fetchDonations = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/items/user/?email=${encodeURIComponent(user.email)}&include_donations=true`);
      const data = await response.json();

      if (response.ok) {
        // Filter only donations
        const donationItems = data.filter((item: Item) => item.listing_type === "donate");
        setDonations(donationItems);
        console.log("Donations loaded:", donationItems.length);
      }
    } catch (error) {
      console.error("Failed to fetch donations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleItemPress = (item: Item) => {
    setSelectedItem(item);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedItem(null);
  };

  const pickProfileImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Permission to access photos is required.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && user) {
      const uri = result.assets[0].uri;
      setProfileImage(uri);
      
      // Upload to server
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("email", user.email);
        
        const uriParts = uri.split('.');
        const fileType = uriParts[uriParts.length - 1];
        
        formData.append("profile_picture", {
          uri: uri,
          name: `profile.${fileType}`,
          type: `image/${fileType}`,
        } as any);

        const response = await fetch(`${API_URL}/api/profile/picture/`, {
          method: "POST",
          body: formData,
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        const data = await response.json();
        console.log("Profile picture upload response:", data);

        if (response.ok) {
          Alert.alert("Success", "Profile picture updated!");
          // Update the profile image with the server URL
          if (data.profile_picture) {
            setProfileImage(`${API_URL}${data.profile_picture}`);
            // Update Redux store
            if (user) {
              dispatch(setUser({ ...user, profile_picture: data.profile_picture }));
            }
          }
        } else {
          Alert.alert("Error", `Failed to update: ${JSON.stringify(data)}`);
          setProfileImage(user.profile_picture ? `${API_URL}${user.profile_picture}` : null);
        }
      } catch (error) {
        console.error("Failed to upload profile picture:", error);
        Alert.alert("Error", "Failed to upload profile picture");
        setProfileImage(user.profile_picture ? `${API_URL}${user.profile_picture}` : null);
      } finally {
        setUploading(false);
      }
    }
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    dispatch(logout());
    // Navigate to login screen
    navigation.navigate("Login" as never);
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Please log in to view your profile</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Curved Background */}
      <View style={styles.curvedBackground}>
        <View style={styles.curve} />
      </View>

      {/* Profile Header */}
      <View style={styles.header}>
        {/* Profile Picture Circle */}
        <TouchableOpacity style={styles.profilePicContainer} onPress={pickProfileImage} activeOpacity={0.8} disabled={uploading}>
          <View style={styles.profilePic}>
            {uploading ? (
              <ActivityIndicator size="large" color="#ff66b3" />
            ) : profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.profilePicImage} />
            ) : (
              <Text style={styles.profileInitial}>{user.username.charAt(0).toUpperCase()}</Text>
            )}
          </View>
          <View style={styles.editBadge}>
            <Text style={styles.editIcon}>✏️</Text>
          </View>
        </TouchableOpacity>

        {/* Name */}
        <Text style={styles.name}>{user.username}</Text>

        {/* Email and Phone */}
        <View style={styles.contactRow}>
          <Text style={styles.contactText}>{user.email}</Text>
          {user.phone_number && (
            <>
              <Text style={styles.separator}>  |  </Text>
              <Text style={styles.contactText}>+91 {user.phone_number}</Text>
            </>
          )}
        </View>
      </View>

      {/* Me Section - Action Buttons */}
      <View style={styles.section}>
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate("BankDetails" as never)}>
            <Text style={styles.actionIcon}>🏦</Text>
            <Text style={styles.actionText}>Bank Details</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate("Orders" as never)}>
            <Text style={styles.actionIcon}>📦</Text>
            <Text style={styles.actionText}>My Orders</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate("MyEarnings" as never)}>
            <Text style={styles.actionIcon}>💰</Text>
            <Text style={styles.actionText}>My Earnings</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Donations Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Donations</Text>
          <Text style={styles.sectionSubtitle}>Items you've donated to help others</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#ff66b3" style={{ marginTop: 20 }} />
        ) : donations.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>💝</Text>
            <Text style={styles.emptyText}>No donations yet</Text>
            <Text style={styles.emptySubtext}>Share the love by donating items you no longer need</Text>
          </View>
        ) : (
          <View style={styles.donationsGrid}>
            {donations.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.donationCard}
                onPress={() => handleItemPress(item)}
                activeOpacity={0.7}
              >
                <View style={styles.donationImageWrapper}>
                  {item.image ? (
                    <Image source={{ uri: `${API_URL}${item.image}` }} style={styles.donationImage} />
                  ) : (
                    <View style={[styles.donationImage, styles.placeholderImage]}>
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
                <View style={styles.donationInfo}>
                  <Text style={styles.donationTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.donationCategory}>{item.display_category}</Text>
                  <Text style={styles.donationSize}>Size: {item.display_size}</Text>
                  
                  {/* Status Badge */}
                  <View style={[styles.statusBadge, item.is_claimed ? styles.statusClaimed : styles.statusAvailable]}>
                    <Text style={styles.statusText}>
                      {item.is_claimed ? "✓ Claimed" : "● Available"}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Logout Section */}
      <View style={styles.logoutSection}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
        
        <Text style={styles.logoutSubtext}>
          You'll need to login again to access your account
        </Text>
      </View>

      <ItemDetailModal visible={modalVisible} item={selectedItem} onClose={handleCloseModal} />
      
      <ConfirmationModal
        visible={showLogoutConfirm}
        title="Logout"
        message="Are you sure you want to logout? You'll need to login again to access your account."
        confirmText="Logout"
        cancelText="Stay"
        onConfirm={confirmLogout}
        onCancel={cancelLogout}
        confirmColor="#ff4757"
        icon="🚪"
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff5fb",
  },
  contentContainer: {
    paddingBottom: 100,
  },
  curvedBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 280,
    backgroundColor: "#ff66b3",
    overflow: "hidden",
  },
  curve: {
    position: "absolute",
    bottom: -50,
    left: -50,
    right: -50,
    height: 150,
    backgroundColor: "#fff5fb",
    borderTopLeftRadius: 200,
    borderTopRightRadius: 200,
  },
  header: {
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 32,
    zIndex: 1,
  },
  profilePicContainer: {
    marginBottom: 16,
    position: "relative",
  },
  profilePic: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 5,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 5 },
    elevation: 10,
    overflow: "hidden",
  },
  profilePicImage: {
    width: "100%",
    height: "100%",
  },
  profileInitial: {
    fontSize: 40,
    fontWeight: "700",
    color: "#ff66b3",
  },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#ff66b3",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  editIcon: {
    fontSize: 14,
  },
  name: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1e0a16",
    marginBottom: 8,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  contactText: {
    fontSize: 14,
    color: "#333",
  },
  separator: {
    fontSize: 14,
    color: "#999",
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1e0a16",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#999",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    lineHeight: 20,
  },
  donationsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  donationCard: {
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
  donationImageWrapper: {
    position: "relative",
  },
  donationImage: {
    width: "100%",
    height: 150,
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
  donationInfo: {
    padding: 12,
  },
  donationTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e0a16",
    marginBottom: 4,
  },
  donationCategory: {
    fontSize: 13,
    color: "#ff66b3",
    fontWeight: "600",
    marginBottom: 2,
  },
  donationSize: {
    fontSize: 12,
    color: "#999",
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  statusAvailable: {
    backgroundColor: "#4caf50",
  },
  statusClaimed: {
    backgroundColor: "#f44336",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
  },
  errorText: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
    marginTop: 60,
  },
  actionsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
  },
  logoutSection: {
    marginTop: 48,
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: "center",
  },
  logoutButton: {
    alignItems: "center",
    backgroundColor: "#ff4757",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: "#ff4757",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    marginBottom: 12,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
  logoutSubtext: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    lineHeight: 16,
  },
});

export default ProfileScreen;
