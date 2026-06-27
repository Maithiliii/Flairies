import React, { useRef, useEffect, useState } from "react";
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import * as Location from "expo-location";

const MAPS_API_KEY = "AIzaSyB-yfhQeeReYRg1DNbJG4K_OpqKPiN3zk0";
const MAP_DIV_ID = "gmap-picker-div";

interface Props {
  onLocationSelect: (loc: {
    latitude: number;
    longitude: number;
    address?: any;
  }) => void;
  initialLocation?: { latitude: number; longitude: number };
}

export default function LocationPicker({ onLocationSelect, initialLocation }: Props) {
  if (Platform.OS === "web") {
    return <WebMapPicker onLocationSelect={onLocationSelect} initialLocation={initialLocation} />;
  }
  return <NativeMapPicker onLocationSelect={onLocationSelect} />;
}

// ── Web: inject Google Maps directly into the document DOM ──
function WebMapPicker({ onLocationSelect, initialLocation }: Props) {
  const [locLoading, setLocLoading] = useState(false);
  const gmapRef = useRef<{
    map: any;
    marker: any;
    geocodeAndSend: (lat: number, lng: number) => void;
  } | null>(null);

  useEffect(() => {
    const initMap = () => {
      const container = document.getElementById(MAP_DIV_ID);
      const g = (window as any).google;
      if (!container || !g?.maps) return;

      const defaultPos = initialLocation
        ? { lat: initialLocation.latitude, lng: initialLocation.longitude }
        : { lat: 19.076, lng: 72.8777 };

      const map = new g.maps.Map(container, {
        center: defaultPos,
        zoom: 15,
        disableDefaultUI: true,
        zoomControl: true,
        clickableIcons: false,
      });

      const geocoder = new g.maps.Geocoder();

      const pinSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="42" viewBox="0 0 30 42"><path fill="#EA4335" stroke="white" stroke-width="1.5" d="M15 1C7.8 1 2 6.8 2 14c0 9.5 13 27 13 27S28 23.5 28 14C28 6.8 22.2 1 15 1z"/><circle cx="15" cy="14" r="6" fill="white"/></svg>`;
      const marker = new g.maps.Marker({
        position: defaultPos,
        map,
        draggable: true,
        icon: {
          url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(pinSvg),
          scaledSize: new g.maps.Size(30, 42),
          anchor: new g.maps.Point(15, 42),
        },
      });

      const geocodeAndSend = (lat: number, lng: number) => {
        geocoder.geocode({ location: { lat, lng } }, (results: any[], status: string) => {
          let addr: any = {};
          if (status === "OK" && results[0]) {
            const comps = results[0].address_components;
            const get = (type: string) =>
              (comps.find((c: any) => c.types.includes(type)) || {}).long_name || "";
            addr = {
              name: get("point_of_interest") || get("establishment") || "",
              street: (get("street_number") + " " + get("route")).trim(),
              city: get("locality") || get("administrative_area_level_2"),
              region: get("administrative_area_level_1"),
              postalCode: get("postal_code"),
              subregion: get("sublocality_level_1") || get("sublocality"),
            };
          }
          onLocationSelect({ latitude: lat, longitude: lng, address: addr });
        });
      };

      map.addListener("click", (e: any) => {
        const pos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
        marker.setPosition(pos);
        geocodeAndSend(pos.lat, pos.lng);
      });

      marker.addListener("dragend", (e: any) => {
        geocodeAndSend(e.latLng.lat(), e.latLng.lng());
      });

      gmapRef.current = { map, marker, geocodeAndSend };
    };

    const load = () => {
      if ((window as any).google?.maps) {
        setTimeout(initMap, 50);
      } else {
        const existing = document.getElementById("gmap-script");
        if (existing) {
          existing.addEventListener("load", () => setTimeout(initMap, 50));
        } else {
          const script = document.createElement("script");
          script.id = "gmap-script";
          script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_API_KEY}`;
          script.async = true;
          script.onload = () => setTimeout(initMap, 50);
          document.head.appendChild(script);
        }
      }
    };

    load();
  }, []);

  const handleCurrentLocation = async () => {
    setLocLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location permission is required.");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const { latitude, longitude } = loc.coords;
      if (gmapRef.current) {
        const { map, marker, geocodeAndSend } = gmapRef.current;
        const pos = { lat: latitude, lng: longitude };
        map.setCenter(pos);
        map.setZoom(16);
        marker.setPosition(pos);
        geocodeAndSend(latitude, longitude);
      }
    } catch {
      Alert.alert("Error", "Failed to get current location");
    } finally {
      setLocLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Map fills container */}
      <View nativeID={MAP_DIV_ID} style={StyleSheet.absoluteFill} />

      {/* Current location button overlay */}
      <TouchableOpacity
        style={styles.currentLocBtn}
        onPress={handleCurrentLocation}
        disabled={locLoading}
        activeOpacity={0.85}
      >
        {locLoading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.currentLocText}>Use Current Location</Text>
        )}
      </TouchableOpacity>

      {/* Hint overlay */}
      <View style={styles.hint}>
        <Text style={styles.hintText}>
          Tap the map or drag the pin to set your location
        </Text>
      </View>
    </View>
  );
}

// ── Native: Google Maps via WebView HTML ──
function NativeMapPicker({ onLocationSelect, initialLocation }: Props) {
  let WebView: any = null;
  try { WebView = require("react-native-webview").WebView; } catch (e) {}
  if (!WebView) return null;

  const html = buildMapHtml(MAPS_API_KEY, initialLocation);

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "location") {
        onLocationSelect({
          latitude: data.lat,
          longitude: data.lng,
          address: data.address,
        });
      }
    } catch (e) {}
  };

  return (
    <WebView
      source={{ html }}
      style={styles.container}
      onMessage={handleMessage}
      javaScriptEnabled
      domStorageEnabled
      geolocationEnabled
      originWhitelist={["*"]}
    />
  );
}

const buildMapHtml = (apiKey: string, initialLocation?: { latitude: number; longitude: number }) => `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { overflow: hidden; }
    #map { width: 100vw; height: 100vh; }
    #btn { position: fixed; top: 12px; left: 50%; transform: translateX(-50%);
      z-index: 10; background: #fe95b4; color: #fff; border: none;
      padding: 10px 28px; border-radius: 10px; font-size: 14px; font-weight: 700;
      cursor: pointer; white-space: nowrap; box-shadow: 0 2px 8px rgba(254,149,180,.4); }
    #hint { position: fixed; bottom: 12px; left: 12px;
      background: rgba(255,255,255,.93); border-radius: 8px; padding: 8px 12px;
      font-size: 13px; color: #444; text-align: left; pointer-events: none; }
  </style>
</head>
<body>
  <div id="map"></div>
  <button id="btn" onclick="useCurrentLocation()">Use Current Location</button>
  <div id="hint">Tap the map or drag the pin to set your location</div>
  <script>
    var map, marker, geocoder;
    function initMap() {
      geocoder = new google.maps.Geocoder();
      var def = ${initialLocation ? `{ lat: ${initialLocation.latitude}, lng: ${initialLocation.longitude} }` : `{ lat: 19.076, lng: 72.8777 }`};
      map = new google.maps.Map(document.getElementById('map'), { center: def, zoom: 15, disableDefaultUI: true, zoomControl: true, clickableIcons: false });
      marker = new google.maps.Marker({ position: def, map: map, draggable: true,
        icon: { url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="30" height="42" viewBox="0 0 30 42"><path fill="#EA4335" stroke="white" stroke-width="1.5" d="M15 1C7.8 1 2 6.8 2 14c0 9.5 13 27 13 27S28 23.5 28 14C28 6.8 22.2 1 15 1z"/><circle cx="15" cy="14" r="6" fill="white"/></svg>'), scaledSize: new google.maps.Size(30, 42), anchor: new google.maps.Point(15, 42) } });
      map.addListener('click', function(e) { var p = { lat: e.latLng.lat(), lng: e.latLng.lng() }; marker.setPosition(p); geocodeAndSend(p.lat, p.lng); });
      marker.addListener('dragend', function(e) { geocodeAndSend(e.latLng.lat(), e.latLng.lng()); });
    }
    function geocodeAndSend(lat, lng) {
      geocoder.geocode({ location: { lat: lat, lng: lng } }, function(results, status) {
        var addr = {};
        if (status === 'OK' && results[0]) {
          var comps = results[0].address_components;
          function get(t) { var c = comps.find(function(c) { return c.types.indexOf(t) !== -1; }); return c ? c.long_name : ''; }
          addr = { name: get('point_of_interest') || get('establishment') || '', street: (get('street_number') + ' ' + get('route')).trim(), city: get('locality') || get('administrative_area_level_2'), region: get('administrative_area_level_1'), postalCode: get('postal_code'), subregion: get('sublocality_level_1') || get('sublocality') };
        }
        var msg = JSON.stringify({ type: 'location', lat: lat, lng: lng, address: addr });
        if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(msg);
        else window.parent.postMessage(msg, '*');
      });
    }
    function useCurrentLocation() {
      if (!navigator.geolocation) { alert('Geolocation not supported'); return; }
      navigator.geolocation.getCurrentPosition(function(pos) {
        var lat = pos.coords.latitude, lng = pos.coords.longitude;
        map.setCenter({ lat: lat, lng: lng }); map.setZoom(16); marker.setPosition({ lat: lat, lng: lng });
        geocodeAndSend(lat, lng);
      }, function(e) { alert('Error: ' + e.message); }, { enableHighAccuracy: true });
    }
  </script>
  <script src="https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap" async defer></script>
</body>
</html>`;

const styles = StyleSheet.create({
  container: { flex: 1 },
  currentLocBtn: {
    position: "absolute",
    top: 12,
    left: 16,
    right: 16,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#fe95b4",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    shadowColor: "#fe95b4",
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  currentLocText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  hint: {
    position: "absolute",
    bottom: 12,
    left: 12,
    backgroundColor: "rgba(255,255,255,0.93)",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    zIndex: 10,
    pointerEvents: "none" as any,
  },
  hintText: { fontSize: 13, color: "#444", textAlign: "left" },
});
