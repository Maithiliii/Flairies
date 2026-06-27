import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from "react-native";
import ScreenHeader from "../components/ScreenHeader";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useSelector } from "react-redux";
import { RootState } from "../store";
import { supabase, getImageUrl } from "../lib/supabase";
import { MessageCircle } from "lucide-react-native";

interface Conversation {
  id: string;
  recipientName: string;
  recipientEmail: string;
  recipientProfilePic?: string | null;
  lastMessage: string;
  lastMessageTime: string;
  isUnread: boolean;
}

const ChatListScreen = () => {
  const navigation = useNavigation();
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  // Re-fetch every time this screen comes into focus so read status is fresh
  useFocusEffect(
    useCallback(() => {
      if (currentUser) fetchConversations();
    }, [currentUser])
  );

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const fetchConversations = async () => {
    if (!currentUser) return;
    try {
      const { data: convData, error } = await supabase
        .from("conversations")
        .select("id, participant1_id, participant2_id, created_at, updated_at")
        .or(`participant1_id.eq.${currentUser.id},participant2_id.eq.${currentUser.id}`)
        .order("updated_at", { ascending: false });

      if (error || !convData || convData.length === 0) return;

      const otherIds = convData.map((c) =>
        c.participant1_id === currentUser.id ? c.participant2_id : c.participant1_id
      );

      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, name, email, profile_picture_url")
        .in("id", otherIds);

      const convIds = convData.map((c) => c.id);

      // Fetch last message per conversation (with is_read)
      const { data: messagesData } = await supabase
        .from("messages")
        .select("conversation_id, content, created_at, sender_id, is_read")
        .in("conversation_id", convIds)
        .order("created_at", { ascending: false });

      const lastMessages: Record<number, { content: string; created_at: string; sender_id: string; is_read: boolean }> = {};
      (messagesData || []).forEach((msg) => {
        if (!lastMessages[msg.conversation_id]) {
          lastMessages[msg.conversation_id] = {
            content: msg.content,
            created_at: msg.created_at,
            sender_id: msg.sender_id,
            is_read: msg.is_read,
          };
        }
      });

      const profileMap: Record<string, any> = {};
      (profilesData || []).forEach((p) => { profileMap[p.id] = p; });

      const transformed: Conversation[] = convData.map((conv) => {
        const otherId = conv.participant1_id === currentUser.id ? conv.participant2_id : conv.participant1_id;
        const profile = profileMap[otherId] || {};
        const lastMsg = lastMessages[conv.id];
        // Unread = last message is from the other person AND not yet marked is_read
        const isUnread = lastMsg
          ? lastMsg.sender_id !== currentUser.id && !lastMsg.is_read
          : false;
        return {
          id: conv.id.toString(),
          recipientName: profile.name || "Unknown",
          recipientEmail: profile.email || "",
          recipientProfilePic: getImageUrl(profile.profile_picture_url),
          lastMessage: lastMsg?.content || "No messages yet",
          lastMessageTime: formatTimeAgo(lastMsg?.created_at || conv.created_at),
          isUnread,
        };
      });

      setConversations(transformed);
    } catch (error) {
      console.log("Chat list: Unable to fetch conversations");
    }
  };

  const handleConversationPress = (conversation: Conversation) => {
    (navigation as any).navigate("Chat", {
      recipientEmail: conversation.recipientEmail,
      recipientName: conversation.recipientName,
      recipientProfilePic: conversation.recipientProfilePic,
    });
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Messages" />

      <ScrollView style={styles.conversationsList}>
        {conversations.length === 0 ? (
          <View style={styles.emptyState}>
            <MessageCircle size={56} color="#fe95b4" strokeWidth={1.5} style={{ marginBottom: 16 }} />
            <Text style={styles.emptyTitle}>No messages yet</Text>
            <Text style={styles.emptyText}>Start a conversation by contacting a seller</Text>
          </View>
        ) : (
          conversations.map((conversation) => (
            <TouchableOpacity
              key={conversation.id}
              style={styles.conversationCard}
              onPress={() => handleConversationPress(conversation)}
              activeOpacity={0.7}
            >
              <View style={styles.avatarContainer}>
                {conversation.recipientProfilePic ? (
                  <Image source={{ uri: conversation.recipientProfilePic }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarInitial}>{conversation.recipientName?.charAt(0).toUpperCase() || "?"}</Text>
                  </View>
                )}
              </View>

              <View style={styles.conversationInfo}>
                <View style={styles.conversationHeader}>
                  <Text style={[styles.recipientName, conversation.isUnread && styles.recipientNameUnread]}>
                    {conversation.recipientName}
                  </Text>
                  {/* Time + dot side by side — no stacking so no extra height */}
                  <View style={styles.timeRow}>
                    {conversation.isUnread && <View style={styles.unreadDot} />}
                    <Text style={styles.timeText}>{conversation.lastMessageTime}</Text>
                  </View>
                </View>
                <Text style={[styles.lastMessage, conversation.isUnread && styles.lastMessageUnread]} numberOfLines={1}>
                  {conversation.lastMessage}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff0ec" },
  conversationsList: { flex: 1 },
  emptyState: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 80, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: "#333", marginBottom: 8 },
  emptyText: { fontSize: 15, color: "#999", textAlign: "center", lineHeight: 22 },

  conversationCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    alignItems: "center",
  },
  avatarContainer: { marginRight: 14 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarPlaceholder: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: "#fe95b4", alignItems: "center", justifyContent: "center",
  },
  avatarInitial: { color: "#fff", fontSize: 19, fontWeight: "700" },

  conversationInfo: { flex: 1, justifyContent: "center" },
  conversationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 1,
  },
  recipientName: { fontSize: 15, fontWeight: "600", color: "#1f0a1a", lineHeight: 19 },
  recipientNameUnread: { fontWeight: "700" },

  timeRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#fe95b4" },
  timeText: { fontSize: 12, color: "#aaa" },

  lastMessage: { fontSize: 13, color: "#999", lineHeight: 17, marginTop: 1 },
  lastMessageUnread: { color: "#444", fontWeight: "600" },
});

export default ChatListScreen;
