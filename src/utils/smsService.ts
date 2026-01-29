// Mock Twilio for development
interface SMSMessageOptions {
  body: string;
  from: string;
  to: string;
}

interface SMSMessage {
  sid: string;
  status: string;
}

interface MockTwilio {
  messages: {
    create: (options: SMSMessageOptions) => Promise<{ sid: string }>;
    (sid: string): {
      fetch: () => Promise<SMSMessage>;
    };
  };
}

const mockTwilio: MockTwilio = {
  messages: Object.assign(
    {
      create: async (options: SMSMessageOptions) => ({ sid: 'mock_message_id' })
    },
    (sid: string) => ({
      fetch: async () => ({ status: 'delivered', sid })
    })
  )
};

export class Twilio {
  messages = mockTwilio.messages;
  
  constructor(accountSid?: string, authToken?: string) {
    if (!accountSid || !authToken) {
      console.warn('Twilio credentials not provided. Using mock implementation.');
    }
  }
}

// SMS Service for CareSync HMS
export class SMSService {
  private client: Twilio | null = null;
  private accountSid: string | null = null;
  private authToken: string | null = null;
  private fromNumber: string | null = null;

  constructor() {
    this.initializeClient();
  }

  private initializeClient() {
    this.accountSid = import.meta.env.VITE_TWILIO_ACCOUNT_SID || null;
    this.authToken = import.meta.env.VITE_TWILIO_AUTH_TOKEN || null;
    this.fromNumber = import.meta.env.VITE_TWILIO_PHONE_NUMBER || null;

    if (this.accountSid && this.authToken) {
      this.client = new Twilio(this.accountSid, this.authToken);
    }
  }

  // Check if SMS service is configured
  isConfigured(): boolean {
    return this.client !== null && this.fromNumber !== null;
  }

  // Send SMS message
  async sendSMS(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.isConfigured()) {
      console.warn('SMS service not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER environment variables.');
      return { success: false, error: 'SMS service not configured' };
    }

    try {
      const result = await this.client!.messages.create({
        body: message,
        from: this.fromNumber!,
        to: this.formatPhoneNumber(to)
      });

      return { success: true, messageId: result.sid };
    } catch (error) {
      console.error('SMS sending failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown SMS error'
      };
    }
  }

  // Send appointment reminder
  async sendAppointmentReminder(
    phoneNumber: string,
    patientName: string,
    doctorName: string,
    appointmentDate: string,
    appointmentTime: string,
    hospitalName: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const message = `Hi ${patientName}, this is a reminder from ${hospitalName}. You have an appointment with Dr. ${doctorName} on ${appointmentDate} at ${appointmentTime}. Please arrive 15 minutes early. Reply CONFIRM to confirm.`;

    return this.sendSMS(phoneNumber, message);
  }

  // Send prescription ready notification
  async sendPrescriptionReady(
    phoneNumber: string,
    patientName: string,
    prescriptionId: string,
    pickupLocation: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const message = `Hi ${patientName}, your prescription (${prescriptionId}) is ready for pickup at ${pickupLocation}. Please bring your ID. Valid for 30 days.`;

    return this.sendSMS(phoneNumber, message);
  }

  // Send lab results notification
  async sendLabResultsReady(
    phoneNumber: string,
    patientName: string,
    testType: string,
    resultsAvailable: boolean = true
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const status = resultsAvailable ? 'are ready' : 'are being processed';
    const message = `Hi ${patientName}, your ${testType} lab results ${status}. Please log into your patient portal to view them or contact your healthcare provider.`;

    return this.sendSMS(phoneNumber, message);
  }

  // Send billing notification
  async sendBillingNotification(
    phoneNumber: string,
    patientName: string,
    amount: number,
    dueDate: string,
    invoiceId: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const message = `Hi ${patientName}, your medical bill of $${amount.toFixed(2)} (Invoice: ${invoiceId}) is due on ${dueDate}. Please pay online via patient portal or contact billing department.`;

    return this.sendSMS(phoneNumber, message);
  }

  // Send emergency alert
  async sendEmergencyAlert(
    phoneNumbers: string[],
    message: string,
    priority: 'normal' | 'high' | 'urgent' = 'normal'
  ): Promise<{ success: boolean; results: Array<{ phone: string; success: boolean; messageId?: string; error?: string }> }> {
    const results = await Promise.all(
      phoneNumbers.map(async (phone) => {
        const result = await this.sendSMS(phone, `[${priority.toUpperCase()}] ${message}`);
        return { phone, ...result };
      })
    );

    return {
      success: results.some(r => r.success),
      results
    };
  }

  // Send bulk SMS (for campaigns, announcements, etc.)
  async sendBulkSMS(
    phoneNumbers: string[],
    message: string,
    batchSize: number = 10
  ): Promise<{ success: boolean; totalSent: number; totalFailed: number; results: Array<{ phone: string; success: boolean; messageId?: string; error?: string }> }> {
    const results: Array<{ phone: string; success: boolean; messageId?: string; error?: string }> = [];

    // Process in batches to avoid rate limits
    for (let i = 0; i < phoneNumbers.length; i += batchSize) {
      const batch = phoneNumbers.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(phone => this.sendSMS(phone, message))
      );
      results.push(...batchResults.map((result, index) => ({ phone: batch[index], ...result })));

      // Small delay between batches
      if (i + batchSize < phoneNumbers.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const totalSent = results.filter(r => r.success).length;
    const totalFailed = results.filter(r => !r.success).length;

    return {
      success: totalSent > 0,
      totalSent,
      totalFailed,
      results
    };
  }

  // Format phone number to E.164 format
  private formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');

    // Add country code if not present (assuming US)
    if (cleaned.length === 10) {
      return `+1${cleaned}`;
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+${cleaned}`;
    } else if (!cleaned.startsWith('+')) {
      return `+${cleaned}`;
    }

    return phone;
  }

  // Get SMS delivery status
  async getMessageStatus(messageId: string): Promise<{ status: string; error?: string }> {
    if (!this.isConfigured()) {
      return { status: 'unknown', error: 'SMS service not configured' };
    }

    try {
      const message = await this.client!.messages(messageId).fetch();
      return { status: message.status };
    } catch (error) {
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Validate phone number format
  validatePhoneNumber(phone: string): boolean {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(this.formatPhoneNumber(phone));
  }
}

// Singleton instance
export const smsService = new SMSService();

// Utility functions for common SMS operations
export const sendAppointmentReminder = (
  phoneNumber: string,
  patientName: string,
  doctorName: string,
  appointmentDate: string,
  appointmentTime: string,
  hospitalName: string
) => smsService.sendAppointmentReminder(phoneNumber, patientName, doctorName, appointmentDate, appointmentTime, hospitalName);

export const sendPrescriptionReady = (
  phoneNumber: string,
  patientName: string,
  prescriptionId: string,
  pickupLocation: string
) => smsService.sendPrescriptionReady(phoneNumber, patientName, prescriptionId, pickupLocation);

export const sendLabResultsReady = (
  phoneNumber: string,
  patientName: string,
  testType: string,
  resultsAvailable?: boolean
) => smsService.sendLabResultsReady(phoneNumber, patientName, testType, resultsAvailable);

export const sendBillingNotification = (
  phoneNumber: string,
  patientName: string,
  amount: number,
  dueDate: string,
  invoiceId: string
) => smsService.sendBillingNotification(phoneNumber, patientName, amount, dueDate, invoiceId);

export default SMSService;