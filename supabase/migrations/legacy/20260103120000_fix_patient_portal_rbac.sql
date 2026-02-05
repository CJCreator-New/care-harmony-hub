-- Fix Patient Portal RBAC - Add missing RLS policies for patient access

-- Add patient access policies for appointments
CREATE POLICY "Patients can view their own appointments"
ON public.appointments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = appointments.patient_id 
    AND p.user_id = auth.uid()
  )
);

-- Add patient access policies for consultations  
CREATE POLICY "Patients can view their own consultations"
ON public.consultations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = consultations.patient_id 
    AND p.user_id = auth.uid()
  )
);

-- Add patient access policies for prescriptions
CREATE POLICY "Patients can view their own prescriptions"
ON public.prescriptions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = prescriptions.patient_id 
    AND p.user_id = auth.uid()
  )
);

-- Add patient access policies for prescription items
CREATE POLICY "Patients can view their own prescription items"
ON public.prescription_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.prescriptions pr
    JOIN public.patients p ON p.id = pr.patient_id
    WHERE pr.id = prescription_items.prescription_id 
    AND p.user_id = auth.uid()
  )
);

-- Add patient access policies for lab orders
CREATE POLICY "Patients can view their own lab orders"
ON public.lab_orders FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = lab_orders.patient_id 
    AND p.user_id = auth.uid()
  )
);

-- Add patient access policies for vital signs
CREATE POLICY "Patients can view their own vital signs"
ON public.vital_signs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = vital_signs.patient_id 
    AND p.user_id = auth.uid()
  )
);

-- Add patient access to view their own patient record
CREATE POLICY "Patients can view their own patient record"
ON public.patients FOR SELECT
USING (user_id = auth.uid());

-- Add patient access to update their own patient record (limited fields)
CREATE POLICY "Patients can update their own contact info"
ON public.patients FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Add patient access to invoices (their own)
CREATE POLICY "Patients can view their own invoices"
ON public.invoices FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = invoices.patient_id 
    AND p.user_id = auth.uid()
  )
);

-- Add patient access to payments (their own)
CREATE POLICY "Patients can view their own payments"
ON public.payments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.invoices i
    JOIN public.patients p ON p.id = i.patient_id
    WHERE i.id = payments.invoice_id 
    AND p.user_id = auth.uid()
  )
);