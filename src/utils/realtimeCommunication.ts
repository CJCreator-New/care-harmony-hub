import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  read_at?: string;
}

export interface Presence {
  user_id: string;
  status: 'online' | 'offline' | 'away';
  last_seen: string;
  current_location?: string;
}

export interface Collaboration {
  id: string;
  entity_type: string;
  entity_id: string;
  user_id: string;
  action: string;
  timestamp: string;
}

class RealtimeCommunication {
  private static instance: RealtimeCommunication;
  private channels: Map<string, RealtimeChannel> = new Map();
  private presenceMap: Map<string, Presence> = new Map();
  private messageCallbacks: Map<string, (msg: Message) => void> = new Map();
  private presenceCallbacks: Map<string, (presence: Presence) => void> = new Map();
  private collaborationCallbacks: Map<string, (collab: Collaboration) => void> = new Map();

  private constructor() {}

  static getInstance(): RealtimeCommunication {
    if (!RealtimeCommunication.instance) {
      RealtimeCommunication.instance = new RealtimeCommunication();
    }
    return RealtimeCommunication.instance;
  }

  subscribeToMessages(userId: string, callback: (msg: Message) => void): () => void {
    const channelName = `messages:${userId}`;
    this.messageCallbacks.set(userId, callback);

    const channel = supabase.channel(channelName).on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `recipient_id=eq.${userId}`,
      },
      (payload) => {
        const message = payload.new as Message;
        callback(message);
        this.saveMessage(message);
      }
    );

    channel.subscribe();
    this.channels.set(channelName, channel);

    return () => {
      channel.unsubscribe();
      this.channels.delete(channelName);
      this.messageCallbacks.delete(userId);
    };
  }

  subscribeToPresence(hospitalId: string, callback: (presence: Presence) => void): () => void {
    const channelName = `presence:${hospitalId}`;
    this.presenceCallbacks.set(hospitalId, callback);

    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: true } },
    });

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      Object.values(state).forEach((presences) => {
        presences.forEach((p) => {
          const presence = p as unknown as Presence;
          this.presenceMap.set(presence.user_id, presence);
          callback(presence);
        });
      });
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        const userId = (await supabase.auth.getUser()).data.user?.id;
        if (userId) {
          channel.track({
            user_id: userId,
            status: 'online',
            last_seen: new Date().toISOString(),
          });
        }
      }
    });

    this.channels.set(channelName, channel);

    return () => {
      channel.unsubscribe();
      this.channels.delete(channelName);
      this.presenceCallbacks.delete(hospitalId);
    };
  }

  subscribeToCollaboration(entityId: string, callback: (collab: Collaboration) => void): () => void {
    const channelName = `collaboration:${entityId}`;
    this.collaborationCallbacks.set(entityId, callback);

    const channel = supabase.channel(channelName).on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'collaboration_events',
        filter: `entity_id=eq.${entityId}`,
      },
      (payload) => {
        const collab = payload.new as Collaboration;
        callback(collab);
      }
    );

    channel.subscribe();
    this.channels.set(channelName, channel);

    return () => {
      channel.unsubscribe();
      this.channels.delete(channelName);
      this.collaborationCallbacks.delete(entityId);
    };
  }

  async sendMessage(senderId: string, recipientId: string, content: string): Promise<Message | null> {
    const { data, error } = await supabase.from('messages').insert({
      sender_id: senderId,
      recipient_id: recipientId,
      content,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Failed to send message:', error);
      return null;
    }

    return data?.[0] as Message;
  }

  async getConversation(userId1: string, userId2: string, limit: number = 50): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${userId1},recipient_id.eq.${userId2}),and(sender_id.eq.${userId2},recipient_id.eq.${userId1})`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to fetch conversation:', error);
      return [];
    }

    return (data || []) as Message[];
  }

  async markMessageAsRead(messageId: string): Promise<boolean> {
    const { error } = await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('id', messageId);

    return !error;
  }

  async getUnreadCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', userId)
      .is('read_at', null);

    return error ? 0 : count || 0;
  }

  async updatePresence(userId: string, status: 'online' | 'offline' | 'away', location?: string): Promise<void> {
    const presence: Presence = {
      user_id: userId,
      status,
      last_seen: new Date().toISOString(),
      current_location: location,
    };

    this.presenceMap.set(userId, presence);

    const channel = Array.from(this.channels.values()).find((c) => c.topic.includes('presence'));
    if (channel) {
      channel.track(presence);
    }
  }

  getPresence(userId: string): Presence | undefined {
    return this.presenceMap.get(userId);
  }

  getAllPresence(): Presence[] {
    return Array.from(this.presenceMap.values());
  }

  async logCollaborationEvent(
    userId: string,
    entityType: string,
    entityId: string,
    action: string
  ): Promise<void> {
    await supabase.from('collaboration_events').insert({
      user_id: userId,
      entity_type: entityType,
      entity_id: entityId,
      action,
      timestamp: new Date().toISOString(),
    });
  }

  private async saveMessage(message: Message): Promise<void> {
    await supabase.from('message_history').insert({
      message_id: message.id,
      sender_id: message.sender_id,
      recipient_id: message.recipient_id,
      content: message.content,
      created_at: message.created_at,
    });
  }

  unsubscribeAll(): void {
    this.channels.forEach((channel) => channel.unsubscribe());
    this.channels.clear();
    this.messageCallbacks.clear();
    this.presenceCallbacks.clear();
    this.collaborationCallbacks.clear();
  }
}

export const realtimeCommunication = RealtimeCommunication.getInstance();
