import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, Alert, LayoutAnimation, Platform, UIManager,
} from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { setUser, logout } from "../../slices/authSlice";
import { RootState } from "../../store";
import ConfirmationModal from "../../components/ConfirmationModal";
// @ts-ignore
import * as ImagePicker from "expo-image-picker";
import { supabase, getImageUrl, uploadImage } from "../../lib/supabase";
import {
  Landmark, PackageOpen, IndianRupee, MapPin, LogOut,
  ChevronRight, ChevronDown, ChevronUp, Heart, Plus, Star, Info, Bookmark, Pencil, Store,
} from "lucide-react-native";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface ItemImage { id: number; image_url: string | null; order: number; }
interface Item {
  id: number; title: string; listing_type: string;
  display_category: string; display_size: string;
  image_url?: string | null; image_count: number; is_claimed: boolean;
}

const MENU_ITEMS = [
  { key: "favorites", label: "Favorites",    icon: Bookmark,      route: "Favorites"   },
  { key: "orders",    label: "My Orders",    icon: PackageOpen,   route: "Orders"      },
  { key: "sales",     label: "My Sales",     icon: Store,         route: "MySales"     },
  { key: "earnings",  label: "My Earnings",  icon: IndianRupee,   route: "MyEarnings"  },
  { key: "bank",      label: "Bank Details", icon: Landmark,      route: "BankDetails" },
];

const ProfileScreen = () => {
  const user       = useSelector((state: RootState) => state.auth.user);
  const dispatch   = useDispatch();
  const navigation = useNavigation();
  const insets     = useSafeAreaInsets();

  const [donations, setDonations]         = useState<Item[]>([]);
  const [loading, setLoading]             = useState(true);
  const [profileImage, setProfileImage]   = useState<string | null>(null);
  const [uploading, setUploading]         = useState(false);
  const [showLogout, setShowLogout]       = useState(false);
  const [donationsOpen, setDonationsOpen] = useState(false);
  const [address, setAddress]             = useState<string | null>(null);
  const [rating, setRating]               = useState<number | null>(null);

  useEffect(() => {
    if (user) {
      fetchDonations();
      fetchAddress();
      fetchRating();
      if (user.profile_picture_url) setProfileImage(user.profile_picture_url);
    }
  }, [user]);

  const fetchRating = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from("reviews")
        .select("rating")
        .eq("seller_id", user.id);
      if (data && data.length > 0) {
        const avg = data.reduce((s: number, r: any) => s + r.rating, 0) / data.length;
        setRating(Math.round(avg * 10) / 10);
      }
    } catch { /* reviews table may not exist yet */ }
  };

  const fetchAddress = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("address")
      .eq("id", user.id)
      .single();
    setAddress(data?.address ?? null);
  };

  const fetchDonations = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("items")
        .select("*, item_images(id, image_url, sort_order)")
        .eq("user_id", user.id)
        .eq("listing_type", "donate")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDonations(
        (data || []).map((raw): Item => ({
          id: raw.id, title: raw.title, listing_type: raw.listing_type,
          display_category: raw.custom_category || raw.category || "",
          display_size: raw.custom_size || raw.size || "",
          image_url: getImageUrl(raw.image_url),
          image_count: (raw.item_images?.length || 0) + (raw.image_url ? 1 : 0),
          is_claimed: raw.is_claimed || false,
        }))
      );
    } catch (e) {
      console.error("Failed to fetch donations:", e);
    } finally {
      setLoading(false);
    }
  };

  const pickProfileImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Alert.alert("Permission required", "Permission to access photos is required."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.8,
    });
    if (!result.canceled && result.assets && user) {
      const uri = result.assets[0].uri;
      setProfileImage(uri);
      setUploading(true);
      try {
        const path = await uploadImage("profiles", user.id, uri);
        if (!path) throw new Error("Upload failed");
        await supabase.from("profiles").update({ profile_picture_url: path }).eq("id", user.id);
        const fullUrl = getImageUrl(path);
        setProfileImage(fullUrl);
        dispatch(setUser({ ...user, profile_picture_url: fullUrl }));
      } catch {
        Alert.alert("Error", "Failed to upload profile picture");
        setProfileImage(user.profile_picture_url || null);
      } finally {
        setUploading(false);
      }
    }
  };

  const confirmLogout = () => {
    setShowLogout(false);
    supabase.auth.signOut();
    dispatch(logout());
    navigation.navigate("Login" as never);
  };

  const toggleDonations = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setDonationsOpen((v) => !v);
  };

  if (!user) {
    return <View style={styles.container}><Text style={styles.errorText}>Please log in to view your profile</Text></View>;
  }

  const firstName = user.name?.split(" ")[0] ?? "";

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Pink background — in-flow so it scrolls away with content */}
        <View style={[styles.pinkBg, { height: insets.top + 165 }]} />

        {/* ── Profile card — negative marginTop overlaps the pink ── */}
        <View style={[styles.profileCard, { marginTop: -85 }]}>
          {/* Profile pic */}
          <TouchableOpacity
            style={styles.picWrap}
            onPress={pickProfileImage}
            activeOpacity={0.85}
            disabled={uploading}
          >
            <View style={styles.profilePic}>
              {uploading ? (
                <ActivityIndicator size="large" color="#fe95b4" />
              ) : profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.profilePicImage} />
              ) : (
                <Text style={styles.profileInitial}>{user.name.charAt(0).toUpperCase()}</Text>
              )}
            </View>
            <View style={styles.editBadge}><Pencil size={13} color="#fe95b4" strokeWidth={2.5} /></View>
          </TouchableOpacity>

          {/* Rating badge — top right of card */}
          <View style={styles.ratingBadge}>
            <Star
              size={13}
              color="#fe95b4"
              fill={rating !== null ? "#fe95b4" : "none"}
              strokeWidth={2}
            />
            <Text style={styles.ratingText}>
              {rating !== null ? rating.toFixed(1) : "—"}
            </Text>
          </View>

          {/* Name + email & phone on one line */}
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.contactText}>
            {user.email}
            {user.phone_number ? `  ·  ${user.phone_number}` : ""}
          </Text>
        </View>

      {/* ── Menu card ── */}
      <View style={styles.menuCard}>

        {/* Standard rows */}
        {MENU_ITEMS.map((item, idx) => {
          const Icon = item.icon;
          return (
            <React.Fragment key={item.key}>
              <TouchableOpacity
                style={styles.menuRow}
                onPress={() => navigation.navigate(item.route as never)}
                activeOpacity={0.7}
              >
                <View style={styles.menuIconBox}>
                  <Icon size={20} color="#fe95b4" strokeWidth={1.8} />
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <ChevronRight size={18} color="#ccc" strokeWidth={2} />
              </TouchableOpacity>
              {idx < MENU_ITEMS.length - 1 && <View style={styles.divider} />}
            </React.Fragment>
          );
        })}

        <View style={styles.divider} />

        {/* Address row */}
        <TouchableOpacity
          style={styles.menuRow}
          onPress={() => (navigation as any).navigate("AddressSetup", { user, fromProfile: true })}
          activeOpacity={0.7}
        >
          <View style={styles.menuIconBox}>
            <MapPin size={20} color="#fe95b4" strokeWidth={1.8} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuLabel}>Address</Text>
            {address ? (
              <Text style={styles.menuSub} numberOfLines={1}>{address}</Text>
            ) : (
              <Text style={[styles.menuSub, { color: "#fe95b4" }]}>Tap to add your address</Text>
            )}
          </View>
          <ChevronRight size={18} color="#ccc" strokeWidth={2} />
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* About row */}
        <TouchableOpacity
          style={styles.menuRow}
          onPress={() => (navigation as any).navigate("About")}
          activeOpacity={0.7}
        >
          <View style={styles.menuIconBox}>
            <Info size={20} color="#fe95b4" strokeWidth={1.8} />
          </View>
          <Text style={styles.menuLabel}>About</Text>
          <ChevronRight size={18} color="#ccc" strokeWidth={2} />
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* Logout row */}
        <TouchableOpacity style={styles.menuRow} onPress={() => setShowLogout(true)} activeOpacity={0.7}>
          <View style={styles.menuIconBox}>
            <LogOut size={20} color="#e53935" strokeWidth={1.8} />
          </View>
          <Text style={[styles.menuLabel, { color: "#e53935" }]}>Logout</Text>
          <ChevronRight size={18} color="#ccc" strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* ── Donations collapsible ── */}
      <View style={styles.donationCard}>
        <TouchableOpacity style={styles.donationHeader} onPress={toggleDonations} activeOpacity={0.7}>
          <View style={styles.menuIconBox}>
            <Heart size={20} color="#fe95b4" strokeWidth={1.8} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuLabel}>My Donations</Text>
            <Text style={styles.menuSub}>{donations.length} item{donations.length !== 1 ? "s" : ""} donated</Text>
          </View>
          {donationsOpen
            ? <ChevronUp size={18} color="#ccc" strokeWidth={2} />
            : <ChevronDown size={18} color="#ccc" strokeWidth={2} />}
        </TouchableOpacity>

        {donationsOpen && (
          <View style={styles.donationBody}>
            {/* About donations blurb */}
            <View style={styles.donationInfo}>
              <Text style={styles.donationInfoText}>
                Have clothes you no longer wear? List them here and we will reach out to you when someone is ready to collect. All donations go to people in need or local charities. No payments, no hassle, just clothes finding a new home.
              </Text>
            </View>

            {/* Add donation button */}
            <TouchableOpacity
              style={styles.addDonationBtn}
              onPress={() => (navigation as any).navigate("AddDonation")}
              activeOpacity={0.85}
            >
              <Plus size={16} color="#fff" strokeWidth={2.5} />
              <Text style={styles.addDonationText}>Add Donation</Text>
            </TouchableOpacity>

            {/* Donation grid */}
            {loading ? (
              <ActivityIndicator size="small" color="#fe95b4" style={{ marginTop: 16 }} />
            ) : donations.length === 0 ? (
              <Text style={styles.emptyText}>No donations yet</Text>
            ) : (
              <View style={styles.donationsGrid}>
                {donations.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.donItem}
                    onPress={() => (navigation as any).navigate("ItemDetail", { itemId: item.id })}
                    activeOpacity={0.8}
                  >
                    {item.image_url ? (
                      <Image source={{ uri: item.image_url }} style={styles.donImg} resizeMode="cover" />
                    ) : (
                      <View style={[styles.donImg, styles.donImgPlaceholder]}>
                        <Text style={{ color: "#bbb", fontSize: 11 }}>No Image</Text>
                      </View>
                    )}
                    <View style={styles.donItemInfo}>
                      <Text style={styles.donTitle} numberOfLines={1}>{item.title}</Text>
                      <View style={[styles.statusBadge, item.is_claimed ? styles.statusClaimed : styles.statusAvailable]}>
                        <Text style={styles.statusText}>{item.is_claimed ? "Claimed" : "Available"}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}
      </View>

        <ConfirmationModal
          visible={showLogout}
          title="Logout"
          message="Are you sure you want to logout?"
          confirmText="Logout"
          cancelText="Stay"
          onConfirm={confirmLogout}
          onCancel={() => setShowLogout(false)}
          confirmColor="#e53935"
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff0ec" },
  content: { paddingBottom: 40 },
  errorText: { textAlign: "center", marginTop: 60, color: "#999" },

  // Pink background — in-flow, scrolls with content
  pinkBg: {
    backgroundColor: "#fe95b4",
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
  },

  // Profile card — floats on top of pink bg
  profileCard: {
    marginHorizontal: 16,
    backgroundColor: "#fff",
    borderRadius: 20,
    shadowColor: "#000", shadowOpacity: 0.10, shadowRadius: 14, elevation: 6,
    alignItems: "center",
    paddingBottom: 20,
  },
  picWrap: {
    position: "relative",
    marginTop: -50,  // half of 100px pic protrudes above card into pink zone
    marginBottom: 12,
  },
  profilePic: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: "#fff", alignItems: "center", justifyContent: "center",
    borderWidth: 4, borderColor: "#fff",
    shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 10, elevation: 6,
    overflow: "hidden",
  },
  profilePicImage: { width: "100%", height: "100%" },
  profileInitial: { fontSize: 36, fontWeight: "700", color: "#fe95b4" },
  editBadge: {
    position: "absolute", bottom: 2, right: 2,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "#fff", alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "#fe95b4",
  },
  name: { fontSize: 20, fontWeight: "700", color: "#1e0a16", marginBottom: 6, textAlign: "center" },
  contactText: { fontSize: 12, color: "#999", textAlign: "center", paddingHorizontal: 16, marginBottom: 20 },
  ratingBadge: {
    position: "absolute",
    top: 14,
    right: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fff0ec",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
  },
  ratingText: { fontSize: 13, fontWeight: "700", color: "#fe95b4" },

  // Menu card
  menuCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 10, elevation: 4,
    overflow: "hidden",
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 14,
  },
  menuIconBox: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "#fff0ec",
    alignItems: "center", justifyContent: "center",
  },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: "600", color: "#1f0a1a" },
  menuSub: { fontSize: 12, color: "#aaa", marginTop: 1 },
  divider: { height: 1, backgroundColor: "#f5f5f5", marginHorizontal: 18 },

  // Donations
  donationCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 10, elevation: 4,
    overflow: "hidden",
  },
  donationHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 14,
  },
  donationBody: { paddingHorizontal: 16, paddingBottom: 16 },
  donationInfo: {
    backgroundColor: "#fff0ec",
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  donationInfoText: { fontSize: 13, color: "#666", lineHeight: 20 },

  addDonationBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fe95b4",
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
    marginBottom: 16,
    shadowColor: "#fe95b4", shadowOpacity: 0.3, shadowRadius: 6, elevation: 3,
  },
  addDonationText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  emptyText: { textAlign: "center", color: "#bbb", fontSize: 13, marginVertical: 12 },

  donationsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  donItem: {
    width: "47.5%",
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  donImg: { width: "100%", aspectRatio: 1 },
  donImgPlaceholder: { backgroundColor: "#f5e8ee", justifyContent: "center", alignItems: "center" },
  donItemInfo: { padding: 8 },
  donTitle: { fontSize: 12, fontWeight: "600", color: "#1f0a1a", marginBottom: 6 },
  statusBadge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusAvailable: { backgroundColor: "#e8f5e9" },
  statusClaimed: { backgroundColor: "#fce4ec" },
  statusText: { fontSize: 10, fontWeight: "700", color: "#444" },
});

export default ProfileScreen;
