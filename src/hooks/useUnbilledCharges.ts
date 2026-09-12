/**
 * useUnbilledCharges.ts
 * Clinical Charge Capture Hook
 *
 * Queries unbilled completed lab orders, dispensed medications,
 * consultations, and bed days for a selected patient.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { resolveTariffRate } from '@/lib/clinical/billingCycleRules';

export interface UnbilledChargeItem {
  id: string;
  sourceType: 'lab' | 'medication' | 'consultation' | 'bed';
  sourceId: string;
  code: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  date: string;
  statusBadge: string;
}

export function useUnbilledCharges(patientId: string | undefined) {
  const { hospital } = useAuth();

  return useQuery({
    queryKey: ['unbilled-charges', hospital?.id, patientId],
    queryFn: async (): Promise<UnbilledChargeItem[]> => {
      if (!hospital?.id || !patientId) return [];

      const unbilledItems: UnbilledChargeItem[] = [];

      try {
        // 1. Fetch completed lab orders
        const { data: labs } = await supabase
          .from('lab_orders')
          .select('id, test_name, status, created_at')
          .eq('hospital_id', hospital.id)
          .eq('patient_id', patientId)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(10);

        if (labs) {
          for (const lab of labs) {
            const tariff = resolveTariffRate(lab.test_name, 'lab');
            unbilledItems.push({
              id: `lab-${lab.id}`,
              sourceType: 'lab',
              sourceId: lab.id,
              code: tariff.code,
              description: `Lab Test: ${tariff.name}`,
              quantity: 1,
              unitPrice: tariff.unitPrice,
              total: tariff.unitPrice,
              date: lab.created_at,
              statusBadge: 'Lab Completed',
            });
          }
        }
      } catch {
        // non-blocking fallback
      }

      try {
        // 2. Fetch prescriptions (dispensed / active)
        const { data: rxList } = await supabase
          .from('prescriptions')
          .select('id, medication_name, dosage, quantity, status, created_at')
          .eq('hospital_id', hospital.id)
          .eq('patient_id', patientId)
          .order('created_at', { ascending: false })
          .limit(10);

        if (rxList) {
          for (const rx of rxList) {
            const tariff = resolveTariffRate(rx.medication_name, 'medication');
            const qty = rx.quantity && Number(rx.quantity) > 0 ? Number(rx.quantity) : 1;
            unbilledItems.push({
              id: `rx-${rx.id}`,
              sourceType: 'medication',
              sourceId: rx.id,
              code: tariff.code,
              description: `Pharmacy: ${tariff.name} (${rx.dosage || 'standard dose'})`,
              quantity: qty,
              unitPrice: tariff.unitPrice,
              total: tariff.unitPrice * qty,
              date: rx.created_at,
              statusBadge: rx.status === 'dispensed' ? 'Dispensed' : 'Prescribed',
            });
          }
        }
      } catch {
        // non-blocking fallback
      }

      try {
        // 3. Fetch completed consultations
        const { data: consultations } = await supabase
          .from('consultations')
          .select('id, chief_complaint, status, completed_at, created_at')
          .eq('hospital_id', hospital.id)
          .eq('patient_id', patientId)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(5);

        if (consultations) {
          for (const c of consultations) {
            const tariff = resolveTariffRate('General OPD Consultation', 'consultation');
            unbilledItems.push({
              id: `con-${c.id}`,
              sourceType: 'consultation',
              sourceId: c.id,
              code: tariff.code,
              description: `Consultation: ${c.chief_complaint || tariff.name}`,
              quantity: 1,
              unitPrice: tariff.unitPrice,
              total: tariff.unitPrice,
              date: c.completed_at || c.created_at,
              statusBadge: 'Consultation Complete',
            });
          }
        }
      } catch {
        // non-blocking fallback
      }

      try {
        // 4. Fetch admissions for bed charges
        const { data: admissions } = await supabase
          .from('admissions')
          .select('id, ward, room_number, admission_date, discharge_date, status')
          .eq('hospital_id', hospital.id)
          .eq('patient_id', patientId)
          .order('admission_date', { ascending: false })
          .limit(2);

        if (admissions) {
          for (const adm of admissions) {
            const admDate = new Date(adm.admission_date);
            const disDate = adm.discharge_date ? new Date(adm.discharge_date) : new Date();
            const days = Math.max(
              1,
              Math.ceil((disDate.getTime() - admDate.getTime()) / (1000 * 60 * 60 * 24))
            );
            const tariff = resolveTariffRate(adm.ward || 'General Ward Bed', 'bed');

            unbilledItems.push({
              id: `bed-${adm.id}`,
              sourceType: 'bed',
              sourceId: adm.id,
              code: tariff.code,
              description: `Inpatient Bed: ${adm.ward || 'General Ward'} (${days} days)`,
              quantity: days,
              unitPrice: tariff.unitPrice,
              total: tariff.unitPrice * days,
              date: adm.admission_date,
              statusBadge: adm.status === 'discharged' ? 'Discharged Bed' : 'Active Inpatient',
            });
          }
        }
      } catch {
        // non-blocking fallback
      }

      return unbilledItems;
    },
    enabled: !!hospital?.id && !!patientId,
    staleTime: 30 * 1000,
  });
}
