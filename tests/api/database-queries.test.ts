import { describe, it, expect } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

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
      expect(duration).toBeLessThan(200); // Under 200ms
    });

    it('should search patients with pagination', async () => {
      const start = performance.now();
      
      const { data, error } = await supabase
        .from('patients')
        .select('*', { count: 'exact' })
        .range(0, 24);
      
      const duration = performance.now() - start;
      
      expect(error).toBeNull();
      expect(duration).toBeLessThan(300);
    });
  });

  describe('Appointment Queries', () => {
    it('should fetch today appointments quickly', async () => {
      const start = performance.now();
      
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('appointments')
        .select('*, patients(*), profiles(*)')
        .gte('appointment_date', today)
        .lt('appointment_date', `${today}T23:59:59`);
      
      const duration = performance.now() - start;
      
      expect(error).toBeNull();
      expect(duration).toBeLessThan(500);
    });
  });

  describe('Complex Joins', () => {
    it('should handle multi-table joins efficiently', async () => {
      const start = performance.now();
      
      const { data, error } = await supabase
        .from('consultations')
        .select(`
          *,
          patients(*),
          profiles(*),
          prescriptions(*)
        `)
        .limit(10);
      
      const duration = performance.now() - start;
      
      expect(error).toBeNull();
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('Aggregation Queries', () => {
    it('should calculate statistics efficiently', async () => {
      const start = performance.now();
      
      const { count, error } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed');
      
      const duration = performance.now() - start;
      
      expect(error).toBeNull();
      expect(duration).toBeLessThan(300);
    });
  });
});
