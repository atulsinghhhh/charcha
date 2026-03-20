import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  FlatList, KeyboardAvoidingView, Platform, ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../context/AuthProvider';
import { supabase } from '@/lib/supabase/client';
import { useChatRealtime } from '@/hooks/realtime';

export default function ChatScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  // We no longer use conversationId, only userId (the other user's ID)
  const { userId: otherUserId, username: otherUsername } = useLocalSearchParams<{
    userId?: string;
    username?: string;
  }>();
  
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  const markMessagesAsRead = async () => {
    if (!user || !otherUserId) return;
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('receiver_id', user.id)
        .eq('sender_id', otherUserId)
        .eq('is_read', false);
      if (error) console.error("Error marking messages read:", error);
    } catch (e) {
      // Ignore
    }
  };

  const fetchMessages = useCallback(async () => {
    if (!user || !otherUserId) {
        setLoading(false);
        return;
    }

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: false })
        .limit(50);
        
      if (error) throw error;
      setMessages(data || []);
      markMessagesAsRead();
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  }, [user, otherUserId]);

  const onNewMessage = useCallback((newMessage: any) => {
    if (newMessage.sender_id === otherUserId) {
      markMessagesAsRead();
    }
    
    setMessages(prev => {
      if (prev.find(m => m.id === newMessage.id)) return prev;
      return [newMessage, ...prev];
    });
  }, [otherUserId]);

  useChatRealtime(otherUserId || null, onNewMessage);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const sendMessage = async () => {
    if (!inputText.trim() || !otherUserId || !user) return;
    
    const textToSend = inputText.trim();
    setInputText('');
    
    try {
      const { error } = await supabase.from('messages').insert({
        sender_id: user.id,
        receiver_id: otherUserId,
        content: textToSend,
      });
      
      if (error) {
        console.error("Error sending message:", error);
        setInputText(textToSend);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setInputText(textToSend);
    }
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isMe = item.sender_id === user?.id;
    return (
      <View style={[styles.messageWrapper, isMe ? styles.messageWrapperMe : styles.messageWrapperThem]}>
        <View style={[styles.messageBubble, isMe ? styles.messageBubbleMe : styles.messageBubbleThem]}>
          <Text style={[styles.messageText, isMe ? styles.messageTextMe : styles.messageTextThem]}>
            {item.content}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{String(otherUsername || 'Chat')}</Text>
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAvoidingView 
        style={styles.keyboardAware} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#4ade80" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            inverted={true}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderMessage}
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
          />
        )}

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor="#a1a1aa"
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity 
            style={[styles.sendButton, (!inputText.trim() || !otherUserId) ? styles.sendButtonDisabled : null]} 
            onPress={sendMessage}
            disabled={!inputText.trim() || !otherUserId}
          >
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a35',
    backgroundColor: '#121212',
  },
  backButton: {
    padding: 8,
    width: 70,
  },
  backText: {
    color: '#4ade80',
    fontSize: 16,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  keyboardAware: {
    flex: 1,
  },
  messageList: {
    padding: 16,
    flexGrow: 1,
  },
  messageWrapper: {
    marginBottom: 12,
    flexDirection: 'row',
  },
  messageWrapperMe: {
    justifyContent: 'flex-end',
  },
  messageWrapperThem: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  messageBubbleMe: {
    backgroundColor: '#4ade80',
    borderBottomRightRadius: 4,
  },
  messageBubbleThem: {
    backgroundColor: '#27272a',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  messageTextMe: {
    color: '#18181b', // Dark text on light green
    fontWeight: '600',
  },
  messageTextThem: {
    color: '#f4f4f5',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#1c1c20',
    borderTopWidth: 1,
    borderTopColor: '#2a2a35',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#27272a',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    color: '#f4f4f5',
    fontSize: 15,
    maxHeight: 120,
  },
  sendButton: {
    marginLeft: 12,
    backgroundColor: '#4ade80',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  sendButtonDisabled: {
    backgroundColor: '#3f3f46',
  },
  sendButtonText: {
    color: '#18181b',
    fontWeight: '700',
    fontSize: 15,
  },
});