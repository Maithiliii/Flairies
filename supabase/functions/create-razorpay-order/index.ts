import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const COMMISSION_RATE = 0.15;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const userSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    if (authError || !user) throw new Error("Not authenticated");
    console.log("Auth OK, user:", user.id);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { cart_items, buyer_name, buyer_phone, delivery_address, payment_method, delivery_fee, gst_amount } =
      await req.json();

    if (!cart_items?.length || !buyer_name || !delivery_address || !payment_method) {
      throw new Error("Missing required fields");
    }

    // Fetch all items from DB
    const itemIds = cart_items.map((i: any) => i.id);
    const daysMap: Record<number, number> = Object.fromEntries(
      cart_items.map((i: any) => [i.id, Math.max(1, i.days || 1)])
    );

    const { data: items, error: itemsError } = await supabase
      .from("items")
      .select("id, user_id, title, price, rent_price, listing_type")
      .in("id", itemIds)
      .eq("is_active", true);

    if (itemsError || !items?.length) throw new Error("Items not found");

    // Block buying own items
    const ownItem = items.find((item: any) => item.user_id === user.id);
    if (ownItem) throw new Error(`Cannot purchase your own item: ${ownItem.title}`);

    // Sum total (rent price × days)
    let total = 0;
    for (const item of items) {
      const days = daysMap[item.id] || 1;
      const price = item.listing_type === "rent"
        ? parseFloat(item.rent_price || "0") * days
        : parseFloat(item.price || "0");
      total += price;
    }
    if (total <= 0) throw new Error("Invalid total amount");

    const extraFees = Number(delivery_fee || 0) + Number(gst_amount || 0);
    const grandTotal = total + extraFees;
    const amountInPaise = Math.round(grandTotal * 100);
    const cartId = `CART${Date.now()}${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
    console.log("Total:", total, "Extra fees:", extraFees, "Grand:", grandTotal, "Paise:", amountInPaise);

    // Create Razorpay order (single order for full cart total)
    let razorpayOrderId: string | null = null;
    if (payment_method === "online") {
      const keyId = Deno.env.get("RAZORPAY_KEY_ID") || "";
      const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET") || "";
      console.log("Razorpay key present:", !!keyId, "Secret present:", !!keySecret);
      const auth = btoa(`${keyId}:${keySecret}`);
      const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Basic ${auth}` },
        body: JSON.stringify({
          amount: amountInPaise,
          currency: "INR",
          receipt: cartId,
          notes: { cart_id: cartId, buyer_id: user.id, item_count: String(items.length) },
        }),
      });
      if (!rzpRes.ok) {
        const errText = await rzpRes.text();
        console.error("Razorpay API error:", rzpRes.status, errText);
        throw new Error(`Razorpay error (${rzpRes.status}): ${errText}`);
      }
      const rzpData = await rzpRes.json();
      razorpayOrderId = rzpData.id;
      console.log("Razorpay order created:", razorpayOrderId);
    }

    // Insert one orders row per cart item, all sharing the same cart_id
    const orderRows = items.map((item: any) => {
      const days = daysMap[item.id] || 1;
      const itemPrice = item.listing_type === "rent"
        ? parseFloat(item.rent_price || "0") * days
        : parseFloat(item.price || "0");
      const platformCommission = payment_method === "online" ? itemPrice * COMMISSION_RATE : 0;
      const orderId = `FL${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      return {
        order_id: orderId,
        cart_id: cartId,
        buyer_id: user.id,
        seller_id: item.user_id,
        item_id: item.id,
        item_price: itemPrice,
        payment_method,
        payment_status: "pending",
        order_status: "pending",
        platform_commission: platformCommission,
        seller_earnings: itemPrice - platformCommission,
        buyer_name,
        buyer_phone: buyer_phone || "",
        delivery_address,
        razorpay_order_id: razorpayOrderId,
        payout_status: "pending",
      };
    });

    const { error: insertError } = await supabase.from("orders").insert(orderRows);
    if (insertError) {
      console.error("DB insert error:", insertError.message);
      throw new Error(`DB error: ${insertError.message}`);
    }
    console.log("Orders saved, cartId:", cartId, "count:", orderRows.length);

    if (payment_method === "cod") {
      await supabase.from("items").update({ is_available: false }).in("id", itemIds);
    }

    return new Response(
      JSON.stringify({
        cart_id: cartId,
        razorpay_order_id: razorpayOrderId,
        amount: grandTotal,
        amount_in_paise: amountInPaise,
        key_id: Deno.env.get("RAZORPAY_KEY_ID") || "",
        item_count: items.length,
        item_titles: items.map((i: any) => i.title).join(", "),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
