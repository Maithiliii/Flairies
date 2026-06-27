import React, { useState, useRef } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Image, Alert,
} from "react-native";
import ScreenHeader from "../components/ScreenHeader";
import { useSelector } from "react-redux";
import { useNavigation } from "@react-navigation/native";
import { RootState } from "../store";
// @ts-ignore
import * as ImagePicker from "expo-image-picker";
import { supabase, uploadImage } from "../lib/supabase";

const FALLBACK_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "Other"];
const FALLBACK_CONDITIONS = ["New", "Like New", "Good", "Used"];
const FALLBACK_CATEGORIES = ["Tops", "Dresses", "Bottoms", "Outerwear", "One Piece", "Jewellery", "Bags", "Footwear", "Other"];

type FormState = {
  imageUris: string[];
  title: string;
  description: string;
  size: string;
  customSize: string;
  condition: string;
  category: string;
  customCategory: string;
};

const defaultForm = (): FormState => ({
  imageUris: [], title: "", description: "",
  size: "M", customSize: "", condition: "New",
  category: FALLBACK_CATEGORIES[0], customCategory: "",
});

const AddDonationScreen = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const navigation = useNavigation();
  const scrollRef = useRef<ScrollView>(null);

  const [form, setForm] = useState<FormState>(defaultForm());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [sizes, setSizes] = useState<string[]>(FALLBACK_SIZES);
  const [conditions, setConditions] = useState<string[]>(FALLBACK_CONDITIONS);
  const [categories, setCategories] = useState<string[]>(FALLBACK_CATEGORIES);

  React.useEffect(() => {
    const fetchOptions = async () => {
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
        if (byType.sell_category?.length) setCategories(byType.sell_category);
      } catch { /* use fallbacks */ }
    };
    fetchOptions();
  }, []);

  const update = <K extends keyof FormState>(field: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const clearError = (field: string) =>
    setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Permission to access photos is required.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, quality: 0.8,
    });
    if (!result.canceled && result.assets) {
      update("imageUris", [...form.imageUris, result.assets[0].uri].slice(0, 5));
      clearError("images");
    }
  };

  const onPressUpload = () => {
    if (form.imageUris.length >= 5) {
      Alert.alert("Maximum images", "You can upload up to 5 images.");
      return;
    }
    pickImage();
  };

  const removeImage = (index: number) =>
    update("imageUris", form.imageUris.filter((_, i) => i !== index));

  const handleSubmit = async () => {
    if (!user) { Alert.alert("Error", "You must be logged in."); return; }

    const newErrors: Record<string, string> = {};
    if (form.imageUris.length === 0) newErrors.images = "Required";
    if (!form.title.trim()) newErrors.title = "Required";
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    setErrors({});
    setIsSubmitting(true);

    try {
      const mainImagePath = await uploadImage("items", user.id, form.imageUris[0]);
      if (!mainImagePath) {
        Alert.alert("Image Upload Failed", "Could not upload your image. Please try again.");
        setIsSubmitting(false);
        return;
      }

      const { data: itemData, error: itemError } = await supabase
        .from("items")
        .insert({
          user_id: user.id,
          listing_type: "donate",
          title: form.title,
          description: form.description.slice(0, 300) || null,
          condition: form.condition.toLowerCase().replace(" ", "_"),
          category: form.category,
          custom_category: form.customCategory || null,
          size: form.size,
          custom_size: form.customSize || null,
          image_url: mainImagePath,
          is_active: true,
          is_claimed: false,
        })
        .select("id")
        .single();

      if (itemError) throw itemError;

      if (form.imageUris.length > 1 && itemData) {
        const extra = await Promise.all(
          form.imageUris.slice(1).map((uri, i) =>
            uploadImage("items", user.id, uri, `extra_${i + 1}_${Date.now()}.jpg`)
          )
        );
        const valid = extra.filter(Boolean) as string[];
        if (valid.length > 0) {
          await supabase.from("item_images").insert(
            valid.map((path, i) => ({ item_id: itemData.id, image_url: path, sort_order: i + 1 }))
          );
        }
      }

      setForm(defaultForm());
      Alert.alert(
        "Donation Listed",
        "Your item has been listed. We'll reach out when someone is ready to collect.",
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      Alert.alert("Failed", error?.message || "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      <ScreenHeader title="Add Donation" />
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formCard}>
          {/* Images */}
          <Text style={styles.label}>Photos ({form.imageUris.length}/5) <Text style={styles.required}>*</Text></Text>
          {errors.images && <Text style={styles.errorText}>Please add at least one photo</Text>}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesScroll}>
            {form.imageUris.map((uri, i) => (
              <View key={i} style={styles.imagePreviewWrapper}>
                <Image source={{ uri }} style={styles.imageThumb} resizeMode="cover" />
                <TouchableOpacity style={styles.removeImageBtn} onPress={() => removeImage(i)}>
                  <Text style={styles.removeImageText}>✕</Text>
                </TouchableOpacity>
                {i === 0 && (
                  <View style={styles.primaryBadge}>
                    <Text style={styles.primaryBadgeText}>Main</Text>
                  </View>
                )}
              </View>
            ))}
            {form.imageUris.length < 5 && (
              <TouchableOpacity style={styles.addImageBtn} onPress={onPressUpload} activeOpacity={0.8}>
                <Text style={styles.addImagePlus}>+</Text>
                <Text style={styles.addImageLabel}>Add Photo</Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          {/* Title */}
          <Text style={styles.label}>Title <Text style={styles.required}>*</Text></Text>
          {errors.title && <Text style={styles.errorText}>Required field</Text>}
          <TextInput
            style={[styles.input, errors.title && styles.inputError]}
            value={form.title}
            onChangeText={(v) => { update("title", v); clearError("title"); }}
            placeholder="Give it a short title"
            placeholderTextColor="#aaa"
          />

          {/* Description */}
          <Text style={styles.label}>Description</Text>
          <View style={styles.descWrapper}>
            <TextInput
              style={[styles.input, styles.descInput]}
              value={form.description}
              onChangeText={(v) => update("description", v.slice(0, 300))}
              placeholder="Describe condition, brand, fit..."
              placeholderTextColor="#aaa"
              multiline
              maxLength={300}
            />
            <Text style={styles.descCount}>{form.description.length}/300</Text>
          </View>

          {/* Size */}
          <Text style={styles.label}>Size <Text style={styles.required}>*</Text></Text>
          <View style={styles.chipRow}>
            {sizes.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.chip, form.size === s && styles.chipActive]}
                onPress={() => update("size", s)}
              >
                <Text style={form.size === s ? styles.chipTextActive : styles.chipText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {form.size === "Other" && (
            <>
              <Text style={styles.label}>Custom size</Text>
              <TextInput
                style={styles.input}
                value={form.customSize}
                onChangeText={(v) => update("customSize", v)}
                placeholder="e.g. 32, 34, etc."
                placeholderTextColor="#aaa"
              />
            </>
          )}

          {/* Condition */}
          <Text style={styles.label}>Condition <Text style={styles.required}>*</Text></Text>
          <View style={styles.chipRow}>
            {conditions.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.chip, form.condition === c && styles.chipActive]}
                onPress={() => update("condition", c)}
              >
                <Text style={form.condition === c ? styles.chipTextActive : styles.chipText}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Category */}
          <Text style={styles.label}>Category <Text style={styles.required}>*</Text></Text>
          <View style={styles.chipRow}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.chip, form.category === cat && styles.chipActive]}
                onPress={() => update("category", cat)}
              >
                <Text style={form.category === cat ? styles.chipTextActive : styles.chipText}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {form.category === "Other" && (
            <>
              <Text style={styles.label}>Custom category</Text>
              <TextInput
                style={styles.input}
                value={form.customCategory}
                onChangeText={(v) => update("customCategory", v)}
                placeholder="e.g. Skirts, Jumpsuits, etc."
                placeholderTextColor="#aaa"
              />
            </>
          )}

          <TouchableOpacity
            style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.9}
          >
            <Text style={styles.submitText}>{isSubmitting ? "Adding..." : "Add Donation"}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: "#fff0ec" },
  container: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 60 },

  infoBanner: {
    backgroundColor: "#ffe8f0",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: "#fe95b4",
  },
  infoBannerText: { fontSize: 13, color: "#6b2a3a", lineHeight: 19 },

  formCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },

  imagesScroll: { marginTop: 8, marginBottom: 12 },
  imagePreviewWrapper: { position: "relative", marginRight: 12 },
  imageThumb: { width: 100, height: 100, borderRadius: 10 },
  removeImageBtn: {
    position: "absolute", top: 4, right: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
    width: 24, height: 24, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  removeImageText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  primaryBadge: {
    position: "absolute", bottom: 4, left: 4,
    backgroundColor: "#fe95b4", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  primaryBadgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  addImageBtn: {
    width: 100, height: 100, borderRadius: 10,
    backgroundColor: "#fff0ec", alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "#e0d0e0", borderStyle: "dashed",
  },
  addImagePlus: { fontSize: 32, color: "#a23a56", fontWeight: "300" },
  addImageLabel: { fontSize: 11, color: "#a23a56", fontWeight: "600", marginTop: 4 },

  label: { fontSize: 14, fontWeight: "700", color: "#4b2a36", marginTop: 8 },
  required: { color: "#fe95b4", fontWeight: "700" },
  errorText: { fontSize: 11, color: "#e53935", marginTop: 2 },

  input: {
    borderWidth: 1, borderColor: "#eee", padding: 10,
    borderRadius: 8, marginTop: 6, color: "#1f0a1a",
  },
  inputError: { borderColor: "#e53935" },
  descWrapper: { position: "relative", marginTop: 6 },
  descInput: { height: 90, borderWidth: 1, borderColor: "#eee", borderRadius: 8, padding: 10, marginTop: 0 },
  descCount: { position: "absolute", bottom: 8, right: 10, fontSize: 11, color: "#aaa" },

  chipRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 8 },
  chip: {
    paddingVertical: 7, paddingHorizontal: 10, borderRadius: 8,
    backgroundColor: "#fff0ec", marginRight: 8, marginTop: 8,
  },
  chipActive: { backgroundColor: "#fe95b4" },
  chipText: { color: "#6b2a3a", fontSize: 13 },
  chipTextActive: { color: "#fff", fontWeight: "700", fontSize: 13 },

  submitBtn: {
    marginTop: 20, backgroundColor: "#fe95b4",
    paddingVertical: 13, borderRadius: 10, alignItems: "center",
    shadowColor: "#fe95b4", shadowOpacity: 0.3, shadowRadius: 6, elevation: 3,
  },
  submitBtnDisabled: { backgroundColor: "#ccc", shadowOpacity: 0, elevation: 0 },
  submitText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});

export default AddDonationScreen;
