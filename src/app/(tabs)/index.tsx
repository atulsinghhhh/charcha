import React, { useEffect, useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthProvider";
import * as Location from "expo-location";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "expo-router";
import { getGridKey } from "@/lib/community";

// Temporary until ionic or other icons are added.
const UserIcon = () => <Text style={{fontSize: 24}}>👤</Text>;

export default function Index() {
  const { user, Logout } = useAuth();
  const router = useRouter();

  const [nearbyUsers, setNearbyUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [radiusKm, setRadiusKm] = useState<number>(10); 
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    if (user) {
      initializeLocationAndFetch(user.id);
    }
  }, [user, radiusKm]);

  useEffect(() => {
    if (userLocation && user) {
      fetchNearbyUsers(userLocation.lat, userLocation.lng, radiusKm, user.id);
    }
  }, [radiusKm]);

  const initializeLocationAndFetch = async (userId: string) => {
    setLoading(true);
    const location = await getLocationAndUpdateProfile(userId);
    if (location) {
      await fetchNearbyUsers(location.lat, location.lng, radiusKm, userId);
    }
    setLoading(false);
  };

  const onRefresh = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    const location = await getLocationAndUpdateProfile(user.id);
    if (location) {
      await fetchNearbyUsers(location.lat, location.lng, radiusKm, user.id);
    }
    setRefreshing(false);
  }, [radiusKm, user]);

  const getLocationAndUpdateProfile = async (userId: string): Promise<{lat: number, lng: number} | null> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Location permission is required to find nearby users.");
        return null;
      }

      const location = await Location.getCurrentPositionAsync({});
      const lat = location.coords.latitude;
      const lng = location.coords.longitude;
      
      setUserLocation({ lat, lng });

      const { error } = await supabase.from("profiles").update({
        latitude: lat,
        longitude: lng,
      }).eq("id", userId);

      if (error) {
        console.error("Error updating location:", error);
      }

      return { lat, lng };
    } catch (error) {
      console.error("Error getting location:", error);
      Alert.alert("Error", "Could not get your location.");
      return null;
    }
  };

  const fetchNearbyUsers = async (lat: number, lng: number, radius: number, userId: string) => {
    try {
      const { data, error } = await supabase.rpc("get_nearby_users", {
        user_lat: lat,
        user_lng: lng,
        radius: radius,
      });

      // console.log(data);
      if (error) throw error;
      
      const filteredData = (data || []).filter((u: any) => u.id !== userId);
      setNearbyUsers(filteredData);
    } catch (error) {
      console.error("Error fetching nearby users:", error);
    }
  };

  const navigateToChat = (selectedUser: any) => {
    router.push({
      pathname: "/chat" as any,
      params: { 
        userId: selectedUser.id, 
        username: selectedUser.username 
      }
    });
  };

  const renderRadiusChips = () => {
    const options = [5, 10];
    return (
      <View style={styles.chipContainer}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[styles.chip, radiusKm === opt && styles.chipActive]}
            onPress={() => setRadiusKm(opt)}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, radiusKm === opt && styles.chipTextActive]}>
              {opt} km
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderCommunityCard = () => {
    if (!userLocation) return null;
    const gridKey = getGridKey(userLocation.lat, userLocation.lng);
    
    return (
      <TouchableOpacity 
        style={styles.communityCard} 
        onPress={() => router.push("/community" as any)}
        activeOpacity={0.8}
      >
        <View style={styles.communityCardContent}>
          <Text style={styles.communityEmoji}>🌍</Text>
          <View style={styles.communityTextContent}>
            <Text style={styles.communityTitle}>Sector {String(gridKey)} Hub</Text>
            <Text style={styles.communitySubtitle}>Join the local conversation</Text>
          </View>
        </View>
        <Text style={styles.communityArrow}>→</Text>
      </TouchableOpacity>
    );
  };

  const renderUserCard = ({ item }: { item: any }) => {
    // Format distance: 1 decimal place
    const distanceText = (item.dist_km !== undefined && item.dist_km !== null) 
      ? `${Number(item.dist_km).toFixed(1)} km away` 
      : "Unknown distance";
    // console.log(distanceText);
    
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
          <Text style={styles.username}>{item.username || "Anonymous User"}</Text>
          <Text style={styles.distance}>{distanceText}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>😢</Text>
        <Text style={styles.emptyText}>No users nearby</Text>
        <Text style={styles.emptySubtext}>Try expanding your radius!</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Nearby Users </Text>
        <TouchableOpacity onPress={Logout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filtersWrapper}>
        <Text style={styles.filterLabel}>Search Radius</Text>
        {renderRadiusChips()}
      </View>

      {renderCommunityCard()}

      {loading && !refreshing ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#4ade80" />
          <Text style={styles.loaderText}>Finding people around you...</Text>
        </View>
      ) : (
          <FlatList
          data={nearbyUsers}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderUserCard}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              tintColor="#A855F7" 
              colors={["#A855F7"]} 
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
    backgroundColor: "#09090B",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  logoutButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#18181B",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#27272A",
  },
  logoutText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 13,
  },
  filtersWrapper: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  filterLabel: {
    color: "#9ca3af",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  communityCard: {
    marginHorizontal: 24,
    marginBottom: 20,
    backgroundColor: '#A855F7',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  communityCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  communityEmoji: {
    fontSize: 28,
    marginRight: 12,
  },
  communityTextContent: {
    justifyContent: 'center',
  },
  communityTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
  },
  communitySubtitle: {
    color: '#E9D5FF',
    fontSize: 13,
    fontWeight: '600',
  },
  communityArrow: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },
  chipContainer: {
    flexDirection: "row",
    gap: 12,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 24,
    backgroundColor: "#18181B",
    borderWidth: 1,
    borderColor: "#27272A",
  },
  chipActive: {
    backgroundColor: "#A855F7",
    borderColor: "#A855F7",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#A1A1AA",
  },
  chipTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loaderText: {
    marginTop: 16,
    color: "#9ca3af",
    fontSize: 16,
  },
  listContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    flexGrow: 1,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#18181B",
    padding: 16,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#27272A",
  },
  cardAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#09090B",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#27272A",
  },
  cardInfo: {
    marginLeft: 16,
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  distance: {
    fontSize: 13,
    color: "#00E5FF",
    fontWeight: "600",
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
