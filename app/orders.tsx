import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import { useSelector } from "react-redux";
import { useFocusEffect } from "@react-navigation/native";
import { RootState } from "../store";
import { API_URL } from "@env";
import RatingModal from "../components/RatingModal";

interface Order {
  id: number;
  order_id: string;
  item_title: string;
  item_image: string | null;
  item_price: string;
  platform_commission: string;
  seller_earnings: string;
  payment_method: string;
  payment_status: string;
  order_status: string;
  buyer_username: string;
  seller_username: string;
  created_at: string;
  delivery_address: string;
  has_review?: boolean;
}

const OrdersScreen = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      fetchOrders();
    }, [])
  );

  const fetchOrders = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/api/orders/user/?email=${encodeURIComponent(user.email)}&role=buyer`
      );
      const data = await response.json();

      if (response.ok) {
        // Filter out pending orders - only show completed purchases
        const completedOrders = data.filter((order: Order) => order.payment_status !== 'pending');
        setOrders(completedOrders);
      }
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
      case "delivered":
        return "#4caf50";
      case "pending":
        return "#ff9800";
      case "cancelled":
      case "failed":
        return "#f44336";
      default:
        return "#999";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const handleRateOrder = (order: Order) => {
    setSelectedOrder(order);
    setShowRatingModal(true);
  };

  const handleSubmitRating = async (rating: number, review: string) => {
    if (!user || !selectedOrder) return;

    try {
      const response = await fetch(`${API_URL}/api/reviews/create/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: selectedOrder.order_id,
          buyer_email: user.email,
          rating: rating,
          review_text: review,
        }),
      });

      if (response.ok) {
        Alert.alert("Success", "Thank you for your review!");
        setShowRatingModal(false);
        fetchOrders(); // Refresh orders
      } else {
        const data = await response.json();
        Alert.alert("Error", data.error || "Failed to submit review");
      }
    } catch (error) {
      console.error("Failed to submit review:", error);
      Alert.alert("Error", "Failed to submit review");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>My Orders</Text>



      {/* Orders List */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.ordersList}>
        {loading ? (
          <ActivityIndicator size="large" color="#ff1493" style={{ marginTop: 40 }} />
        ) : orders.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyText}>No purchases yet</Text>
            <Text style={styles.emptySubtext}>Start shopping to see your orders here</Text>
          </View>
        ) : (
          orders.map((order) => (
            <View key={order.id} style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <Text style={styles.orderId}>Order #{order.order_id}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(order.order_status) },
                  ]}
                >
                  <Text style={styles.statusText}>{order.order_status.toUpperCase()}</Text>
                </View>
              </View>

              <View style={styles.orderBody}>
                {order.item_image && (
                  <Image
                    source={{ uri: `${API_URL}${order.item_image}` }}
                    style={styles.orderImage}
                  />
                )}
                <View style={styles.orderDetails}>
                  <Text style={styles.orderItemTitle}>{order.item_title}</Text>
                  <Text style={styles.orderPrice}>₹{order.item_price}</Text>
                  <Text style={styles.orderDate}>{formatDate(order.created_at)}</Text>
                  <View style={styles.orderMeta}>
                    <Text style={styles.orderMetaText}>
                      {order.payment_method === "online" ? "💳 Online" : "💵 COD"}
                    </Text>
                    <Text style={styles.orderMetaText}>•</Text>
                    <Text
                      style={[
                        styles.orderMetaText,
                        { color: getStatusColor(order.payment_status) },
                      ]}
                    >
                      {order.payment_status.toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Show Seller */}
              <View style={styles.sellerInfo}>
                <Text style={styles.sellerInfoText}>Sold by {order.seller_username}</Text>
              </View>

              {/* Rate Button */}
              {order.payment_status === "paid" && !order.has_review && (
                <TouchableOpacity
                  style={styles.rateButton}
                  onPress={() => handleRateOrder(order)}
                >
                  <Text style={styles.rateButtonText}>⭐ Rate Seller</Text>
                </TouchableOpacity>
              )}
              {order.has_review && (
                <View style={styles.reviewedBadge}>
                  <Text style={styles.reviewedText}>✓ Reviewed</Text>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {/* Rating Modal */}
      <RatingModal
        visible={showRatingModal}
        orderId={selectedOrder?.order_id || ""}
        sellerName={selectedOrder?.seller_username || ""}
        onClose={() => setShowRatingModal(false)}
        onSubmit={handleSubmitRating}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  header: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1f0a1a",
    marginBottom: 20,
  },
  tabRow: {
    flexDirection: "row",
    backgroundColor: "#e0e0e0",
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: "#fff",
  },
  tabText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#666",
  },
  tabTextActive: {
    color: "#ff1493",
    fontWeight: "700",
  },
  earningsCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  earningsTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f0a1a",
    marginBottom: 16,
  },
  earningsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  earningsStat: {
    flex: 1,
    alignItems: "center",
  },
  earningsValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#4caf50",
    marginBottom: 4,
  },
  earningsValueSmall: {
    fontSize: 18,
    fontWeight: "700",
    color: "#666",
    marginBottom: 4,
  },
  earningsLabel: {
    fontSize: 12,
    color: "#999",
  },
  ordersList: {
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: "center",
    marginTop: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
  },
  orderCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  orderId: {
    fontSize: 14,
    fontWeight: "700",
    color: "#666",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
  },
  orderBody: {
    flexDirection: "row",
    marginBottom: 12,
  },
  orderImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 12,
  },
  orderDetails: {
    flex: 1,
    justifyContent: "center",
  },
  orderItemTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f0a1a",
    marginBottom: 4,
  },
  orderPrice: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ff1493",
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 13,
    color: "#999",
    marginBottom: 6,
  },
  orderMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  orderMetaText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "600",
  },
  earningsBreakdown: {
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  earningsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  earningsRowLabel: {
    fontSize: 13,
    color: "#666",
  },
  earningsRowValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
  },
  earningsDivider: {
    height: 1,
    backgroundColor: "#e0e0e0",
    marginVertical: 8,
  },
  earningsRowLabelBold: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1f0a1a",
  },
  earningsRowValueBold: {
    fontSize: 15,
    fontWeight: "800",
    color: "#4caf50",
  },
  sellerInfo: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  sellerInfoText: {
    fontSize: 13,
    color: "#666",
  },
  rateButton: {
    backgroundColor: "#ff1493",
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  rateButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  reviewedBadge: {
    backgroundColor: "#e8f5e9",
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  reviewedText: {
    color: "#2e7d32",
    fontSize: 13,
    fontWeight: "600",
  },
});

export default OrdersScreen;
