import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft } from "lucide-react-native";

const AboutScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color="#1f0a1a" strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={styles.title}>ABOUT</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand block */}
        <View style={styles.brandBlock}>
          <Text style={styles.brandName}>Flairies</Text>
          <Text style={styles.tagline}>From One Wardrobe to Another</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What is Flairies?</Text>
          <Text style={styles.body}>
            Flairies is a community-driven online thrift store built for girls. Buy, sell, rent, or donate clothes and accessories with people around you. No big retail markups, no wasted wardrobes, just real fashion moving between real people.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Why the name "Flairies"?</Text>
          <Text style={styles.body}>
            The name is inspired by the magical Flairies from Barbie: Fashion Fairytale, tiny sparkly creatures who brought color, creativity, and confidence back to the fashion world. That energy felt like exactly what we wanted to create: a space where every girl can express her style, share her wardrobe, and feel a little magic doing it.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Why we exist</Text>
          <Text style={styles.body}>
            The fashion industry is one of the largest contributors to waste in the world. At the same time, girls in Goa had no local platform to buy, sell, or rent pre-loved fashion without visiting a store or scrolling through endless generic listings.{"\n\n"}Flairies was built to fix that. It is a way to refresh your wardrobe without the guilt, earn a little extra on the side, and keep clothes out of the bin. Made by girls, for girls.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How it works</Text>
          <View style={styles.howRow}>
            <Text style={styles.howBadge}>BUY</Text>
            <Text style={styles.howText}>Shop pre-loved pieces from girls in your community at a fraction of the original price.</Text>
          </View>
          <View style={styles.howRow}>
            <Text style={styles.howBadge}>RENT</Text>
            <Text style={styles.howText}>Borrow outfits for events, trips, or just to try something new without committing.</Text>
          </View>
          <View style={styles.howRow}>
            <Text style={styles.howBadge}>SELL</Text>
            <Text style={styles.howText}>List clothes you no longer wear and earn money from your closet.</Text>
          </View>
          <View style={[styles.howRow, { marginBottom: 0 }]}>
            <Text style={styles.howBadge}>DONATE</Text>
            <Text style={styles.howText}>Pass on pieces to someone who will actually use them. No payments, just good vibes.</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Our promise</Text>
          <Text style={styles.body}>
            Every listing on Flairies is from a real person in your community. We keep payments secure, listings honest, and conversations easy. If anything ever feels off, we are here.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Get in touch</Text>
          <Text style={styles.body}>
            Have a question, a suggestion, or just want to say hi? Drop us a message at support@flairies.com. We read every single one.
          </Text>
        </View>

        <Text style={styles.version}>Version 1.0.0</Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff0ec" },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    letterSpacing: 1.5,
    color: "#1f0a1a",
  },

  content: { paddingHorizontal: 20, paddingTop: 8 },

  brandBlock: {
    alignItems: "center",
    paddingVertical: 28,
    backgroundColor: "#fff",
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
  },
  brandName: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 36,
    color: "#fe95b4",
    marginBottom: 4,
  },
  tagline: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "#999",
    letterSpacing: 0.5,
  },

  section: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    letterSpacing: 0.5,
    color: "#1f0a1a",
    marginBottom: 10,
    textTransform: "uppercase",
  },
  body: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "#555",
    lineHeight: 22,
  },

  howRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 10,
  },
  howBadge: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 1.2,
    color: "#fe95b4",
    backgroundColor: "#ffe8f0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 1,
    minWidth: 52,
    textAlign: "center",
  },
  howText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "#555",
    lineHeight: 20,
  },

  version: {
    textAlign: "center",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "#bbb",
    marginTop: 8,
    marginBottom: 4,
  },
});

export default AboutScreen;
