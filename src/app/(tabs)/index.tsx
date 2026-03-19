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

// Temporary until ionic or other icons are added.
const UserIcon = () => <Text style={{fontSize: 24}}>👤</Text>;

export default function Index() {
  const { user } = useAuth();
  const router = useRouter();

  const [nearbyUsers, setNearbyUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [radiusKm, setRadiusKm] = useState<number>(10); // 5, 10, 20
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);

  // Initial fetch and permissions
  useEffect(() => {
    if (user) {
      initializeLocationAndFetch();
    }
  }, [user]);

  // Refetch when radius changes, if we already have location
  useEffect(() => {
    if (userLocation) {
      fetchNearbyUsers(userLocation.lat, userLocation.lng, radiusKm);
    }
  }, [radiusKm]);

  const initializeLocationAndFetch = async () => {
    setLoading(true);
    const loc = await getLocationAndUpdateProfile();
    if (loc) {
      await fetchNearbyUsers(loc.lat, loc.lng, radiusKm);
    }
    setLoading(false);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const loc = await getLocationAndUpdateProfile();
    if (loc) {
      await fetchNearbyUsers(loc.lat, loc.lng, radiusKm);
    }
    setRefreshing(false);
  }, [radiusKm]);

  const getLocationAndUpdateProfile = async (): Promise<{lat: number, lng: number} | null> => {
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

      // Update in profiles table (or users if your schema requires it)
      const { error } = await supabase.from("profiles").update({
        latitude: lat,
        longitude: lng,
      }).eq("id", user?.id);

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

  const fetchNearbyUsers = async (lat: number, lng: number, radius: number) => {
    try {
      const { data, error } = await supabase.rpc("get_nearby_users", {
        user_lat: lat,
        user_lng: lng,
        radius: radius,
      });

      if (error) throw error;
      
      // Filter out the current user if the RPC doesn't do it
      const filteredData = (data || []).filter((u: any) => u.id !== user?.id);
      setNearbyUsers(filteredData);
    } catch (error) {
      console.error("Error fetching nearby users:", error);
      // Alert.alert("Error", "Could not fetch nearby users.");
    }
  };

  const navigateToChat = (selectedUser: any) => {
    // Navigate to chat bypassing expo-router strict type errors
    // Since 'chat' is in the (tabs) folder, its route path is '/chat' automatically via expo routing
    router.push({
      pathname: "/chat" as any,
      params: { 
        userId: selectedUser.id, 
        username: selectedUser.username 
      }
    });
  };

  const renderRadiusChips = () => {
    const options = [5, 10, 20];
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

  const renderUserCard = ({ item }: { item: any }) => {
    // Format distance: 1 decimal place
    const distanceText = item.dist_km ? `${Number(item.dist_km).toFixed(1)} km away` : "Unknown distance";
    
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
        <Text style={styles.title}>Nearby Users 🔥</Text>
      </View>

      <View style={styles.filtersWrapper}>
        <Text style={styles.filterLabel}>Search Radius</Text>
        {renderRadiusChips()}
      </View>

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
    backgroundColor: "#121212", // Dark theme background
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
  chipContainer: {
    flexDirection: "row",
    gap: 12,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 24,
    backgroundColor: "#27272a",
    borderWidth: 1,
    borderColor: "#3f3f46",
  },
  chipActive: {
    backgroundColor: "#4ade80", // Modern green
    borderColor: "#4ade80",
  },
  chipText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#a1a1aa",
  },
  chipTextActive: {
    color: "#18181b", // Dark text on light green bg
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
    backgroundColor: "#1c1c20",
    padding: 16,
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#2a2a35",
  },
  cardAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#3f3f46",
    justifyContent: "center",
    alignItems: "center",
  },
  cardInfo: {
    marginLeft: 16,
    flex: 1,
  },
  username: {
    fontSize: 18,
    fontWeight: "700",
    color: "#f4f4f5",
    marginBottom: 4,
  },
  distance: {
    fontSize: 14,
    color: "#a1a1aa",
    fontWeight: "500",
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
