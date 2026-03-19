import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { generateUsername } from "@/lib/username";

export interface User {
    id: string;
    email: string;
    username: string;
    latitude?: number;
    longitude?: number;
}

interface AuthContextType {
    Signup: (email: string,password: string) => Promise<void>;
    Login: (email: string,password: string) => Promise<void>;
    Logout: () => Promise<void>;
    user: User | null;
    loading: boolean;
}
const AuthContext = createContext< AuthContextType | null>(null);

export default function AuthProvider ({children}: {children: React.ReactNode}) {
    const [ user,setUser ] = useState<User | null>(null);
    const [ loading,setLoading ] = useState<boolean>(true);

    useEffect(() => {
        // Fetch session on load
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                setUser({
                    id: session.user.id,
                    email: session.user.email || '',
                    username: session.user.user_metadata?.username || 'User',
                });
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                setUser({
                    id: session.user.id,
                    email: session.user.email || '',
                    username: session.user.user_metadata?.username || 'User',
                });
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const Signup = async (email: string,password: string) =>{
        setLoading(true);
        const username = generateUsername();
        try{
            const { data,error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        username
                    }
                }
            });

            if(error){
                console.log("error occur due to",error.message);
                throw error;
            }

            if(data?.user) {
                setUser({
                    id: data.user.id,
                    email: data.user.email || email,
                    username: data.user.user_metadata?.username || username,
                });
            }
        }catch(error){
            console.log("error occur due to",error);
        }finally{
            setLoading(false);
        }
    }
    
    const Login = async (email: string,password: string) =>{
        setLoading(true);
        try {
            const { data,error } = await supabase.auth.signInWithPassword({
                email,
                password
            });
            if(error){
                console.log("error occur due to",error.message);
                throw error;
            }
    
            if(data?.user){
                setUser({
                    id: data.user.id,
                    email: data.user.email || email,
                    username: data.user.user_metadata?.username || 'User',
                });
            }
        } catch (error) {
            console.log("error occur due to",error);
        }finally{
            setLoading(false);
        }
    }
    
    const Logout = async () =>{
        const { error } = await supabase.auth.signOut();
        if(error){
            console.log("error occur due to",error.message);
        } else {
            setUser(null);
        }
    }
    
    return(
        <AuthContext.Provider value={{Signup,Login,Logout,user,loading}}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if(!context){
        throw new Error("useAuth must be used within AuthProvider");
    }
    return context;
}