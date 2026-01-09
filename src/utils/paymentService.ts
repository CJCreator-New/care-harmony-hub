// Mock Stripe imports for development
interface StripeError {
  message: string;
}

interface StripePaymentResult {
  error: StripeError | null;
  paymentIntent: PaymentIntent | null;
}

interface MockStripe {
  confirmCardPayment: (clientSecret: string, options: Record<string, unknown>) => Promise<StripePaymentResult>;
}

const mockStripe: MockStripe = {
  confirmCardPayment: async (): Promise<StripePaymentResult> => ({
    error: null,
    paymentIntent: {
      id: 'pi_mock_' + Date.now(),
      status: 'succeeded',
      amount: 1000,
      currency: 'usd',
      client_secret: 'pi_mock_secret_' + Date.now()
    }
  })
};

export const loadStripe = async (key?: string): Promise<MockStripe | null> => {
  if (!key) {
    console.warn('Stripe key not provided. Using mock implementation.');
  }
  return mockStripe;
};

export type Stripe = MockStripe;
export type StripeElements = Record<string, unknown>;
export type StripeCardElement = Record<string, unknown>;

// Payment-related types
export interface PaymentIntent {
  id: string;
  status: string;
  amount: number;
  currency: string;
  client_secret?: string;
}

export interface BillingDetails {
  name?: string;
  email?: string;
  phone?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
}

export interface Refund {
  id: string;
  amount: number;
  status: string;
  payment_intent: string;
}

export interface PaymentMethod {
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
}
import { supabase } from '@/integrations/supabase/client';

// Payment Service for CareSync HMS
export class PaymentService {
  private stripe: Stripe | null = null;
  private stripePromise: Promise<Stripe | null>;

  constructor() {
    this.stripePromise = this.initializeStripe();
  }

  private async initializeStripe(): Promise<Stripe | null> {
    const stripePublishableKey = process.env.VITE_STRIPE_PUBLISHABLE_KEY;

    if (!stripePublishableKey) {
      console.warn('Stripe publishable key not found. Payment features will be disabled.');
      return null;
    }

    try {
      return await loadStripe(stripePublishableKey);
    } catch (error) {
      console.error('Failed to initialize Stripe:', error);
      return null;
    }
  }

  // Get Stripe instance
  async getStripe(): Promise<Stripe | null> {
    if (!this.stripe) {
      this.stripe = await this.stripePromise;
    }
    return this.stripe;
  }

  // Check if payment service is configured
  isConfigured(): boolean {
    return this.stripe !== null;
  }

  // Create payment intent for invoice
  async createPaymentIntent(
    amount: number,
    currency: string = 'usd',
    invoiceId: string,
    patientId: string,
    description?: string
  ): Promise<{ clientSecret: string; paymentIntentId: string } | { error: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('create-payment-intent', {
        body: {
          amount: Math.round(amount * 100), // Convert to cents
          currency,
          invoiceId,
          patientId,
          description: description || `Payment for invoice ${invoiceId}`
        }
      });

      if (error) {
        console.error('Payment intent creation failed:', error);
        return { error: error.message || 'Failed to create payment intent' };
      }

      return {
        clientSecret: data.clientSecret,
        paymentIntentId: data.paymentIntentId
      };
    } catch (error) {
      console.error('Payment intent creation error:', error);
      return {
        error: error instanceof Error ? error.message : 'Unknown payment error'
      };
    }
  }

  // Process payment with card element
  async processPayment(
    clientSecret: string,
    cardElement: StripeCardElement,
    billingDetails: BillingDetails
  ): Promise<{ success: boolean; paymentIntent?: PaymentIntent; error?: string }> {
    const stripe = await this.getStripe();
    if (!stripe) {
      return { success: false, error: 'Payment service not configured' };
    }

    try {
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: billingDetails
        }
      });

      if (error) {
        console.error('Payment confirmation failed:', error);
        return { success: false, error: error.message || 'Payment failed' };
      }

      return { success: true, paymentIntent: paymentIntent || undefined };
    } catch (error) {
      console.error('Payment processing error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown payment error'
      };
    }
  }

  // Create payment plan
  async createPaymentPlan(
    invoiceId: string,
    totalAmount: number,
    numberOfPayments: number,
    frequency: 'weekly' | 'monthly' = 'monthly',
    startDate?: Date
  ): Promise<{ success: boolean; planId?: string; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('create-payment-plan', {
        body: {
          invoiceId,
          totalAmount,
          numberOfPayments,
          frequency,
          startDate: startDate?.toISOString() || new Date().toISOString()
        }
      });

      if (error) {
        console.error('Payment plan creation failed:', error);
        return { success: false, error: error.message || 'Failed to create payment plan' };
      }

      return { success: true, planId: data.planId };
    } catch (error) {
      console.error('Payment plan creation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Process payment plan installment
  async processInstallment(
    planId: string,
    installmentNumber: number,
    cardElement: StripeCardElement,
    billingDetails: BillingDetails
  ): Promise<{ success: boolean; paymentIntent?: PaymentIntent; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('process-installment', {
        body: {
          planId,
          installmentNumber,
          billingDetails
        }
      });

      if (error) {
        return { success: false, error: error.message || 'Failed to process installment' };
      }

      return this.processPayment(data.clientSecret, cardElement, billingDetails);
    } catch (error) {
      console.error('Installment processing error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Refund payment
  async refundPayment(
    paymentIntentId: string,
    amount?: number,
    reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer'
  ): Promise<{ success: boolean; refund?: Refund; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('refund-payment', {
        body: {
          paymentIntentId,
          amount: amount ? Math.round(amount * 100) : undefined,
          reason
        }
      });

      if (error) {
        console.error('Refund failed:', error);
        return { success: false, error: error.message || 'Refund failed' };
      }

      return { success: true, refund: data.refund };
    } catch (error) {
      console.error('Refund error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown refund error'
      };
    }
  }

  // Get payment methods for customer
  async getPaymentMethods(customerId: string): Promise<{ success: boolean; paymentMethods?: PaymentMethod[]; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('get-payment-methods', {
        body: { customerId }
      });

      if (error) {
        console.error('Failed to get payment methods:', error);
        return { success: false, error: error.message || 'Failed to get payment methods' };
      }

      return { success: true, paymentMethods: data.paymentMethods };
    } catch (error) {
      console.error('Get payment methods error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Attach payment method to customer
  async attachPaymentMethod(
    paymentMethodId: string,
    customerId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.functions.invoke('attach-payment-method', {
        body: { paymentMethodId, customerId }
      });

      if (error) {
        console.error('Failed to attach payment method:', error);
        return { success: false, error: error.message || 'Failed to attach payment method' };
      }

      return { success: true };
    } catch (error) {
      console.error('Attach payment method error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Create customer in Stripe
  async createCustomer(
    email: string,
    name: string,
    phone?: string,
    metadata?: Record<string, unknown>
  ): Promise<{ success: boolean; customerId?: string; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('create-customer', {
        body: {
          email,
          name,
          phone,
          metadata: {
            ...metadata,
            source: 'caresync-hms'
          }
        }
      });

      if (error) {
        console.error('Customer creation failed:', error);
        return { success: false, error: error.message || 'Failed to create customer' };
      }

      return { success: true, customerId: data.customerId };
    } catch (error) {
      console.error('Customer creation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Validate payment amount
  validateAmount(amount: number): { valid: boolean; error?: string } {
    if (amount <= 0) {
      return { valid: false, error: 'Amount must be greater than 0' };
    }

    if (amount > 999999.99) {
      return { valid: false, error: 'Amount cannot exceed $999,999.99' };
    }

    // Check for reasonable decimal places (max 2)
    if (Math.round(amount * 100) !== amount * 100) {
      return { valid: false, error: 'Amount cannot have more than 2 decimal places' };
    }

    return { valid: true };
  }

  // Format currency amount
  formatAmount(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(amount);
  }
}

// Singleton instance
export const paymentService = new PaymentService();

// Utility functions
export const createPaymentIntent = (
  amount: number,
  invoiceId: string,
  patientId: string,
  description?: string
) => paymentService.createPaymentIntent(amount, 'usd', invoiceId, patientId, description);

export const createPaymentPlan = (
  invoiceId: string,
  totalAmount: number,
  numberOfPayments: number,
  frequency?: 'weekly' | 'monthly'
) => paymentService.createPaymentPlan(invoiceId, totalAmount, numberOfPayments, frequency);

export const refundPayment = (
  paymentIntentId: string,
  amount?: number,
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer'
) => paymentService.refundPayment(paymentIntentId, amount, reason);

export default PaymentService;