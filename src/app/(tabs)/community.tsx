import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthProvider';
import { useCommunity } from '@/hooks/community';
import * as Location from "expo-location";
import { supabase } from '@/lib/supabase/client';

export default function CommunityScreen() {
  const { user } = useAuth();
  const { getorCreateRoom, loadMessages, sendMessage, subscribeToRoom } = useCommunity();
  
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [gridKey, setGridKey] = useState<string | null>(null);
  const [hasJoined, setHasJoined] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    initCommunityChat();
  }, []);

  const initCommunityChat = async () => {
    if (!user) return;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Location is needed for community chat.");
        setLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const lat = location.coords.latitude;
      const lng = location.coords.longitude;

      const room = await getorCreateRoom(lat, lng);
      setRoomId(room.id);
      setGridKey(room.grid_key);

      // Successfully located the user and their grid/room, but we don't automatically join yet
    } catch (error) {
      console.error("Community init error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!roomId) return;
    setLoading(true);
    try {
      const msgs = await loadMessages(roomId);
      
      if (msgs.length > 0) {
        const userIds = Array.from(new Set(msgs.map(m => m.sender_id)));
        const { data: profiles } = await supabase.from('profiles').select('id, username').in('id', userIds);
        const profileMap = new Map((profiles || []).map(p => [p.id, p.username]));
        
        const richMsgs = msgs.map(m => ({
          ...m,
          username: profileMap.get(m.sender_id) || 'Anonymous'
        }));
        setMessages(richMsgs);
      } else {
        setMessages([]);
      }
      
      setHasJoined(true);
    } catch (error) {
      console.error("Error joining room:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfileName = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('username').eq('id', userId).single();
    return data?.username || 'Anonymous';
  };

  const onNewMessage = useCallback(async (newMessage: any) => {
    const username = await fetchProfileName(newMessage.sender_id);
    const enrichedMessage = { ...newMessage, username };

    setMessages(prev => {
      if (prev.find(m => m.id === newMessage.id)) return prev;
      return [enrichedMessage, ...prev];
    });
  }, []);

  useEffect(() => {
    // We only subscribe AFTER the user explicitly clicks "Join"
    if (!roomId || !hasJoined) return;
    const unsubscribe = subscribeToRoom(roomId, onNewMessage);
    return () => {
      unsubscribe();
    };
  }, [roomId, hasJoined, onNewMessage]);

  const handleSend = async () => {
    if (!inputText.trim() || !roomId || !user) return;
    const textToSend = inputText.trim();
    setInputText('');
    try {
      await sendMessage(roomId, user.id, textToSend);
    } catch (e) {
      console.error(e);
      setInputText(textToSend);
    }
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isMe = item.sender_id === user?.id;
    return (
      <View style={[styles.messageWrapper, isMe ? styles.messageWrapperMe : styles.messageWrapperThem]}>
        {!isMe ? (
          <Text style={styles.senderName}>{String(item.username)}</Text>
        ) : null}
        <View style={[styles.messageBubble, isMe ? styles.messageBubbleMe : styles.messageBubbleThem]}>
          <Text style={[styles.messageText, isMe ? styles.messageTextMe : null]}>
            {String(item.content)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Community Chat</Text>
          {gridKey ? <Text style={styles.subTitle}>Sector {String(gridKey)}</Text> : null}
        </View>
      </View>

      <KeyboardAvoidingView 
        style={styles.keyboardAware} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#4ade80" />
            <Text style={styles.loadingText}>Locating your sector...</Text>
          </View>
        ) : !hasJoined ? (
          <View style={styles.joinContainer}>
            <Text style={styles.joinTitle}>Join the Community 🌍</Text>
            <Text style={styles.joinDesc}>
              Chat with nearby users around Sector {gridKey ? String(gridKey) : '...'}
            </Text>
            <TouchableOpacity style={styles.joinActionBtn} onPress={handleJoin}>
              <Text style={styles.joinBtnText}>Join Now</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <FlatList
              ref={flatListRef}
              data={messages}
              inverted={true}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderMessage}
              contentContainerStyle={styles.messageList}
              showsVerticalScrollIndicator={false}
            />
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Type to community..."
                placeholderTextColor="#a1a1aa"
                value={inputText}
                onChangeText={setInputText}
                multiline
              />
              <TouchableOpacity 
                style={[styles.sendButton, (!inputText.trim() || !roomId) ? styles.sendButtonDisabled : null]} 
                onPress={handleSend}
                disabled={!inputText.trim() || !roomId}
              >
                <Text style={styles.sendButtonText}>Send</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: '#121212' 
    },
    centerContainer: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    loadingText: { 
        color: '#a1a1aa', 
        marginTop: 12 
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#2a2a35',
        backgroundColor: '#121212',
    },
    headerTitle: { 
        fontSize: 22, 
        fontWeight: '800', 
        color: '#ffffff' 
    },
    subTitle: { 
        fontSize: 13, 
        color: '#4ade80', 
        fontWeight: '600', 
        marginTop: 2 
    },
    keyboardAware: { flex: 1 },
    joinContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    joinTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#ffffff',
        marginBottom: 8,
        textAlign: 'center',
    },
    joinDesc: {
        fontSize: 15,
        color: '#a1a1aa',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    joinActionBtn: {
        backgroundColor: '#4ade80',
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 30,
    },
    joinBtnText: {
        color: '#18181b',
        fontWeight: '700',
        fontSize: 16,
    },
    messageList: { 
        padding: 16, 
        flexGrow: 1 
    },
    messageWrapper: { 
        marginBottom: 12, 
        flexDirection: 'column' 
    },
    messageWrapperMe: { 
        alignItems: 'flex-end' 
    },
    messageWrapperThem: { 
        alignItems: 'flex-start' 
    },
    senderName: { 
        fontSize: 13, 
        color: '#a1a1aa', 
        marginBottom: 4, 
        marginLeft: 4, 
        fontWeight: "600" 
    },
    messageBubble: { 
        maxWidth: '80%', 
        paddingHorizontal: 16, 
        paddingVertical: 12, 
        borderRadius: 20 
    },
    messageBubbleMe: { 
        backgroundColor: '#4ade80', 
        borderBottomRightRadius: 4 
    },
    messageBubbleThem: { 
        backgroundColor: '#27272a', 
        borderBottomLeftRadius: 4 
    },
    messageText: { 
        fontSize: 15, 
        lineHeight: 20,
        color: '#f4f4f5' 
    },
    messageTextMe: { 
        color: '#18181b', 
        fontWeight: '600' 
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
        backgroundColor: '#3f3f46' 
    },
    sendButtonText: { 
        color: '#18181b', 
        fontWeight: '700', 
        fontSize: 15 
    },
});