import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from "react-native";
import { useSelector } from "react-redux";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootState } from "../store";
import type { AuthStackParamList } from "../types/navigation";
import { API_URL } from "@env";
// @ts-ignore: optional dependency (install with `npx expo install expo-image-picker` to enable gallery)
import * as ImagePicker from "expo-image-picker";

type Mode = "Sell" | "Rent" | "Sell Accessories" | "Donate";

const CONDITIONS = ["New", "Like New", "Good", "Used"] as const;
const SELL_CATEGORIES = ["Tops", "Dresses", "Bottoms", "Outerwear", "One Piece", "Other"];
const ACCESSORY_CATEGORIES = ["Jewellery", "Bags", "Hair Accessories", "Footwear", "Other"];

const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "Other"];

const AddListingScreen = () => {
  const [mode, setMode] = useState<Mode>("Sell");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasBankDetails, setHasBankDetails] = useState(false);
  const [checkingBankDetails, setCheckingBankDetails] = useState(false);
  const user = useSelector((state: RootState) => state.auth.user);
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  
  // Store state for each mode separately
  const [formData, setFormData] = useState<Record<Mode, {
    imageUris: string[];
    title: string;
    description: string;
    price: string;
    rentPrice: string;
    deposit: string;
    size: string;
    customSize: string;
    condition: typeof CONDITIONS[number];
    category: string;
    customCategory: string;
    paymentMethod: "online" | "cod" | "both";
  }>>({
    "Sell": {
      imageUris: [],
      title: "",
      description: "",
      price: "",
      rentPrice: "",
      deposit: "",
      size: SIZES[2],
      customSize: "",
      condition: CONDITIONS[0],
      category: SELL_CATEGORIES[0],
      customCategory: "",
      paymentMethod: "both",
    },
    "Rent": {
      imageUris: [],
      title: "",
      description: "",
      price: "",
      rentPrice: "",
      deposit: "",
      size: SIZES[2],
      customSize: "",
      condition: CONDITIONS[0],
      category: SELL_CATEGORIES[0],
      customCategory: "",
      paymentMethod: "both",
    },
    "Sell Accessories": {
      imageUris: [],
      title: "",
      description: "",
      price: "",
      rentPrice: "",
      deposit: "",
      size: SIZES[2],
      customSize: "",
      condition: CONDITIONS[0],
      category: ACCESSORY_CATEGORIES[0],
      customCategory: "",
      paymentMethod: "both",
    },
    "Donate": {
      imageUris: [],
      title: "",
      description: "",
      price: "",
      rentPrice: "",
      deposit: "",
      size: SIZES[2],
      customSize: "",
      condition: CONDITIONS[0],
      category: SELL_CATEGORIES[0],
      customCategory: "",
      paymentMethod: "cod",
    },
  });

  // Get current mode's data
  const currentData = formData[mode];

  // Check bank details on mount and when returning from bank details screen
  React.useEffect(() => {
    const checkBankDetails = async () => {
      if (!user) return;
      
      setCheckingBankDetails(true);
      try {
        const response = await fetch(`${API_URL}/api/profile/bank-details/?email=${encodeURIComponent(user.email)}`);
        const bankData = await response.json();
        
        const hasDetails = !!(bankData.account_number || bankData.upi_id);
        setHasBankDetails(hasDetails);
      } catch (error) {
        console.error("Failed to check bank details:", error);
      } finally {
        setCheckingBankDetails(false);
      }
    };

    // Check when screen comes into focus
    const unsubscribe = navigation.addListener('focus', () => {
      checkBankDetails();
    });

    checkBankDetails();

    return unsubscribe;
  }, [user, navigation]);
  
  // Helper to update current mode's data
  const updateField = <K extends keyof typeof currentData>(field: K, value: typeof currentData[K]) => {
    setFormData(prev => ({
      ...prev,
      [mode]: {
        ...prev[mode],
        [field]: value,
      }
    }));
  };

  // Placeholder image upload handler — we intentionally do not add a native picker
  const pickImageFromGallery = async () => {
    // Request permission
    const { status} = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Permission to access photos is required to upload images.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets) {
      const uri = result.assets[0].uri;
      updateField('imageUris', [...currentData.imageUris, uri].slice(0, 5)); // Max 5 images
    }
  };

  const onPressUpload = () => {
    if (currentData.imageUris.length >= 5) {
      Alert.alert("Maximum images", "You can upload up to 5 images per item.");
      return;
    }
    pickImageFromGallery();
  };

  const removeImage = (index: number) => {
    const newUris = currentData.imageUris.filter((_, i) => i !== index);
    updateField('imageUris', newUris);
  };

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert("Error", "You must be logged in to add items");
      return;
    }

    // Validation
    if (!currentData.title.trim()) {
      Alert.alert("Error", "Please enter a title");
      return;
    }

    if (mode === "Sell" && !currentData.price) {
      Alert.alert("Error", "Please enter a price");
      return;
    }

    if (mode === "Rent" && !currentData.rentPrice) {
      Alert.alert("Error", "Please enter a rent price");
      return;
    }

    if (mode === "Sell Accessories" && !currentData.price) {
      Alert.alert("Error", "Please enter a price");
      return;
    }

    // Check if online payment is selected and bank details are missing
    if (mode !== "Donate" && (currentData.paymentMethod === "online" || currentData.paymentMethod === "both")) {
      setIsSubmitting(true);
      try {
        const response = await fetch(`${API_URL}/api/profile/bank-details/?email=${encodeURIComponent(user.email)}`);
        const bankData = await response.json();
        
        // Check if bank details are empty
        const hasBankDetails = bankData.account_number || bankData.upi_id;
        
        if (!hasBankDetails) {
          setIsSubmitting(false);
          Alert.alert(
            "Bank Details Required",
            "You need to add your bank details to accept online payments. Would you like to add them now?",
            [
              {
                text: "Cancel",
                style: "cancel",
              },
              {
                text: "Add Bank Details",
                onPress: () => {
                  navigation.navigate("BankDetails");
                },
              },
            ]
          );
          return;
        }
      } catch (error) {
        console.error("Failed to check bank details:", error);
        setIsSubmitting(false);
        Alert.alert("Error", "Failed to verify bank details. Please try again.");
        return;
      }
      setIsSubmitting(false);
    }

    setIsSubmitting(true);

    try {
      // Map mode to listing_type
      const listingTypeMap: Record<Mode, string> = {
        "Sell": "sell",
        "Rent": "rent",
        "Sell Accessories": "sell_accessories",
        "Donate": "donate",
      };

      // Map condition to backend format
      const conditionMap: Record<string, string> = {
        "New": "new",
        "Like New": "like_new",
        "Good": "good",
        "Used": "used",
      };

      const formData = new FormData();
      formData.append("user_email", user.email);
      formData.append("listing_type", listingTypeMap[mode]);
      formData.append("title", currentData.title);
      formData.append("description", currentData.description);
      formData.append("condition", conditionMap[currentData.condition]);
      formData.append("category", currentData.category);
      formData.append("custom_category", currentData.customCategory);
      formData.append("size", currentData.size);
      formData.append("custom_size", currentData.customSize);
      formData.append("payment_method", currentData.paymentMethod);

      if (currentData.price) {
        formData.append("price", currentData.price);
      }
      if (currentData.rentPrice) {
        formData.append("rent_price", currentData.rentPrice);
      }
      if (currentData.deposit) {
        formData.append("deposit", currentData.deposit);
      }

      // Handle image uploads
      if (currentData.imageUris.length > 0) {
        // First image is the main image
        const mainUri = currentData.imageUris[0];
        const mainUriParts = mainUri.split('.');
        const mainFileType = mainUriParts[mainUriParts.length - 1];
        
        formData.append("image", {
          uri: mainUri,
          name: `item.${mainFileType}`,
          type: `image/${mainFileType}`,
        } as any);

        // Additional images
        for (let i = 1; i < currentData.imageUris.length; i++) {
          const uri = currentData.imageUris[i];
          const uriParts = uri.split('.');
          const fileType = uriParts[uriParts.length - 1];
          
          formData.append("additional_images", {
            uri: uri,
            name: `item_${i}.${fileType}`,
            type: `image/${fileType}`,
          } as any);
        }
      }

      const response = await fetch(`${API_URL}/api/items/create/`, {
        method: "POST",
        body: formData,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert("Success", "Item added successfully!", [
          {
            text: "OK",
            onPress: () => {
              // Reset the form for current mode
              setFormData(prev => ({
                ...prev,
                [mode]: {
                  imageUris: [],
                  title: "",
                  description: "",
                  price: "",
                  rentPrice: "",
                  deposit: "",
                  size: SIZES[2],
                  customSize: "",
                  condition: CONDITIONS[0],
                  category: mode === "Sell Accessories" ? ACCESSORY_CATEGORIES[0] : SELL_CATEGORIES[0],
                  customCategory: "",
                  paymentMethod: mode === "Donate" ? "cod" : "both",
                },
              }));
              // Navigate back to closet
              navigation.goBack();
            },
          },
        ]);
      } else {
        Alert.alert("Error", JSON.stringify(data));
      }
    } catch (error) {
      Alert.alert("Network Error", "Failed to add item. Please try again.");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCommonFields = () => (
    <>
      <Text style={styles.label}>Images ({currentData.imageUris.length}/5)</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesScroll}>
        {currentData.imageUris.map((uri, index) => (
          <View key={index} style={styles.imagePreviewWrapper}>
            <Image source={{ uri }} style={styles.imagePreviewThumb} resizeMode="cover" />
            <TouchableOpacity style={styles.removeImageButton} onPress={() => removeImage(index)}>
              <Text style={styles.removeImageText}>✕</Text>
            </TouchableOpacity>
            {index === 0 && (
              <View style={styles.primaryBadge}>
                <Text style={styles.primaryBadgeText}>Main</Text>
              </View>
            )}
          </View>
        ))}
        {currentData.imageUris.length < 5 && (
          <TouchableOpacity style={styles.addImageButton} onPress={onPressUpload} activeOpacity={0.8}>
            <Text style={styles.addImageText}>+</Text>
            <Text style={styles.addImageLabel}>Add Photo</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <Text style={styles.label}>Title</Text>
      <TextInput style={styles.input} value={currentData.title} onChangeText={(val) => updateField('title', val)} placeholder="Give it a short title" />

      <Text style={styles.label}>Description (optional)</Text>
      <TextInput
        style={[styles.input, { height: 90 }]}
        value={currentData.description}
        onChangeText={(val) => updateField('description', val)}
        placeholder="Describe condition, brand, fit..."
        multiline
      />

      {mode !== "Donate" && (
        <>
          <Text style={styles.label}>Payment Methods Accepted</Text>
          <View style={styles.optionRow}>
            <TouchableOpacity
              style={[styles.paymentOption, currentData.paymentMethod === "online" && styles.paymentOptionActive]}
              onPress={() => updateField('paymentMethod', 'online')}
            >
              <Text style={currentData.paymentMethod === "online" ? styles.paymentOptionTextActive : styles.paymentOptionText}>
                💳 Online Only
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.paymentOption, currentData.paymentMethod === "cod" && styles.paymentOptionActive]}
              onPress={() => updateField('paymentMethod', 'cod')}
            >
              <Text style={currentData.paymentMethod === "cod" ? styles.paymentOptionTextActive : styles.paymentOptionText}>
                💵 COD Only
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.paymentOption, currentData.paymentMethod === "both" && styles.paymentOptionActive]}
              onPress={() => updateField('paymentMethod', 'both')}
            >
              <Text style={currentData.paymentMethod === "both" ? styles.paymentOptionTextActive : styles.paymentOptionText}>
                ✨ Both
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* Bank Details Status */}
          {(currentData.paymentMethod === "online" || currentData.paymentMethod === "both") && (
            <View style={styles.bankDetailsStatus}>
              {checkingBankDetails ? (
                <Text style={styles.bankDetailsStatusText}>Checking bank details...</Text>
              ) : hasBankDetails ? (
                <View style={styles.bankDetailsSuccess}>
                  <Text style={styles.bankDetailsSuccessIcon}>✓</Text>
                  <Text style={styles.bankDetailsSuccessText}>Bank details added</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.bankDetailsWarning}
                  onPress={() => navigation.navigate("BankDetails")}
                >
                  <Text style={styles.bankDetailsWarningIcon}>⚠️</Text>
                  <View style={styles.bankDetailsWarningContent}>
                    <Text style={styles.bankDetailsWarningTitle}>Bank details required</Text>
                    <Text style={styles.bankDetailsWarningText}>Tap to add your bank details</Text>
                  </View>
                  <Text style={styles.bankDetailsWarningArrow}>›</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </>
      )}
    </>
  );

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.header}>My Fairy Closet</Text>

      <View style={styles.modeRow}>
        {(["Sell", "Rent", "Sell Accessories", "Donate"] as Mode[]).map((m) => (
          <TouchableOpacity
            key={m}
            style={[styles.modeButton, mode === m && styles.modeButtonActive]}
            onPress={() => setMode(m)}
            activeOpacity={0.85}
          >
            <Text style={[styles.modeText, mode === m && styles.modeTextActive]}>{m}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.formCard}>
        {renderCommonFields()}

        {mode === "Sell" && (
          <>
            <Text style={styles.label}>Price</Text>
            <TextInput style={styles.input} value={currentData.price} onChangeText={(val) => updateField('price', val)} placeholder="e.g. 250" keyboardType="numeric" />

            <Text style={styles.label}>Size</Text>
            <View style={styles.optionRow}>
              {SIZES.map((s) => (
                <TouchableOpacity key={s} style={[styles.smallChip, currentData.size === s && styles.smallChipActive]} onPress={() => updateField('size', s)}>
                  <Text style={currentData.size === s ? styles.smallChipTextActive : styles.smallChipText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {currentData.size === "Other" && (
              <>
                <Text style={styles.label}>Enter custom size</Text>
                <TextInput 
                  style={styles.input} 
                  value={currentData.customSize} 
                  onChangeText={(val) => updateField('customSize', val)} 
                  placeholder="e.g. 32, 34, etc." 
                />
              </>
            )}

            <Text style={styles.label}>Condition</Text>
            <View style={styles.optionRow}>
              {CONDITIONS.map((c) => (
                <TouchableOpacity key={c} style={[styles.option, currentData.condition === c && styles.optionActive]} onPress={() => updateField('condition', c)}>
                  <Text style={currentData.condition === c ? styles.optionTextActive : styles.optionText}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Category</Text>
            <View style={styles.optionRowHorizontal}>
              {SELL_CATEGORIES.map((cat) => (
                <TouchableOpacity key={cat} style={[styles.smallChip, currentData.category === cat && styles.smallChipActive]} onPress={() => updateField('category', cat)}>
                  <Text style={currentData.category === cat ? styles.smallChipTextActive : styles.smallChipText}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {currentData.category === "Other" && (
              <>
                <Text style={styles.label}>Enter custom category</Text>
                <TextInput 
                  style={styles.input} 
                  value={currentData.customCategory} 
                  onChangeText={(val) => updateField('customCategory', val)} 
                  placeholder="e.g. Skirts, Jumpsuits, etc." 
                />
              </>
            )}
          </>
        )}

        {mode === "Rent" && (
          <>
            <Text style={styles.label}>Rent price per day</Text>
            <TextInput style={styles.input} value={currentData.rentPrice} onChangeText={(val) => updateField('rentPrice', val)} placeholder="e.g. 250" keyboardType="numeric" />

            <Text style={styles.label}>Size</Text>
            <View style={styles.optionRow}>
              {SIZES.map((s) => (
                <TouchableOpacity key={s} style={[styles.smallChip, currentData.size === s && styles.smallChipActive]} onPress={() => updateField('size', s)}>
                  <Text style={currentData.size === s ? styles.smallChipTextActive : styles.smallChipText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {currentData.size === "Other" && (
              <>
                <Text style={styles.label}>Enter custom size</Text>
                <TextInput 
                  style={styles.input} 
                  value={currentData.customSize} 
                  onChangeText={(val) => updateField('customSize', val)} 
                  placeholder="e.g. 32, 34, etc." 
                />
              </>
            )}

            <Text style={styles.label}>Security deposit (optional)</Text>
            <TextInput style={styles.input} value={currentData.deposit} onChangeText={(val) => updateField('deposit', val)} placeholder="e.g. 550" keyboardType="numeric" />

            <Text style={styles.label}>Condition</Text>
            <View style={styles.optionRow}>
              {CONDITIONS.map((c) => (
                <TouchableOpacity key={c} style={[styles.option, currentData.condition === c && styles.optionActive]} onPress={() => updateField('condition', c)}>
                  <Text style={currentData.condition === c ? styles.optionTextActive : styles.optionText}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Category</Text>
            <View style={styles.optionRowHorizontal}>
              {SELL_CATEGORIES.map((cat) => (
                <TouchableOpacity key={cat} style={[styles.smallChip, currentData.category === cat && styles.smallChipActive]} onPress={() => updateField('category', cat)}>
                  <Text style={currentData.category === cat ? styles.smallChipTextActive : styles.smallChipText}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {currentData.category === "Other" && (
              <>
                <Text style={styles.label}>Enter custom category</Text>
                <TextInput 
                  style={styles.input} 
                  value={currentData.customCategory} 
                  onChangeText={(val) => updateField('customCategory', val)} 
                  placeholder="e.g. Skirts, Jumpsuits, etc." 
                />
              </>
            )}
          </>
        )}

        {mode === "Sell Accessories" && (
          <>
            <Text style={styles.label}>Price</Text>
            <TextInput style={styles.input} value={currentData.price} onChangeText={(val) => updateField('price', val)} placeholder="e.g. 250" keyboardType="numeric" />

            <Text style={styles.label}>Condition</Text>
            <View style={styles.optionRow}>
              {CONDITIONS.map((c) => (
                <TouchableOpacity key={c} style={[styles.option, currentData.condition === c && styles.optionActive]} onPress={() => updateField('condition', c)}>
                  <Text style={currentData.condition === c ? styles.optionTextActive : styles.optionText}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Category</Text>
            <View style={styles.optionRowHorizontal}>
              {ACCESSORY_CATEGORIES.map((cat) => (
                <TouchableOpacity key={cat} style={[styles.smallChip, currentData.category === cat && styles.smallChipActive]} onPress={() => updateField('category', cat)}>
                  <Text style={currentData.category === cat ? styles.smallChipTextActive : styles.smallChipText}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {currentData.category === "Other" && (
              <>
                <Text style={styles.label}>Enter custom category</Text>
                <TextInput 
                  style={styles.input} 
                  value={currentData.customCategory} 
                  onChangeText={(val) => updateField('customCategory', val)} 
                  placeholder="e.g. Watches, Belts, etc." 
                />
              </>
            )}
          </>
        )}

        {mode === "Donate" && (
          <>
            <Text style={styles.label}>Size</Text>
            <View style={styles.optionRow}>
              {SIZES.map((s) => (
                <TouchableOpacity key={s} style={[styles.smallChip, currentData.size === s && styles.smallChipActive]} onPress={() => updateField('size', s)}>
                  <Text style={currentData.size === s ? styles.smallChipTextActive : styles.smallChipText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {currentData.size === "Other" && (
              <>
                <Text style={styles.label}>Enter custom size</Text>
                <TextInput 
                  style={styles.input} 
                  value={currentData.customSize} 
                  onChangeText={(val) => updateField('customSize', val)} 
                  placeholder="e.g. 32, 34, etc." 
                />
              </>
            )}

            <Text style={styles.label}>Condition</Text>
            <View style={styles.optionRow}>
              {CONDITIONS.map((c) => (
                <TouchableOpacity key={c} style={[styles.option, currentData.condition === c && styles.optionActive]} onPress={() => updateField('condition', c)}>
                  <Text style={currentData.condition === c ? styles.optionTextActive : styles.optionText}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Category</Text>
            <View style={styles.optionRowHorizontal}>
              {SELL_CATEGORIES.map((cat) => (
                <TouchableOpacity key={cat} style={[styles.smallChip, currentData.category === cat && styles.smallChipActive]} onPress={() => updateField('category', cat)}>
                  <Text style={currentData.category === cat ? styles.smallChipTextActive : styles.smallChipText}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {currentData.category === "Other" && (
              <>
                <Text style={styles.label}>Enter custom category</Text>
                <TextInput 
                  style={styles.input} 
                  value={currentData.customCategory} 
                  onChangeText={(val) => updateField('customCategory', val)} 
                  placeholder="e.g. Skirts, Jumpsuits, etc." 
                />
              </>
            )}

            {/* Price field intentionally omitted for Donate */}
          </>
        )}

        <TouchableOpacity 
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]} 
          activeOpacity={0.9} 
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <Text style={styles.submitText}>{isSubmitting ? "Adding..." : "Add Item"}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 60,
    backgroundColor: "#fff5fb",
  },
  header: { fontSize: 28, fontWeight: "800", color: "#1f0a1a", marginBottom: 18 },
  modeRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 18 },
  modeButton: { flex: 1, marginHorizontal: 4, paddingVertical: 10, borderRadius: 10, backgroundColor: "#ffe8f2", alignItems: "center" },
  modeButtonActive: { backgroundColor: "#ff1493" },
  modeText: { color: "#6b2a3a", fontWeight: "700" },
  modeTextActive: { color: "#fff" },
  formCard: { backgroundColor: "#fff", borderRadius: 14, padding: 16, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  imagesScroll: { marginTop: 8, marginBottom: 12 },
  imagePreviewWrapper: { position: "relative", marginRight: 12 },
  imagePreviewThumb: { width: 100, height: 100, borderRadius: 10 },
  removeImageButton: { position: "absolute", top: 4, right: 4, backgroundColor: "rgba(0,0,0,0.6)", width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  removeImageText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  primaryBadge: { position: "absolute", bottom: 4, left: 4, backgroundColor: "#ff1493", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  primaryBadgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  addImageButton: { width: 100, height: 100, borderRadius: 10, backgroundColor: "#faf0f6", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#e0d0e0", borderStyle: "dashed" },
  addImageText: { fontSize: 32, color: "#a23a56", fontWeight: "300" },
  addImageLabel: { fontSize: 11, color: "#a23a56", fontWeight: "600", marginTop: 4 },
  label: { fontSize: 14, fontWeight: "700", color: "#4b2a36", marginTop: 8 },
  input: { borderWidth: 1, borderColor: "#eee", padding: 10, borderRadius: 8, marginTop: 6 },
  optionRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 8 },
  option: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, backgroundColor: "#fff5fb", marginRight: 8, marginTop: 8 },
  optionActive: { backgroundColor: "#ff1493" },
  optionText: { color: "#6b2a3a" },
  optionTextActive: { color: "#fff", fontWeight: "700" },
  optionRowHorizontal: { flexDirection: "row", flexWrap: "wrap", marginTop: 8 },
  smallChip: { paddingVertical: 6, paddingHorizontal: 8, borderRadius: 20, backgroundColor: "#fff5fb", marginRight: 8, marginTop: 8 },
  smallChipActive: { backgroundColor: "#ff1493" },
  smallChipText: { color: "#6b2a3a" },
  smallChipTextActive: { color: "#fff", fontWeight: "700" },
  submitButton: { marginTop: 18, backgroundColor: "#ff1493", paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  submitButtonDisabled: { backgroundColor: "#ccc" },
  submitText: { color: "#fff", fontWeight: "800" },
  paymentOption: { flex: 1, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 8, backgroundColor: "#fff5fb", marginRight: 8, marginTop: 8, alignItems: "center" },
  paymentOptionActive: { backgroundColor: "#ff1493" },
  paymentOptionText: { color: "#6b2a3a", fontSize: 13, fontWeight: "600" },
  paymentOptionTextActive: { color: "#fff", fontWeight: "700" },
  bankDetailsStatus: { marginTop: 12 },
  bankDetailsStatusText: { fontSize: 13, color: "#999", textAlign: "center" },
  bankDetailsSuccess: { flexDirection: "row", alignItems: "center", backgroundColor: "#e8f5e9", padding: 12, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: "#4caf50" },
  bankDetailsSuccessIcon: { fontSize: 18, marginRight: 8 },
  bankDetailsSuccessText: { fontSize: 14, fontWeight: "600", color: "#2e7d32" },
  bankDetailsWarning: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff3e0", padding: 12, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: "#ff9800" },
  bankDetailsWarningIcon: { fontSize: 20, marginRight: 12 },
  bankDetailsWarningContent: { flex: 1 },
  bankDetailsWarningTitle: { fontSize: 14, fontWeight: "700", color: "#e65100", marginBottom: 2 },
  bankDetailsWarningText: { fontSize: 12, color: "#f57c00" },
  bankDetailsWarningArrow: { fontSize: 24, color: "#f57c00", fontWeight: "300" },
});

export default AddListingScreen;


