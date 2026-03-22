import React, { useEffect, useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthProvider";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "expo-router";
import { useConversationsRealtime } from "@/hooks/realtime";

const UserIcon = () => <Text style={{fontSize: 24}}>👤</Text>;

export default function MessagesScreen() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchConversations = useCallback(async () => {
    if (!user) {
        setLoading(false);
        return;
    }
    try {
      const { data: msgs, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .is('room_id', null)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(500);

      if (msgError) throw msgError;

      if (!msgs || msgs.length === 0) {
        setConversations([]);
        return;
      }

      // Group by counterparty
      const convMap = new Map();
      msgs.forEach(msg => {
        const otherId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        if (!convMap.has(otherId)) {
          convMap.set(otherId, {
            other_user_id: otherId,
            last_message: msg.content,
            last_message_time: msg.created_at,
            unread_count: 0
          });
        }
        if (msg.receiver_id === user.id && !msg.is_read) {
          convMap.get(otherId).unread_count += 1;
        }
      });

      const uniqueUserIds = Array.from(convMap.keys()).filter(Boolean);
      
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', uniqueUserIds);

      if (profileError) throw profileError;

      const profileMap = new Map((profiles || []).map(p => [p.id, p.username]));
      // console.log(profileMap);

      const formatedConvs = Array.from(convMap.values()).map(c => ({
        ...c,
        other_username: profileMap.get(c.other_user_id) || "Anonymous User",
      }));

      // console.log(formatedConvs);
      // Map iterators ordered by insertion, which is from latest msg down, so already sorted by time!
      setConversations(formatedConvs);
      
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useConversationsRealtime(fetchConversations);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchConversations();
  }, [fetchConversations]);

  const navigateToChat = (item: any) => {
    router.push({
      pathname: "/chat" as any,
      params: { 
        userId: item.other_user_id, 
        username: item.other_username 
      }
    });
  };

  const formatTime = (isoString: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const renderConversationItem = ({ item }: { item: any }) => {
    const isUnread = item.unread_count > 0;
    
    return (
      <TouchableOpacity 
        style={styles.card} 
        onPress={() => navigateToChat(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardAvatar}>
           <UserIcon />
        </View>
        <View style={styles.cardInfo}>
          <View style={styles.cardHeader}>
            <Text style={[styles.username, isUnread ? styles.usernameUnread : null]}>
              {String(item.other_username)}
            </Text>
            <Text style={[styles.timeText, isUnread ? styles.timeTextUnread : null]}>
              {String(formatTime(item.last_message_time))}
            </Text>
          </View>
          <View style={styles.cardFooter}>
            <Text 
              style={[styles.lastMessage, isUnread ? styles.lastMessageUnread : null]} 
              numberOfLines={1}
            >
              {String(item.last_message || "Started a conversation")}
            </Text>
            {isUnread ? (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>
                  {String(item.unread_count > 99 ? '99+' : item.unread_count)}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>💬</Text>
        <Text style={styles.emptyText}>No messages yet</Text>
        <Text style={styles.emptySubtext}>Find people nearby to start chatting!</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#4ade80" />
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => String(item.other_user_id)}
          renderItem={renderConversationItem}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              tintColor="#4ade80" 
              colors={["#4ade80"]} 
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    flexGrow: 1,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#1c1c20",
  },
  cardAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#27272a",
    justifyContent: "center",
    alignItems: "center",
  },
  cardInfo: {
    marginLeft: 16,
    flex: 1,
    justifyContent: "center",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  username: {
    fontSize: 17,
    fontWeight: "600",
    color: "#f4f4f5",
  },
  usernameUnread: {
    fontWeight: "800",
  },
  timeText: {
    fontSize: 13,
    color: "#a1a1aa",
  },
  timeTextUnread: {
    color: "#4ade80",
    fontWeight: "600",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  lastMessage: {
    fontSize: 15,
    color: "#a1a1aa",
    flex: 1,
    marginRight: 16,
  },
  lastMessageUnread: {
    color: "#f4f4f5",
    fontWeight: "600",
  },
  unreadBadge: {
    backgroundColor: "#4ade80",
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: "#18181b",
    fontSize: 12,
    fontWeight: "800",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
  },
  emptyEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 20,
    color: "#f4f4f5",
    fontWeight: "700",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: "#a1a1aa",
  },
});
