import { describe, it, expect } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

describe('Supabase Edge Functions', () => {
  describe('Health Check Function', () => {
    it('should respond with system health status', async () => {
      const { data, error } = await supabase.functions.invoke('health-check');
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
    });
  });

  describe('Notification Function', () => {
    it('should send notifications successfully', async () => {
      const { data, error } = await supabase.functions.invoke('send-notification', {
        body: {
          userId: 'test-user',
          title: 'Test Notification',
          message: 'This is a test',
          type: 'info',
        },
      });

      expect(error).toBeNull();
    });
  });

  describe('Analytics Function', () => {
    it('should generate analytics data', async () => {
      const { data, error } = await supabase.functions.invoke('analytics-engine', {
        body: {
          metric: 'patient_visits',
          startDate: new Date(Date.now() - 86400000).toISOString(),
          endDate: new Date().toISOString(),
        },
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });
  });

  describe('Function Performance', () => {
    it('should respond within acceptable time', async () => {
      const start = Date.now();
      
      await supabase.functions.invoke('health-check');
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(2000); // Under 2 seconds
    });
  });
});
