import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSelector } from "react-redux";
import { useNavigation } from "@react-navigation/native";
import { RootState } from "../store";
import { API_URL } from "@env";

interface EarningItem {
  id: number;
  order_id: string;
  item_title: string;
  item_image?: string;
  item_price: number;
  seller_earnings: number;
  platform_commission: number;
  buyer_name: string;
  payment_method: string;
  payment_status: string;
  payout_status: string;
  created_at: string;
  paid_at?: string;
}

interface EarningsSummary {
  total_earnings: number;
  total_paid_out: number;
  pending_payout: number;
  total_orders: number;
  this_month_earnings: number;
}

const MyEarningsScreen = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const navigation = useNavigation();
  const [earnings, setEarnings] = useState<EarningItem[]>([]);
  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      fetchEarnings();
    }
  }, [user]);

  const fetchEarnings = async () => {
    if (!user) return;

    try {
      const response = await fetch(
        `${API_URL}/api/seller/earnings/?email=${encodeURIComponent(user.email)}`
      );
      const data = await response.json();

      if (response.ok) {
        setEarnings(data.earnings || []);
        setSummary(data.summary || null);
      } else {
        console.error("Failed to fetch earnings:", data);
      }
    } catch (error) {
      console.error("Error fetching earnings:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchEarnings();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getPayoutStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "#4caf50";
      case "processing":
        return "#ff9800";
      case "pending":
        return "#f44336";
      default:
        return "#999";
    }
  };

  const getPayoutStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return "✓ Paid";
      case "processing":
        return "⏳ Processing";
      case "pending":
        return "⏰ Pending";
      default:
        return status;
    }
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Please log in to view earnings</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff1493" />
        <Text style={styles.loadingText}>Loading your earnings...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Earnings</Text>
      </View>

      {/* Summary Cards */}
      {summary && (
        <View style={styles.summaryContainer}>
          <View style={styles.summaryGrid}>
            <View style={[styles.summaryCard, styles.totalEarningsCard]}>
              <Text style={styles.summaryIcon}>💰</Text>
              <Text style={styles.summaryValue}>₹{summary.total_earnings.toLocaleString()}</Text>
              <Text style={styles.summaryLabel}>Total Earnings</Text>
            </View>

            <View style={[styles.summaryCard, styles.paidOutCard]}>
              <Text style={styles.summaryIcon}>✅</Text>
              <Text style={styles.summaryValue}>₹{summary.total_paid_out.toLocaleString()}</Text>
              <Text style={styles.summaryLabel}>Paid Out</Text>
            </View>
          </View>

          <View style={styles.summaryGrid}>
            <View style={[styles.summaryCard, styles.pendingCard]}>
              <Text style={styles.summaryIcon}>⏰</Text>
              <Text style={styles.summaryValue}>₹{summary.pending_payout.toLocaleString()}</Text>
              <Text style={styles.summaryLabel}>Pending</Text>
            </View>

            <View style={[styles.summaryCard, styles.ordersCard]}>
              <Text style={styles.summaryIcon}>📦</Text>
              <Text style={styles.summaryValue}>{summary.total_orders}</Text>
              <Text style={styles.summaryLabel}>Orders Sold</Text>
            </View>
          </View>

          <View style={styles.monthlyCard}>
            <Text style={styles.monthlyIcon}>📈</Text>
            <View style={styles.monthlyInfo}>
              <Text style={styles.monthlyValue}>₹{summary.this_month_earnings.toLocaleString()}</Text>
              <Text style={styles.monthlyLabel}>This Month's Earnings</Text>
            </View>
          </View>
        </View>
      )}

      {/* Earnings List */}
      <View style={styles.earningsSection}>
        <Text style={styles.sectionTitle}>Recent Sales</Text>

        {earnings.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>💸</Text>
            <Text style={styles.emptyText}>No sales yet</Text>
            <Text style={styles.emptySubtext}>
              Start selling items to see your earnings here
            </Text>
          </View>
        ) : (
          earnings.map((item) => (
            <View key={item.id} style={styles.earningCard}>
              <View style={styles.earningHeader}>
                <View style={styles.earningImageContainer}>
                  {item.item_image ? (
                    <Image
                      source={{ uri: `${API_URL}${item.item_image}` }}
                      style={styles.earningImage}
                    />
                  ) : (
                    <View style={[styles.earningImage, styles.placeholderImage]}>
                      <Text style={styles.placeholderText}>📷</Text>
                    </View>
                  )}
                </View>

                <View style={styles.earningInfo}>
                  <Text style={styles.itemTitle} numberOfLines={1}>
                    {item.item_title}
                  </Text>
                  <Text style={styles.buyerName}>Sold to {item.buyer_name}</Text>
                  <Text style={styles.orderDate}>{formatDate(item.created_at)}</Text>
                </View>

                <View style={styles.earningAmount}>
                  <Text style={styles.earningValue}>₹{item.seller_earnings.toLocaleString()}</Text>
                  <Text style={styles.originalPrice}>₹{item.item_price.toLocaleString()}</Text>
                </View>
              </View>

              <View style={styles.earningFooter}>
                <View style={styles.paymentInfo}>
                  <Text style={styles.paymentMethod}>
                    {item.payment_method === "online" ? "💳 Online" : "💵 COD"}
                  </Text>
                  <Text style={styles.orderNumber}>#{item.order_id}</Text>
                </View>

                <View
                  style={[
                    styles.payoutStatus,
                    { backgroundColor: getPayoutStatusColor(item.payout_status) },
                  ]}
                >
                  <Text style={styles.payoutStatusText}>
                    {getPayoutStatusText(item.payout_status)}
                  </Text>
                </View>
              </View>

              {item.platform_commission > 0 && (
                <View style={styles.commissionInfo}>
                  <Text style={styles.commissionText}>
                    Platform fee: ₹{item.platform_commission.toLocaleString()} (15%)
                  </Text>
                </View>
              )}
            </View>
          ))
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
  contentContainer: {
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    paddingTop: 60,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: "#ff1493",
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f0a1a",
    marginLeft: 16,
  },
  summaryContainer: {
    padding: 20,
  },
  summaryGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  totalEarningsCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#4caf50",
  },
  paidOutCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#2196f3",
  },
  pendingCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#ff9800",
  },
  ordersCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#9c27b0",
  },
  summaryIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },
  monthlyCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#ff1493",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  monthlyIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  monthlyInfo: {
    flex: 1,
  },
  monthlyValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#ff1493",
    marginBottom: 4,
  },
  monthlyLabel: {
    fontSize: 14,
    color: "#666",
  },
  earningsSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f0a1a",
    marginBottom: 16,
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
  earningCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  earningHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  earningImageContainer: {
    marginRight: 12,
  },
  earningImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  placeholderImage: {
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    fontSize: 20,
  },
  earningInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 4,
  },
  buyerName: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  orderDate: {
    fontSize: 12,
    color: "#999",
  },
  earningAmount: {
    alignItems: "flex-end",
  },
  earningValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#4caf50",
    marginBottom: 2,
  },
  originalPrice: {
    fontSize: 12,
    color: "#999",
    textDecorationLine: "line-through",
  },
  earningFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  paymentInfo: {
    flex: 1,
  },
  paymentMethod: {
    fontSize: 12,
    color: "#666",
    marginBottom: 2,
  },
  orderNumber: {
    fontSize: 11,
    color: "#999",
    fontFamily: "monospace",
  },
  payoutStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  payoutStatusText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
  },
  commissionInfo: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  commissionText: {
    fontSize: 11,
    color: "#999",
    textAlign: "center",
  },
  errorText: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
    marginTop: 60,
  },
});

export default MyEarningsScreen;