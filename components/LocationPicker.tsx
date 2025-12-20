import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import * as Location from "expo-location";

// Conditionally import MapView
let MapView: any = null;
let Marker: any = null;
let PROVIDER_GOOGLE: any = null;

try {
  const Maps = require("react-native-maps");
  MapView = Maps.default;
  Marker = Maps.Marker;
  PROVIDER_GOOGLE = Maps.PROVIDER_GOOGLE;
} catch (e) {
  console.log("Maps not available, using fallback");
}

const { width } = Dimensions.get("window");

interface LocationPickerProps {
  onLocationSelect: (location: {
    latitude: number;
    longitude: number;
    address?: any;
  }) => void;
  initialLocation?: {
    latitude: number;
    longitude: number;
  };
}

export default function LocationPicker({
  onLocationSelect,
  initialLocation,
}: LocationPickerProps) {
  const [loading, setLoading] = useState(false);
  const [region, setRegion] = useState({
    latitude: initialLocation?.latitude || 19.076,
    longitude: initialLocation?.longitude || 72.8777,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const [markerPosition, setMarkerPosition] = useState({
    latitude: initialLocation?.latitude || 19.076,
    longitude: initialLocation?.longitude || 72.8777,
  });
  const [address, setAddress] = useState<any>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (initialLocation) {
      setRegion({
        ...region,
        latitude: initialLocation.latitude,
        longitude: initialLocation.longitude,
      });
      setMarkerPosition(initialLocation);
      reverseGeocode(initialLocation.latitude, initialLocation.longitude);
    }
  }, [initialLocation]);

  const reverseGeocode = async (latitude: number, longitude: number) => {
    try {
      const addresses = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });
      if (addresses.length > 0) {
        const addr = addresses[0];
        setAddress(addr);
        onLocationSelect({
          latitude,
          longitude,
          address: addr,
        });
      }
    } catch (error) {
      console.error("Reverse geocoding error:", error);
    }
  };

  const getCurrentLocation = async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Location permission is required to use this feature"
        );
        setLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const { latitude, longitude } = location.coords;

      const newRegion = {
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };

      setRegion(newRegion);
      setMarkerPosition({ latitude, longitude });

      // Animate to new location if map is ready
      if (mapRef.current && isMapReady) {
        mapRef.current.animateToRegion(newRegion, 1000);
      }

      await reverseGeocode(latitude, longitude);
    } catch (error) {
      console.error("Error getting location:", error);
      Alert.alert("Error", "Failed to get current location");
    } finally {
      setLoading(false);
    }
  };

  const handleMapPress = (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setMarkerPosition({ latitude, longitude });
    reverseGeocode(latitude, longitude);
  };

  const handleMarkerDragEnd = (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setMarkerPosition({ latitude, longitude });
    reverseGeocode(latitude, longitude);
  };

  const confirmLocation = () => {
    onLocationSelect({
      latitude: markerPosition.latitude,
      longitude: markerPosition.longitude,
      address,
    });
  };

  // Fallback UI when maps are not available
  if (!MapView) {
    return (
      <View style={styles.fallbackContainer}>
        <TouchableOpacity
          style={styles.locationButton}
          onPress={getCurrentLocation}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.locationIcon}>📍</Text>
              <Text style={styles.locationButtonText}>Use Current Location</Text>
            </>
          )}
        </TouchableOpacity>

        {markerPosition.latitude !== 19.076 && (
          <View style={styles.locationInfo}>
            <Text style={styles.locationInfoTitle}>📍 Location Detected</Text>
            <Text style={styles.locationInfoText}>
              Lat: {markerPosition.latitude.toFixed(4)}, Lng:{" "}
              {markerPosition.longitude.toFixed(4)}
            </Text>
            {address && (
              <Text style={styles.addressText}>
                {address.street}, {address.city}, {address.region}
              </Text>
            )}
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Location Button */}
      <TouchableOpacity
        style={styles.locationButton}
        onPress={getCurrentLocation}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Text style={styles.locationIcon}>📍</Text>
            <Text style={styles.locationButtonText}>Use Current Location</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Map Container */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          region={region}
          onPress={handleMapPress}
          onMapReady={() => setIsMapReady(true)}
          showsUserLocation={true}
          showsMyLocationButton={false}
          toolbarEnabled={false}
        >
          <Marker
            coordinate={markerPosition}
            draggable
            onDragEnd={handleMarkerDragEnd}
            title="Delivery Location"
            description="Drag to adjust your location"
          />
        </MapView>

        {/* Center Pin Overlay (Swiggy style) */}
        <View style={styles.centerMarker}>
          <View style={styles.pin}>
            <View style={styles.pinHead} />
            <View style={styles.pinTail} />
          </View>
        </View>

        {/* Map Instructions */}
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsText}>
            🎯 Tap anywhere or drag the pin to set your location
          </Text>
        </View>
      </View>

      {/* Address Display */}
      {address && (
        <View style={styles.addressContainer}>
          <Text style={styles.addressTitle}>📍 Selected Location</Text>
          <Text style={styles.addressText}>
            {address.name && `${address.name}, `}
            {address.street && `${address.street}, `}
            {address.city && `${address.city}, `}
            {address.region && `${address.region} `}
            {address.postalCode && `- ${address.postalCode}`}
          </Text>
          <Text style={styles.coordinatesText}>
            Coordinates: {markerPosition.latitude.toFixed(6)},{" "}
            {markerPosition.longitude.toFixed(6)}
          </Text>
        </View>
      )}

      {/* Confirm Location Button (Swiggy Style) */}
      <TouchableOpacity 
        style={[styles.confirmButton, !address && styles.confirmButtonDisabled]} 
        onPress={confirmLocation}
        disabled={!address}
      >
        <View style={styles.confirmButtonContent}>
          <Text style={styles.confirmButtonIcon}>📍</Text>
          <View style={styles.confirmButtonTextContainer}>
            <Text style={styles.confirmButtonText}>Confirm Location</Text>
            {address && (
              <Text style={styles.confirmButtonSubtext}>
                {address.street && `${address.street}, `}
                {address.city}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fallbackContainer: {
    padding: 20,
  },
  locationButton: {
    flexDirection: "row",
    backgroundColor: "#ff1493",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#ff1493",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  locationIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  locationButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  mapContainer: {
    position: "relative",
    height: 400,
    marginBottom: 16,
    borderRadius: 12,
    overflow: "hidden",
  },
  map: {
    flex: 1,
  },
  centerMarker: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: -12,
    marginTop: -24,
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
  },
  pin: {
    alignItems: "center",
  },
  pinHead: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#ff1493",
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  pinTail: {
    width: 2,
    height: 12,
    backgroundColor: "#ff1493",
    marginTop: -2,
  },
  instructionsContainer: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    padding: 12,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  instructionsText: {
    fontSize: 14,
    color: "#333",
    textAlign: "center",
    fontWeight: "600",
  },
  addressContainer: {
    backgroundColor: "#f8f9fa",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  addressTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f0a1a",
    marginBottom: 8,
  },
  addressText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
    marginBottom: 4,
  },
  coordinatesText: {
    fontSize: 12,
    color: "#666",
    fontFamily: "monospace",
  },
  confirmButton: {
    backgroundColor: "#ff1493",
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 4,
    shadowColor: "#ff1493",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmButtonDisabled: {
    backgroundColor: "#ccc",
    shadowOpacity: 0,
  },
  confirmButtonContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  confirmButtonIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  confirmButtonTextContainer: {
    flex: 1,
  },
  confirmButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  confirmButtonSubtext: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 12,
    marginTop: 2,
  },
  locationInfo: {
    backgroundColor: "#e8f5e9",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 16,
  },
  locationInfoTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2e7d32",
    marginBottom: 8,
  },
  locationInfoText: {
    fontSize: 12,
    color: "#4caf50",
    marginBottom: 8,
  },
});