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
import { Audio } from 'expo-av';

const AudioMessage = ({ url }: { url: string }) => {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  async function playSound() {
    if (sound) {
      if (isPlaying) {
        await sound.pauseAsync();
        setIsPlaying(false);
      } else {
        await sound.playAsync();
        setIsPlaying(true);
      }
      return;
    }

    try {
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true }
      );
      setSound(newSound);
      setIsPlaying(true);
      
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
          newSound.setPositionAsync(0);
        }
      });
    } catch (e) {
      console.error("Failed to load sound", e);
    }
  }

  useEffect(() => {
    return sound ? () => { sound.unloadAsync(); } : undefined;
  }, [sound]);

  return (
    <TouchableOpacity onPress={playSound} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4 }}>
      <Text style={{ fontSize: 20, marginRight: 12 }}>{isPlaying ? "⏸" : "▶️"}</Text>
      <View style={{ height: 4, width: 80, backgroundColor: '#D8B4FE', borderRadius: 2 }} />
    </TouchableOpacity>
  );
};

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
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
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

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status === 'granted') {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
        const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
        setRecording(recording);
        setIsRecording(true);
      }
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    setIsRecording(false);
    
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      if (uri) {
        uploadVoiceNote(uri);
      }
    } catch (error) {
      console.error("Error stopping recording", error);
    }
  };

  const uploadVoiceNote = async (uri: string) => {
    if (!user || !otherUserId) return;
    try {
      const ext = uri.substring(uri.lastIndexOf(".") + 1);
      const fileName = `${user.id}_${Date.now()}.${ext}`;
      
      const arraybuffer = await fetch(uri).then((res) => res.arrayBuffer());

      const { data, error: uploadError } = await supabase.storage
        .from('voice_notes')
        .upload(fileName, arraybuffer, {
          contentType: `audio/${ext}`,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('voice_notes').getPublicUrl(fileName);

      await supabase.from('messages').insert({
        sender_id: user.id,
        receiver_id: otherUserId,
        content: "🎤 Voice Note",
        audio_url: publicUrl,
      });

    } catch (error) {
      console.error("Upload error", error);
    }
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isMe = item.sender_id === user?.id;
    return (
      <View style={[styles.messageWrapper, isMe ? styles.messageWrapperMe : styles.messageWrapperThem]}>
        <View style={[styles.messageBubble, isMe ? styles.messageBubbleMe : styles.messageBubbleThem]}>
          {item.audio_url ? (
            <AudioMessage url={item.audio_url} />
          ) : (
            <Text style={[styles.messageText, isMe ? styles.messageTextMe : styles.messageTextThem]}>
              {item.content}
            </Text>
          )}
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
            placeholder={isRecording ? "Recording..." : "Type a message..."}
            placeholderTextColor={isRecording ? "#EF4444" : "#a1a1aa"}
            value={inputText}
            onChangeText={setInputText}
            multiline
            editable={!isRecording}
          />
          {!inputText.trim() ? (
            <TouchableOpacity 
              style={[styles.sendButton, isRecording ? { backgroundColor: '#EF4444' } : null]} 
              onPressIn={startRecording}
              onPressOut={stopRecording}
            >
              <Text style={styles.sendButtonText}>{isRecording ? "🔴" : "🎤"}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.sendButton, (!inputText.trim() || !otherUserId) ? styles.sendButtonDisabled : null]} 
              onPress={sendMessage}
              disabled={!inputText.trim() || !otherUserId}
            >
              <Text style={styles.sendButtonText}>Send</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090B',
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
    borderBottomColor: '#27272A',
    backgroundColor: '#09090B',
  },
  backButton: {
    padding: 8,
    width: 70,
  },
  backText: {
    color: '#A855F7',
    fontSize: 16,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
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
    backgroundColor: '#A855F7',
    borderBottomRightRadius: 4,
  },
  messageBubbleThem: {
    backgroundColor: '#18181B',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  messageTextMe: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  messageTextThem: {
    color: '#FFFFFF',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#09090B',
    borderTopWidth: 1,
    borderTopColor: '#27272A',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#18181B',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    color: '#FFFFFF',
    fontSize: 15,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  sendButton: {
    marginLeft: 12,
    backgroundColor: '#A855F7',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  sendButtonDisabled: {
    backgroundColor: '#27272A',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});