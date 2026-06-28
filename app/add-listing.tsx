import React, { useState, useRef } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Image, Alert } from "react-native";
import ScreenHeader from "../components/ScreenHeader";
import { useSelector } from "react-redux";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootState } from "../store";
import type { AuthStackParamList } from "../types/navigation";
// @ts-ignore
import * as ImagePicker from "expo-image-picker";
import { supabase, uploadImage } from "../lib/supabase";
import { TriangleAlert } from "lucide-react-native";

type Mode = "Sell" | "Rent" | "Sell Accessories" | "Donate";

const FALLBACK_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "Other"];
const FALLBACK_CONDITIONS = ["New", "Like New", "Good", "Used"];
const FALLBACK_SELL_CATEGORIES = ["Tops", "Dresses", "Bottoms", "Outerwear", "One Piece", "Other"];
const FALLBACK_ACCESSORY_CATEGORIES = ["Jewellery", "Bags", "Hair Accessories", "Footwear", "Other"];

type FormState = {
  imageUris: string[]; title: string; description: string; price: string;
  rentPrice: string; deposit: string; size: string; customSize: string;
  condition: string; category: string; customCategory: string;
};

const defaultForm = (mode: Mode): FormState => ({
  imageUris: [], title: "", description: "", price: "", rentPrice: "", deposit: "",
  size: "M", customSize: "", condition: "New",
  category: mode === "Sell Accessories" ? FALLBACK_ACCESSORY_CATEGORIES[0] : FALLBACK_SELL_CATEGORIES[0],
  customCategory: "",
});

const AddListingScreen = () => {
  const [mode, setMode] = useState<Mode>("Sell");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const scrollRef = useRef<ScrollView>(null);

  const clearError = (field: string) => {
    if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
  };
  const [hasBankDetails, setHasBankDetails] = useState(false);
  const [checkingBankDetails, setCheckingBankDetails] = useState(false);
  const [sizes, setSizes] = useState<string[]>(FALLBACK_SIZES);
  const [conditions, setConditions] = useState<string[]>(FALLBACK_CONDITIONS);
  const [sellCategories, setSellCategories] = useState<string[]>(FALLBACK_SELL_CATEGORIES);
  const [accessoryCategories, setAccessoryCategories] = useState<string[]>(FALLBACK_ACCESSORY_CATEGORIES);
  const user = useSelector((state: RootState) => state.auth.user);
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();

  const [formData, setFormData] = useState<Record<Mode, FormState>>({
    "Sell": defaultForm("Sell"), "Rent": defaultForm("Rent"),
    "Sell Accessories": defaultForm("Sell Accessories"), "Donate": defaultForm("Donate"),
  });

  const currentData = formData[mode];

  React.useEffect(() => {
    fetchListingOptions();
  }, []);

  React.useEffect(() => {
    const checkBankDetails = async () => {
      if (!user) return;
      setCheckingBankDetails(true);
      try {
        const { data } = await supabase.from("profiles").select("account_number, upi_id").eq("id", user.id).single();
        setHasBankDetails(!!(data?.account_number || data?.upi_id));
      } catch { /* ignore */ } finally { setCheckingBankDetails(false); }
    };
    const unsubscribe = navigation.addListener("focus", checkBankDetails);
    checkBankDetails();
    return unsubscribe;
  }, [user, navigation]);

  const fetchListingOptions = async () => {
    try {
      const { data } = await supabase
        .from("listing_options")
        .select("type, value")
        .eq("is_active", true)
        .order("display_order");
      if (!data) return;
      const byType = data.reduce((acc: Record<string, string[]>, row) => {
        if (!acc[row.type]) acc[row.type] = [];
        acc[row.type].push(row.value);
        return acc;
      }, {});
      if (byType.size?.length) setSizes(byType.size);
      if (byType.condition?.length) setConditions(byType.condition);
      if (byType.sell_category?.length) setSellCategories(byType.sell_category);
      if (byType.accessory_category?.length) setAccessoryCategories(byType.accessory_category);
    } catch { /* use fallback values already set */ }
  };

  const updateField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setFormData((prev) => ({ ...prev, [mode]: { ...prev[mode], [field]: value } }));
  };

  const pickImageFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Alert.alert("Permission required", "Permission to access photos is required."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.8 });
    if (!result.canceled && result.assets) {
      updateField("imageUris", [...currentData.imageUris, result.assets[0].uri].slice(0, 5));
      clearError("images");
    }
  };

  const onPressUpload = () => {
    if (currentData.imageUris.length >= 5) { Alert.alert("Maximum images", "You can upload up to 5 images per item."); return; }
    pickImageFromGallery();
  };

  const removeImage = (index: number) => {
    updateField("imageUris", currentData.imageUris.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!user) { Alert.alert("Error", "You must be logged in to add items"); return; }

    const newErrors: Record<string, string> = {};
    if (currentData.imageUris.length === 0) newErrors.images = "Required";
    if (!currentData.title.trim()) newErrors.title = "Required";
    if ((mode === "Sell" || mode === "Sell Accessories") && !currentData.price) newErrors.price = "Required";
    if (mode === "Rent" && !currentData.rentPrice) newErrors.rentPrice = "Required";
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    setErrors({});

    setIsSubmitting(true);
    try {
      const listingTypeMap: Record<Mode, string> = { "Sell": "sell", "Rent": "rent", "Sell Accessories": "sell_accessories", "Donate": "donate" };
      const conditionMap: Record<string, string> = { "New": "new", "Like New": "like_new", "Good": "good", "Used": "used" };

      let mainImagePath: string | null = null;
      if (currentData.imageUris.length > 0) {
        mainImagePath = await uploadImage("items", user.id, currentData.imageUris[0]);
        if (!mainImagePath) {
          Alert.alert("Image Upload Failed", "Could not upload your image. Check that the 'flairies' storage bucket exists and is public in Supabase.");
          setIsSubmitting(false);
          return;
        }
      }

      const { data: itemData, error: itemError } = await supabase
        .from("items")
        .insert({
          user_id: user.id,
          listing_type: listingTypeMap[mode],
          title: currentData.title,
          description: currentData.description.slice(0, 300) || null,
          condition: conditionMap[currentData.condition],
          category: currentData.category,
          custom_category: currentData.customCategory || null,
          size: currentData.size,
          custom_size: currentData.customSize || null,
          payment_method: "online",
          price: currentData.price ? parseFloat(currentData.price) : null,
          rent_price: currentData.rentPrice ? parseFloat(currentData.rentPrice) : null,
          deposit: currentData.deposit ? parseFloat(currentData.deposit) : null,
          image_url: mainImagePath,
          is_active: true,
        })
        .select("id")
        .single();

      if (itemError) throw itemError;

      // Upload additional images
      if (currentData.imageUris.length > 1 && itemData) {
        const additionalPaths = await Promise.all(
          currentData.imageUris.slice(1).map((uri, i) => uploadImage("items", user.id, uri, `extra_${i + 1}_${Date.now()}.jpg`))
        );
        const validPaths = additionalPaths.filter(Boolean) as string[];
        if (validPaths.length > 0) {
          await supabase.from("item_images").insert(
            validPaths.map((path, i) => ({ item_id: itemData.id, image_url: path, sort_order: i + 1 }))
          );
        }
      }

      setFormData((prev) => ({ ...prev, [mode]: defaultForm(mode) }));
      navigation.navigate("Home" as never, { screen: "ClosetTab" } as never);
    } catch (error: any) {
      const msg = error?.message || error?.details || JSON.stringify(error) || "Unknown error";
      Alert.alert("Add Item Failed", msg);
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCommonFields = () => (
    <>
      <Text style={styles.label}>Images ({currentData.imageUris.length}/5) <Text style={styles.required}>*</Text></Text>
      {errors.images && <Text style={styles.errorText}>Required field</Text>}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesScroll}>
        {currentData.imageUris.map((uri, index) => (
          <View key={index} style={styles.imagePreviewWrapper}>
            <Image source={{ uri }} style={styles.imagePreviewThumb} resizeMode="cover" />
            <TouchableOpacity style={styles.removeImageButton} onPress={() => removeImage(index)}>
              <Text style={styles.removeImageText}>✕</Text>
            </TouchableOpacity>
            {index === 0 && <View style={styles.primaryBadge}><Text style={styles.primaryBadgeText}>Main</Text></View>}
          </View>
        ))}
        {currentData.imageUris.length < 5 && (
          <TouchableOpacity style={styles.addImageButton} onPress={onPressUpload} activeOpacity={0.8}>
            <Text style={styles.addImageText}>+</Text>
            <Text style={styles.addImageLabel}>Add Photo</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <Text style={styles.label}>Title <Text style={styles.required}>*</Text></Text>
      {errors.title && <Text style={styles.errorText}>Required field</Text>}
      <TextInput style={[styles.input, errors.title && styles.inputError]} value={currentData.title} onChangeText={(v) => { updateField("title", v); clearError("title"); }} placeholderTextColor="#555" placeholder="Give it a short title" />

      <Text style={styles.label}>Description</Text>
      <View style={styles.descWrapper}>
        <TextInput
          style={[styles.input, styles.descInput, currentData.description.length > 300 && styles.descInputOver]}
          value={currentData.description}
          onChangeText={(v) => updateField("description", v)}
          onBlur={() => {
            if (currentData.description.length > 300)
              updateField("description", currentData.description.slice(0, 300));
          }}
          placeholderTextColor="#555"
          placeholder="Describe condition, brand, fit..."
          multiline
          maxLength={301}
        />
        <Text style={[styles.descCount, currentData.description.length > 300 && styles.descCountOver]}>
          {Math.min(currentData.description.length, 300)}/300
        </Text>
      </View>

      {mode !== "Donate" && !hasBankDetails && (
        <View style={styles.bankDetailsStatus}>
          {checkingBankDetails ? (
            <Text style={styles.bankDetailsStatusText}>Checking bank details...</Text>
          ) : (
            <TouchableOpacity style={styles.bankDetailsWarning} onPress={() => navigation.navigate("BankDetails")} activeOpacity={0.85}>
              <TriangleAlert size={20} color="#e65100" strokeWidth={1.8} />
              <View style={styles.bankDetailsWarningContent}>
                <Text style={styles.bankDetailsWarningTitle}>Bank details required</Text>
                <Text style={styles.bankDetailsWarningText}>Tap to add your bank or UPI details to receive payments</Text>
              </View>
              <Text style={styles.bankDetailsWarningArrow}>›</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </>
  );

  const renderSizeField = () => (
    <>
      <Text style={styles.label}>Size <Text style={styles.required}>*</Text></Text>
      <View style={styles.optionRow}>
        {sizes.map((s) => (
          <TouchableOpacity key={s} style={[styles.smallChip, currentData.size === s && styles.smallChipActive]} onPress={() => updateField("size", s)}>
            <Text style={currentData.size === s ? styles.smallChipTextActive : styles.smallChipText}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {currentData.size === "Other" && (
        <><Text style={styles.label}>Custom size</Text>
        <TextInput style={styles.input} value={currentData.customSize} onChangeText={(v) => updateField("customSize", v)} placeholderTextColor="#555" placeholder="e.g. 32, 34, etc." /></>
      )}
    </>
  );

  const renderConditionField = () => (
    <>
      <Text style={styles.label}>Condition <Text style={styles.required}>*</Text></Text>
      <View style={styles.optionRow}>
        {conditions.map((c) => (
          <TouchableOpacity key={c} style={[styles.option, currentData.condition === c && styles.optionActive]} onPress={() => updateField("condition", c)}>
            <Text style={currentData.condition === c ? styles.optionTextActive : styles.optionText}>{c}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </>
  );

  const renderCategoryField = (cats: string[]) => (
    <>
      <Text style={styles.label}>Category <Text style={styles.required}>*</Text></Text>
      <View style={styles.optionRowHorizontal}>
        {cats.map((cat) => (
          <TouchableOpacity key={cat} style={[styles.smallChip, currentData.category === cat && styles.smallChipActive]} onPress={() => updateField("category", cat)}>
            <Text style={currentData.category === cat ? styles.smallChipTextActive : styles.smallChipText}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {currentData.category === "Other" && (
        <><Text style={styles.label}>Custom category</Text>
        <TextInput style={styles.input} value={currentData.customCategory} onChangeText={(v) => updateField("customCategory", v)} placeholderTextColor="#555" placeholder="e.g. Skirts, Jumpsuits, etc." /></>
      )}
    </>
  );

  return (
    <View style={styles.wrapper}>
      <ScreenHeader title="Add Listing" />
      <ScrollView ref={scrollRef} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

      <View style={styles.modeRow}>
        {(["Sell", "Rent", "Sell Accessories"] as Mode[]).map((m) => (
          <TouchableOpacity key={m} style={[styles.modeButton, mode === m && styles.modeButtonActive]} onPress={() => setMode(m)} activeOpacity={0.85}>
            <Text style={[styles.modeText, mode === m && styles.modeTextActive]}>{m}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.formCard}>
        {renderCommonFields()}

        {mode === "Sell" && (
          <>
            <Text style={styles.label}>Price <Text style={styles.required}>*</Text></Text>
            {errors.price && <Text style={styles.errorText}>Required field</Text>}
            <TextInput style={[styles.input, errors.price && styles.inputError]} value={currentData.price} onChangeText={(v) => { updateField("price", v); clearError("price"); }} placeholderTextColor="#555" placeholder="e.g. 250" keyboardType="numeric" />
            {renderSizeField()}
            {renderConditionField()}
            {renderCategoryField(sellCategories)}
          </>
        )}

        {mode === "Rent" && (
          <>
            <Text style={styles.label}>Rent price per day <Text style={styles.required}>*</Text></Text>
            {errors.rentPrice && <Text style={styles.errorText}>Required field</Text>}
            <TextInput style={[styles.input, errors.rentPrice && styles.inputError]} value={currentData.rentPrice} onChangeText={(v) => { updateField("rentPrice", v); clearError("rentPrice"); }} placeholderTextColor="#555" placeholder="e.g. 250" keyboardType="numeric" />
            {renderSizeField()}
            <Text style={styles.label}>Security deposit</Text>
            <TextInput style={styles.input} value={currentData.deposit} onChangeText={(v) => updateField("deposit", v)} placeholderTextColor="#555" placeholder="e.g. 550 (optional)" keyboardType="numeric" />
            {renderConditionField()}
            {renderCategoryField(sellCategories)}
          </>
        )}

        {mode === "Sell Accessories" && (
          <>
            <Text style={styles.label}>Price <Text style={styles.required}>*</Text></Text>
            {errors.price && <Text style={styles.errorText}>Required field</Text>}
            <TextInput style={[styles.input, errors.price && styles.inputError]} value={currentData.price} onChangeText={(v) => { updateField("price", v); clearError("price"); }} placeholderTextColor="#555" placeholder="e.g. 250" keyboardType="numeric" />
            {renderConditionField()}
            {renderCategoryField(accessoryCategories)}
          </>
        )}

        {mode === "Donate" && (
          <>
            {renderSizeField()}
            {renderConditionField()}
            {renderCategoryField(sellCategories)}
          </>
        )}

        {(() => {
          const needsBank = mode !== "Donate" && !hasBankDetails;
          const disabled = isSubmitting || needsBank;
          return (
            <TouchableOpacity
              style={[styles.submitButton, disabled && styles.submitButtonDisabled]}
              activeOpacity={disabled ? 1 : 0.9}
              onPress={disabled ? undefined : handleSubmit}
              disabled={disabled}
            >
              <Text style={styles.submitText}>
                {isSubmitting ? "Adding..." : needsBank ? "Add Bank Details First" : "Add Item"}
              </Text>
            </TouchableOpacity>
          );
        })()}
      </View>
    </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: "#fff0ec" },
  container: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 60 },
  modeRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 18 },
  modeButton: { flex: 1, marginHorizontal: 4, paddingVertical: 10, borderRadius: 10, backgroundColor: "#ffe8f2", alignItems: "center" },
  modeButtonActive: { backgroundColor: "#fe95b4" },
  modeText: { color: "#6b2a3a", fontWeight: "700" },
  modeTextActive: { color: "#fff" },
  formCard: { backgroundColor: "#fff", borderRadius: 14, padding: 16, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  imagesScroll: { marginTop: 8, marginBottom: 12 },
  imagePreviewWrapper: { position: "relative", marginRight: 12 },
  imagePreviewThumb: { width: 100, height: 100, borderRadius: 10 },
  removeImageButton: { position: "absolute", top: 4, right: 4, backgroundColor: "rgba(0,0,0,0.6)", width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  removeImageText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  primaryBadge: { position: "absolute", bottom: 4, left: 4, backgroundColor: "#fe95b4", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  primaryBadgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  addImageButton: { width: 100, height: 100, borderRadius: 10, backgroundColor: "#fff0ec", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#e0d0e0", borderStyle: "dashed" },
  addImageText: { fontSize: 32, color: "#a23a56", fontWeight: "300" },
  addImageLabel: { fontSize: 11, color: "#a23a56", fontWeight: "600", marginTop: 4 },
  label: { fontSize: 14, fontWeight: "700", color: "#4b2a36", marginTop: 8 },
  required: { color: "#fe95b4", fontWeight: "700" },
  input: { borderWidth: 1, borderColor: "#eee", padding: 10, borderRadius: 8, marginTop: 6 },
  descWrapper: { position: "relative", marginTop: 6 },
  descInput: { height: 90, borderWidth: 1, borderColor: "#eee", borderRadius: 8, padding: 10, marginTop: 0 },
  descInputOver: { borderColor: "#e53935" },
  descCount: { position: "absolute", bottom: 8, right: 10, fontSize: 11, color: "#aaa" },
  descCountOver: { color: "#e53935", fontWeight: "600" },
  optionRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 8 },
  option: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, backgroundColor: "#fff0ec", marginRight: 8, marginTop: 8 },
  optionActive: { backgroundColor: "#fe95b4" },
  optionText: { color: "#6b2a3a" },
  optionTextActive: { color: "#fff", fontWeight: "700" },
  optionRowHorizontal: { flexDirection: "row", flexWrap: "wrap", marginTop: 8 },
  smallChip: { paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8, backgroundColor: "#fff0ec", marginRight: 8, marginTop: 8 },
  smallChipActive: { backgroundColor: "#fe95b4" },
  smallChipText: { color: "#6b2a3a" },
  smallChipTextActive: { color: "#fff", fontWeight: "700" },
  errorText: { fontSize: 11, color: "#e53935", marginTop: 2 },
  inputError: { borderColor: "#e53935" },
  submitButton: { marginTop: 18, backgroundColor: "#fe95b4", paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  submitButtonDisabled: { backgroundColor: "#ccc" },
  submitText: { color: "#fff", fontWeight: "800" },
  bankDetailsStatus: { marginTop: 12 },
  bankDetailsStatusText: { fontSize: 13, color: "#999", textAlign: "center" },
  bankDetailsSuccess: { flexDirection: "row", alignItems: "center", backgroundColor: "#e8f5e9", padding: 12, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: "#4caf50" },
  bankDetailsSuccessIcon: { fontSize: 18, marginRight: 8 },
  bankDetailsSuccessText: { fontSize: 14, fontWeight: "600", color: "#2e7d32" },
  bankDetailsWarning: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#fff3e0", padding: 12, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: "#ff9800" },
  bankDetailsWarningContent: { flex: 1 },
  bankDetailsWarningTitle: { fontSize: 14, fontWeight: "700", color: "#e65100", marginBottom: 2 },
  bankDetailsWarningText: { fontSize: 12, color: "#f57c00" },
  bankDetailsWarningArrow: { fontSize: 24, color: "#f57c00", fontWeight: "300" },
});

export default AddListingScreen;



