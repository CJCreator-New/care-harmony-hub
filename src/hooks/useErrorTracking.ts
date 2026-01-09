import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ErrorLog {
  id: string;
  message: string;
  stack?: string;
  url: string;
  user_agent: string;
  user_id?: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context?: Record<string, any>;
}

export function useErrorTracking() {
  const logError = useCallback(async (error: Error | string, context?: {
    severity?: 'low' | 'medium' | 'high' | 'critical';
    userId?: string;
    additionalContext?: Record<string, any>;
  }) => {
    try {
      const errorMessage = error instanceof Error ? error.message : error;
      const errorStack = error instanceof Error ? error.stack : undefined;

      const errorLog = {
        message: errorMessage,
        stack: errorStack,
        url: window.location.href,
        user_agent: navigator.userAgent,
        user_id: context?.userId,
        severity: context?.severity || 'medium',
        context: {
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href,
          ...context?.additionalContext,
        },
      };

      // Log to error_logs table
      const { error: dbError } = await supabase
        .from('error_logs')
        .insert({
          message: errorMessage,
          stack: errorStack,
          url: window.location.href,
          user_agent: navigator.userAgent,
          user_id: context?.userId || (await supabase.auth.getUser()).data.user?.id || null,
          severity: context?.severity || 'medium',
          context: context?.additionalContext || {},
        });

      if (dbError) {
        console.error('Failed to log error to database:', dbError);
      }

      // Also log to console for development
      console.error('Error logged:', errorLog);

      // In production, you might want to send to external error tracking service
      // like Sentry, LogRocket, etc.

    } catch (loggingError) {
      console.error('Failed to log error:', loggingError);
    }
  }, []);

  const logUserAction = useCallback(async (action: string, details?: Record<string, any>) => {
    try {
      await supabase.from('activity_logs').insert({
        action_type: action,
        details,
        user_id: (await supabase.auth.getUser()).data.user?.id || '',
        user_agent: navigator.userAgent,
        entity_type: 'user',
        entity_id: (await supabase.auth.getUser()).data.user?.id || '',
      });
    } catch (error) {
      console.error('Failed to log user action:', error);
    }
  }, []);

  return {
    logError,
    logUserAction,
  };
}

// Global error handler setup
export function setupGlobalErrorHandling() {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    // You could log this to your error tracking service
  });

  // Handle uncaught errors
  window.addEventListener('error', (event) => {
    console.error('Uncaught error:', event.error);
    // You could log this to your error tracking service
  });

  // Handle React errors (if using React Error Boundaries)
  // This would be set up in your main App component
}