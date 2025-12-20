import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Full User interface for your API
export interface User {
  username: string;
  email: string;
  phone_number?: string;
  profile_picture?: string | null;
  id?: number;
  token?: string;
  // You can add more fields here if your API returns them
}

interface AuthState {
  user: User | null;
}

const initialState: AuthState = { user: null };

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
    },
    logout: (state) => {
      state.user = null;
    },
  },
});

// Export actions and reducer
export const { setUser, logout } = authSlice.actions;
export default authSlice.reducer;
