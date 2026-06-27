import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, Alert } from "react-native";
import ScreenHeader from "../components/ScreenHeader";
import { useSelector } from "react-redux";
import { useFocusEffect } from "@react-navigation/native";
import { RootState } from "../store";
import RatingModal from "../components/RatingModal";
import { supabase, getImageUrl } from "../lib/supabase";
import { ShoppingBag } from "lucide-react-native";

interface Order {
  id: number; order_id: string;
  item_title: string; item_image: string | null; item_price: string;
  platform_commission: string; seller_earnings: string;
  payment_method: string; payment_status: string; order_status: string;
  buyer_name: string; seller_name: string;
  created_at: string; delivery_address: string; has_review?: boolean;
}

const OrdersScreen = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useFocusEffect(React.useCallback(() => { fetchOrders(); }, []));

  const fetchOrders = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: ordersData, error } = await supabase
        .from("orders")
        .select("*, items!item_id(title, image_url, price, rent_price, listing_type), seller:profiles!seller_id(name)")
        .eq("buyer_id", user.id)
        .neq("payment_status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const { data: reviewsData } = await supabase.from("reviews").select("order_id").eq("reviewer_id", user.id);
      const reviewedOrderIds = new Set((reviewsData || []).map((r) => r.order_id));

      const mapped: Order[] = (ordersData || []).map((raw) => ({
        id: raw.id, order_id: raw.order_id,
        item_title: raw.items?.title || "Unknown Item",
        item_image: getImageUrl(raw.items?.image_url),
        item_price: raw.items?.listing_type === "rent" ? String(raw.items?.rent_price ?? 0) : String(raw.items?.price ?? 0),
        platform_commission: String(raw.platform_commission ?? 0),
        seller_earnings: String(raw.seller_earnings ?? 0),
        payment_method: raw.payment_method,
        payment_status: raw.payment_status,
        order_status: raw.order_status,
        buyer_name: user.name,
        seller_name: raw.seller?.name || "Unknown Seller",
        created_at: raw.created_at,
        delivery_address: raw.delivery_address || "",
        has_review: reviewedOrderIds.has(raw.id),
      }));

      setOrders(mapped);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid": case "delivered": return "#4caf50";
      case "pending": return "#ff9800";
      case "cancelled": case "failed": return "#f44336";
      default: return "#999";
    }
  };

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  const handleRateOrder = (order: Order) => { setSelectedOrder(order); setShowRatingModal(true); };

  const handleSubmitRating = async (rating: number, review: string) => {
    if (!user || !selectedOrder) return;
    try {
      const { error } = await supabase.from("reviews").insert({
        order_id: selectedOrder.id,
        reviewer_id: user.id,
        rating,
        review_text: review,
      });
      if (error) throw error;
      Alert.alert("Success", "Thank you for your review!");
      setShowRatingModal(false);
      fetchOrders();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to submit review");
    }
  };

  return (
    <View style={styles.wrapper}>
      <ScreenHeader title="My Orders" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.ordersList}>
        {loading ? (
          <ActivityIndicator size="large" color="#fe95b4" style={{ marginTop: 40 }} />
        ) : orders.length === 0 ? (
          <View style={styles.emptyState}>
            <ShoppingBag size={56} color="#fe95b4" strokeWidth={1.5} style={{ marginBottom: 16 }} />
            <Text style={styles.emptyText}>No purchases yet</Text>
            <Text style={styles.emptySubtext}>Start shopping to see your orders here</Text>
          </View>
        ) : (
          orders.map((order) => (
            <View key={order.id} style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <Text style={styles.orderId}>Order #{order.order_id}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.order_status) }]}>
                  <Text style={styles.statusText}>{order.order_status.toUpperCase()}</Text>
                </View>
              </View>
              <View style={styles.orderBody}>
                {order.item_image && <Image source={{ uri: order.item_image }} style={styles.orderImage} />}
                <View style={styles.orderDetails}>
                  <Text style={styles.orderItemTitle}>{order.item_title}</Text>
                  <Text style={styles.orderPrice}>₹{order.item_price}</Text>
                  <Text style={styles.orderDate}>{formatDate(order.created_at)}</Text>
                  <View style={styles.orderMeta}>
                    <Text style={styles.orderMetaText}>💳 Online</Text>
                    <Text style={styles.orderMetaText}>•</Text>
                    <Text style={[styles.orderMetaText, { color: getStatusColor(order.payment_status) }]}>{order.payment_status.toUpperCase()}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.sellerInfo}>
                <Text style={styles.sellerInfoText}>Sold by {order.seller_name}</Text>
              </View>
              {order.payment_status === "paid" && !order.has_review && (
                <TouchableOpacity style={styles.rateButton} onPress={() => handleRateOrder(order)}>
                  <Text style={styles.rateButtonText}>⭐ Rate Seller</Text>
                </TouchableOpacity>
              )}
              {order.has_review && (
                <View style={styles.reviewedBadge}><Text style={styles.reviewedText}>✓ Reviewed</Text></View>
              )}
            </View>
          ))
        )}
      </ScrollView>

      <RatingModal visible={showRatingModal} orderId={selectedOrder?.order_id || ""} sellerName={selectedOrder?.seller_name || ""} onClose={() => setShowRatingModal(false)} onSubmit={handleSubmitRating} />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: "#fff0ec" },
  ordersList: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 100 },
  emptyState: { alignItems: "center", marginTop: 60 },
  emptyText: { fontSize: 18, fontWeight: "700", color: "#333", marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: "#999" },
  orderCard: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  orderHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  orderId: { fontSize: 14, fontWeight: "700", color: "#666" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: "700", color: "#fff" },
  orderBody: { flexDirection: "row", marginBottom: 12 },
  orderImage: { width: 80, height: 80, borderRadius: 12, marginRight: 12 },
  orderDetails: { flex: 1, justifyContent: "center" },
  orderItemTitle: { fontSize: 16, fontWeight: "700", color: "#1f0a1a", marginBottom: 4 },
  orderPrice: { fontSize: 18, fontWeight: "700", color: "#fe95b4", marginBottom: 4 },
  orderDate: { fontSize: 13, color: "#999", marginBottom: 6 },
  orderMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  orderMetaText: { fontSize: 12, color: "#666", fontWeight: "600" },
  sellerInfo: { marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#f0f0f0" },
  sellerInfoText: { fontSize: 13, color: "#666" },
  rateButton: { backgroundColor: "#fe95b4", marginTop: 12, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, alignItems: "center" },
  rateButtonText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  reviewedBadge: { backgroundColor: "#e8f5e9", marginTop: 12, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, alignItems: "center" },
  reviewedText: { color: "#2e7d32", fontSize: 13, fontWeight: "600" },
});

export default OrdersScreen;

