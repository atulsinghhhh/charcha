import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthProvider";
import { useState } from "react";
import { router } from "expo-router";


export default function LoginScreen() {
    const { Login } = useAuth();
    const [ email,setEmail ] = useState("");
    const [ password,setPassword ] = useState("");
    const [ loading,setLoading ] = useState(false);

    const handleLogin = async () =>{
        setLoading(true);
        try{
            await Login(email,password);
            router.push("/(tabs)");
        }catch(error: any){
            console.log("error occur due to",error);
            Alert.alert("Login Failed", error.message || "An error occurred");
        }finally{
            setLoading(false);
        }
    }
    return(
        <SafeAreaView edges={["top","bottom"]} style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Welcome back</Text>
                <Text style={styles.subtitle}>Login to your account</Text>
            </View>

            <View style={styles.form}>
                <TextInput
                    placeholder="email"
                    placeholderTextColor={"#999"}
                    style={styles.emailInput}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                />
                <TextInput
                    placeholder="password"
                    placeholderTextColor={"#999"}
                    style={styles.passwordInput}
                    secureTextEntry
                    autoCapitalize="none"
                    value={password}
                    onChangeText={setPassword}
                />

                <TouchableOpacity 
                    disabled={loading}
                    style={styles.button} 
                    onPress={handleLogin}>
                    <Text style={styles.buttonText}
                        disabled={loading}
                    >
                        {loading ? "Logging in..." : "Login"}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={styles.signupText}
                    onPress={() => router.push("/signup")}
                >
                    <Text style={styles.baseText}>Don't have an account? <Text style={styles.signup}>Sign Up</Text></Text>
                </TouchableOpacity>
            </View>

        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#09090B",
        paddingHorizontal: 24,
    },
    header: {
        marginTop: 80,
        marginBottom: 40,
        alignItems: "center",
    },
    title: {
        fontSize: 32,
        fontWeight: "bold",
        color: "#FFFFFF",
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: "#A1A1AA",
    },
    form: {
        marginTop: 20,
    },
    emailInput: {
        backgroundColor: "#18181B",
        borderRadius: 30,
        padding: 16,
        fontSize: 16,
        color: "#FFFFFF",
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#27272A",
    },
    passwordInput: {
        backgroundColor: "#18181B",
        borderRadius: 30,
        padding: 16,
        fontSize: 16,
        color: "#FFFFFF",
        marginBottom: 24,
        borderWidth: 1,
        borderColor: "#27272A",
    },
    button: {
        backgroundColor: "#A855F7",
        borderRadius: 30,
        padding: 18,
        alignItems: "center",
        shadowColor: "#A855F7",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    buttonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "bold",
    },
    signupText: {
        alignItems: "center",
        marginTop: 32,
    },
    baseText: {
        fontSize: 15,
        color: "#a1a1aa",
    },
    signup: {
        color: "#A855F7",
        fontWeight: "bold",
    }
})