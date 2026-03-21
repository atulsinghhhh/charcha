import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  FlatList, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthProvider';
import { useCommunity } from '@/hooks/community';
import * as Location from "expo-location";
import { supabase } from '@/lib/supabase/client';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';

export default function CommunityScreen() {
  const { user } = useAuth();
  const { getorCreateRoom, loadMessages, sendMessage, subscribeToRoom, getRoomsInArea, createCustomRoom, deleteCustomRoom } = useCommunity();
  const params = useLocalSearchParams<{ joinRoomId?: string }>();
  
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [gridKey, setGridKey] = useState<string | null>(null);
  const [hasJoined, setHasJoined] = useState(false);
  
  // Custom Community Modal
  const [isModalVisible, setModalVisible] = useState(false);
  const [newCommunityName, setNewCommunityName] = useState('');
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    initCommunityHub();
  }, []);

  // Watch for external navigation joins from Search Screen
  useEffect(() => {
    if (params.joinRoomId && !loading && !selectedRoom) {
      fetchAndJoinSpecificRoom(params.joinRoomId);
    }
  }, [params.joinRoomId, loading]);

  const fetchAndJoinSpecificRoom = async (roomId: string) => {
    try {
      const { data: room } = await supabase.from('rooms').select('*').eq('id', roomId).single();
      if (room) {
        handleJoinRoom(room);
      }
    } catch (e) {
      console.error("Failed to jump to searched room", e);
    }
  };

  const initCommunityHub = async () => {
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
      setUserLocation({ lat, lng });

      // Ensure the base sector room exists
      const baseRoom = await getorCreateRoom(lat, lng);
      setGridKey(baseRoom.grid_key);

      // Fetch all rooms in area
      await fetchAreaRooms(lat, lng);

    } catch (error) {
      console.error("Community init error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAreaRooms = async (lat: number, lng: number) => {
    try {
        const areaRooms = await getRoomsInArea(lat, lng);
        setRooms(areaRooms);
    } catch (e) {
        console.error("Failed to fetch area rooms", e);
    }
  };

  const handleDeleteCommunity = (room: any) => {
    Alert.alert(
      "Delete Community", 
      `Are you sure you want to delete "${room.name}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => confirmDelete(room.id) }
      ]
    );
  };

  const confirmDelete = async (roomId: string) => {
    try {
      setLoading(true);
      await deleteCustomRoom(roomId);
      if (userLocation) {
        await fetchAreaRooms(userLocation.lat, userLocation.lng);
      }
    } catch (error: any) {
      Alert.alert("Delete Failed", error.message || "Could not delete community");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCommunity = async () => {
    if (!newCommunityName.trim() || !userLocation) return;
    try {
        setLoading(true);
        await createCustomRoom(userLocation.lat, userLocation.lng, newCommunityName.trim(), user?.id);
        setModalVisible(false);
        setNewCommunityName('');
        await fetchAreaRooms(userLocation.lat, userLocation.lng);
    } catch (error: any) {
        if (error.code === '23505') {
            Alert.alert("Unique Constraint Violation", `Database says: ${error.message}\n\nIf it mentions "grid_key", you need to remove the Unique constraint on the grid_key column in Supabase!`);
        } else {
            Alert.alert("Creation Failed", error.message || "Could not create community");
        }
    } finally {
        setLoading(false);
    }
  };

  const handleJoinRoom = async (room: any) => {
    setSelectedRoom(room);
    setLoading(true);
    setHasJoined(false);
    try {
      const msgs = await loadMessages(room.id);
      
      if (msgs.length > 0) {
        const userIds = Array.from(new Set(msgs.map(m => m.sender_id)));
        const { data: profiles } = await supabase.from('profiles').select('id, username').in('id', userIds);
        const profileMap = new Map((profiles || []).map(p => [p.id, p.username]));
        
        const richMsgs = msgs.map(m => ({
          ...m,
          username: profileMap.get(m.sender_id) || 'Anonymous' // Don't crash if username is empty, we handle anonymous automatically
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
    try {
        const { data } = await supabase.from('profiles').select('username').eq('id', userId).single();
        return data?.username || 'Anonymous';
    } catch (e) {
        return 'Anonymous';
    }
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
    if (!selectedRoom || !hasJoined) return;
    const unsubscribe = subscribeToRoom(selectedRoom.id, onNewMessage);
    return () => {
      unsubscribe();
    };
  }, [selectedRoom, hasJoined, onNewMessage]);

  const handleSend = async () => {
    if (!inputText.trim() || !selectedRoom || !user) return;
    const textToSend = inputText.trim();
    setInputText('');
    try {
      await sendMessage(selectedRoom.id, user.id, textToSend);
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
          <Text style={styles.senderName}>{String(item.username || 'Anonymous')}</Text>
        ) : null}
        <View style={[styles.messageBubble, isMe ? styles.messageBubbleMe : styles.messageBubbleThem]}>
          <Text style={[styles.messageText, isMe ? styles.messageTextMe : null]}>
            {String(item.content)}
          </Text>
        </View>
      </View>
    );
  };

  const renderRoomItem = ({ item }: { item: any }) => {
      const roomName = item.name || `Sector ${item.grid_key} Hub`;
      const isDefault = !item.name;
      return (
          <TouchableOpacity style={styles.roomCard} onPress={() => handleJoinRoom(item)}>
              <View style={styles.roomCardIcon}>
                  <Ionicons name={isDefault ? "planet-outline" : "people-outline"} size={24} color="#A855F7" />
              </View>
              <View style={styles.roomCardInfo}>
                  <Text style={styles.roomTitle}>{roomName}</Text>
                  <Text style={styles.roomSubtitle}>{isDefault ? "Local Default Chat" : "Custom Community"}</Text>
              </View>
              
              {!isDefault && item.created_by === user?.id ? (
                  <TouchableOpacity onPress={() => handleDeleteCommunity(item)} style={{ padding: 8 }}>
                      <Ionicons name="trash-outline" size={22} color="#EF4444" />
                  </TouchableOpacity>
              ) : (
                  <Ionicons name="chevron-forward" size={24} color="#A1A1AA" />
              )}
          </TouchableOpacity>
      )
  };

  if (loading && !selectedRoom) {
      return (
          <SafeAreaView style={styles.container}>
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#A855F7" />
              <Text style={styles.loadingText}>Locating your sector...</Text>
            </View>
          </SafeAreaView>
      )
  }

  // ROOMS LIST VIEW
  if (!selectedRoom) {
      const defaultRoom = rooms.find(r => !r.name);
      const customRooms = rooms.filter(r => r.name);

      return (
          <SafeAreaView style={styles.container} edges={["top"]}>
            <View style={styles.header}>
              <View>
                <Text style={styles.headerTitle}>Communities</Text>
                {gridKey ? <Text style={styles.subTitle}>Sector {String(gridKey)}</Text> : null}
              </View>
              <TouchableOpacity style={styles.createButton} onPress={() => setModalVisible(true)}>
                  <Ionicons name="add" size={20} color="#FFFFFF" />
                  <Text style={styles.createBtnText}>Create</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.roomList} showsVerticalScrollIndicator={false}>
                <Text style={styles.sectionTitle}>5km Sector Hub</Text>
                {defaultRoom ? renderRoomItem({ item: defaultRoom }) : null}

                <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Custom Communities</Text>
                {customRooms.length > 0 ? customRooms.map(room => (
                    <View key={room.id}>
                        {renderRoomItem({ item: room })}
                    </View>
                )) : (
                    <Text style={styles.emptySubtitle}>No custom communities in this 5km area yet. Create one!</Text>
                )}
            </ScrollView>

            {/* Create Community Modal */}
            <Modal visible={isModalVisible} transparent animationType="slide">
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>New Local Community</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Enter Community Name"
                            placeholderTextColor="#A1A1AA"
                            value={newCommunityName}
                            onChangeText={setNewCommunityName}
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.modalCancel} onPress={() => setModalVisible(false)}>
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalSubmit} onPress={handleCreateCommunity}>
                                <Text style={styles.modalSubmitText}>Create</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
          </SafeAreaView>
      )
  }

  // CHAT ROOM VIEW
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => setSelectedRoom(null)}>
            <Ionicons name="arrow-back" size={24} color="#A855F7" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text style={styles.headerTitle}>{selectedRoom.name || 'Local Hub'}</Text>
          {gridKey ? <Text style={styles.subTitle}>Sector {String(gridKey)}</Text> : null}
        </View>
      </View>

      <KeyboardAvoidingView 
        style={styles.keyboardAware} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#A855F7" />
            <Text style={styles.loadingText}>Joining...</Text>
          </View>
        ) : !hasJoined ? (
          <View style={styles.joinContainer}>
            <Text style={styles.joinTitle}>Join {selectedRoom.name || 'Local Hub'}</Text>
            <TouchableOpacity style={styles.joinActionBtn} onPress={() => handleJoinRoom(selectedRoom)}>
              <Text style={styles.joinBtnText}>Join Now</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <FlatList
              ref={flatListRef}
              data={messages}
              inverted={true}
              keyExtractor={(item, index) => item.id ? String(item.id) : String(index)}
              renderItem={renderMessage}
              contentContainerStyle={styles.messageList}
              showsVerticalScrollIndicator={false}
            />
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Type to community..."
                placeholderTextColor="#A1A1AA"
                value={inputText}
                onChangeText={setInputText}
                multiline
              />
              <TouchableOpacity 
                style={[styles.sendButton, (!inputText.trim() || !selectedRoom) ? styles.sendButtonDisabled : null]} 
                onPress={handleSend}
                disabled={!inputText.trim() || !selectedRoom}
              >
                <Ionicons name="send" size={18} color={!inputText.trim() ? "#A1A1AA" : "#FFFFFF"} />
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
        backgroundColor: '#09090B' 
    },
    centerContainer: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    loadingText: { 
        color: '#A1A1AA', 
        marginTop: 12 
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#27272A',
        backgroundColor: '#09090B',
    },
    backButton: {
        padding: 4,
    },
    createButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#A855F7',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
    },
    createBtnText: {
        color: '#FFFFFF',
        fontWeight: '700',
        marginLeft: 4,
        fontSize: 13,
    },
    headerTitle: { 
        fontSize: 22, 
        fontWeight: '800', 
        color: '#FFFFFF' 
    },
    subTitle: { 
        fontSize: 13, 
        color: '#00E5FF', 
        fontWeight: '600', 
        marginTop: 2 
    },
    keyboardAware: { flex: 1 },
    roomList: {
        padding: 20,
    },
    sectionTitle: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 12,
        letterSpacing: 0.5,
    },
    emptySubtitle: {
        color: '#A1A1AA',
        fontSize: 14,
        fontStyle: 'italic',
        marginTop: 8,
    },
    roomCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#18181B',
        padding: 16,
        borderRadius: 20,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#27272A',
    },
    roomCardIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#09090B',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#27272A',
        marginRight: 16,
    },
    roomCardInfo: {
        flex: 1,
    },
    roomTitle: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
    },
    roomSubtitle: {
        color: '#A1A1AA',
        fontSize: 13,
    },
    joinContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    joinTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 24,
        textAlign: 'center',
    },
    joinActionBtn: {
        backgroundColor: '#A855F7',
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 30,
    },
    joinBtnText: {
        color: '#FFFFFF',
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
        color: '#A1A1AA', 
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
        backgroundColor: '#A855F7', 
        borderBottomRightRadius: 4 
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
        color: '#FFFFFF' 
    },
    messageTextMe: { 
        color: '#FFFFFF', 
        fontWeight: '600' 
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
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center', 
        marginBottom: 2,
    },
    sendButtonDisabled: { 
        backgroundColor: '#18181B',
        borderWidth: 1,
        borderColor: '#27272A',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(9, 9, 11, 0.8)',
        justifyContent: 'center',
        padding: 24,
    },
    modalContent: {
        backgroundColor: '#18181B',
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: '#27272A',
    },
    modalTitle: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: '800',
        marginBottom: 20,
        textAlign: 'center',
    },
    modalInput: {
        backgroundColor: '#09090B',
        borderRadius: 16,
        padding: 16,
        color: '#FFFFFF',
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#27272A',
        marginBottom: 24,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    modalCancel: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 30,
        backgroundColor: '#27272A',
        alignItems: 'center',
    },
    modalCancelText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 15,
    },
    modalSubmit: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 30,
        backgroundColor: '#A855F7',
        alignItems: 'center',
    },
    modalSubmitText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 15,
    },
});