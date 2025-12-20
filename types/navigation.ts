import type { User } from '../slices/authSlice';

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  AddressSetup: { user: User } | undefined;
  Welcome: { user?: User } | undefined;
  Home: undefined;
  Buy: undefined;
  Rent: undefined;
  Accessories: undefined;
  AddListing: undefined;
  Search: undefined;
  BankDetails: undefined;
  Checkout: { item?: any } | undefined;
  Orders: undefined;
  SellerProfile: { username: string; sellerEmail: string; sellerName: string; sellerProfilePic?: string } | undefined;
  ChatList: undefined;
  Chat: { recipientEmail: string; recipientName: string; recipientProfilePic?: string } | undefined;
};

