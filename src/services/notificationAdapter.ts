import { supabase } from '@/integrations/supabase/client';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent' | 'critical';

export interface NotificationPayload {
  hospital_id: string;
  recipient_id: string;
  sender_id?: string | null;
  type: string;
  title: string;
  message: string;
  priority?: NotificationPriority;
  category?: string | null;
  action_url?: string | null;
  related_entity_id?: string | null;
  related_entity_type?: string | null;
  metadata?: Record<string, unknown> | null;
}

export async function sendNotification(payload: NotificationPayload) {
  const { error } = await supabase.from('notifications').insert({
    hospital_id: payload.hospital_id,
    recipient_id: payload.recipient_id,
    sender_id: payload.sender_id ?? null,
    type: payload.type,
    title: payload.title,
    message: payload.message,
    priority: payload.priority ?? 'normal',
    category: payload.category ?? null,
    action_url: payload.action_url ?? null,
    related_entity_id: payload.related_entity_id ?? null,
    related_entity_type: payload.related_entity_type ?? null,
    metadata: payload.metadata ?? {},
  });

  if (error) throw error;
}

