import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator, RefreshControl } from "react-native";
import ScreenHeader from "../components/ScreenHeader";
import { useSelector } from "react-redux";
import { RootState } from "../store";
import { supabase, getImageUrl } from "../lib/supabase";
import { IndianRupee, Package, TrendingUp, CreditCard } from "lucide-react-native";

interface EarningItem {
  id: number; order_id: string; item_title: string; item_image?: string | null;
  item_price: number; seller_earnings: number; platform_commission: number;
  buyer_name: string; payment_method: string; payment_status: string;
  payout_status: string; created_at: string;
}

interface EarningsSummary {
  total_earnings: number;
  online_earnings: number;
  total_orders: number;
  this_month_earnings: number;
}

const MyEarningsScreen = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const [earnings, setEarnings] = useState<EarningItem[]>([]);
  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { if (user) fetchEarnings(); }, [user]);

  const fetchEarnings = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_id, payment_method, payment_status, payout_status, platform_commission, seller_earnings, buyer_name, created_at, items!item_id(title, image_url, price, rent_price, listing_type)")
        .eq("seller_id", user.id)
        .neq("payment_status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mapped: EarningItem[] = (data || []).map((raw) => ({
        id: raw.id, order_id: raw.order_id,
        item_title: raw.items?.title || "Unknown Item",
        item_image: getImageUrl(raw.items?.image_url),
        item_price: raw.items?.listing_type === "rent" ? parseFloat(raw.items?.rent_price ?? "0") : parseFloat(raw.items?.price ?? "0"),
        seller_earnings: parseFloat(raw.seller_earnings ?? "0"),
        platform_commission: parseFloat(raw.platform_commission ?? "0"),
        buyer_name: raw.buyer_name || "Unknown",
        payment_method: raw.payment_method,
        payment_status: raw.payment_status,
        payout_status: raw.payout_status || "pending",
        created_at: raw.created_at,
      }));

      setEarnings(mapped);

      const now = new Date();
      const thisMonth = now.getMonth();
      const thisYear = now.getFullYear();

      setSummary({
        total_earnings: mapped.reduce((s, e) => s + e.seller_earnings, 0),
        online_earnings: mapped.reduce((s, e) => s + e.seller_earnings, 0),
        total_orders: mapped.length,
        this_month_earnings: mapped
          .filter((e) => { const d = new Date(e.created_at); return d.getMonth() === thisMonth && d.getFullYear() === thisYear; })
          .reduce((s, e) => s + e.seller_earnings, 0),
      });
    } catch (error) {
      console.error("Error fetching earnings:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); fetchEarnings(); };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  if (!user) return <View style={styles.wrapper}><Text style={styles.errorText}>Please log in to view earnings</Text></View>;
  if (loading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#fe95b4" /><Text style={styles.loadingText}>Loading your earnings...</Text></View>;

  return (
    <View style={styles.wrapper}>
      <ScreenHeader title="My Earnings" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >

        {summary && (
          <View style={styles.summaryContainer}>

            {/* Monthly highlight */}
            <View style={styles.monthlyCard}>
              <TrendingUp size={32} color="#fe95b4" strokeWidth={1.8} />
              <View style={styles.monthlyInfo}>
                <Text style={styles.monthlyValue}>₹{summary.this_month_earnings.toLocaleString()}</Text>
                <Text style={styles.monthlyLabel}>This Month</Text>
              </View>
            </View>

            {/* 2 stat cards */}
            <View style={styles.summaryGrid}>
              <View style={[styles.summaryCard, { borderLeftColor: "#fe95b4" }]}>
                <IndianRupee size={22} color="#fe95b4" strokeWidth={1.8} />
                <Text style={styles.summaryValue}>₹{summary.total_earnings.toLocaleString()}</Text>
                <Text style={styles.summaryLabel}>Total Earned</Text>
              </View>
              <View style={[styles.summaryCard, { borderLeftColor: "#4caf50" }]}>
                <Package size={22} color="#4caf50" strokeWidth={1.8} />
                <Text style={styles.summaryValue}>{summary.total_orders}</Text>
                <Text style={styles.summaryLabel}>Items Sold</Text>
              </View>
            </View>

          </View>
        )}

        <View style={styles.earningsSection}>
          <Text style={styles.sectionTitle}>Recent Sales</Text>
          {earnings.length === 0 ? (
            <View style={styles.emptyState}>
              <TrendingUp size={56} color="#fe95b4" strokeWidth={1.5} />
              <Text style={styles.emptyText}>No sales yet</Text>
              <Text style={styles.emptySubtext}>Start selling items to see your earnings here</Text>
            </View>
          ) : (
            earnings.map((item) => (
              <View key={item.id} style={styles.earningCard}>
                <View style={styles.earningHeader}>
                  <View style={styles.earningImageContainer}>
                    {item.item_image ? (
                      <Image source={{ uri: item.item_image }} style={styles.earningImage} />
                    ) : (
                      <View style={[styles.earningImage, styles.placeholderImage]}>
                        <Package size={24} color="#ccc" strokeWidth={1.5} />
                      </View>
                    )}
                  </View>
                  <View style={styles.earningInfo}>
                    <Text style={styles.itemTitle} numberOfLines={1}>{item.item_title}</Text>
                    <Text style={styles.buyerName}>Sold to {item.buyer_name}</Text>
                    <Text style={styles.orderDate}>{formatDate(item.created_at)}</Text>
                  </View>
                  <View style={styles.earningAmount}>
                    <Text style={styles.earningValue}>₹{item.seller_earnings.toLocaleString()}</Text>
                    <Text style={styles.originalPrice}>of ₹{item.item_price.toLocaleString()}</Text>
                  </View>
                </View>
                <View style={styles.earningFooter}>
                  <View style={[styles.methodBadge, styles.onlineBadge]}>
                    <CreditCard size={12} color="#1565c0" strokeWidth={2} />
                    <Text style={[styles.methodText, styles.onlineText]}>Item Sold</Text>
                  </View>
                  <View style={[styles.payoutBadge, item.payout_status === "completed" ? styles.payoutDone : styles.payoutPending]}>
                    <Text style={[styles.payoutText, item.payout_status === "completed" ? styles.payoutDoneText : styles.payoutPendingText]}>
                      {item.payout_status === "completed" ? "Paid to you" : "Transfer pending"}
                    </Text>
                  </View>
                  <Text style={styles.orderNumber}>#{item.order_id}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: "#fff0ec" },
  scrollView: { flex: 1 },
  contentContainer: { paddingBottom: 100 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff0ec" },
  loadingText: { marginTop: 16, fontSize: 16, color: "#666" },
  summaryContainer: { padding: 20, gap: 12 },
  monthlyCard: { flexDirection: "row", alignItems: "center", gap: 16, backgroundColor: "#fff", borderRadius: 16, padding: 20, borderLeftWidth: 4, borderLeftColor: "#fe95b4", shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 8, elevation: 4 },
  monthlyInfo: { flex: 1 },
  monthlyValue: { fontSize: 28, fontWeight: "700", color: "#fe95b4", marginBottom: 2 },
  monthlyLabel: { fontSize: 14, color: "#666" },
  summaryGrid: { flexDirection: "row", gap: 10 },
  summaryCard: { flex: 1, backgroundColor: "#fff", borderRadius: 14, padding: 14, alignItems: "center", gap: 6, borderLeftWidth: 3, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 6, elevation: 3 },
  summaryValue: { fontSize: 17, fontWeight: "700", color: "#333" },
  summaryLabel: { fontSize: 11, color: "#888", textAlign: "center" },
  ordersRow: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fff", borderRadius: 12, padding: 14, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 6, elevation: 3 },
  ordersText: { fontSize: 14, fontWeight: "600", color: "#555" },
  earningsSection: { paddingHorizontal: 20, paddingBottom: 20 },
  sectionTitle: { fontSize: 20, fontWeight: "700", color: "#1f0a1a", marginBottom: 16 },
  emptyState: { alignItems: "center", paddingVertical: 60, paddingHorizontal: 40, gap: 12 },
  emptyText: { fontSize: 18, fontWeight: "600", color: "#666" },
  emptySubtext: { fontSize: 14, color: "#999", textAlign: "center", lineHeight: 20 },
  earningCard: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  earningHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  earningImageContainer: { marginRight: 12 },
  earningImage: { width: 60, height: 60, borderRadius: 8 },
  placeholderImage: { backgroundColor: "#f5f5f5", justifyContent: "center", alignItems: "center" },
  earningInfo: { flex: 1 },
  itemTitle: { fontSize: 15, fontWeight: "700", color: "#333", marginBottom: 3 },
  buyerName: { fontSize: 13, color: "#666", marginBottom: 2 },
  orderDate: { fontSize: 12, color: "#999" },
  earningAmount: { alignItems: "flex-end" },
  earningValue: { fontSize: 18, fontWeight: "700", color: "#4caf50", marginBottom: 2 },
  originalPrice: { fontSize: 11, color: "#999" },
  earningFooter: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  methodBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  onlineBadge: { backgroundColor: "#e3f2fd" },
  methodText: { fontSize: 12, fontWeight: "600" },
  onlineText: { color: "#1565c0" },
  payoutBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  payoutDone: { backgroundColor: "#e8f5e9" },
  payoutPending: { backgroundColor: "#fff3e0" },
  payoutText: { fontSize: 11, fontWeight: "600" },
  payoutDoneText: { color: "#2e7d32" },
  payoutPendingText: { color: "#e65100" },
  orderNumber: { fontSize: 11, color: "#bbb", flex: 1 },
  errorText: { fontSize: 16, color: "#999", textAlign: "center", marginTop: 60 },
});

export default MyEarningsScreen;
