import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from "react-native";

interface RatingModalProps {
  visible: boolean;
  orderId: string;
  sellerName: string;
  onClose: () => void;
  onSubmit: (rating: number, review: string) => Promise<void> | void;
}

const RatingModal: React.FC<RatingModalProps> = ({
  visible,
  orderId,
  sellerName,
  onClose,
  onSubmit,
}) => {
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");

  const handleSubmit = () => {
    if (rating === 0) {
      Alert.alert("Rating Required", "Please select a star rating");
      return;
    }
    const savedRating = rating;
    const savedReview = review;
    setRating(0);
    setReview("");
    onClose();
    onSubmit(savedRating, savedReview).catch((err: any) => {
      Alert.alert("Review Error", err?.message || "Could not save your review.");
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Rate Your Experience</Text>
              <TouchableOpacity onPress={onClose}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Seller Info */}
            <View style={styles.sellerInfo}>
              <Text style={styles.sellerLabel}>How was your experience with</Text>
              <Text style={styles.sellerName}>{sellerName}?</Text>
            </View>

            {/* Star Rating */}
            <View style={styles.ratingSection}>
              <Text style={styles.ratingLabel}>Tap to rate</Text>
              <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setRating(star)}
                    style={styles.starButton}
                  >
                    <Text style={styles.star}>
                      {star <= rating ? "⭐" : "☆"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {rating > 0 && (
                <Text style={styles.ratingText}>
                  {rating === 1 && "Poor"}
                  {rating === 2 && "Fair"}
                  {rating === 3 && "Good"}
                  {rating === 4 && "Very Good"}
                  {rating === 5 && "Excellent"}
                </Text>
              )}
            </View>

            {/* Review Text (Optional) */}
            <View style={styles.reviewSection}>
              <Text style={styles.reviewLabel}>
                Write a review <Text style={styles.optional}>(Optional)</Text>
              </Text>
              <TextInput
                style={styles.reviewInput}
                placeholder="Share your experience..."
                value={review}
                onChangeText={setReview}
                multiline
                numberOfLines={4}
                maxLength={500}
              />
              <Text style={styles.charCount}>{review.length}/500</Text>
            </View>

            {/* Submit Button */}
            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
              <Text style={styles.submitButtonText}>Submit Review</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.skipButton} onPress={onClose}>
              <Text style={styles.skipButtonText}>Maybe Later</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
    paddingBottom: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f0a1a",
  },
  closeButton: {
    fontSize: 24,
    color: "#999",
    fontWeight: "700",
  },
  sellerInfo: {
    alignItems: "center",
    paddingVertical: 24,
  },
  sellerLabel: {
    fontSize: 15,
    color: "#666",
    marginBottom: 8,
  },
  sellerName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fe95b4",
  },
  ratingSection: {
    alignItems: "center",
    paddingVertical: 20,
    backgroundColor: "#f8f9fa",
    marginHorizontal: 20,
    borderRadius: 16,
    marginBottom: 20,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
  },
  starsContainer: {
    flexDirection: "row",
    gap: 8,
  },
  starButton: {
    padding: 4,
  },
  star: {
    fontSize: 40,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fe95b4",
    marginTop: 12,
  },
  reviewSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  reviewLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  optional: {
    fontSize: 14,
    color: "#999",
    fontWeight: "400",
  },
  reviewInput: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    minHeight: 100,
    textAlignVertical: "top",
  },
  charCount: {
    fontSize: 12,
    color: "#999",
    textAlign: "right",
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: "#fe95b4",
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#fe95b4",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: "#ccc",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  skipButton: {
    marginHorizontal: 20,
    marginTop: 12,
    padding: 12,
    alignItems: "center",
  },
  skipButtonText: {
    color: "#999",
    fontSize: 15,
    fontWeight: "600",
  },
});

export default RatingModal;
