import { useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/app/context/AuthProvider';

export const useConversationsRealtime = (fetchConversations: () => void) => {
  const { user } = useAuth();
  
  useEffect(() => {
    if (!user) return;

    const messageSubscription = supabase
      .channel('public:messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        fetchConversations();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, () => {
        fetchConversations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(messageSubscription);
    };
  }, [user, fetchConversations]);
};

export const useChatRealtime = (
  otherUserId: string | null,
  onNewMessage: (message: any) => void
) => {
  const { user } = useAuth();

  useEffect(() => {
    if (!otherUserId || !user) return;
    
    // Listen to ALL inserts on messages and filter client-side to find ones for this DM
    const messageSubscription = supabase
      .channel(`chat_${otherUserId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
      }, payload => {
        const msg = payload.new;
        if (
          (msg.sender_id === user.id && msg.receiver_id === otherUserId) ||
          (msg.sender_id === otherUserId && msg.receiver_id === user.id)
        ) {
          onNewMessage(msg);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(messageSubscription);
    };
  }, [otherUserId, user, onNewMessage]);
};