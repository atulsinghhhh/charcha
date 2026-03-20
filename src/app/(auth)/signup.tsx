import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthProvider";
import { useState } from "react";
import { router } from "expo-router";


export default function SignupScreen() {
    
    const { Signup } = useAuth();
    const [ email,setEmail ] = useState("");
    const [ password,setPassword ] = useState("");
    const [ loading,setLoading ] = useState(false);

    const handleSignup = async () =>{
        setLoading(true);
        try{
            await Signup(email,password);
            router.push("/login");
        }catch(error: any) {
            console.log("error occur due to",error);
            Alert.alert("Signup Failed", error.message || "An error occurred");
        }finally{
            setLoading(false);
        }
    }
    return(
        <SafeAreaView edges={["top","bottom"]} style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Create your account</Text>
                <Text style={styles.subtitle}>Join Charcha and connect with people around you</Text>
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
                    onPress={handleSignup}>
                    <Text style={styles.buttonText}>
                        {loading ? "Creating account..." : "Sign Up"}
                    </Text>  
                </TouchableOpacity>

                <TouchableOpacity style={styles.loginText}>
                    <Text style={styles.baseText}>Already have an account? <Text 
                        style={styles.login}
                        onPress={() => router.push("/login")}
                    >
                        Login
                    </Text></Text>
                </TouchableOpacity>
            </View>

        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFFFFF",
        paddingHorizontal: 24,
    },
    header: {
        marginTop: 80,
        marginBottom: 40,
    },
    title: {
        fontSize: 32,
        fontWeight: "bold",
        color: "#111827",
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: "#6B7280",
    },
    form: {
        marginTop: 20,
    },
    emailInput: {
        backgroundColor: "#F3F4F6",
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: "#111827",
        marginBottom: 16,
    },
    passwordInput: {
        backgroundColor: "#F3F4F6",
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: "#111827",
        marginBottom: 24,
    },
    button: {
        backgroundColor: "#0d0e0eff",
        borderRadius: 12,
        padding: 18,    
        alignItems: "center",
        shadowColor: "#0d0e0eff",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "bold",
    },
    loginText: {
        alignItems: "center",
        marginTop: 32,
    },
    baseText: {
        fontSize: 15,
        color: "#6B7280",
    },
    login: {
        color: "#4F46E5",
        fontWeight: "bold",
    }
})