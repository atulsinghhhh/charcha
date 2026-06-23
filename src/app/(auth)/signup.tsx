import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthProvider";
import { useState } from "react";
import { router } from "expo-router";

const AVAILABLE_INTERESTS = ['Tech', 'Gaming', 'Fitness', 'Movies', 'IPL', 'College', 'Startups', 'Food'];

export default function SignupScreen() {
    
    const { Signup } = useAuth();
    const [ email,setEmail ] = useState("");
    const [ password,setPassword ] = useState("");
    const [ selectedInterests, setSelectedInterests ] = useState<string[]>([]);
    const [ loading,setLoading ] = useState(false);

    const toggleInterest = (interest: string) => {
        if (selectedInterests.includes(interest)) {
            setSelectedInterests(prev => prev.filter(i => i !== interest));
        } else {
            if (selectedInterests.length >= 5) {
                Alert.alert("Limit Reached", "You can only select up to 5 interests.");
                return;
            }
            setSelectedInterests(prev => [...prev, interest]);
        }
    };

    const handleSignup = async () =>{
        if (selectedInterests.length < 3) {
            Alert.alert("Interests Required", "Please select at least 3 interests.");
            return;
        }

        setLoading(true);
        try{
            await Signup(email,password, selectedInterests);
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
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
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

                    <Text style={styles.interestLabel}>Pick 3-5 interests</Text>
                    <View style={styles.interestContainer}>
                        {AVAILABLE_INTERESTS.map(interest => {
                            const isSelected = selectedInterests.includes(interest);
                            return (
                                <TouchableOpacity 
                                    key={interest} 
                                    style={[styles.interestChip, isSelected && styles.interestChipSelected]}
                                    onPress={() => toggleInterest(interest)}
                                >
                                    <Text style={[styles.interestText, isSelected && styles.interestTextSelected]}>
                                        {interest}
                                    </Text>
                                </TouchableOpacity>
                            )
                        })}
                    </View>

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
            </ScrollView>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#09090B",
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 40,
    },
    header: {
        marginTop: 60,
        marginBottom: 30,
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
        textAlign: "center",
    },
    form: {
        marginTop: 10,
    },
    emailInput: {
        backgroundColor: "#18181B",
        borderRadius: 20,
        padding: 16,
        fontSize: 16,
        color: "#FFFFFF",
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#27272A",
    },
    passwordInput: {
        backgroundColor: "#18181B",
        borderRadius: 20,
        padding: 16,
        fontSize: 16,
        color: "#FFFFFF",
        marginBottom: 20,
        borderWidth: 1,
        borderColor: "#27272A",
    },
    interestLabel: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "600",
        marginBottom: 12,
        marginLeft: 4,
    },
    interestContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
        marginBottom: 32,
    },
    interestChip: {
        backgroundColor: "#18181B",
        borderRadius: 20,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: "#27272A",
    },
    interestChipSelected: {
        backgroundColor: "#A855F7",
        borderColor: "#A855F7",
    },
    interestText: {
        color: "#A1A1AA",
        fontWeight: "600",
    },
    interestTextSelected: {
        color: "#FFFFFF",
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
    loginText: {
        alignItems: "center",
        marginTop: 32,
    },
    baseText: {
        fontSize: 15,
        color: "#A1A1AA",
    },
    login: {
        color: "#A855F7",
        fontWeight: "bold",
    }
})