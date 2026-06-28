import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Alert,
  Linking,
  Animated,
  Modal,
} from "react-native";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft, ChevronRight, ShoppingCart, Mail, Phone, MessageCircle, Heart, Calendar } from "lucide-react-native";
import { useDispatch, useSelector } from "react-redux";
import { supabase, getImageUrl } from "../lib/supabase";
import { addToCart, clearCart } from "../slices/cartSlice";
import ConfirmationModal from "../components/ConfirmationModal";
import { RootState } from "../store";

const { width: W, height: H } = Dimensions.get("window");
const IMG_H = H * 0.52;

const CONDITION_LABELS: Record<string, string> = {
  new: "New",
  like_new: "Like New",
  good: "Good",
  used: "Used",
};

export default function ItemDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const currentUser = useSelector((state: RootState) => state.auth.user);

  const { itemId } = route.params as { itemId: number };

  const cartItems = useSelector((state: RootState) => state.cart.items);
  const isInCart = cartItems.some((ci) => ci.id === itemId);

  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [imageIndex, setImageIndex] = useState(0);
  const [images, setImages] = useState<string[]>([]);
  const [rentDays, setRentDays] = useState(1);
  const [isFavorited, setIsFavorited] = useState(false);
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const [startDate, setStartDate] = useState<Date>(tomorrow);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerDay, setPickerDay] = useState(tomorrow.getDate());
  const [pickerMonth, setPickerMonth] = useState(tomorrow.getMonth());
  const [pickerYear, setPickerYear] = useState(tomorrow.getFullYear());

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [showCartConflict, setShowCartConflict] = useState(false);

  useEffect(() => { fetchItem(); }, [itemId]);

  // Re-check favorite status every time the screen is focused
  useFocusEffect(
    useCallback(() => {
      if (currentUser) checkFavorite();
    }, [currentUser, itemId])
  );

  const checkFavorite = async () => {
    if (!currentUser) return;
    try {
      const { data } = await supabase
        .from("favorites")
        .select("id")
        .eq("user_id", currentUser.id)
        .eq("item_id", itemId)
        .maybeSingle();
      setIsFavorited(!!data);
    } catch { /* silent */ }
  };

  const toggleFavorite = async () => {
    if (!currentUser) { Alert.alert("Login required", "Please log in to save favorites"); return; }
    if (isFavorited) {
      setIsFavorited(false);
      const { error } = await supabase.from("favorites").delete()
        .eq("user_id", currentUser.id).eq("item_id", itemId);
      if (error) setIsFavorited(true); // revert if failed
    } else {
      setIsFavorited(true);
      const { error } = await supabase.from("favorites").insert(
        { user_id: currentUser.id, item_id: itemId }
      );
      if (error) setIsFavorited(false); // revert if failed
    }
  };

  const fetchItem = async () => {
    try {
      const { data: itemData, error: itemError } = await supabase
        .from("items")
        .select("*, item_images(id, image_url, sort_order)")
        .eq("id", itemId)
        .single();

      if (itemError) throw itemError;

      // Fetch seller profile separately to avoid FK join issues
      let profile = null;
      if (itemData?.user_id) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, name, profile_picture_url, email, phone_number")
          .eq("id", itemData.user_id)
          .single();
        profile = profileData;
      }

      const data = { ...itemData, profiles: profile };
      setItem(data);

      const all: string[] = [];
      const main = getImageUrl(data.image_url);
      if (main) all.push(main);
      const extras = (data.item_images || [])
        .sort((a: any, b: any) => a.sort_order - b.sort_order)
        .map((img: any) => getImageUrl(img.image_url))
        .filter(Boolean) as string[];
      all.push(...extras);
      setImages(all);
    } catch (err: any) {
      console.error("ItemDetail fetch error:", err);
      Alert.alert("Error", err?.message || "Failed to load item");
    } finally {
      setLoading(false);
    }
  };

  const doAddToCart = () => {
    dispatch(
      addToCart({
        id: item.id,
        user_id: item.user_id,
        title: item.title,
        price: item.price ?? undefined,
        rent_price: item.rent_price ?? undefined,
        listing_type: item.listing_type,
        image_url: images[0] ?? null,
        quantity: 1,
        size: item.custom_size || item.size || null,
        condition: item.condition || null,
      })
    );
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1.07, useNativeDriver: true, speed: 80, bounciness: 12 }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 4 }),
    ]).start();
  };

  const handleAddToCart = () => {
    if (!item) return;
    if (isInCart) return;
    if (!currentUser) {
      Alert.alert("Login required", "Please log in to add items to cart");
      return;
    }
    const existingKind = cartItems.length > 0
      ? (cartItems[0].listing_type === "rent" ? "rent" : "buy")
      : null;
    const newKind = item.listing_type === "rent" ? "rent" : "buy";
    if (existingKind && existingKind !== newKind) {
      setShowCartConflict(true);
      return;
    }
    doAddToCart();
  };

  const handleBuyNow = () => {
    if (!item) return;
    if (!currentUser) {
      Alert.alert("Login required", "Please log in to continue");
      return;
    }
    (navigation as any).navigate("Checkout", { item });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#fe95b4" />
      </View>
    );
  }

  if (!item) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "#999", fontSize: 16 }}>Item not found</Text>
      </View>
    );
  }

  const isRent = item.listing_type === "rent";
  const isDonate = item.listing_type === "donate";
  const isAccessory = item.listing_type === "sell_accessories";
  const isOwnItem = currentUser?.id === item.user_id;
  const showActionBar = !isDonate && !isOwnItem;

  const price = isRent ? item.rent_price : item.price;
  const totalRent = isRent ? parseFloat(item.rent_price || "0") * rentDays : 0;
  const displaySize = item.custom_size || item.size;
  const displayCategory = item.custom_category || item.category;
  const seller = item.profiles;
  const sellerName = seller?.name ?? "Unknown Seller";
  const sellerEmail = seller?.email ?? null;
  const sellerPhone = seller?.phone_number ?? null;
  const sellerAvatar = seller?.profile_picture_url
    ? getImageUrl(seller.profile_picture_url)
    : null;

  return (
    <View style={styles.wrapper}>
      {/* ── Image area ── */}
      <View style={[styles.imageArea, { height: IMG_H }]}>
        {images.length > 0 ? (
          <Image
            source={{ uri: images[imageIndex] }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Text style={{ color: "#ccc" }}>No image</Text>
          </View>
        )}

        {/* Back */}
        <TouchableOpacity
          style={[styles.overlayBtn, styles.backBtn, { top: insets.top + 10 }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.85}
        >
          <ChevronLeft size={22} color="#1f0a1a" strokeWidth={2.5} />
        </TouchableOpacity>

        {/* Left arrow */}
        {images.length > 1 && imageIndex > 0 && (
          <TouchableOpacity
            style={[styles.arrowBtn, { left: 12 }]}
            onPress={() => setImageIndex((i) => i - 1)}
            activeOpacity={0.8}
          >
            <ChevronLeft size={20} color="#fff" strokeWidth={2.5} />
          </TouchableOpacity>
        )}

        {/* Right arrow */}
        {images.length > 1 && imageIndex < images.length - 1 && (
          <TouchableOpacity
            style={[styles.arrowBtn, { right: 12 }]}
            onPress={() => setImageIndex((i) => i + 1)}
            activeOpacity={0.8}
          >
            <ChevronRight size={20} color="#fff" strokeWidth={2.5} />
          </TouchableOpacity>
        )}

        {/* Dots */}
        {images.length > 1 && (
          <View style={styles.dotsRow}>
            {images.map((_, i) => (
              <View key={i} style={[styles.dot, i === imageIndex && styles.dotActive]} />
            ))}
          </View>
        )}
      </View>

      {/* ── White info card ── */}
      <View style={styles.card}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.cardContent,
            { paddingBottom: showActionBar ? 100 : 48 },
          ]}
        >
          {/* Category tag */}
          {displayCategory ? (
            <Text style={styles.categoryTag}>{String(displayCategory).toUpperCase()}</Text>
          ) : null}

          {/* Title + Price */}
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={3}>
              {item.title}
            </Text>
            <View style={styles.priceBox}>
              {isDonate ? (
                <View style={styles.donationTag}><Text style={styles.donationTagText}>DONATION</Text></View>
              ) : isRent ? (
                <View style={styles.priceRow}>
                  <Text style={styles.price}>₹{item.rent_price}</Text>
                  <Text style={styles.priceUnit}>/day</Text>
                </View>
              ) : (
                <Text style={styles.price}>₹{price}</Text>
              )}
            </View>
          </View>

          {/* Description */}
          {item.description ? (
            <Text style={[styles.description, { marginTop: 2 }]}>{item.description}</Text>
          ) : null}

          {/* Detail chips */}
          {(displaySize && !isAccessory) || item.condition || (isRent && item.deposit) ? (
            <View style={styles.chipsRow}>
              {displaySize && !isAccessory && (
                <View style={styles.chip}>
                  <Text style={styles.chipLabel}>SIZE</Text>
                  <Text style={styles.chipValue}>{displaySize}</Text>
                </View>
              )}
              {item.condition && (
                <View style={styles.chip}>
                  <Text style={styles.chipLabel}>CONDITION</Text>
                  <Text style={styles.chipValue}>
                    {CONDITION_LABELS[item.condition] || item.condition}
                  </Text>
                </View>
              )}
              {isRent && item.deposit && (
                <View style={styles.chip}>
                  <Text style={styles.chipLabel}>DEPOSIT</Text>
                  <Text style={styles.chipValue}>₹{item.deposit}</Text>
                </View>
              )}
            </View>
          ) : null}

          {/* Rent options */}
          {isRent && !isOwnItem && (
            <View style={styles.rentBox}>
              {/* Start date */}
              <View style={styles.rentRow}>
                <View>
                  <Text style={styles.rentLabel}>Start Date</Text>
                  <TouchableOpacity
                    style={styles.dateBtn}
                    onPress={() => setShowDatePicker(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.dateBtnText} numberOfLines={1}>
                      {startDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </Text>
                    <Calendar size={15} color="#fe95b4" strokeWidth={2} />
                  </TouchableOpacity>
                </View>

                {/* Duration */}
                <View style={styles.durationSide}>
                  <Text style={styles.rentLabel}>Duration</Text>
                  <View style={styles.daysRow}>
                    <TouchableOpacity
                      style={styles.dayBtn}
                      onPress={() => setRentDays((d) => Math.max(1, d - 1))}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.dayBtnText}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.daysCount}>{rentDays}d</Text>
                    <TouchableOpacity
                      style={styles.dayBtn}
                      onPress={() => setRentDays((d) => d + 1)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.dayBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <Text style={styles.rentTotal}>Total: ₹{totalRent.toFixed(0)}</Text>

            </View>
          )}

          {/* Seller row */}
          <TouchableOpacity
            style={styles.sellerRow}
            activeOpacity={0.85}
            onPress={() =>
              sellerEmail &&
              (navigation as any).navigate("SellerProfile", {
                sellerEmail,
                sellerName,
                sellerProfilePic: sellerAvatar ?? undefined,
              })
            }
          >
            <View style={styles.sellerAvatar}>
              {sellerAvatar ? (
                <Image source={{ uri: sellerAvatar }} style={styles.sellerAvatarImg} />
              ) : (
                <Text style={styles.sellerInitial}>
                  {sellerName.charAt(0).toUpperCase()}
                </Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.sellerNameRow}>
                <Text style={styles.sellerName}>{sellerName}</Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {sellerEmail ? (
                    <TouchableOpacity
                      style={styles.sellerIconBtn}
                      onPress={() => Linking.openURL(`mailto:${sellerEmail}`)}
                      activeOpacity={0.7}
                    >
                      <Mail size={16} color="#fe95b4" strokeWidth={2} />
                    </TouchableOpacity>
                  ) : null}
                  {sellerPhone ? (
                    <TouchableOpacity
                      style={styles.sellerIconBtn}
                      onPress={() => Linking.openURL(`tel:${sellerPhone}`)}
                      activeOpacity={0.7}
                    >
                      <Phone size={16} color="#fe95b4" strokeWidth={2} />
                    </TouchableOpacity>
                  ) : null}
                  {sellerEmail && !isOwnItem ? (
                    <TouchableOpacity
                      style={styles.sellerIconBtn}
                      onPress={() =>
                        (navigation as any).navigate("Chat", {
                          recipientEmail: sellerEmail,
                          recipientName: sellerName,
                          recipientProfilePic: sellerAvatar ?? undefined,
                        })
                      }
                      activeOpacity={0.7}
                    >
                      <MessageCircle size={16} color="#fe95b4" strokeWidth={2} />
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
              <Text style={styles.sellerLabel}>Seller</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>

        {/* Action bar */}
        {showActionBar && (
          <View style={[styles.actionBar, { paddingBottom: insets.bottom + 12 }]}>
            <TouchableOpacity
              style={styles.cartBtn}
              onPress={toggleFavorite}
              activeOpacity={0.8}
            >
              <Heart size={22} color="#fe95b4" fill={isFavorited ? "#fe95b4" : "none"} strokeWidth={2} />
            </TouchableOpacity>
            <Animated.View style={{ flex: 1, height: 50, transform: [{ scale: scaleAnim }] }}>
              <TouchableOpacity
                style={[styles.buyBtn, isInCart && styles.addedBtn]}
                onPress={handleAddToCart}
                activeOpacity={isInCart ? 1 : 0.85}
              >
                {isInCart ? (
                  <Text style={styles.buyBtnText}>ADDED!</Text>
                ) : (
                  <>
                    <ShoppingCart size={18} color="#fff" strokeWidth={2} />
                    <Text style={styles.buyBtnText}>ADD TO CART</Text>
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>
          </View>
        )}
      </View>

      <ConfirmationModal
        visible={showCartConflict}
        title="Replace cart?"
        message={
          cartItems.length > 0 && cartItems[0].listing_type === "rent"
            ? "Your cart has a rental. Replace it with this buy item?"
            : "Your cart has buy items. Replace with this rental?"
        }
        confirmText="Replace"
        cancelText="Keep cart"
        confirmColor="#fe95b4"
        onConfirm={() => {
          setShowCartConflict(false);
          dispatch(clearCart());
          doAddToCart();
        }}
        onCancel={() => setShowCartConflict(false)}
      />

      {/* Date picker modal */}
      <Modal visible={showDatePicker} transparent animationType="fade" onRequestClose={() => setShowDatePicker(false)}>
        <View style={styles.dpOverlay}>
          <View style={styles.dpCard}>
            <Text style={styles.dpTitle}>Select Start Date</Text>

            {(() => {
              const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
              const maxDay = new Date(pickerYear, pickerMonth + 1, 0).getDate();
              const clampedDay = Math.min(pickerDay, maxDay);
              const isAtMin = new Date(pickerYear, pickerMonth, clampedDay) <= tomorrow;

              const decDay   = () => setPickerDay(d => Math.max(1, d - 1));
              const incDay   = () => setPickerDay(d => Math.min(maxDay, d + 1));
              const decMonth = () => setPickerMonth(m => m > 0 ? m - 1 : 11);
              const incMonth = () => setPickerMonth(m => m < 11 ? m + 1 : 0);
              const decYear  = () => setPickerYear(y => y - 1);
              const incYear  = () => setPickerYear(y => y + 1);

              return (
                <>
                  <View style={styles.dpRow}>
                    {/* Day */}
                    <View style={styles.dpUnit}>
                      <TouchableOpacity onPress={decDay} style={styles.dpArrow} activeOpacity={0.7}>
                        <ChevronLeft size={18} color="#fe95b4" strokeWidth={2.5} />
                      </TouchableOpacity>
                      <Text style={styles.dpValue}>{String(clampedDay).padStart(2, "0")}</Text>
                      <TouchableOpacity onPress={incDay} style={styles.dpArrow} activeOpacity={0.7}>
                        <ChevronRight size={18} color="#fe95b4" strokeWidth={2.5} />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.dpSep}>/</Text>
                    {/* Month */}
                    <View style={styles.dpUnit}>
                      <TouchableOpacity onPress={decMonth} style={styles.dpArrow} activeOpacity={0.7}>
                        <ChevronLeft size={18} color="#fe95b4" strokeWidth={2.5} />
                      </TouchableOpacity>
                      <Text style={styles.dpValue}>{MONTHS[pickerMonth]}</Text>
                      <TouchableOpacity onPress={incMonth} style={styles.dpArrow} activeOpacity={0.7}>
                        <ChevronRight size={18} color="#fe95b4" strokeWidth={2.5} />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.dpSep}>/</Text>
                    {/* Year */}
                    <View style={styles.dpUnit}>
                      <TouchableOpacity onPress={decYear} style={styles.dpArrow} activeOpacity={0.7}>
                        <ChevronLeft size={18} color="#fe95b4" strokeWidth={2.5} />
                      </TouchableOpacity>
                      <Text style={styles.dpValue}>{pickerYear}</Text>
                      <TouchableOpacity onPress={incYear} style={styles.dpArrow} activeOpacity={0.7}>
                        <ChevronRight size={18} color="#fe95b4" strokeWidth={2.5} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.dpBtns}>
                    <TouchableOpacity style={styles.dpCancelBtn} onPress={() => setShowDatePicker(false)} activeOpacity={0.8}>
                      <Text style={styles.dpCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.dpConfirmBtn}
                      onPress={() => {
                        const d = new Date(pickerYear, pickerMonth, clampedDay);
                        if (d >= tomorrow) setStartDate(d);
                        setShowDatePicker(false);
                      }}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.dpConfirmText}>Confirm</Text>
                    </TouchableOpacity>
                  </View>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: "#fff0ec" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff0ec",
  },
  imageArea: {
    width: W,
    backgroundColor: "#ffe8f0",
    overflow: "hidden",
  },
  image: { width: "100%", height: "100%" },
  imagePlaceholder: { justifyContent: "center", alignItems: "center" },
  overlayBtn: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  backBtn: { left: 16 },
  arrowBtn: {
    position: "absolute",
    top: "50%",
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.32)",
    alignItems: "center",
    justifyContent: "center",
  },
  dotsRow: {
    position: "absolute",
    bottom: 14,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.5)" },
  dotActive: { backgroundColor: "#fff", width: 18, borderRadius: 3 },
  card: {
    flex: 1,
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -24,
    overflow: "hidden",
  },
  cardContent: { padding: 24, gap: 16 },
  categoryTag: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    color: "#fe95b4",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#1f0a1a",
    lineHeight: 28,
  },
  priceBox: { alignItems: "flex-end", paddingTop: 2 },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: 2 },
  price: { fontSize: 22, fontWeight: "800", color: "#fe95b4" },
  priceUnit: { fontSize: 12, color: "#999" },
  priceFree: { fontSize: 20, fontWeight: "700", color: "#4caf50" },
  donationTag: { backgroundColor: "#ffe8f0", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  donationTagText: { fontSize: 13, fontWeight: "800", color: "#fe95b4", letterSpacing: 1.2 },
  description: { fontSize: 15, color: "#666", lineHeight: 22 },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: {
    backgroundColor: "#fff0ec",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
    gap: 3,
  },
  chipLabel: { fontSize: 10, color: "#aaa", fontWeight: "700", letterSpacing: 0.8 },
  chipValue: { fontSize: 14, color: "#1f0a1a", fontWeight: "700" },
  rentBox: {
    backgroundColor: "#fff0ec",
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  rentRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  rentLabel: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: "#999",
    letterSpacing: 0.6,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  dateBtn: {
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#f0d8e8",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  dateBtnText: { fontSize: 13, fontWeight: "600", color: "#1f0a1a" },
  durationSide: { alignItems: "flex-start" },
  daysRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  dayBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#fe95b4",
    alignItems: "center",
    justifyContent: "center",
  },
  dayBtnText: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "700",
    lineHeight: 32,
    includeFontPadding: false,
    textAlignVertical: "center",
  } as any,
  daysCount: { fontSize: 15, fontWeight: "700", color: "#1f0a1a", minWidth: 26, textAlign: "center" },
  rentTotal: { fontSize: 14, color: "#fe95b4", fontWeight: "700", textAlign: "right" },
  sellerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#fff0ec",
    borderRadius: 16,
    padding: 14,
  },
  sellerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fe95b4",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  sellerAvatarImg: { width: 44, height: 44 },
  sellerInitial: { fontSize: 18, fontWeight: "700", color: "#fff" },
  sellerNameRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sellerName: { fontSize: 15, fontWeight: "700", color: "#1f0a1a" },
  sellerLabel: { fontSize: 12, color: "#999", marginTop: 2 },
  sellerIconBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#ffe8f0", alignItems: "center", justifyContent: "center" },
  actionBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  cartBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: "#fe95b4",
    alignItems: "center",
    justifyContent: "center",
  },
  buyBtn: {
    width: "100%",
    height: 50,
    borderRadius: 25,
    backgroundColor: "#fe95b4",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#fe95b4",
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  buyBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  addedBtn: { backgroundColor: "#4caf50", shadowColor: "#4caf50" },

  dpOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center", alignItems: "center", paddingHorizontal: 24,
  },
  dpCard: {
    backgroundColor: "#fff", borderRadius: 20, padding: 24,
    width: "100%", gap: 20,
    shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 16, elevation: 8,
  },
  dpTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#1f0a1a", textAlign: "center" },
  dpRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 },
  dpUnit: { flexDirection: "row", alignItems: "center", gap: 2 },
  dpArrow: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  dpValue: { fontSize: 17, fontWeight: "700", color: "#1f0a1a", minWidth: 40, textAlign: "center" },
  dpSep: { fontSize: 16, color: "#ccc", fontWeight: "600", marginHorizontal: 2 },
  dpBtns: { flexDirection: "row", gap: 12 },
  dpCancelBtn: {
    flex: 1, height: 44, borderRadius: 10, borderWidth: 1, borderColor: "#e9ecef",
    alignItems: "center", justifyContent: "center", backgroundColor: "#f8f9fa",
  },
  dpCancelText: { fontSize: 14, fontWeight: "600", color: "#666" },
  dpConfirmBtn: {
    flex: 1, height: 44, borderRadius: 10,
    alignItems: "center", justifyContent: "center", backgroundColor: "#fe95b4",
  },
  dpConfirmText: { fontSize: 14, fontWeight: "700", color: "#fff" },
});
