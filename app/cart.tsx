import React from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { RootState } from '../store';
import { removeFromCart, clearCart } from '../slices/cartSlice';
import { API_URL } from '@env';

const CartScreen = () => {
  const items = useSelector((s: RootState) => s.cart.items);
  const dispatch = useDispatch();
  const navigation = useNavigation();

  const total = items.reduce((sum, it) => {
    const price = it.listing_type === 'rent' ? (it.rent_price ? parseFloat(it.rent_price) : 0) : (it.price ? parseFloat(it.price) : 0);
    return sum + price;
  }, 0);

  const handleCheckout = () => {
    navigation.navigate('Checkout' as never);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Cart</Text>
      {items.length === 0 ? (
        <Text style={styles.empty}>Your cart is empty</Text>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => `${i.listing_type}-${i.id}`}
          renderItem={({ item }) => (
            <View style={styles.card}>
              {item.image ? (
                <Image source={{ uri: `${API_URL}${item.image}` }} style={styles.image} resizeMode="cover" />
              ) : (
                <View style={[styles.image, styles.placeholder]}>
                  <Text style={styles.placeholderText}>No Image</Text>
                </View>
              )}
              <View style={styles.meta}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.price}>{item.listing_type === 'rent' ? `₹${item.rent_price} / day` : `₹${item.price}`}</Text>
                <TouchableOpacity style={styles.remove} onPress={() => dispatch(removeFromCart(item.id))}>
                  <Text style={styles.removeText}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      <View style={styles.footer}>
        <Text style={styles.total}>Total: ₹{total.toFixed(2)}</Text>
        <TouchableOpacity style={styles.checkout} onPress={handleCheckout} disabled={items.length === 0}>
          <Text style={styles.checkoutText}>Checkout</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.clear} onPress={() => dispatch(clearCart())}>
          <Text style={styles.clearText}>Clear</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 60, backgroundColor: '#fff5fb' },
  header: { fontSize: 28, fontWeight: '800', color: '#1f0a1a', marginBottom: 20 },
  empty: { marginTop: 24, color: '#999', textAlign: 'center' },
  card: { flexDirection: 'row', backgroundColor: '#fff', padding: 12, borderRadius: 12, marginBottom: 12, alignItems: 'center' },
  image: { width: 80, height: 80, borderRadius: 8, marginRight: 12 },
  placeholder: { backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
  placeholderText: { color: '#999', fontSize: 10 },
  meta: { flex: 1 },
  title: { fontSize: 16, fontWeight: '700', color: '#1e0a16' },
  price: { color: '#ff2f8f', marginTop: 6, fontSize: 15, fontWeight: '600' },
  footer: { marginTop: 'auto', paddingBottom: 20 },
  total: { fontSize: 20, fontWeight: '800', marginBottom: 16, color: '#1e0a16' },
  checkout: { backgroundColor: '#ff1493', padding: 14, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  checkoutText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  clear: { alignItems: 'center', paddingVertical: 8 },
  clearText: { color: '#666', fontSize: 14 },
  remove: { marginTop: 8, backgroundColor: '#ff66b3', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, alignSelf: 'flex-start' },
  removeText: { color: '#fff', fontSize: 13, fontWeight: '600' },
});

export default CartScreen;
