# Flairies

**Flairies** is a cross-platform fashion resale app (mobile & web) built for girls who want to give their wardrobe a second life. Buy, sell, rent, or donate pre-loved clothes and accessories — all within a community that values sustainability, affordability, and girlhood empowerment. Sellers earn from their closet, renters access fashion affordably, and donors can connect their unused pieces directly to NGOs and charitable organisations.

## Features

**User Profiles:** Secure sign-up/login, profile management, seller details, bank/UPI details for payouts, and address storage with location sync.  
**Listings:** Post pre-loved fashion items — clothes, shoes, bags, and accessories — with images, pricing, size, condition, and descriptions. Choose to sell, rent, or donate.  
**Buy & Rent:** Browse curated listings, add to cart, and checkout securely. Rent items for a set duration with per-day pricing and date selection.  
**Donations:** List clothes and accessories as donations to be connected with NGOs and charitable organisations, giving pre-loved items a meaningful second life.  
**Cart & Conflict Detection:** Smart cart that prevents mixing buy/rent items, with clear prompts to keep things clean at checkout.  
**Payments:** Razorpay-powered online-only payments via Supabase Edge Functions, with seller payouts to verified bank/UPI accounts.  
**Bank Details & Payouts:** Sellers add bank or UPI details before listing paid items, ensuring smooth and verified payouts.  
**Seller Profiles & Earnings:** Dedicated seller pages with listings, ratings, and an earnings dashboard showing sales history and payout status.  
**Real-Time Chat:** In-app messaging between buyers and sellers for queries, negotiation, and coordination.  
**Search & Filter:** Browse and filter listings by category, size, price, condition, and availability.  
**Favorites:** Save and revisit items you love with a persistent favorites list.  
**Orders & Reviews:** Track purchase history, order status, and leave ratings for sellers post-purchase.  
**Location Services:** Google Maps–based location picker with reverse geocoding for accurate delivery address selection.  
**Notifications:** In-app and push notifications for purchases, messages, and order updates.  


## Tech Stack

**Frontend:** React Native (Expo SDK 54), TypeScript, Redux Toolkit, React Navigation  
**Backend & Auth:** Supabase (PostgreSQL, Auth, Storage, Edge Functions)  
**Payments:** Razorpay (online payments only) via Supabase Edge Functions  
**Maps:** Google Maps API with reverse geocoding for delivery address selection  
**State Management:** Redux Toolkit with persistent cart and auth slices  
