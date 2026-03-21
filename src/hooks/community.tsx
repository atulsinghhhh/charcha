import { getGridKey } from "@/lib/community"
import { supabase } from "@/lib/supabase/client";

export const useCommunity = () => {

    const getorCreateRoom = async (lat: number,lng: number) => {
        const gridKey = getGridKey(lat,lng);

        // check if room exists
        const { data: exisitingRoom } = await supabase.from("rooms").select("*").eq("grid_key",gridKey).is("name", null).maybeSingle();
        if(exisitingRoom) return exisitingRoom;

        // create room
        const { data: newRoom, error: createError } = await supabase
            .from("rooms")
            .insert([{
                grid_key: gridKey,
                latitude: lat,
                longitude: lng
            }])
            .select()
            .single();

        if(createError) throw createError;
        return newRoom;
    }

    const loadMessages = async(roomId: string)=>{
        const { data, error } = await supabase
            .from("messages")
            .select("*")
            .eq("room_id",roomId)
            .order("created_at",{ ascending: false })
            .limit(50);

        if(error) throw error;
        return data || [];
    }

    const sendMessage = async(roomId: string,userId: string,content: string)=>{
        const { error } = await supabase
            .from("messages")
            .insert([
                {
                    room_id: roomId,
                    sender_id: userId,
                    content: content
                }
            ]);

        if(error) throw error;
    }

    const subscribeToRoom = (roomId: string,onNewMessage: (message: any) => void)=>{
        const subscription = supabase
            .channel(`room_${roomId}`)
            .on("postgres_changes",{
                event: "INSERT",
                schema: "public",
                table: "messages",
                filter: `room_id=eq.${roomId}`
            },payload => {
                onNewMessage(payload.new);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        }
    }

    const createCustomRoom = async (lat: number, lng: number, name: string, userId?: string) => {
        const gridKey = getGridKey(lat, lng);
        const insertObj: any = {
            grid_key: gridKey,
            latitude: lat,
            longitude: lng,
            name: name
        };
        if (userId) {
            insertObj.created_by = userId;
        }

        const { data: newRoom, error } = await supabase
            .from("rooms")
            .insert([insertObj])
            .select()
            .single();

        if(error) throw error;
        return newRoom;
    }

    const getRoomsInArea = async (lat: number, lng: number) => {
        const gridKey = getGridKey(lat, lng);
        const { data, error } = await supabase
            .from("rooms")
            .select("*")
            .eq("grid_key", gridKey)
            .order("created_at", { ascending: false });

        if(error) throw error;
        return data || [];
    }

    const deleteCustomRoom = async (roomId: string) => {
        const { error } = await supabase.from("rooms").delete().eq("id", roomId);
        if (error) throw error;
    }

    return { getorCreateRoom, loadMessages, sendMessage, subscribeToRoom, createCustomRoom, getRoomsInArea, deleteCustomRoom }
}