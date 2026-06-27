import React, { useState, useMemo } from "react";
import {
  View, Text, TextInput, TouchableOpacity, Modal,
  FlatList, StyleSheet, SafeAreaView, Pressable,
} from "react-native";
import { Search } from "lucide-react-native";
import { countries } from "countries-list";

export interface Country {
  name: string;
  dialCode: string;
  flag: string;
}

// Build sorted list from the countries-list package (all 249 countries)
// phone can be comma-separated (e.g. "1,808" for US territories) — take first segment
const ALL_COUNTRIES: Country[] = Object.values(countries)
  .map((c) => ({
    name: c.name,
    dialCode: `+${String(c.phone).split(",")[0]}`,
    flag: c.emoji,
  }))
  .sort((a, b) => {
    if (a.name === "India") return -1;
    if (b.name === "India") return 1;
    return a.name.localeCompare(b.name);
  });

export const DEFAULT_COUNTRY: Country = ALL_COUNTRIES.find((c) => c.name === "India")!;

interface Props {
  selected: Country;
  onSelect: (country: Country) => void;
}

const CountryPicker: React.FC<Props> = ({ selected, onSelect }) => {
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return ALL_COUNTRIES;
    return ALL_COUNTRIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.dialCode.includes(q)
    );
  }, [search]);

  const handleSelect = (country: Country) => {
    onSelect(country);
    setVisible(false);
    setSearch("");
  };

  const close = () => { setVisible(false); setSearch(""); };

  return (
    <>
      <TouchableOpacity style={styles.trigger} onPress={() => setVisible(true)} activeOpacity={0.7}>
        <Text style={styles.triggerFlag}>{selected.flag}</Text>
        <Text style={styles.triggerCode}>{selected.dialCode}</Text>
        <Text style={styles.arrow}>▾</Text>
      </TouchableOpacity>

      <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
        <Pressable style={styles.overlay} onPress={close}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <SafeAreaView style={{ flex: 1 }}>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Select Country</Text>
                <TouchableOpacity onPress={close}>
                  <Text style={styles.closeBtn}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.searchContainer}>
                <Search size={18} color="#aaa" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by name or code e.g. india, +91"
                  placeholderTextColor="#aaa"
                  value={search}
                  onChangeText={setSearch}
                  autoFocus
                  autoCapitalize="none"
                />
                {search.length > 0 && (
                  <TouchableOpacity onPress={() => setSearch("")}>
                    <Text style={styles.clearBtn}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>

              <FlatList
                data={filtered}
                keyExtractor={(item, index) => `${item.name}-${index}`}
                keyboardShouldPersistTaps="handled"
                initialNumToRender={20}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.item, item.name === selected.name && styles.selectedItem]}
                    onPress={() => handleSelect(item)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.itemFlag}>{item.flag}</Text>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemCode}>{item.dialCode}</Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No countries found</Text>
                  </View>
                }
              />
            </SafeAreaView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 4,
  },
  triggerFlag: { fontSize: 20 },
  triggerCode: { fontSize: 15, color: "#333", fontWeight: "600" },
  arrow: { fontSize: 11, color: "#888", marginTop: 1 },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: "80%",
    paddingTop: 8,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  sheetTitle: { fontSize: 18, fontWeight: "700", color: "#1f0a1a" },
  closeBtn: { fontSize: 18, color: "#888", padding: 4 },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    margin: 16,
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchInput: { flex: 1, paddingVertical: 11, paddingLeft: 10, fontSize: 15, color: "#333" },
  clearBtn: { fontSize: 14, color: "#aaa", padding: 4 },

  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#f8f8f8",
    gap: 12,
  },
  selectedItem: { backgroundColor: "#daeaf5" },
  itemFlag: { fontSize: 22, width: 32 },
  itemName: { flex: 1, fontSize: 15, color: "#333" },
  itemCode: { fontSize: 15, color: "#fe95b4", fontWeight: "600", minWidth: 44, textAlign: "right" },

  emptyState: { padding: 40, alignItems: "center" },
  emptyText: { fontSize: 15, color: "#999" },
});

export default CountryPicker;
