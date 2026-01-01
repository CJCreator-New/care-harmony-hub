import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

type NotificationType = 'appointment_reminder' | 'prescription_ready' | 'lab_results' | 'invoice' | 'custom';

interface NotificationData {
  appointmentDate?: string;
  appointmentTime?: string;
  doctorName?: string;
  prescriptionDetails?: string;
  labTestName?: string;
  invoiceNumber?: string;
  invoiceAmount?: string;
  customSubject?: string;
  customMessage?: string;
}

interface SendNotificationParams {
  type: NotificationType;
  recipientEmail: string;
  recipientName: string;
  data?: NotificationData;
}

export function useNotifications() {
  const { hospital } = useAuth();

  const sendNotification = useMutation({
    mutationFn: async (params: SendNotificationParams) => {
      if (!hospital?.name) {
        throw new Error('Hospital context not available');
      }

      const { data, error } = await supabase.functions.invoke('send-notification', {
        body: {
          ...params,
          hospitalName: hospital.name,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Notification sent successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to send notification: ${error.message}`);
    },
  });

  const sendAppointmentReminder = (
    recipientEmail: string,
    recipientName: string,
    appointmentDate: string,
    appointmentTime: string,
    doctorName?: string
  ) => {
    return sendNotification.mutateAsync({
      type: 'appointment_reminder',
      recipientEmail,
      recipientName,
      data: { appointmentDate, appointmentTime, doctorName },
    });
  };

  const sendPrescriptionReady = (
    recipientEmail: string,
    recipientName: string,
    prescriptionDetails?: string
  ) => {
    return sendNotification.mutateAsync({
      type: 'prescription_ready',
      recipientEmail,
      recipientName,
      data: { prescriptionDetails },
    });
  };

  const sendLabResults = (
    recipientEmail: string,
    recipientName: string,
    labTestName?: string
  ) => {
    return sendNotification.mutateAsync({
      type: 'lab_results',
      recipientEmail,
      recipientName,
      data: { labTestName },
    });
  };

  const sendInvoiceNotification = (
    recipientEmail: string,
    recipientName: string,
    invoiceNumber: string,
    invoiceAmount: string
  ) => {
    return sendNotification.mutateAsync({
      type: 'invoice',
      recipientEmail,
      recipientName,
      data: { invoiceNumber, invoiceAmount },
    });
  };

  const sendCustomNotification = (
    recipientEmail: string,
    recipientName: string,
    customSubject: string,
    customMessage: string
  ) => {
    return sendNotification.mutateAsync({
      type: 'custom',
      recipientEmail,
      recipientName,
      data: { customSubject, customMessage },
    });
  };

  return {
    sendNotification: sendNotification.mutate,
    sendNotificationAsync: sendNotification.mutateAsync,
    sendAppointmentReminder,
    sendPrescriptionReady,
    sendLabResults,
    sendInvoiceNotification,
    sendCustomNotification,
    isLoading: sendNotification.isPending,
  };
}
