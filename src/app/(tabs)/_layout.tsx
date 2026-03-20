import { Tabs } from "expo-router";

export default function TabLayout() {
    return (
        <Tabs screenOptions={{ headerShown: false }}>
            <Tabs.Screen name="index" options={{ title: "Home" }} />
            <Tabs.Screen name="messages" options={{ title: "Messages" }} />
            <Tabs.Screen name="community" options={{ title: "Community" }} />
            <Tabs.Screen name="chat" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        </Tabs>
    );
}
