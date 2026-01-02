import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Json } from '@/integrations/supabase/types';

type NotificationType = 'appointment_reminder' | 'prescription_ready' | 'lab_results' | 'invoice' | 'system' | 'message' | 'alert' | 'task';
type Priority = 'low' | 'normal' | 'high' | 'urgent';
type Category = 'clinical' | 'administrative' | 'billing' | 'system' | 'communication';

interface CreateNotificationParams {
  recipientId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority?: Priority;
  category?: Category;
  actionUrl?: string;
  metadata?: Json;
}

export function useNotificationTriggers() {
  const { hospital, profile } = useAuth();

  const createNotification = useCallback(async ({
    recipientId,
    type,
    title,
    message,
    priority = 'normal',
    category = 'system',
    actionUrl,
    metadata = {},
  }: CreateNotificationParams) => {
    if (!hospital?.id) {
      console.error('No hospital context for notification');
      return null;
    }

    const { data, error } = await supabase
      .from('notifications')
      .insert([{
        hospital_id: hospital.id,
        recipient_id: recipientId,
        sender_id: profile?.user_id || null,
        type,
        title,
        message,
        priority,
        category,
        action_url: actionUrl,
        metadata,
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating notification:', error);
      return null;
    }

    return data;
  }, [hospital?.id, profile?.user_id]);

  // Appointment reminder notification
  const notifyAppointmentReminder = useCallback(async (
    recipientId: string,
    patientName: string,
    appointmentDate: string,
    appointmentTime: string,
    appointmentId: string
  ) => {
    return createNotification({
      recipientId,
      type: 'appointment_reminder',
      title: 'Upcoming Appointment',
      message: `Appointment with ${patientName} scheduled for ${appointmentDate} at ${appointmentTime}`,
      priority: 'normal',
      category: 'clinical',
      actionUrl: `/appointments?id=${appointmentId}`,
      metadata: { appointmentId, patientName, appointmentDate, appointmentTime },
    });
  }, [createNotification]);

  // Prescription ready notification
  const notifyPrescriptionReady = useCallback(async (
    recipientId: string,
    patientName: string,
    prescriptionId: string,
    medicationCount: number
  ) => {
    return createNotification({
      recipientId,
      type: 'prescription_ready',
      title: 'Prescription Ready',
      message: `Prescription for ${patientName} with ${medicationCount} medication(s) is ready for pickup`,
      priority: 'normal',
      category: 'clinical',
      actionUrl: `/pharmacy?prescription=${prescriptionId}`,
      metadata: { prescriptionId, patientName, medicationCount },
    });
  }, [createNotification]);

  // Lab results notification
  const notifyLabResults = useCallback(async (
    recipientId: string,
    patientName: string,
    testName: string,
    labOrderId: string,
    isCritical: boolean = false
  ) => {
    return createNotification({
      recipientId,
      type: 'lab_results',
      title: isCritical ? '⚠️ Critical Lab Results' : 'Lab Results Available',
      message: `${testName} results for ${patientName} are now available${isCritical ? ' - CRITICAL VALUES DETECTED' : ''}`,
      priority: isCritical ? 'urgent' : 'normal',
      category: 'clinical',
      actionUrl: `/laboratory?order=${labOrderId}`,
      metadata: { labOrderId, patientName, testName, isCritical },
    });
  }, [createNotification]);

  // Invoice notification
  const notifyInvoice = useCallback(async (
    recipientId: string,
    patientName: string,
    invoiceNumber: string,
    amount: number,
    invoiceId: string
  ) => {
    return createNotification({
      recipientId,
      type: 'invoice',
      title: 'New Invoice Generated',
      message: `Invoice #${invoiceNumber} for $${amount.toFixed(2)} has been generated for ${patientName}`,
      priority: 'normal',
      category: 'billing',
      actionUrl: `/billing?invoice=${invoiceId}`,
      metadata: { invoiceId, invoiceNumber, patientName, amount },
    });
  }, [createNotification]);

  // Refill request notification
  const notifyRefillRequest = useCallback(async (
    recipientId: string,
    patientName: string,
    medicationName: string,
    requestId: string
  ) => {
    return createNotification({
      recipientId,
      type: 'prescription_ready',
      title: 'New Refill Request',
      message: `${patientName} has requested a refill for ${medicationName}`,
      priority: 'high',
      category: 'clinical',
      actionUrl: `/pharmacy?refill=${requestId}`,
      metadata: { requestId, patientName, medicationName },
    });
  }, [createNotification]);

  // Low stock alert notification
  const notifyLowStock = useCallback(async (
    recipientId: string,
    medicationName: string,
    currentStock: number,
    minimumStock: number
  ) => {
    return createNotification({
      recipientId,
      type: 'alert',
      title: 'Low Stock Alert',
      message: `${medicationName} is running low: ${currentStock} units remaining (min: ${minimumStock})`,
      priority: 'high',
      category: 'administrative',
      actionUrl: '/inventory',
      metadata: { medicationName, currentStock, minimumStock },
    });
  }, [createNotification]);

  // Task assignment notification
  const notifyTaskAssignment = useCallback(async (
    recipientId: string,
    taskTitle: string,
    assignedBy: string
  ) => {
    return createNotification({
      recipientId,
      type: 'task',
      title: 'New Task Assigned',
      message: `${assignedBy} assigned you a new task: ${taskTitle}`,
      priority: 'normal',
      category: 'administrative',
      metadata: { taskTitle, assignedBy },
    });
  }, [createNotification]);

  // System notification
  const notifySystem = useCallback(async (
    recipientId: string,
    title: string,
    message: string,
    priority: Priority = 'normal'
  ) => {
    return createNotification({
      recipientId,
      type: 'system',
      title,
      message,
      priority,
      category: 'system',
    });
  }, [createNotification]);

  return {
    createNotification,
    notifyAppointmentReminder,
    notifyPrescriptionReady,
    notifyLabResults,
    notifyInvoice,
    notifyRefillRequest,
    notifyLowStock,
    notifyTaskAssignment,
    notifySystem,
  };
}
