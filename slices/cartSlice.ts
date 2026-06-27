import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface CartItem {
  id: number;
  user_id?: string;
  title: string;
  price?: string | null;
  rent_price?: string | null;
  listing_type: string;
  image_url?: string | null;
  quantity: number;
  rent_days: number;
  size?: string | null;
  condition?: string | null;
}

interface CartState {
  items: CartItem[];
}

const initialState: CartState = { items: [] };

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (state, action: PayloadAction<Omit<CartItem, 'rent_days'> & { rent_days?: number }>) => {
      const existing = state.items.find(
        (i) => i.id === action.payload.id && i.listing_type === action.payload.listing_type
      );
      if (!existing) {
        state.items.push({ ...action.payload, quantity: 1, rent_days: action.payload.rent_days ?? 1 });
      }
    },
    removeFromCart: (state, action: PayloadAction<number>) => {
      state.items = state.items.filter((i) => i.id !== action.payload);
    },
    updateRentDays: (state, action: PayloadAction<{ id: number; days: number }>) => {
      const item = state.items.find((i) => i.id === action.payload.id);
      if (item) item.rent_days = Math.max(1, action.payload.days);
    },
    clearCart: (state) => {
      state.items = [];
    },
    setCart: (state, action: PayloadAction<CartItem[]>) => {
      state.items = action.payload;
    },
  },
});

export const { addToCart, removeFromCart, updateRentDays, clearCart, setCart } = cartSlice.actions;
export default cartSlice.reducer;
