import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import type { NavigationProp } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft, MapPinned } from "lucide-react-native";
import { supabase } from "../lib/supabase";
import LocationPicker from "../components/LocationPicker";

export default function AddressSetupScreen() {
  const route = useRoute();
  const navigation = useNavigation<NavigationProp<any>>();
  const insets = useSafeAreaInsets();
  const { user, fromProfile } = route.params as any;

  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [addressMethod, setAddressMethod] = useState<"map" | "manual">("map");

  const [houseNo, setHouseNo] = useState("");
  const [street, setStreet] = useState("");
  const [landmark, setLandmark] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
    address?: any;
  } | null>(null);
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const [existingAddress, setExistingAddress] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      supabase
        .from("profiles")
        .select("address")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (data?.address) setExistingAddress(data.address);
        });
    }
  }, [user]);

  const touch = (field: string) =>
    setTouched((prev) => ({ ...prev, [field]: true }));

  const fieldError = (field: string, value: string) =>
    touched[field] && !value.trim();

  const handleLocationSelect = (location: {
    latitude: number;
    longitude: number;
    address?: any;
  }) => {
    setSelectedLocation(location);
    if (location.address) {
      const addr = location.address;
      setStreet(addr.street || "");
      setCity(addr.city || "");
      setState(addr.region || "");
      setPincode(addr.postalCode || "");
      setLandmark(addr.subregion || addr.name || "");
    }
  };

  const handleConfirmLocation = () => {
    if (!selectedLocation) return;
    setLocationConfirmed(true);
    setShowLocationPicker(false);
  };

  const manualComplete =
    houseNo.trim() && street.trim() && city.trim() && state.trim() && pincode.trim();

  const saveDisabled =
    loading ||
    (addressMethod === "map" ? !locationConfirmed : !manualComplete);

  const handleSaveAddress = async () => {
    if (saveDisabled) return;

    let updateData: Record<string, any> = {};

    if (addressMethod === "map" && selectedLocation && locationConfirmed) {
      const addr = selectedLocation.address;
      const fullAddress = [
        houseNo,
        addr?.name,
        addr?.street,
        addr?.city,
        addr?.region,
        addr?.postalCode ? `- ${addr.postalCode}` : null,
      ]
        .filter(Boolean)
        .join(", ");
      updateData = {
        address: fullAddress.trim(),
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
      };
    } else {
      setTouched({ houseNo: true, street: true, city: true, state: true, pincode: true });
      if (!manualComplete) return;
      const fullAddress = `${houseNo}, ${street}${landmark ? ", " + landmark : ""}, ${city}, ${state} - ${pincode}`;
      updateData = { address: fullAddress.trim() };
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", user.id);
      if (error) {
        console.error("Save address error:", error);
        Alert.alert("Error", "Failed to save address");
      } else if (fromProfile) {
        // Stay on this page and show the updated address
        setExistingAddress(updateData.address);
        setSelectedLocation(null);
        setLocationConfirmed(false);
        setHouseNo(""); setStreet(""); setLandmark("");
        setCity(""); setState(""); setPincode("");
        setTouched({});
        setAddressMethod("map");
      } else {
        navigation.navigate("Welcome", { user });
      }
    } catch {
      Alert.alert("Error", "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    if (fromProfile) navigation.goBack();
    else navigation.navigate("Welcome", { user });
  };

  // ── Location picker screen ──
  if (showLocationPicker) {
    return (
      <View style={{ flex: 1, backgroundColor: "#fff0ec" }}>
        <View style={[styles.pickerHeader, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity
            style={styles.pickerBackBtn}
            onPress={() => setShowLocationPicker(false)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <ChevronLeft size={26} color="#fe95b4" strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.pickerTitle}>SELECT LOCATION</Text>
          <View style={{ width: 44 }} />
        </View>

        <LocationPicker
          onLocationSelect={handleLocationSelect}
          initialLocation={selectedLocation || undefined}
        />

        <TouchableOpacity
          style={[
            styles.confirmBtn,
            !selectedLocation && styles.confirmBtnDisabled,
            { marginBottom: insets.bottom + 16 },
          ]}
          onPress={handleConfirmLocation}
          disabled={!selectedLocation}
          activeOpacity={0.85}
        >
          <Text style={styles.confirmBtnText}>Confirm Location</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Main screen ──
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#fff0ec" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header bar with back button + title */}
      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color="#1f0a1a" strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>SET UP YOUR ADDRESS</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: 16 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Show existing address if one is saved */}
        {existingAddress ? (
          <View style={styles.existingAddressBox}>
            <Text style={styles.existingAddressLabel}>YOUR CURRENT ADDRESS</Text>
            <Text style={styles.existingAddressText}>{existingAddress}</Text>
            <Text style={styles.existingAddressHint}>Set a new address below to replace it</Text>
          </View>
        ) : (
          <Text style={styles.subtitle}>We'll use this for deliveries</Text>
        )}

        {/* Option boxes */}
        <View style={styles.optionsWrap}>
          <OptionBox
            selected={addressMethod === "map"}
            onPress={() => setAddressMethod("map")}
            title="Select Location on Map"
            subtitle={locationConfirmed ? "Location confirmed" : "Auto-detect or pin on map"}
          />

          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>OR</Text>
            <View style={styles.orLine} />
          </View>

          <OptionBox
            selected={addressMethod === "manual"}
            onPress={() => setAddressMethod("manual")}
            title="Enter Address Manually"
            subtitle="Type your complete address"
          />
        </View>

        {/* Map section */}
        {addressMethod === "map" && (
          <View style={styles.mapSection}>
            <TouchableOpacity
              style={styles.openMapBtn}
              onPress={() => setShowLocationPicker(true)}
              activeOpacity={0.85}
            >
              <Text style={styles.openMapBtnText}>
                {locationConfirmed ? "Change Location" : "Open Map"}
              </Text>
            </TouchableOpacity>

            {locationConfirmed && selectedLocation?.address && (
              <View style={styles.confirmedBox}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <MapPinned size={16} color="#2e7d32" strokeWidth={2} />
                  <Text style={styles.confirmedTitle}>Location Confirmed</Text>
                </View>
                <Text style={styles.confirmedAddress}>
                  {[
                    selectedLocation.address.name,
                    selectedLocation.address.street,
                    selectedLocation.address.city,
                    selectedLocation.address.region,
                    selectedLocation.address.postalCode &&
                      `- ${selectedLocation.address.postalCode}`,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Manual form */}
        {addressMethod === "manual" && (
          <View style={styles.manualForm}>
            <FieldInput
              label="House/Flat No."
              value={houseNo}
              onChangeText={setHouseNo}
              onBlur={() => touch("houseNo")}
              error={fieldError("houseNo", houseNo)}
              required
            />
            <FieldInput
              label="Street/Area"
              value={street}
              onChangeText={setStreet}
              onBlur={() => touch("street")}
              error={fieldError("street", street)}
              required
            />
            <FieldInput
              label="Landmark"
              value={landmark}
              onChangeText={setLandmark}
            />
            <View style={styles.rowFields}>
              <View style={styles.halfField}>
                <FieldInput
                  label="City"
                  value={city}
                  onChangeText={setCity}
                  onBlur={() => touch("city")}
                  error={fieldError("city", city)}
                  required
                />
              </View>
              <View style={styles.halfField}>
                <FieldInput
                  label="State"
                  value={state}
                  onChangeText={setState}
                  onBlur={() => touch("state")}
                  error={fieldError("state", state)}
                  required
                />
              </View>
            </View>
            <FieldInput
              label="Pincode"
              value={pincode}
              onChangeText={setPincode}
              onBlur={() => touch("pincode")}
              error={fieldError("pincode", pincode)}
              required
              keyboardType="numeric"
              maxLength={6}
            />
          </View>
        )}

        <View style={{ height: 140 }} />
      </ScrollView>

      {/* Bottom buttons pinned above system nav bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[styles.saveBtn, saveDisabled && styles.saveBtnDisabled]}
          onPress={handleSaveAddress}
          disabled={saveDisabled}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Save Address</Text>
          )}
        </TouchableOpacity>
        <View style={{ height: 8 }} />
        <TouchableOpacity onPress={handleSkip} activeOpacity={0.7}>
          <Text style={styles.skipText}>Skip for Now</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ── Option box ──
function OptionBox({
  selected,
  onPress,
  title,
  subtitle,
}: {
  selected: boolean;
  onPress: () => void;
  title: string;
  subtitle: string;
}) {
  return (
    <TouchableOpacity
      style={[styles.optionBox, selected && styles.optionBoxSelected]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.optionText}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionSubtitle}>{subtitle}</Text>
      </View>
      <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
        {selected && <View style={styles.radioInner} />}
      </View>
    </TouchableOpacity>
  );
}

// ── Field input ──
function FieldInput({
  label,
  value,
  onChangeText,
  onBlur,
  error,
  required,
  keyboardType,
  maxLength,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  onBlur?: () => void;
  error?: boolean;
  required?: boolean;
  keyboardType?: any;
  maxLength?: number;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>
        {label}
        {required && <Text style={styles.fieldStar}> *</Text>}
      </Text>
      {error && <Text style={styles.fieldErrorMsg}>This field is required</Text>}
      <TextInput
        style={[styles.fieldInput, error && styles.fieldInputError]}
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        placeholderTextColor="#aaa"
        keyboardType={keyboardType}
        maxLength={maxLength}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingBottom: 12,
    backgroundColor: "#fff0ec",
  },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  topBarTitle: {
    flex: 1,
    textAlign: "center",
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    letterSpacing: 1.5,
    color: "#1f0a1a",
  },
  subtitle: {
    fontSize: 14,
    color: "#888",
    marginBottom: 24,
  },
  existingAddressBox: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 3,
    borderLeftColor: "#fe95b4",
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  existingAddressLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 1.2,
    color: "#fe95b4",
    marginBottom: 6,
  },
  existingAddressText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f0a1a",
    lineHeight: 20,
    marginBottom: 8,
  },
  existingAddressHint: {
    fontSize: 12,
    color: "#aaa",
  },

  // Options
  optionsWrap: { marginBottom: 20 },
  optionBox: {
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: "#e0e0e0",
  },
  optionBoxSelected: { borderColor: "#fe95b4" },
  optionText: { flex: 1 },
  optionTitle: { fontSize: 15, fontWeight: "600", color: "#1f0a1a" },
  optionSubtitle: { fontSize: 12, color: "#888", marginTop: 1 },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#ccc",
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterSelected: { borderColor: "#fe95b4" },
  radioInner: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: "#fe95b4",
  },
  orRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 10,
  },
  orLine: { flex: 1, height: 1, backgroundColor: "#e0e0e0" },
  orText: {
    marginHorizontal: 12,
    fontSize: 13,
    fontWeight: "700",
    color: "#aaa",
  },

  // Map section
  mapSection: { marginBottom: 16 },
  openMapBtn: {
    backgroundColor: "#fe95b4",
    height: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  openMapBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  confirmedBox: {
    backgroundColor: "#e8f5e9",
    borderRadius: 12,
    padding: 14,
  },
  confirmedTitle: { fontSize: 14, fontWeight: "700", color: "#2e7d32" },
  confirmedAddress: { fontSize: 13, color: "#388e3c", lineHeight: 18 },

  // Manual form
  manualForm: { marginBottom: 8 },
  rowFields: { flexDirection: "row", gap: 12 },
  halfField: { flex: 1, minWidth: 0 },
  fieldWrap: { marginBottom: 12 },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: "#4b2a36", marginBottom: 2 },
  fieldStar: { color: "#e53935" },
  fieldErrorMsg: { fontSize: 11, color: "#e53935", marginBottom: 2 },
  fieldInput: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    color: "#1f0a1a",
  },
  fieldInputError: { borderColor: "#e53935" },

  // Bottom bar
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: "#fff0ec",
  },
  saveBtn: {
    height: 52,
    borderRadius: 12,
    backgroundColor: "#fe95b4",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#fe95b4",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnDisabled: {
    backgroundColor: "#ccc",
    shadowOpacity: 0,
    elevation: 0,
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  skipText: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
    color: "#888",
    paddingVertical: 8,
  },

  // Location picker
  pickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingBottom: 12,
    backgroundColor: "#fff0ec",
  },
  pickerBackBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  pickerTitle: {
    flex: 1,
    textAlign: "center",
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    letterSpacing: 1.5,
    color: "#1f0a1a",
  },
  confirmBtn: {
    marginHorizontal: 20,
    height: 52,
    borderRadius: 12,
    backgroundColor: "#fe95b4",
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtnDisabled: { backgroundColor: "#ccc" },
  confirmBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
