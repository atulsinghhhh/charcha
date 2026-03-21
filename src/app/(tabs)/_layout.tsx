import { Tabs } from "expo-router";
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
    return (
        <Tabs screenOptions={{ 
            headerShown: false,
            tabBarStyle: {
                backgroundColor: "#09090B",
                borderTopWidth: 1,
                borderTopColor: "#27272A",
                paddingBottom: 5,
                paddingTop: 5,
            },
            tabBarActiveTintColor: "#A855F7",
            tabBarInactiveTintColor: "#A1A1AA",
        }}>
            <Tabs.Screen name="index" options={{ title: "Nearby", tabBarIcon: ({ color }) => <Ionicons name="compass-outline" size={24} color={color} /> }} />
            <Tabs.Screen name="search" options={{ title: "Discover", tabBarIcon: ({ color }) => <Ionicons name="search-outline" size={24} color={color} /> }} />
            <Tabs.Screen name="messages" options={{ title: "Messages", tabBarIcon: ({ color }) => <Ionicons name="chatbubbles-outline" size={24} color={color} /> }} />
            <Tabs.Screen name="community" options={{ title: "Community", tabBarIcon: ({ color }) => <Ionicons name="planet-outline" size={24} color={color} /> }} />
            <Tabs.Screen name="chat" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        </Tabs>
    );
}
