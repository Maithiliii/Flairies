import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, cart_id } =
      await req.json();

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !cart_id) {
      throw new Error("Missing payment verification fields");
    }

    // ── 1. Verify Razorpay signature ─────────────────────────────────────────
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET")!;
    const sigBody = `${razorpay_order_id}|${razorpay_payment_id}`;
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(keySecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sigBuffer = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(sigBody));
    const computedSig = Array.from(new Uint8Array(sigBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (computedSig !== razorpay_signature) throw new Error("Invalid payment signature");

    // ── 2. Fetch all orders for this cart ─────────────────────────────────────
    const { data: orders, error: fetchError } = await supabase
      .from("orders")
      .select("order_id, item_id, buyer_id, seller_id, seller_earnings")
      .eq("cart_id", cart_id);

    if (fetchError || !orders?.length) throw new Error("Orders not found for cart");
    if (orders[0].buyer_id !== user.id) throw new Error("Unauthorized");

    // ── 3. Mark all orders as paid ────────────────────────────────────────────
    const orderIds = orders.map((o: any) => o.order_id);
    await supabase
      .from("orders")
      .update({
        payment_status: "paid",
        order_status: "confirmed",
        razorpay_payment_id,
        razorpay_signature,
        payout_status: "processing",
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .in("order_id", orderIds);

    // Mark all items unavailable
    const itemIds = orders.map((o: any) => o.item_id).filter(Boolean);
    if (itemIds.length > 0) {
      await supabase.from("items").update({ is_available: false }).in("id", itemIds);
    }

    // ── 4. Group by seller, sum earnings, fire one payout per seller ──────────
    const sellerMap: Record<string, { earnings: number; orderIds: string[] }> = {};
    for (const order of orders) {
      const sid = order.seller_id;
      if (!sellerMap[sid]) sellerMap[sid] = { earnings: 0, orderIds: [] };
      sellerMap[sid].earnings += parseFloat(order.seller_earnings || "0");
      sellerMap[sid].orderIds.push(order.order_id);
    }

    const payoutResults: Record<string, any> = {};
    for (const [sellerId, { earnings, orderIds: sellerOrderIds }] of Object.entries(sellerMap)) {
      if (earnings <= 0) continue;
      const result = await triggerSellerPayout({ supabase, sellerId, sellerEarnings: earnings, cartId: cart_id });
      payoutResults[sellerId] = result;
      await supabase
        .from("orders")
        .update({ payout_status: result.status })
        .in("order_id", sellerOrderIds);
    }

    return new Response(
      JSON.stringify({ success: true, payouts: payoutResults }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function triggerSellerPayout({
  supabase, sellerId, sellerEarnings, cartId,
}: {
  supabase: any;
  sellerId: string;
  sellerEarnings: number;
  cartId: string;
}) {
  try {
    const accountNumber = Deno.env.get("RAZORPAY_ACCOUNT_NUMBER");
    if (!accountNumber) return { status: "pending", reason: "account_not_configured" };

    const auth = btoa(`${Deno.env.get("RAZORPAY_KEY_ID")}:${Deno.env.get("RAZORPAY_KEY_SECRET")}`);
    const headers = { "Content-Type": "application/json", Authorization: `Basic ${auth}` };

    const { data: seller } = await supabase
      .from("profiles")
      .select("id, name, email, upi_id, account_holder_name, account_number, ifsc_code, razorpay_contact_id")
      .eq("id", sellerId)
      .single();

    if (!seller) return { status: "pending", reason: "seller_not_found" };

    const hasUpi = !!seller.upi_id?.trim();
    const hasBank = !!(seller.account_number?.trim() && seller.ifsc_code?.trim() && seller.account_holder_name?.trim());
    if (!hasUpi && !hasBank) return { status: "pending", reason: "no_payout_details" };

    // Get or create Razorpay Contact
    let contactId = seller.razorpay_contact_id;
    if (!contactId) {
      const contactRes = await fetch("https://api.razorpay.com/v1/contacts", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: seller.name || "Seller",
          email: seller.email || "",
          type: "vendor",
          reference_id: `seller_${seller.id}`,
        }),
      });
      if (!contactRes.ok) return { status: "pending", reason: "contact_creation_failed" };
      const contact = await contactRes.json();
      contactId = contact.id;
      await supabase.from("profiles").update({ razorpay_contact_id: contactId }).eq("id", seller.id);
    }

    // Create Fund Account (UPI preferred)
    const fundAccountBody: any = hasUpi
      ? { contact_id: contactId, account_type: "vpa", vpa: { address: seller.upi_id.trim() } }
      : {
          contact_id: contactId,
          account_type: "bank_account",
          bank_account: {
            name: seller.account_holder_name.trim(),
            ifsc: seller.ifsc_code.trim().toUpperCase(),
            account_number: seller.account_number.trim(),
          },
        };

    const faRes = await fetch("https://api.razorpay.com/v1/fund_accounts", {
      method: "POST", headers, body: JSON.stringify(fundAccountBody),
    });
    if (!faRes.ok) return { status: "pending", reason: "fund_account_failed" };
    const fundAccount = await faRes.json();

    // Fire Payout
    const payoutRes = await fetch("https://api.razorpay.com/v1/payouts", {
      method: "POST",
      headers,
      body: JSON.stringify({
        account_number: accountNumber,
        fund_account_id: fundAccount.id,
        amount: Math.round(sellerEarnings * 100),
        currency: "INR",
        mode: hasUpi ? "UPI" : "IMPS",
        purpose: "payout",
        queue_if_low_balance: true,
        reference_id: `${cartId}_${sellerId.substring(0, 8)}`,
        narration: "Flairies seller payout",
      }),
    });
    if (!payoutRes.ok) return { status: "pending", reason: "payout_api_failed" };

    const payout = await payoutRes.json();
    return {
      status: payout.status === "processed" ? "completed" : "processing",
      razorpay_payout_id: payout.id,
    };
  } catch (err: any) {
    console.error("Payout error:", err.message);
    return { status: "pending", reason: "unexpected_error" };
  }
}
