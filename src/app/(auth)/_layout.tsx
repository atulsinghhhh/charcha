import { Stack } from "expo-router";

export function AuthLayout() {
    return(
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="login" />
            <Stack.Screen name="signup" />
        </Stack>
    )
}