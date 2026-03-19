import { Tabs } from "expo-router";

export default function TabLayout() {
    return (
        <Tabs screenOptions={{ headerShown: false }}>
            <Tabs.Screen name="index" options={{ title: "Home" }} />
            {/* Hide 'chat' from the tab bar since it's a detail screen */}
            <Tabs.Screen name="chat" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        </Tabs>
    );
}
