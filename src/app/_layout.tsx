import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import AuthProvider, { useAuth } from "./context/AuthProvider";

const InitialLayout = () => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (user && inAuthGroup) {
      // If logged in but trying to access auth screens, redirect to tabs
      router.replace("/(tabs)");
    } else if (!user && !inAuthGroup) {
      // If not logged in but trying to access non-auth screens, redirect to login
      router.replace("/(auth)/login");
    }
  }, [user, loading, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
};

export default function RootLayout() {
  return (
    <AuthProvider>
      <InitialLayout />
    </AuthProvider>
  );
}
