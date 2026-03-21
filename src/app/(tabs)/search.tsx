import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  FlatList, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase/client';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function SearchScreen() {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'users' | 'communities'>('users');
    
    // Results
    const [users, setUsers] = useState<any[]>([]);
    const [communities, setCommunities] = useState<any[]>([]);

    useEffect(() => {
        if (query.trim().length > 1) {
            handleSearch();
        } else {
            setUsers([]);
            setCommunities([]);
        }
    }, [query, activeTab]);

    const handleSearch = async () => {
        setLoading(true);
        try {
            if (activeTab === 'users') {
                const { data } = await supabase
                    .from('profiles')
                    .select('id, username')
                    .ilike('username', `%${query}%`)
                    .limit(20);
                setUsers(data || []);
            } else {
                const { data } = await supabase
                    .from('rooms')
                    .select('*')
                    .ilike('name', `%${query}%`)
                    .limit(20);
                setCommunities(data || []);
            }
        } catch (error) {
            console.error("Search error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleUserPress = (user: any) => {
        router.push({
            pathname: "/chat" as any,
            params: { 
              userId: user.id, 
              username: user.username 
            }
        });
    };

    const handleCommunityPress = (room: any) => {
        // Navigate to the community tab and pass the roomId to auto-join
        router.push({
            pathname: "/community" as any,
            params: { joinRoomId: room.id }
        });
    };

    const renderUser = ({ item }: { item: any }) => (
        <TouchableOpacity style={styles.card} onPress={() => handleUserPress(item)}>
            <View style={styles.cardAvatar}>
                <Ionicons name="person" size={20} color="#00E5FF" />
            </View>
            <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{item.username || 'Anonymous User'}</Text>
                <Text style={styles.cardSubtitle}>User Profile</Text>
            </View>
            <Ionicons name="chatbubble-ellipses" size={22} color="#A855F7" />
        </TouchableOpacity>
    );

    const renderCommunity = ({ item }: { item: any }) => (
        <TouchableOpacity style={styles.card} onPress={() => handleCommunityPress(item)}>
            <View style={styles.cardAvatar}>
                <Ionicons name="planet" size={24} color="#A855F7" />
            </View>
            <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardSubtitle}>Sector {item.grid_key}</Text>
            </View>
            <Ionicons name="arrow-forward" size={22} color="#A1A1AA" />
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Discover</Text>
            </View>

            <View style={styles.searchSection}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color="#A1A1AA" />
                    <TextInput 
                        style={styles.searchInput}
                        placeholder={`Search ${activeTab}...`}
                        placeholderTextColor="#A1A1AA"
                        value={query}
                        onChangeText={setQuery}
                        autoCapitalize="none"
                    />
                    {query.length > 0 && (
                        <TouchableOpacity onPress={() => setQuery('')}>
                            <Ionicons name="close-circle" size={20} color="#A1A1AA" />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Tabs */}
                <View style={styles.tabsContainer}>
                    <TouchableOpacity 
                        style={[styles.tab, activeTab === 'users' && styles.activeTab]}
                        onPress={() => setActiveTab('users')}
                    >
                        <Text style={[styles.tabText, activeTab === 'users' && styles.activeTabText]}>Users</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.tab, activeTab === 'communities' && styles.activeTab]}
                        onPress={() => setActiveTab('communities')}
                    >
                        <Text style={[styles.tabText, activeTab === 'communities' && styles.activeTabText]}>Communities</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.listContainer}>
                {loading ? (
                    <ActivityIndicator size="large" color="#A855F7" style={{ marginTop: 40 }} />
                ) : (
                    <FlatList
                        data={activeTab === 'users' ? users : communities}
                        keyExtractor={(item) => String(item.id)}
                        renderItem={activeTab === 'users' ? renderUser : renderCommunity}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={() => (
                            <View style={styles.emptyContainer}>
                                <Ionicons name="search-outline" size={48} color="#27272A" />
                                <Text style={styles.emptyText}>
                                    {query.length < 2 ? `Type to search for ${activeTab}` : `No ${activeTab} found`}
                                </Text>
                            </View>
                        )}
                    />
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#09090B',
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 8,
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    searchSection: {
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#27272A',
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#18181B',
        borderRadius: 24,
        paddingHorizontal: 16,
        height: 48,
        borderWidth: 1,
        borderColor: '#27272A',
        marginBottom: 16,
    },
    searchInput: {
        flex: 1,
        color: '#FFFFFF',
        fontSize: 16,
        marginLeft: 10,
    },
    tabsContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 20,
        backgroundColor: '#18181B',
        borderWidth: 1,
        borderColor: '#27272A',
    },
    activeTab: {
        backgroundColor: '#A855F7',
        borderColor: '#A855F7',
    },
    tabText: {
        color: '#A1A1AA',
        fontWeight: '600',
        fontSize: 14,
    },
    activeTabText: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    listContainer: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 16,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#18181B',
        padding: 16,
        borderRadius: 20,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#27272A',
    },
    cardAvatar: {
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
    cardInfo: {
        flex: 1,
    },
    cardTitle: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
    },
    cardSubtitle: {
        color: '#A1A1AA',
        fontSize: 13,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingTop: 60,
    },
    emptyText: {
        color: '#A1A1AA',
        marginTop: 16,
        fontSize: 16,
    }
});
