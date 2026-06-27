import React, { useState } from "react";
import {
  View, Text, StyleSheet, FlatList, Image, TouchableOpacity,
} from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { useNavigation } from "@react-navigation/native";
import { Trash2 } from "lucide-react-native";
import ScreenHeader from "../components/ScreenHeader";
import ConfirmationModal from "../components/ConfirmationModal";
import { RootState } from "../store";
import { removeFromCart, updateRentDays, clearCart, CartItem } from "../slices/cartSlice";

function typeBadge(listingType: string) {
  if (listingType === "rent") return "RENT";
  if (listingType === "sell_accessories") return "ACCESSORIES";
  return "BUY";
}

function itemPrice(item: CartItem) {
  if (item.listing_type === "rent") {
    return parseFloat(item.rent_price || "0") * (item.rent_days || 1);
  }
  return parseFloat(item.price || "0");
}

export default function CartScreen() {
  const items = useSelector((s: RootState) => s.cart.items);
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const [deleteTarget, setDeleteTarget] = useState<CartItem | null>(null);

  const total = items.reduce((sum, it) => sum + itemPrice(it), 0);

  return (
    <View style={styles.container}>
      <ScreenHeader title="Cart" />

      {items.length === 0 ? (
        <Text style={styles.empty}>Your cart is empty</Text>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => `${i.listing_type}-${i.id}`}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => (navigation as any).navigate("ItemDetail", { itemId: item.id })}
            >
              <View style={styles.card}>
                {/* Image */}
                {item.image_url ? (
                  <Image source={{ uri: item.image_url }} style={styles.image} resizeMode="cover" />
                ) : (
                  <View style={[styles.image, styles.placeholder]}>
                    <Text style={styles.placeholderText}>No Image</Text>
                  </View>
                )}

                {/* Meta */}
                <View style={styles.meta}>
                  {/* Top row: title + badge */}
                  <View style={styles.topRow}>
                    <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{typeBadge(item.listing_type)}</Text>
                    </View>
                  </View>

                  {/* Size + condition chips for buy items */}
                  {item.listing_type !== "rent" && (item.size || item.condition) && (
                    <View style={styles.tagsRow}>
                      {item.size ? (
                        <View style={styles.tag}><Text style={styles.tagText}>{item.size}</Text></View>
                      ) : null}
                      {item.condition ? (
                        <View style={styles.tag}>
                          <Text style={styles.tagText}>
                            {{ new: "New", like_new: "Like New", good: "Good", used: "Used" }[item.condition] ?? item.condition}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  )}

                  {/* Price */}
                  <Text style={styles.price}>
                    {item.listing_type === "rent"
                      ? `₹${(parseFloat(item.rent_price || "0") * (item.rent_days || 1)).toFixed(0)} (₹${item.rent_price}/day)`
                      : `₹${item.price}`}
                  </Text>

                  {/* Bottom row: days stepper (rent only) + trash */}
                  <View style={styles.bottomRow}>
                    {item.listing_type === "rent" ? (
                      <View style={styles.daysStepper}>
                        <TouchableOpacity
                          style={styles.stepBtn}
                          onPress={() => dispatch(updateRentDays({ id: item.id, days: (item.rent_days || 1) - 1 }))}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Text style={styles.stepBtnText}>−</Text>
                        </TouchableOpacity>
                        <Text style={styles.daysLabel}>{item.rent_days || 1} day{(item.rent_days || 1) > 1 ? "s" : ""}</Text>
                        <TouchableOpacity
                          style={styles.stepBtn}
                          onPress={() => dispatch(updateRentDays({ id: item.id, days: (item.rent_days || 1) + 1 }))}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Text style={styles.stepBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View />
                    )}

                    <TouchableOpacity
                      onPress={(e) => { e.stopPropagation(); setDeleteTarget(item); }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Trash2 size={18} color="#e53935" strokeWidth={2} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Footer */}
      {items.length > 0 && (
        <View style={styles.footer}>
          <Text style={styles.total}>Total: ₹{total.toFixed(2)}</Text>
          <TouchableOpacity style={styles.checkout} onPress={() => navigation.navigate("Checkout" as never)}>
            <Text style={styles.checkoutText}>Checkout</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.clear} onPress={() => dispatch(clearCart())}>
            <Text style={styles.clearText}>Clear Cart</Text>
          </TouchableOpacity>
        </View>
      )}

      <ConfirmationModal
        visible={!!deleteTarget}
        title="Remove Item"
        message="This item will be removed from your cart."
        confirmText="Remove"
        cancelText="Cancel"
        confirmColor="#e53935"
        onConfirm={() => {
          if (deleteTarget) dispatch(removeFromCart(deleteTarget.id));
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff0ec" },
  empty: { marginTop: 60, color: "#999", textAlign: "center", fontSize: 16 },
  listContent: { paddingHorizontal: 20, paddingVertical: 12, paddingBottom: 20 },

  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  image: { width: 80, height: 80, borderRadius: 10, marginRight: 12 },
  placeholder: { backgroundColor: "#f0f0f0", justifyContent: "center", alignItems: "center" },
  placeholderText: { color: "#999", fontSize: 10 },

  meta: { flex: 1 },
  topRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
  title: { flex: 1, fontSize: 14, fontWeight: "700", color: "#1e0a16", lineHeight: 18 },

  badge: {
    backgroundColor: "#ffe8f0",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  badgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 9,
    letterSpacing: 1.2,
    color: "#fe95b4",
  },

  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 5 },
  tag: {
    backgroundColor: "#fff0ec",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  tagText: { fontSize: 11, fontWeight: "600", color: "#b06080" },

  price: { fontSize: 13, fontWeight: "600", color: "#ff2f8f", marginTop: 5 },

  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  daysStepper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff0ec",
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
    gap: 8,
  },
  stepBtn: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: "#fe95b4",
    alignItems: "center", justifyContent: "center",
  },
  stepBtnText: { color: "#fff", fontSize: 16, fontWeight: "700", lineHeight: 20 },
  daysLabel: { fontSize: 13, fontWeight: "700", color: "#1f0a1a", minWidth: 44, textAlign: "center" },

  footer: { paddingHorizontal: 20, paddingBottom: 24, paddingTop: 12, backgroundColor: "#fff0ec" },
  total: { fontSize: 20, fontWeight: "800", color: "#1e0a16", marginBottom: 14 },
  checkout: {
    backgroundColor: "#fe95b4", padding: 14, borderRadius: 12,
    alignItems: "center", marginBottom: 10,
    shadowColor: "#fe95b4", shadowOpacity: 0.3, shadowRadius: 6, elevation: 3,
  },
  checkoutText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  clear: { alignItems: "center", paddingVertical: 6 },
  clearText: { color: "#888", fontSize: 14, fontWeight: "600" },

});
