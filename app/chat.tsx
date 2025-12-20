import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Image } from "react-native";
import { useRoute } from "@react-navigation/native";
import { useSelector } from "react-redux";
import { RootState } from "../store";
import { API_URL } from "@env";

interface Message {
  id: number;
  content: string;
  sender_email: string;
  sender_username: string;
  created_at: string;
}

const ChatScreen = () => {
  const route = useRoute();
  const { recipientEmail, recipientName, recipientProfilePic } = route.params as any;
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const scrollViewRef = useRef<ScrollView>(null);
  
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (currentUser) {
      initializeConversation();
    }
  }, [currentUser]);

  useEffect(() => {
    if (conversationId) {
      fetchMessages();
      // Poll for new messages every 3 seconds
      const interval = setInterval(fetchMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [conversationId]);

  const initializeConversation = async () => {
    if (!currentUser) return;

    try {
      console.log('Initializing conversation:', currentUser.email, recipientEmail);
      // Create or get conversation
      const response = await fetch(`${API_URL}/api/conversations/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user1_email: currentUser.email,
          user2_email: recipientEmail,
        }),
      });

      // Check if response is JSON
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.error('Server returned non-JSON response');
        alert('Server error. The seller account may not be properly set up. Please try again later.');
        setLoading(false);
        return;
      }

      const data = await response.json();
      console.log('Conversation response:', response.status, data);
      
      if (response.ok) {
        setConversationId(data.id);
      } else {
        console.error('Failed to create conversation:', data);
        const errorMsg = data.error || 'Failed to start conversation';
        
        if (errorMsg.includes('not found')) {
          alert('Unable to start chat. The seller account may not exist. Please contact support.');
        } else {
          alert(`Error: ${errorMsg}`);
        }
      }
    } catch (error) {
      console.error("Failed to initialize conversation:", error);
      alert('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    if (!conversationId || !currentUser) return;

    try {
      const response = await fetch(
        `${API_URL}/api/conversations/${conversationId}/messages/?email=${encodeURIComponent(currentUser.email)}`
      );
      const data = await response.json();

      if (response.ok) {
        setMessages(data);
        // Scroll to bottom when new messages arrive
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
      }
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
      const response = await fetch(`${API_URL}/api/messages/send/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conversationId,
          sender_email: currentUser.email,
          content: messageText,
        }),
      });

      if (response.ok) {
        // Fetch messages immediately to show the new message
        await fetchMessages();
      } else {
        // Restore message if send failed
        setMessage(messageText);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      setMessage(messageText);
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={100}
    >
      {/* Header */}
      <View style={styles.header}>
        {recipientProfilePic ? (
          <Image 
            source={{ uri: `${API_URL}${recipientProfilePic}` }} 
            style={styles.headerProfilePic}
          />
        ) : (
          <View style={styles.headerProfilePicPlaceholder}>
            <Text style={styles.headerProfileInitial}>
              {recipientName && recipientName.length > 0 ? recipientName.charAt(0).toUpperCase() : '?'}
            </Text>
          </View>
        )}
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{recipientName}</Text>
          <Text style={styles.headerSubtitle}>{recipientEmail}</Text>
        </View>
      </View>

      {/* Messages */}
      <ScrollView 
        ref={scrollViewRef}
        style={styles.messagesContainer} 
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {loading ? (
          <ActivityIndicator size="large" color="#ff1493" style={{ marginTop: 40 }} />
        ) : messages.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Start a conversation with {recipientName}</Text>
            <Text style={styles.emptySubtext}>Send a message to get started</Text>
          </View>
        ) : (
          messages.map((msg) => {
            const isMyMessage = currentUser && msg.sender_email === currentUser.email;
            return (
              <View 
                key={msg.id} 
                style={[
                  styles.messageBubble, 
                  isMyMessage ? styles.myMessage : styles.theirMessage
                ]}
              >
                <Text style={[
                  styles.messageText,
                  { color: isMyMessage ? "#fff" : "#333" }
                ]}>
                  {msg.content}
                </Text>
                <Text style={[
                  styles.messageTime,
                  { color: isMyMessage ? "#fff" : "#666" }
                ]}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Input */}
      <View style={styles.inputContainer}>
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
    flexDirection: "row",
    alignItems: "center",
  },
  headerProfilePic: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  headerProfilePicPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#ff1493",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerProfileInitial: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f0a1a",
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#666",
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
  },
  messageBubble: {
    maxWidth: "75%",
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  myMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#ff1493",
  },
  theirMessage: {
    alignSelf: "flex-start",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#eee",
  },
  messageText: {
    fontSize: 15,
    marginBottom: 4,
  },
  messageTime: {
    fontSize: 11,
    alignSelf: "flex-end",
    opacity: 0.7,
  },
  inputContainer: {
    flexDirection: "row",
    padding: 12,
    paddingBottom: 60,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: "#ff1493",
    borderRadius: 20,
    paddingHorizontal: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#ccc",
  },
  sendButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },

});

export default ChatScreen;
