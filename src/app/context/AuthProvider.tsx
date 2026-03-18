import { createContext, useContext, useState } from "react";
import { supabase } from "@/lib/supabase/client";


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
}
const AuthContext = createContext< AuthContextType | null>(null);


export const AuthProvider = ({children}: {children: React.ReactNode}) => {

    const [ user,setUser ] = useState<User | null>(null);
    const [ loading,setLoading ] = useState<boolean>(false);

    const Signup = async (email: string,password: string) =>{
        setLoading(true);
        try{
            const { data,error } = await supabase.auth.signUp({
                email,
                password
            });

            if(error){
                console.log("error occur due to",error.message);
            }

            // setUser(data?.user);
            console.log(data?.user);
        }catch(error){
            console.log("error occur due to",error);
        }finally{
            setLoading(false);
        }
    }
    const Login = async (email: string,password: string) =>{
        try {
            const { data,error } = await supabase.auth.signInWithPassword({
                email,
                password
            });
            if(error){
                console.log("error occur due to",error.message);
            }
    
            if(data){
                console.log("user logged in successfully",data);
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
        }

        console.log("user logged out successfully");
    }
    return(
        <AuthContext.Provider value={{Signup,Login,Logout,user}}>
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