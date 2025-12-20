import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import type { NavigationProp } from '@react-navigation/native';
import { API_URL } from "@env";
import LocationPicker from "../components/LocationPicker";
import RadioButton from "../components/RadioButton";

export default function AddressSetupScreen() {
  const route = useRoute();
  const navigation = useNavigation<NavigationProp<any>>();
  const { user } = route.params as any;

  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [addressMethod, setAddressMethod] = useState<"map" | "manual">("map"); // Track selected method

  // Address fields
  const [houseNo, setHouseNo] = useState("");
  const [street, setStreet] = useState("");
  const [landmark, setLandmark] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");

  // Location state
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
    address?: any;
  } | null>(null);
  const [locationConfirmed, setLocationConfirmed] = useState(false);

  const handleLocationSelect = (location: {
    latitude: number;
    longitude: number;
    address?: any;
  }) => {
    setSelectedLocation(location);
    
    // Auto-fill address fields from the selected location
    if (location.address) {
      const addr = location.address;
      setStreet(addr.street || "");
      setCity(addr.city || "");
      setState(addr.region || "");
      setPincode(addr.postalCode || "");
      setLandmark(addr.subregion || addr.name || "");
    }
  };

  const openLocationPicker = () => {
    setShowLocationPicker(true);
  };

  const confirmSelectedLocation = async () => {
    if (!selectedLocation) return;
    
    setLocationConfirmed(true);
    Alert.alert(
      "Location Confirmed!",
      "Your address has been set from the selected location. You can now save and continue.",
      [{ text: "OK" }]
    );
  };

  const handleSaveAddress = async () => {
    let fullAddress = "";
    let lat = 19.076;
    let lng = 72.8777;

    if (selectedLocation && locationConfirmed) {
      // Using confirmed location from map
      const addr = selectedLocation.address;
      fullAddress = `${houseNo ? houseNo + ", " : ""}${addr?.name ? addr.name + ", " : ""}${addr?.street ? addr.street + ", " : ""}${addr?.city ? addr.city + ", " : ""}${addr?.region ? addr.region + " " : ""}${addr?.postalCode ? "- " + addr.postalCode : ""}`;
      lat = selectedLocation.latitude;
      lng = selectedLocation.longitude;
    } else if (addressMethod === "map" && !locationConfirmed) {
      Alert.alert("Error", "Please confirm your location first");
      return;
    } else {
      // Using manual entry
      if (!houseNo || !street || !city || !state || !pincode) {
        Alert.alert("Error", "Please fill all required fields or confirm location");
        return;
      }
      fullAddress = `${houseNo}, ${street}, ${landmark ? landmark + ", " : ""}${city}, ${state} - ${pincode}`;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/profile/address/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          address: fullAddress.trim(),
          latitude: lat,
          longitude: lng,
        }),
      });

      if (response.ok) {
        navigation.navigate("Welcome", { user });
      } else {
        Alert.alert("Error", "Failed to save address");
      }
    } catch (error) {
      console.error("Error saving address:", error);
      Alert.alert("Error", "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    navigation.navigate("Welcome", { user });
  };

  // Show location picker screen
  if (showLocationPicker) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setShowLocationPicker(false)}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select Location</Text>
        </View>
        <LocationPicker
          onLocationSelect={handleLocationSelect}
          initialLocation={selectedLocation || undefined}
        />
        <TouchableOpacity
          style={styles.doneButton}
          onPress={() => setShowLocationPicker(false)}
        >
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Setup Your Address</Text>
      <Text style={styles.subtitle}>We'll use this for deliveries</Text>

      {/* Address Method Selection */}
      <View style={styles.methodSelection}>
        <RadioButton
          selected={addressMethod === "map"}
          onPress={() => setAddressMethod("map")}
          title="Use Location on Map"
          subtitle={selectedLocation ? "Location confirmed" : "Auto-detect or select on map"}
          icon=""
        />
        
        {/* OR Divider */}
        <View style={styles.orContainer}>
          <View style={styles.orLine} />
          <Text style={styles.orText}>OR</Text>
          <View style={styles.orLine} />
        </View>
        
        <RadioButton
          selected={addressMethod === "manual"}
          onPress={() => setAddressMethod("manual")}
          title="Enter Address Manually"
          subtitle="Type your complete address"
          icon="✏️"
        />
      </View>

      {/* Map Location Section */}
      {addressMethod === "map" && (
        <View style={styles.mapSection}>
          <TouchableOpacity
            style={styles.locationButton}
            onPress={openLocationPicker}
          >
            <Text style={styles.locationButtonText}>
              {selectedLocation ? "Change Location" : "Select Location on Map"}
            </Text>
          </TouchableOpacity>

      {/* Selected Location Display */}
      {selectedLocation && (
        <View style={styles.selectedLocationContainer}>
          <View style={styles.locationHeader}>
            <Text style={styles.selectedLocationTitle}>📍 Location Confirmed</Text>
            <TouchableOpacity 
              style={styles.changeLocationButton}
              onPress={openLocationPicker}
            >
              <Text style={styles.changeLocationText}>Change</Text>
            </TouchableOpacity>
          </View>
          {selectedLocation.address && (
            <Text style={styles.selectedAddressText}>
              {selectedLocation.address.name && `${selectedLocation.address.name}, `}
              {selectedLocation.address.street && `${selectedLocation.address.street}, `}
              {selectedLocation.address.city && `${selectedLocation.address.city}, `}
              {selectedLocation.address.region && `${selectedLocation.address.region} `}
              {selectedLocation.address.postalCode && `- ${selectedLocation.address.postalCode}`}
            </Text>
          )}
          <Text style={styles.coordinatesText}>
            Coordinates: {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
          </Text>
          
          {/* Confirm Location Button */}
          <TouchableOpacity
            style={styles.confirmLocationButton}
            onPress={confirmSelectedLocation}
          >
            <Text style={styles.confirmLocationText}>✓ Confirm This Location</Text>
          </TouchableOpacity>
        </View>
      )}
        </View>
      )}

      {/* Manual Entry Section */}
      {addressMethod === "manual" && (
        <View style={styles.formContainer}>
          <Text style={styles.sectionTitle}>Enter Address Details</Text>

        <TextInput
          style={styles.input}
          placeholder="House/Flat No. *"
          value={houseNo}
          onChangeText={setHouseNo}
        />

        <TextInput
          style={styles.input}
          placeholder="Street/Area *"
          value={street}
          onChangeText={setStreet}
        />

        <TextInput
          style={styles.input}
          placeholder="Landmark (Optional)"
          value={landmark}
          onChangeText={setLandmark}
        />

        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="City *"
            value={city}
            onChangeText={setCity}
          />
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="State *"
            value={state}
            onChangeText={setState}
          />
        </View>

        <TextInput
          style={styles.input}
          placeholder="Pincode *"
          value={pincode}
          onChangeText={setPincode}
          keyboardType="numeric"
          maxLength={6}
        />
        </View>
      )}



      {/* Buttons */}
      <TouchableOpacity
        style={[styles.saveButton, loading && styles.saveButtonDisabled]}
        onPress={handleSaveAddress}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>
            {selectedLocation ? "Save & Continue" : "Save Address"}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipButtonText}>Skip for Now</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  contentContainer: {
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1f0a1a",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 24,
  },
  locationButton: {
    flexDirection: "row",
    backgroundColor: "#ff1493",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    shadowColor: "#ff1493",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  locationButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  mapContainer: {
    marginBottom: 24,
  },
  map: {
    width: "100%",
    height: 250,
    borderRadius: 12,
  },
  mapHint: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    marginTop: 8,
  },
  formContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f0a1a",
    marginBottom: 16,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  saveButton: {
    backgroundColor: "#ff1493",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#ff1493",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDisabled: {
    backgroundColor: "#ccc",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  skipButton: {
    padding: 16,
    alignItems: "center",
  },
  skipButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
  },
  orContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  orLine: {
    flex: 1,
    height: 2,
    backgroundColor: "#d0d0d0",
  },
  orText: {
    marginHorizontal: 20,
    fontSize: 16,
    fontWeight: "700",
    color: "#666",
    backgroundColor: "#f8f9fa",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  mapFallback: {
    backgroundColor: "#e8f5e9",
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 24,
  },
  mapFallbackText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2e7d32",
    marginBottom: 8,
  },
  mapFallbackSubtext: {
    fontSize: 12,
    color: "#4caf50",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    paddingTop: 60,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: "#ff1493",
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f0a1a",
    marginLeft: 16,
  },
  doneButton: {
    backgroundColor: "#ff1493",
    margin: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#ff1493",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  doneButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  selectedLocationContainer: {
    backgroundColor: "#e8f5e9",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  selectedLocationTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2e7d32",
    marginBottom: 8,
  },
  selectedLocationText: {
    fontSize: 12,
    color: "#4caf50",
    fontFamily: "monospace",
    marginBottom: 4,
  },
  selectedAddressText: {
    fontSize: 14,
    color: "#2e7d32",
    lineHeight: 20,
    marginBottom: 8,
  },
  locationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  changeLocationButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#ff1493",
    borderRadius: 6,
  },
  changeLocationText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  coordinatesText: {
    fontSize: 10,
    color: "#666",
    fontFamily: "monospace",
  },
  finalDetailsContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  finalDetailsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f0a1a",
    marginBottom: 12,
  },
  finalDetailsNote: {
    fontSize: 12,
    color: "#666",
    marginTop: 8,
    fontStyle: "italic",
  },
  methodSelection: {
    marginBottom: 24,
  },
  mapSection: {
    marginBottom: 24,
  },

  confirmLocationButton: {
    backgroundColor: "#4caf50",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 12,
  },
  confirmLocationText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
});
