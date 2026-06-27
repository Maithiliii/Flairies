import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Image } from "react-native";
import { ChevronLeft } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import { RootState } from "../store";
import { supabase, getImageUrl } from "../lib/supabase";

interface Message {
  id: number; content: string; sender_id: string; created_at: string;
}

const ChatScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { recipientEmail, recipientName, recipientProfilePic } = route.params as any;
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const scrollViewRef = useRef<ScrollView>(null);

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => { if (currentUser) { initializeConversation(); } }, [currentUser]);

  useEffect(() => {
    if (conversationId) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [conversationId]);

  const initializeConversation = async () => {
    if (!currentUser) return;
    try {
      const { data: recipientProfile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", recipientEmail)
        .single();

      if (profileError || !recipientProfile) {
        alert("Unable to start chat. The user account may not exist.");
        setLoading(false);
        return;
      }

      const recipientId = recipientProfile.id;

      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .or(
          `and(participant1_id.eq.${currentUser.id},participant2_id.eq.${recipientId}),and(participant1_id.eq.${recipientId},participant2_id.eq.${currentUser.id})`
        )
        .maybeSingle();

      if (existing) {
        setConversationId(existing.id);
      } else {
        const { data: newConv, error: convError } = await supabase
          .from("conversations")
          .insert({ participant1_id: currentUser.id, participant2_id: recipientId })
          .select("id")
          .single();

        if (convError) throw convError;
        if (newConv) setConversationId(newConv.id);
      }
    } catch (error) {
      console.error("Failed to initialize conversation:", error);
      alert("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    if (!conversationId || !currentUser) return;
    try {
      const { data } = await supabase
        .from("messages")
        .select("id, content, sender_id, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (data) {
        setMessages(data);
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
      }

      // Mark all messages from the other person as read
      await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("conversation_id", conversationId)
        .eq("is_read", false)
        .neq("sender_id", currentUser.id);
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    }
  };

  const handleSend = async () => {
    if (!message.trim() || !conversationId || !currentUser || sending) return;
    setSending(true);
    const messageText = message.trim();
    setMessage("");
    try {
      const { error } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: currentUser.id,
        content: messageText,
      });
      if (error) { setMessage(messageText); return; }
      await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
      await fetchMessages();
    } catch (error) {
      console.error("Failed to send message:", error);
      setMessage(messageText);
    } finally {
      setSending(false);
    }
  };

  const profilePicUri = recipientProfilePic?.startsWith("http") ? recipientProfilePic : getImageUrl(recipientProfilePic);

  const getDateLabel = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86400000);
    const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    if (msgDate.getTime() === today.getTime()) return "Today";
    if (msgDate.getTime() === yesterday.getTime()) return "Yesterday";
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  };

  // Build render list with date separators injected
  type RenderItem =
    | { type: "separator"; label: string }
    | { type: "message"; msg: Message };

  const renderItems: RenderItem[] = [];
  let lastLabel = "";
  for (const msg of messages) {
    const label = getDateLabel(msg.created_at);
    if (label !== lastLabel) {
      renderItems.push({ type: "separator", label });
      lastLabel = label;
    }
    renderItems.push({ type: "message", msg });
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      {/* Header flush with status bar */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.chatBackBtn}>
          <ChevronLeft size={26} color="#fe95b4" strokeWidth={2} />
        </TouchableOpacity>
        {profilePicUri ? (
          <Image source={{ uri: profilePicUri }} style={styles.headerProfilePic} />
        ) : (
          <View style={styles.headerProfilePicPlaceholder}>
            <Text style={styles.headerProfileInitial}>{recipientName?.charAt(0).toUpperCase() || "?"}</Text>
          </View>
        )}
        <Text style={styles.headerTitle}>{recipientName}</Text>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {loading ? (
          <ActivityIndicator size="large" color="#fe95b4" style={{ marginTop: 40 }} />
        ) : messages.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Start a conversation with {recipientName}</Text>
          </View>
        ) : (
          renderItems.map((item, idx) => {
            if (item.type === "separator") {
              return (
                <View key={`sep-${idx}`} style={styles.dateSeparator}>
                  <View style={styles.dateSeparatorLine} />
                  <View style={styles.datePill}>
                    <Text style={styles.datePillText}>{item.label}</Text>
                  </View>
                  <View style={styles.dateSeparatorLine} />
                </View>
              );
            }
            const { msg } = item;
            const isMyMessage = currentUser && msg.sender_id === currentUser.id;
            return (
              <View key={msg.id} style={[styles.messageBubble, isMyMessage ? styles.myMessage : styles.theirMessage]}>
                <Text style={[styles.messageText, { color: isMyMessage ? "#fff" : "#333" }]}>{msg.content}</Text>
                <Text style={[styles.messageTime, { color: isMyMessage ? "rgba(255,255,255,0.7)" : "#666" }]}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </Text>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Input bar sits above the system nav bar */}
      <View style={[styles.inputContainer, { paddingBottom: insets.bottom + 8 }]}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={message}
          onChangeText={setMessage}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendButton, !message.trim() && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!message.trim()}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  header: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  chatBackBtn: { padding: 4 },
  headerProfilePic: { width: 38, height: 38, borderRadius: 19 },
  headerProfilePicPlaceholder: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#fe95b4",
    alignItems: "center",
    justifyContent: "center",
  },
  headerProfileInitial: { color: "#fff", fontSize: 16, fontWeight: "700" },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#1f0a1a" },
  messagesContainer: { flex: 1 },
  messagesContent: { padding: 16, flexGrow: 1 },
  emptyState: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 60 },
  emptyText: { fontSize: 16, fontWeight: "600", color: "#333", marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: "#999" },
  dateSeparator: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
    gap: 8,
  },
  dateSeparatorLine: { flex: 1, height: 1, backgroundColor: "#e4eaed" },
  datePill: {
    backgroundColor: "#dde5ea",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  datePillText: { fontSize: 12, fontWeight: "600", color: "#6b8a96" },

  messageBubble: { maxWidth: "75%", padding: 12, borderRadius: 16, marginBottom: 12 },
  myMessage: { alignSelf: "flex-end", backgroundColor: "#fe95b4" },
  theirMessage: { alignSelf: "flex-start", backgroundColor: "#fff", borderWidth: 1, borderColor: "#eee" },
  messageText: { fontSize: 15, marginBottom: 4 },
  messageTime: { fontSize: 11, alignSelf: "flex-end", opacity: 0.7 },
  inputContainer: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingTop: 6,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    gap: 8,
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    fontSize: 15,
    maxHeight: 80,
  },
  sendButton: { backgroundColor: "#fe95b4", borderRadius: 18, paddingHorizontal: 16, paddingVertical: 8, justifyContent: "center", alignItems: "center", marginBottom: 1 },
  sendButtonDisabled: { backgroundColor: "#ccc" },
  sendButtonText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});

export default ChatScreen;
