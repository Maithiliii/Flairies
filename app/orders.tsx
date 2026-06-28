import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Image, Alert,
} from "react-native";
import ScreenHeader from "../components/ScreenHeader";
import { useSelector } from "react-redux";
import { useFocusEffect } from "@react-navigation/native";
import { RootState } from "../store";
import RatingModal from "../components/RatingModal";
import { supabase, getImageUrl } from "../lib/supabase";
import { ShoppingBag } from "lucide-react-native";

interface Order {
  id: number;
  order_id: string;
  item_id: number | null;
  item_title: string;
  item_image: string | null;
  item_price: string;
  listing_type: string;
  rent_price: string | null;
  payment_method: string;
  payment_status: string;
  order_status: string;
  seller_name: string;
  seller_id: string;
  created_at: string;
  has_review: boolean;
}

const STAGES = ["Placed", "Confirmed", "Dispatched", "Out for Delivery", "Delivered"];

const stepOf = (status: string) => {
  switch (status) {
    case "pending":          return 0;
    case "confirmed":        return 1;
    case "dispatched":       return 2;
    case "out_for_delivery": return 3;
    case "delivered":        return 4;
    default:                 return 0;
  }
};

const Dot = ({ state }: { state: "done" | "active" | "idle" }) => {
  if (state === "done") return (
    <View style={styles.dotDone}>
      <Text style={styles.dotCheck}>✓</Text>
    </View>
  );
  if (state === "active") return (
    <View style={styles.dotActive}>
      <View style={styles.dotActiveInner} />
    </View>
  );
  return <View style={styles.dotIdle} />;
};

const OrderProgress = ({ status }: { status: string }) => {
  if (status === "cancelled") return (
    <View style={styles.cancelledBadge}>
      <Text style={styles.cancelledText}>Order Cancelled</Text>
    </View>
  );

  const step = stepOf(status);

  return (
    <View style={styles.progressWrap}>
      {/* Dots + connecting lines */}
      <View style={styles.dotsRow}>
        {STAGES.map((_, i) => {
          const state = i < step ? "done" : i === step ? "active" : "idle";
          return (
            <React.Fragment key={i}>
              <Dot state={state} />
              {i < STAGES.length - 1 && (
                <View style={[styles.progressLine, i < step && styles.progressLineFilled]} />
              )}
            </React.Fragment>
          );
        })}
      </View>

      {/* Labels */}
      <View style={styles.labelsRow}>
        {STAGES.map((label, i) => (
          <Text
            key={i}
            numberOfLines={2}
            style={[
              styles.stageLabel,
              i <= step && styles.stageLabelActive,
              i === step && styles.stageLabelCurrent,
              { textAlign: i === 0 ? "left" : i === STAGES.length - 1 ? "right" : "center" },
            ]}
          >
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
};

const OrdersScreen = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [localReviewed, setLocalReviewed] = useState<Set<number>>(new Set());

  useFocusEffect(React.useCallback(() => { fetchOrders(); }, []));

  const fetchOrders = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch orders separately to avoid RLS join issues
      const { data: ordersData, error } = await supabase
        .from("orders")
        .select("id, order_id, item_id, seller_id, payment_method, payment_status, order_status, item_price, created_at")
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!ordersData?.length) { setOrders([]); return; }

      // Fetch item details
      const itemIds = [...new Set(ordersData.map((o) => o.item_id).filter(Boolean))];
      const sellerIds = [...new Set(ordersData.map((o) => o.seller_id).filter(Boolean))];

      const [{ data: itemsData }, { data: sellersData }, { data: reviewsData }] =
        await Promise.all([
          supabase.from("items").select("id, title, image_url, price, rent_price, listing_type").in("id", itemIds),
          supabase.from("profiles").select("id, name").in("id", sellerIds),
          supabase.from("reviews").select("order_id").eq("reviewer_id", user.id),
        ]);

      const itemMap = Object.fromEntries((itemsData || []).map((i) => [i.id, i]));
      const sellerMap = Object.fromEntries((sellersData || []).map((s) => [s.id, s]));
      const reviewedSet = new Set((reviewsData || []).map((r) => r.order_id));

      const mapped: Order[] = ordersData.map((raw) => {
        const item = itemMap[raw.item_id];
        const seller = sellerMap[raw.seller_id];
        return {
          id: raw.id,
          order_id: raw.order_id,
          item_id: raw.item_id,
          item_title: item?.title || "Item",
          item_image: item?.image_url ? getImageUrl(item.image_url) : null,
          item_price: String(raw.item_price ?? item?.price ?? 0),
          listing_type: item?.listing_type || "sell",
          rent_price: item?.rent_price ? String(item.rent_price) : null,
          payment_method: raw.payment_method,
          payment_status: raw.payment_status,
          order_status: raw.order_status,
          seller_name: seller?.name || "Seller",
          seller_id: raw.seller_id,
          created_at: raw.created_at,
          has_review: reviewedSet.has(raw.id),
        };
      });

      setOrders(mapped);
    } catch (err) {
      console.error("fetchOrders error:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  const handleRateOrder = (order: Order) => { setSelectedOrder(order); setShowRatingModal(true); };

  const handleConfirmOrder = (order: Order) => {
    Alert.alert(
      "Confirm Order",
      "Please confirm you want to proceed with this order. The seller will be notified to ship it.",
      [
        { text: "Not Yet", style: "cancel" },
        {
          text: "Yes, Confirm",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("orders")
                .update({ order_status: "confirmed", updated_at: new Date().toISOString() })
                .eq("order_id", order.order_id)
                .eq("buyer_id", user!.id);
              if (error) throw error;
              fetchOrders();
            } catch (err: any) {
              Alert.alert("Error", err.message || "Could not confirm order");
            }
          },
        },
      ]
    );
  };

  const handleDenyOrder = (order: Order) => {
    Alert.alert(
      "Deny Order",
      "Are you sure you want to deny this order? A full refund will be initiated.",
      [
        { text: "Keep Order", style: "cancel" },
        {
          text: "Yes, Deny",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("orders")
                .update({ order_status: "cancelled", updated_at: new Date().toISOString() })
                .eq("order_id", order.order_id)
                .eq("buyer_id", user!.id);
              if (error) throw error;
              Alert.alert(
                "Refund Initiated",
                "You will receive your refund within 24 hrs. If not received, mail us at flairies@gmail.com"
              );
              fetchOrders();
            } catch (err: any) {
              Alert.alert("Error", err.message || "Could not deny order");
            }
          },
        },
      ]
    );
  };

  const handleSubmitRating = async (rating: number, review: string) => {
    if (!user || !selectedOrder) return;
    setLocalReviewed((prev) => new Set(prev).add(selectedOrder.id));
    const { error } = await supabase.from("reviews").insert({
      order_id: selectedOrder.id,
      reviewer_id: user.id,
      rating,
      review_text: review,
    });
    if (error) console.error("Review insert error:", error.message);
    fetchOrders();
  };

  const statusColor = (s: string) => {
    if (s === "delivered")        return "#4caf50";
    if (s === "cancelled")        return "#e53935";
    if (s === "out_for_delivery") return "#2196f3";
    if (s === "dispatched")       return "#9c27b0";
    if (s === "confirmed")        return "#fe95b4";
    return "#ff9800";
  };

  const statusLabel = (s: string) => {
    switch (s) {
      case "pending":          return "Placed";
      case "confirmed":        return "Confirmed";
      case "dispatched":       return "Dispatched";
      case "out_for_delivery": return "Out for Delivery";
      case "delivered":        return "Delivered";
      case "cancelled":        return "Cancelled";
      default:                 return s.toUpperCase();
    }
  };

  return (
    <View style={styles.wrapper}>
      <ScreenHeader title="My Orders" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        {loading ? (
          <ActivityIndicator size="large" color="#fe95b4" style={{ marginTop: 48 }} />
        ) : orders.length === 0 ? (
          <View style={styles.empty}>
            <ShoppingBag size={56} color="#fe95b4" strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>No orders yet</Text>
            <Text style={styles.emptySub}>Your purchases will show up here</Text>
          </View>
        ) : (
          orders.map((order) => (
            <View key={order.id} style={styles.card}>
              {/* Header */}
              <View style={styles.cardHeader}>
                <Text style={styles.orderId}>#{order.order_id.slice(-10)}</Text>
                <View style={[styles.badge, { backgroundColor: statusColor(order.order_status) + "22" }]}>
                  <Text style={[styles.badgeText, { color: statusColor(order.order_status) }]}>
                    {statusLabel(order.order_status)}
                  </Text>
                </View>
              </View>

              {/* Listing type tag */}
              <View style={styles.typeTag}>
                <Text style={styles.typeTagText}>
                  {order.listing_type === "rent" ? "RENT" : order.listing_type === "sell_accessories" ? "ACCESSORIES" : "BUY"}
                </Text>
              </View>

              {/* Item row */}
              <View style={styles.itemRow}>
                {order.item_image ? (
                  <Image source={{ uri: order.item_image }} style={styles.itemImg} />
                ) : (
                  <View style={[styles.itemImg, styles.itemImgPlaceholder]} />
                )}
                <View style={styles.itemInfo}>
                  <Text style={styles.itemTitle} numberOfLines={2}>{order.item_title}</Text>
                  <Text style={styles.itemPrice}>
                    ₹{order.item_price}
                    {order.listing_type === "rent" && order.rent_price
                      ? <Text style={styles.rentSub}> (₹{order.rent_price}/day)</Text>
                      : null}
                  </Text>
                  <Text style={styles.orderDate}>{formatDate(order.created_at)}</Text>
                </View>
              </View>

              {/* Progress tracker */}
              {order.order_status !== "cancelled" && (
                <OrderProgress status={order.order_status} />
              )}
              {order.order_status === "cancelled" && (
                <OrderProgress status="cancelled" />
              )}

              {/* Seller */}
              <View style={styles.sellerRow}>
                <Text style={styles.sellerText}>Sold by {order.seller_name}</Text>
              </View>

              {/* Buyer confirms or denies order */}
              {order.order_status === "pending" && order.payment_status === "paid" && (
                <View style={styles.actionRow}>
                  <TouchableOpacity style={styles.confirmBtn} onPress={() => handleConfirmOrder(order)}>
                    <Text style={styles.confirmBtnText}>Confirm</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.denyBtn} onPress={() => handleDenyOrder(order)}>
                    <Text style={styles.denyBtnText}>Deny</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Rate seller */}
              {order.payment_status === "paid" && order.order_status === "delivered" && !order.has_review && !localReviewed.has(order.id) && (
                <TouchableOpacity style={styles.rateBtn} onPress={() => handleRateOrder(order)}>
                  <Text style={styles.rateBtnText}>⭐ Rate Seller</Text>
                </TouchableOpacity>
              )}
              {(order.has_review || localReviewed.has(order.id)) && (
                <View style={styles.reviewedBadge}>
                  <Text style={styles.reviewedText}>Reviewed</Text>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>

      <RatingModal
        visible={showRatingModal}
        orderId={selectedOrder?.order_id || ""}
        sellerName={selectedOrder?.seller_name || ""}
        onClose={() => setShowRatingModal(false)}
        onSubmit={handleSubmitRating}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: "#fff0ec" },
  list: { padding: 20, paddingBottom: 100 },

  empty: { alignItems: "center", marginTop: 64, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#333" },
  emptySub: { fontSize: 14, color: "#999" },

  card: {
    backgroundColor: "#fff", borderRadius: 18, padding: 16,
    marginBottom: 16,
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  orderId: { fontSize: 13, fontWeight: "700", color: "#888" },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: "700" },

  typeTag: {
    alignSelf: "flex-start", backgroundColor: "#ffe8f0",
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginBottom: 10,
  },
  typeTagText: { fontSize: 9, fontWeight: "700", letterSpacing: 1.2, color: "#fe95b4" },
  rentSub: { fontSize: 12, fontWeight: "400", color: "#aaa" },

  itemRow: { flexDirection: "row", gap: 12 },
  itemImg: { width: 80, height: 80, borderRadius: 12 },
  itemImgPlaceholder: { backgroundColor: "#f5e8ee" },
  itemInfo: { flex: 1, justifyContent: "center", gap: 3 },
  itemTitle: { fontSize: 15, fontWeight: "700", color: "#1f0a1a" },
  itemPrice: { fontSize: 17, fontWeight: "800", color: "#fe95b4" },
  orderDate: { fontSize: 12, color: "#aaa" },
  payRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  payChip: { fontSize: 12, color: "#555", fontWeight: "600" },
  payStatus: { fontSize: 12, fontWeight: "700" },

  // Progress tracker
  progressWrap: { marginTop: 16, marginBottom: 4 },
  dotsRow: { flexDirection: "row", alignItems: "center" },
  progressLine: { flex: 1, height: 2.5, backgroundColor: "#e0e0e0" },
  progressLineFilled: { backgroundColor: "#fe95b4" },

  dotDone: {
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: "#fe95b4",
    alignItems: "center", justifyContent: "center",
  },
  dotCheck: { color: "#fff", fontSize: 8, fontWeight: "900", lineHeight: 10 },
  dotActive: {
    width: 14, height: 14, borderRadius: 7,
    borderWidth: 2.5, borderColor: "#fe95b4",
    alignItems: "center", justifyContent: "center",
  },
  dotActiveInner: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#fe95b4" },
  dotIdle: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: "#ddd" },

  labelsRow: { flexDirection: "row", marginTop: 6 },
  stageLabel: { flex: 1, fontSize: 9, color: "#bbb", lineHeight: 13 },
  stageLabelActive: { color: "#e07090" },
  stageLabelCurrent: { fontWeight: "700" },

  cancelledBadge: {
    backgroundColor: "#fff3f3", borderRadius: 8, paddingVertical: 8,
    marginTop: 14, alignItems: "center",
  },
  cancelledText: { color: "#e53935", fontSize: 12, fontWeight: "700" },

  sellerRow: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#f5f5f5" },
  sellerText: { fontSize: 13, color: "#888" },

  actionRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  confirmBtn: {
    flex: 1, backgroundColor: "#4caf50",
    paddingVertical: 10, borderRadius: 10, alignItems: "center",
  },
  confirmBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  denyBtn: {
    flex: 1, borderWidth: 1.5, borderColor: "#e53935",
    paddingVertical: 10, borderRadius: 10, alignItems: "center",
  },
  denyBtnText: { color: "#e53935", fontSize: 14, fontWeight: "700" },

  rateBtn: {
    backgroundColor: "#fe95b4", marginTop: 12,
    paddingVertical: 10, borderRadius: 10, alignItems: "center",
  },
  rateBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },

  reviewedBadge: {
    backgroundColor: "#f0f0f0", marginTop: 12,
    paddingVertical: 8, borderRadius: 10, alignItems: "center",
  },
  reviewedText: { color: "#999", fontSize: 13, fontWeight: "600" },
});

export default OrdersScreen;
