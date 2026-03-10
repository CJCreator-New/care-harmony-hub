import { describe, it, expect } from 'vitest';
import { supabase } from '@/integrations/supabase/query-helper';

describe('Database Query Performance', () => {
  describe('Patient Queries', () => {
    it('should fetch patients list efficiently', async () => {
      const start = performance.now();
      
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .limit(50);
      
      const duration = performance.now() - start;
      
      expect(error).toBeNull();
      expect(duration).toBeLessThan(10000);
    });
  });

  describe('Patient Queries – pagination', () => {
    it('should search patients with pagination', async () => {
      const start = performance.now();
      
      const { data, error } = await supabase
        .from('patients')
        .select('*', { count: 'exact' })
        .range(0, 24);
      
      const duration = performance.now() - start;
      
      expect(error).toBeNull();
      expect(duration).toBeLessThan(10000);
    });
  });

  describe('Appointment Queries', () => {
    it('should fetch today\'s appointments efficiently', async () => {
      const today = new Date().toISOString().split('T')[0];
      const start = performance.now();
      
      const { data, error } = await supabase
        .from('appointments')
        .select('*, patients(first_name, last_name)')
        .eq('scheduled_date', today);
      
      const duration = performance.now() - start;
      
      expect(error).toBeNull();
      expect(duration).toBeLessThan(10000);
    });

    it('should filter appointments by status', async () => {
      const start = performance.now();
      
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('status', 'scheduled')
        .limit(20);
      
      const duration = performance.now() - start;
      
      expect(error).toBeNull();
      expect(duration).toBeLessThan(10000);
    });
  });

  describe('Statistics Queries', () => {
    it('should calculate statistics efficiently', async () => {
      const start = performance.now();
      
      const { count, error } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed');
      
      const duration = performance.now() - start;
      
      expect(error).toBeNull();
      expect(duration).toBeLessThan(10000);
    });
  });
});
