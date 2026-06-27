import { supabase, getImageUrl } from './supabase';
import { CartItem } from '../slices/cartSlice';

export const syncCartToDb = async (userId: string, items: CartItem[]) => {
  try {
    await supabase.from("cart_items").delete().eq("user_id", userId);
    if (items.length > 0) {
      await supabase.from("cart_items").insert(
        items.map(item => ({
          user_id: userId,
          item_id: item.id,
          quantity: item.quantity,
          rent_days: item.rent_days,
          listing_type: item.listing_type,
        }))
      );
    }
  } catch { /* silent — cart sync failure shouldn't crash the app */ }
};

export const loadCartFromDb = async (userId: string): Promise<CartItem[]> => {
  try {
    const { data } = await supabase
      .from("cart_items")
      .select("quantity, rent_days, listing_type, items(id, title, price, rent_price, listing_type, image_url, user_id, size, custom_size, condition)")
      .eq("user_id", userId);

    return (data || [])
      .filter((row: any) => row.items)
      .map((row: any) => ({
        id: row.items.id,
        user_id: row.items.user_id,
        title: row.items.title,
        price: row.items.price != null ? String(row.items.price) : null,
        rent_price: row.items.rent_price != null ? String(row.items.rent_price) : null,
        listing_type: row.listing_type || row.items.listing_type,
        image_url: getImageUrl(row.items.image_url),
        quantity: row.quantity,
        rent_days: row.rent_days,
        size: row.items.custom_size || row.items.size || null,
        condition: row.items.condition || null,
      }));
  } catch {
    return [];
  }
};
