import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import cartReducer from './slices/cartSlice';
import { syncCartToDb } from './lib/cartSync';

export const store = configureStore({
  reducer: { auth: authReducer, cart: cartReducer },
});

// Sync cart to DB whenever it changes (debounced)
let syncDebounce: ReturnType<typeof setTimeout> | null = null;
let lastSyncKey = '';

store.subscribe(() => {
  const { auth, cart } = store.getState();
  if (!auth.user?.id) return;
  const key = auth.user.id + '|' + JSON.stringify(cart.items);
  if (key === lastSyncKey) return;
  lastSyncKey = key;
  if (syncDebounce) clearTimeout(syncDebounce);
  syncDebounce = setTimeout(() => syncCartToDb(auth.user!.id, cart.items), 800);
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
