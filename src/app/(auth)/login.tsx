import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";


export default function LoginScreen() {
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
                />
                <TextInput
                    placeholder="password"
                    placeholderTextColor={"#999"}
                    style={styles.passwordInput}
                    secureTextEntry
                    autoCapitalize="none"
                />

                <TouchableOpacity style={styles.button}>
                    <Text style={styles.buttonText}>Login</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.signupText}>
                    <Text style={styles.baseText}>Don't have an account? <Text style={styles.signup}>Sign Up</Text></Text>
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
        backgroundColor: "#4F46E5",
        borderRadius: 12,
        padding: 18,
        alignItems: "center",
        shadowColor: "#4F46E5",
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
    signupText: {
        alignItems: "center",
        marginTop: 32,
    },
    baseText: {
        fontSize: 15,
        color: "#6B7280",
    },
    signup: {
        color: "#4F46E5",
        fontWeight: "bold",
    }
})