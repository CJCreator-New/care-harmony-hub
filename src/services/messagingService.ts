import { supabase } from '@/integrations/supabase/client';

export interface Message {
  id: string;
  from_user_id: string;
  to_user_id: string;
  subject: string;
  body: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  read: boolean;
  created_at: string;
}

export const messagingService = {
  async sendMessage(message: Omit<Message, 'id' | 'created_at' | 'read'>) {
    const { data, error } = await supabase
      .from('messages')
      .insert([{ ...message, read: false }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getMessages(userId: string) {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('to_user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async markAsRead(messageId: string) {
    const { error } = await supabase
      .from('messages')
      .update({ read: true })
      .eq('id', messageId);

    if (error) throw error;
  }
};
