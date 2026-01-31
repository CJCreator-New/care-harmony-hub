/**
 * Real-time Notifications System
 * Manages notifications with Supabase Realtime
 */

import { supabase } from '@/integrations/supabase/client';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'alert';
  read: boolean;
  action_url?: string;
  created_at: string;
  expires_at?: string;
}

export interface NotificationPreferences {
  email_notifications: boolean;
  push_notifications: boolean;
  in_app_notifications: boolean;
  notification_types: string[];
}

class NotificationManager {
  private listeners: Map<string, Set<(notification: Notification) => void>> = new Map();
  private unreadCount = 0;

  /**
   * Subscribe to notifications for a user
   */
  subscribeToNotifications(userId: string, callback: (notification: Notification) => void) {
    if (!this.listeners.has(userId)) {
      this.listeners.set(userId, new Set());
    }
    this.listeners.get(userId)!.add(callback);

    // Subscribe to Realtime changes
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const notification = payload.new as Notification;
          this.notifyListeners(userId, notification);
          if (!notification.read) {
            this.unreadCount++;
          }
        }
      )
      .subscribe();

    return () => {
      this.listeners.get(userId)?.delete(callback);
      channel.unsubscribe();
    };
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(userId: string, notification: Notification) {
    const callbacks = this.listeners.get(userId);
    if (callbacks) {
      callbacks.forEach(callback => callback(notification));
    }
  }

  /**
   * Create a notification
   */
  async createNotification(
    userId: string,
    title: string,
    message: string,
    type: Notification['type'],
    actionUrl?: string
  ): Promise<Notification> {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        message,
        type,
        action_url: actionUrl,
        read: false,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) throw error;
    this.unreadCount = Math.max(0, this.unreadCount - 1);
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) throw error;
    this.unreadCount = 0;
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) throw error;
  }

  /**
   * Get unread count
   */
  getUnreadCount(): number {
    return this.unreadCount;
  }

  /**
   * Set unread count
   */
  setUnreadCount(count: number): void {
    this.unreadCount = count;
  }
}

// Singleton instance
export const notificationManager = new NotificationManager();

/**
 * Notification types for different scenarios
 */
export const notificationTypes = {
  appointmentReminder: (patientName: string) => ({
    title: 'Appointment Reminder',
    message: `You have an upcoming appointment with ${patientName}`,
    type: 'info' as const,
  }),

  appointmentConfirmed: (date: string, time: string) => ({
    title: 'Appointment Confirmed',
    message: `Your appointment is confirmed for ${date} at ${time}`,
    type: 'success' as const,
  }),

  appointmentCancelled: (reason?: string) => ({
    title: 'Appointment Cancelled',
    message: reason ? `Your appointment has been cancelled. Reason: ${reason}` : 'Your appointment has been cancelled',
    type: 'warning' as const,
  }),

  prescriptionReady: (medicationName: string) => ({
    title: 'Prescription Ready',
    message: `Your prescription for ${medicationName} is ready for pickup`,
    type: 'success' as const,
  }),

  labResultsReady: () => ({
    title: 'Lab Results Available',
    message: 'Your lab results are now available. Please review them with your doctor.',
    type: 'info' as const,
  }),

  billingAlert: (amount: number) => ({
    title: 'Billing Alert',
    message: `You have an outstanding balance of $${amount.toFixed(2)}`,
    type: 'warning' as const,
  }),

  systemAlert: (message: string) => ({
    title: 'System Alert',
    message,
    type: 'alert' as const,
  }),

  error: (message: string) => ({
    title: 'Error',
    message,
    type: 'error' as const,
  }),
};
