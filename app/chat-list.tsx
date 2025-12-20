import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSelector } from "react-redux";
import { RootState } from "../store";
import { API_URL } from "@env";

interface Conversation {
  id: string;
  recipientName: string;
  recipientEmail: string;
  recipientProfilePic?: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

const ChatListScreen = () => {
  const navigation = useNavigation();
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    if (currentUser) {
      fetchConversations();
    }
  }, [currentUser]);

  const fetchConversations = async () => {
    if (!currentUser) return;

    try {
      const response = await fetch(`${API_URL}/api/conversations/?email=${encodeURIComponent(currentUser.email)}`);
      
      // Check if response is JSON
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.log('Chat list: Server returned non-JSON response');
        return;
      }
      
      const data = await response.json();

      if (response.ok) {
        // Transform backend data to match our interface
        const transformedConversations: Conversation[] = data.map((conv: any) => {
          const otherParticipant = conv.participant1_email === currentUser.email
            ? {
                name: conv.participant2_username,
                email: conv.participant2_email,
                profilePic: conv.participant2_profile_picture,
              }
            : {
                name: conv.participant1_username,
                email: conv.participant1_email,
                profilePic: conv.participant1_profile_picture,
              };

          return {
            id: conv.id.toString(),
            recipientName: otherParticipant.name,
            recipientEmail: otherParticipant.email,
            recipientProfilePic: otherParticipant.profilePic,
            lastMessage: conv.last_message?.content || "No messages yet",
            lastMessageTime: formatTimeAgo(conv.last_message?.created_at || conv.created_at),
            unreadCount: conv.unread_count || 0,
          };
        });

        setConversations(transformedConversations);
      }
    } catch (error) {
      // Silently fail
      console.log("Chat list: Unable to fetch conversations");
    }
  };

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

  const handleConversationPress = (conversation: Conversation) => {
    (navigation as any).navigate("Chat", {
      recipientEmail: conversation.recipientEmail,
      recipientName: conversation.recipientName,
      recipientProfilePic: conversation.recipientProfilePic,
    });
  };

  const formatTime = (timeStr: string) => {
    return timeStr;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>

      <ScrollView style={styles.conversationsList}>
        {conversations.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyTitle}>No messages yet</Text>
            <Text style={styles.emptyText}>
              Start a conversation by contacting a seller
            </Text>
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
                  <Image
                    source={{ uri: `${API_URL}${conversation.recipientProfilePic}` }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarInitial}>
                      {conversation.recipientName && conversation.recipientName.length > 0 ? conversation.recipientName.charAt(0).toUpperCase() : '?'}
                    </Text>
                  </View>
                )}
                {conversation.unreadCount > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>{conversation.unreadCount}</Text>
                  </View>
                )}
              </View>

              <View style={styles.conversationInfo}>
                <View style={styles.conversationHeader}>
                  <Text style={styles.recipientName}>{conversation.recipientName}</Text>
                  <Text style={styles.timeText}>{formatTime(conversation.lastMessageTime)}</Text>
                </View>
                <Text
                  style={[
                    styles.lastMessage,
                    conversation.unreadCount > 0 && styles.lastMessageUnread,
                  ]}
                  numberOfLines={1}
                >
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
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    backgroundColor: "#fff",
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1f0a1a",
  },
  conversationsList: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: "#999",
    textAlign: "center",
    lineHeight: 22,
  },
  conversationCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  avatarContainer: {
    position: "relative",
    marginRight: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#ff1493",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
  },
  unreadBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#ff1493",
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: "#fff",
  },
  unreadText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  conversationInfo: {
    flex: 1,
    justifyContent: "center",
  },
  conversationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  recipientName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f0a1a",
  },
  timeText: {
    fontSize: 13,
    color: "#999",
  },
  lastMessage: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  lastMessageUnread: {
    color: "#333",
    fontWeight: "600",
  },

});

export default ChatListScreen;
