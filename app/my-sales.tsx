import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Image, Alert,
} from "react-native";
import ScreenHeader from "../components/ScreenHeader";
import { useSelector } from "react-redux";
import { useFocusEffect } from "@react-navigation/native";
import { RootState } from "../store";
import { supabase, getImageUrl } from "../lib/supabase";
import { Package } from "lucide-react-native";

interface Sale {
  id: number;
  order_id: string;
  item_id: number | null;
  item_title: string;
  item_image: string | null;
  item_price: string;
  listing_type: string;
  rent_price: string | null;
  payment_status: string;
  order_status: string;
  buyer_name: string;
  delivery_address: string;
  created_at: string;
}

const STAGES = ["Placed", "Confirmed", "Out for Delivery", "Delivered"];

const stepOf = (status: string) => {
  switch (status) {
    case "pending":   return 0;
    case "confirmed": return 1;
    case "shipped":   return 2;
    case "delivered": return 3;
    default:          return 0;
  }
};

const Dot = ({ state }: { state: "done" | "active" | "idle" }) => {
  if (state === "done") return (
    <View style={styles.dotDone}><Text style={styles.dotCheck}>✓</Text></View>
  );
  if (state === "active") return (
    <View style={styles.dotActive}><View style={styles.dotActiveInner} /></View>
  );
  return <View style={styles.dotIdle} />;
};

const OrderProgress = ({ status }: { status: string }) => {
  const step = stepOf(status);
  return (
    <View style={styles.progressWrap}>
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

const nextStatus = (current: string): string | null => {
  switch (current) {
    case "pending":   return "confirmed";
    case "confirmed": return "shipped";
    case "shipped":   return "delivered";
    default:          return null;
  }
};

const nextLabel = (current: string) => {
  switch (current) {
    case "pending":   return "Confirm Order";
    case "confirmed": return "Mark as Shipped";
    case "shipped":   return "Mark as Delivered";
    default:          return null;
  }
};

const MySalesScreen = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useFocusEffect(React.useCallback(() => { fetchSales(); }, []));

  const fetchSales = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: salesData, error } = await supabase
        .from("orders")
        .select("id, order_id, item_id, payment_status, order_status, item_price, buyer_name, delivery_address, created_at")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!salesData?.length) { setSales([]); return; }

      const itemIds = [...new Set(salesData.map((o) => o.item_id).filter(Boolean))];
      const { data: itemsData } = await supabase
        .from("items")
        .select("id, title, image_url, listing_type, rent_price")
        .in("id", itemIds);

      const itemMap = Object.fromEntries((itemsData || []).map((i) => [i.id, i]));

      setSales(salesData.map((raw) => {
        const item = itemMap[raw.item_id];
        return {
          id: raw.id,
          order_id: raw.order_id,
          item_id: raw.item_id,
          item_title: item?.title || "Item",
          item_image: item?.image_url ? getImageUrl(item.image_url) : null,
          item_price: String(raw.item_price ?? 0),
          listing_type: item?.listing_type || "sell",
          rent_price: item?.rent_price ? String(item.rent_price) : null,
          payment_status: raw.payment_status,
          order_status: raw.order_status,
          buyer_name: raw.buyer_name || "Buyer",
          delivery_address: raw.delivery_address || "",
          created_at: raw.created_at,
        };
      }));
    } catch (err) {
      console.error("fetchSales error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdvanceStatus = async (sale: Sale) => {
    const next = nextStatus(sale.order_status);
    if (!next) return;

    const label = nextLabel(sale.order_status);
    Alert.alert(
      label || "Update Status",
      `Mark this order as "${next}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            setUpdating(sale.order_id);
            try {
              const { error } = await supabase
                .from("orders")
                .update({
                  order_status: next,
                  updated_at: new Date().toISOString(),
                  ...(next === "delivered" ? { delivered_at: new Date().toISOString() } : {}),
                })
                .eq("order_id", sale.order_id);
              if (error) throw error;
              await fetchSales();
            } catch (err: any) {
              Alert.alert("Error", err.message || "Could not update status");
            } finally {
              setUpdating(null);
            }
          },
        },
      ]
    );
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  const statusColor = (s: string) => {
    if (s === "delivered") return "#4caf50";
    if (s === "cancelled") return "#e53935";
    if (s === "shipped")   return "#2196f3";
    if (s === "confirmed") return "#fe95b4";
    return "#ff9800";
  };

  return (
    <View style={styles.wrapper}>
      <ScreenHeader title="My Sales" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        {loading ? (
          <ActivityIndicator size="large" color="#fe95b4" style={{ marginTop: 48 }} />
        ) : sales.length === 0 ? (
          <View style={styles.empty}>
            <Package size={56} color="#fe95b4" strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>No sales yet</Text>
            <Text style={styles.emptySub}>When someone buys your item, it shows up here</Text>
          </View>
        ) : (
          sales.map((sale) => {
            const actionLabel = nextLabel(sale.order_status);
            const isUpdating = updating === sale.order_id;

            return (
              <View key={sale.id} style={styles.card}>
                {/* Header */}
                <View style={styles.cardHeader}>
                  <Text style={styles.orderId}>#{sale.order_id.slice(-10)}</Text>
                  <View style={[styles.badge, { backgroundColor: statusColor(sale.order_status) + "22" }]}>
                    <Text style={[styles.badgeText, { color: statusColor(sale.order_status) }]}>
                      {sale.order_status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {/* Listing type tag */}
                <View style={styles.typeTag}>
                  <Text style={styles.typeTagText}>
                    {sale.listing_type === "rent" ? "RENT" : sale.listing_type === "sell_accessories" ? "ACCESSORIES" : "BUY"}
                  </Text>
                </View>

                {/* Item row */}
                <View style={styles.itemRow}>
                  {sale.item_image ? (
                    <Image source={{ uri: sale.item_image }} style={styles.itemImg} />
                  ) : (
                    <View style={[styles.itemImg, styles.itemImgPlaceholder]} />
                  )}
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemTitle} numberOfLines={2}>{sale.item_title}</Text>
                    <Text style={styles.itemPrice}>
                      ₹{sale.item_price}
                      {sale.listing_type === "rent" && sale.rent_price
                        ? <Text style={styles.rentSub}> (₹{sale.rent_price}/day)</Text>
                        : null}
                    </Text>
                    <Text style={styles.orderDate}>{formatDate(sale.created_at)}</Text>
                  </View>
                </View>

                {/* Progress tracker */}
                {sale.order_status !== "cancelled" && (
                  <OrderProgress status={sale.order_status} />
                )}

                {/* Buyer info */}
                <View style={styles.buyerRow}>
                  <Text style={styles.buyerLabel}>Buyer</Text>
                  <Text style={styles.buyerValue}>{sale.buyer_name}</Text>
                </View>
                {sale.delivery_address ? (
                  <View style={styles.addrRow}>
                    <Text style={styles.buyerLabel}>Deliver to</Text>
                    <Text style={styles.addrValue} numberOfLines={2}>{sale.delivery_address}</Text>
                  </View>
                ) : null}

                {/* Action button */}
                {actionLabel && (
                  <TouchableOpacity
                    style={[styles.actionBtn, isUpdating && styles.actionBtnDisabled]}
                    onPress={() => handleAdvanceStatus(sale)}
                    disabled={isUpdating}
                  >
                    {isUpdating ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.actionBtnText}>{actionLabel}</Text>
                    )}
                  </TouchableOpacity>
                )}

                {sale.order_status === "delivered" && (
                  <View style={styles.deliveredBadge}>
                    <Text style={styles.deliveredText}>✓ Order Delivered</Text>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: "#fff0ec" },
  list: { padding: 20, paddingBottom: 100 },

  empty: { alignItems: "center", marginTop: 64, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#333" },
  emptySub: { fontSize: 14, color: "#999", textAlign: "center" },

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

  // Progress tracker
  progressWrap: { marginTop: 16, marginBottom: 4 },
  dotsRow: { flexDirection: "row", alignItems: "center" },
  progressLine: { flex: 1, height: 2.5, backgroundColor: "#e0e0e0" },
  progressLineFilled: { backgroundColor: "#fe95b4" },
  dotDone: { width: 14, height: 14, borderRadius: 7, backgroundColor: "#fe95b4", alignItems: "center", justifyContent: "center" },
  dotCheck: { color: "#fff", fontSize: 8, fontWeight: "900", lineHeight: 10 },
  dotActive: { width: 14, height: 14, borderRadius: 7, borderWidth: 2.5, borderColor: "#fe95b4", alignItems: "center", justifyContent: "center" },
  dotActiveInner: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#fe95b4" },
  dotIdle: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: "#ddd" },
  labelsRow: { flexDirection: "row", marginTop: 6 },
  stageLabel: { flex: 1, fontSize: 9, color: "#bbb", lineHeight: 13 },
  stageLabelActive: { color: "#e07090" },
  stageLabelCurrent: { fontWeight: "700" },

  // Buyer info
  buyerRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#f5f5f5" },
  addrRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 6, gap: 8 },
  buyerLabel: { fontSize: 12, color: "#aaa", flex: 0 },
  buyerValue: { fontSize: 13, fontWeight: "600", color: "#333" },
  addrValue: { fontSize: 12, color: "#555", flex: 1, textAlign: "right" },

  // Action
  actionBtn: {
    backgroundColor: "#fe95b4", marginTop: 14,
    paddingVertical: 12, borderRadius: 12, alignItems: "center",
  },
  actionBtnDisabled: { backgroundColor: "#f5c6d8" },
  actionBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },

  deliveredBadge: {
    backgroundColor: "#e8f5e9", marginTop: 14,
    paddingVertical: 10, borderRadius: 12, alignItems: "center",
  },
  deliveredText: { color: "#2e7d32", fontSize: 13, fontWeight: "700" },
});

export default MySalesScreen;
