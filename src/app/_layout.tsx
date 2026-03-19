import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import AuthProvider from "./context/AuthProvider";

export default function RootLayout() {

  const isAuth=false;
  const router = useRouter();
  useEffect(() => {
    if(isAuth){
      router.replace("/(tabs)");
    }else{
      router.replace("/(auth)/login");
    }
  }, [isAuth]);
  return(
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </AuthProvider>
  )
}
