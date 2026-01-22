# CareSync - Implementation Guide
## Critical Components & Workflows

---

## 1. Pharmacist Dashboard Implementation

### 1.1 PrescriptionQueue Component

```typescript
// src/components/pharmacist/PrescriptionQueue.tsx
import { useState, useEffect } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Prescription {
  id: string;
  patient_id: string;
  medication_id: string;
  dosage: string;
  frequency: string;
  status: 'pending' | 'verified' | 'dispensed';
  created_at: string;
}

export const PrescriptionQueue = () => {
  const supabase = useSupabaseClient();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const subscription = supabase
      .channel('prescriptions-queue')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'prescriptions',
          filter: 'status=eq.pending'
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setPrescriptions(prev => [payload.new as Prescription, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setPrescriptions(prev =>
              prev.map(p => p.id === payload.new.id ? payload.new as Prescription : p)
            );
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const verifyPrescription = async (prescriptionId: string) => {
    await supabase
      .from('prescriptions')
      .update({ status: 'verified' })
      .eq('id', prescriptionId);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Pending Prescriptions</h2>
      {prescriptions.map(rx => (
        <Card key={rx.id}>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>{rx.medication_id}</span>
              <Badge>{rx.status}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>Dosage: {rx.dosage}</p>
            <p>Frequency: {rx.frequency}</p>
            <Button onClick={() => verifyPrescription(rx.id)}>Verify & Dispense</Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
```

### 1.2 InventoryDashboard Component

```typescript
// src/components/pharmacist/InventoryDashboard.tsx
import { useQuery } from '@tanstack/react-query';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface InventoryItem {
  id: string;
  medication_id: string;
  quantity_on_hand: number;
  reorder_level: number;
  unit_cost: number;
}

export const InventoryDashboard = () => {
  const supabase = useSupabaseClient();

  const { data: inventory = [] } = useQuery({
    queryKey: ['pharmacy-inventory'],
    queryFn: async () => {
      const { data } = await supabase
        .from('pharmacy_inventory')
        .select('*')
        .order('quantity_on_hand', { ascending: true });
      return data as InventoryItem[];
    }
  });

  const lowStockItems = inventory.filter(item => item.quantity_on_hand <= item.reorder_level);

  return (
    <div className="space-y-4">
      {lowStockItems.length > 0 && (
        <Alert>
          <AlertDescription>{lowStockItems.length} items need reordering</AlertDescription>
        </Alert>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Medication</TableHead>
            <TableHead>On Hand</TableHead>
            <TableHead>Reorder Level</TableHead>
            <TableHead>Unit Cost</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {inventory.map(item => (
            <TableRow key={item.id}>
              <TableCell>{item.medication_id}</TableCell>
              <TableCell>{item.quantity_on_hand}</TableCell>
              <TableCell>{item.reorder_level}</TableCell>
              <TableCell>${item.unit_cost}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
```

---

## 2. Nurse Dashboard Implementation

### 2.1 VitalsEntry Component

```typescript
// src/components/nurse/VitalsEntry.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const vitalsSchema = z.object({
  temperature: z.number().min(35).max(42),
  blood_pressure: z.string().regex(/^\d{2,3}\/\d{2,3}$/),
  heart_rate: z.number().min(40).max(200),
  respiratory_rate: z.number().min(8).max(40),
  oxygen_saturation: z.number().min(70).max(100)
});

type VitalsFormData = z.infer<typeof vitalsSchema>;

export const VitalsEntry = ({ patientId }: { patientId: string }) => {
  const supabase = useSupabaseClient();
  const form = useForm<VitalsFormData>({
    resolver: zodResolver(vitalsSchema)
  });

  const onSubmit = async (data: VitalsFormData) => {
    const { error } = await supabase.from('patient_vitals').insert({
      patient_id: patientId,
      ...data,
      recorded_at: new Date().toISOString()
    });

    if (error) {
      toast.error('Failed to record vitals');
      return;
    }

    toast.success('Vitals recorded successfully');
    form.reset();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="temperature"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Temperature (°C)</FormLabel>
              <FormControl>
                <Input type="number" step="0.1" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="blood_pressure"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Blood Pressure (mmHg)</FormLabel>
              <FormControl>
                <Input placeholder="120/80" {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="heart_rate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Heart Rate (bpm)</FormLabel>
              <FormControl>
                <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="respiratory_rate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Respiratory Rate (breaths/min)</FormLabel>
              <FormControl>
                <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="oxygen_saturation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Oxygen Saturation (%)</FormLabel>
              <FormControl>
                <Input type="number" step="0.1" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
              </FormControl>
            </FormItem>
          )}
        />
        <Button type="submit">Record Vitals</Button>
      </form>
    </Form>
  );
};
```

### 2.2 PredictiveAlerts Component

```typescript
// src/components/nurse/PredictiveAlerts.tsx
import { useQuery } from '@tanstack/react-query';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, AlertCircle } from 'lucide-react';

interface Alert {
  id: string;
  patient_id: string;
  alert_type: 'critical' | 'warning' | 'info';
  message: string;
  created_at: string;
}

export const PredictiveAlerts = ({ patientId }: { patientId: string }) => {
  const supabase = useSupabaseClient();

  const { data: alerts = [] } = useQuery({
    queryKey: ['alerts', patientId],
    queryFn: async () => {
      const { data } = await supabase
        .from('alerts')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(10);
      return data as Alert[];
    },
    refetchInterval: 30000
  });

  return (
    <div className="space-y-2">
      {alerts.map(alert => (
        <Alert key={alert.id} variant={alert.alert_type === 'critical' ? 'destructive' : 'default'}>
          {alert.alert_type === 'critical' ? <AlertTriangle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <AlertTitle>{alert.alert_type.toUpperCase()}</AlertTitle>
          <AlertDescription>{alert.message}</AlertDescription>
        </Alert>
      ))}
    </div>
  );
};
```

---

## 3. Doctor Dashboard Implementation

### 3.1 ConsultationForm Component

```typescript
// src/components/doctor/ConsultationForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { useAuth } from '@/contexts/AuthContext';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const consultationSchema = z.object({
  chief_complaint: z.string().min(10),
  diagnosis: z.string().min(10),
  notes: z.string().optional()
});

type ConsultationFormData = z.infer<typeof consultationSchema>;

export const ConsultationForm = ({ patientId }: { patientId: string }) => {
  const supabase = useSupabaseClient();
  const { user } = useAuth();
  const form = useForm<ConsultationFormData>({
    resolver: zodResolver(consultationSchema)
  });

  const onSubmit = async (data: ConsultationFormData) => {
    const { error } = await supabase.from('consultations').insert({
      patient_id: patientId,
      doctor_id: user?.id,
      consultation_date: new Date().toISOString(),
      status: 'completed',
      ...data
    });

    if (error) {
      toast.error('Failed to save consultation');
      return;
    }

    toast.success('Consultation saved successfully');
    form.reset();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="chief_complaint"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Chief Complaint</FormLabel>
              <FormControl>
                <Textarea placeholder="Patient's main complaint..." {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="diagnosis"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Diagnosis</FormLabel>
              <FormControl>
                <Textarea placeholder="Clinical diagnosis..." {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Additional Notes</FormLabel>
              <FormControl>
                <Textarea placeholder="Any additional notes..." {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        <Button type="submit">Save Consultation</Button>
      </form>
    </Form>
  );
};
```

---

## 4. Receptionist Dashboard Implementation

### 4.1 PatientRegistration Component

```typescript
// src/components/receptionist/PatientRegistration.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const patientSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  dateOfBirth: z.string(),
  gender: z.enum(['M', 'F', 'Other']),
  bloodGroup: z.string().optional()
});

type PatientFormData = z.infer<typeof patientSchema>;

export const PatientRegistration = () => {
  const supabase = useSupabaseClient();
  const form = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema)
  });

  const generateMRN = () => `MRN${Date.now()}`;

  const onSubmit = async (data: PatientFormData) => {
    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: Math.random().toString(36).slice(-12)
      });

      if (authError) throw authError;

      // Create patient record
      const { error: patientError } = await supabase.from('patients').insert({
        user_id: authData.user?.id,
        mrn: generateMRN(),
        date_of_birth: data.dateOfBirth,
        gender: data.gender,
        blood_group: data.bloodGroup
      });

      if (patientError) throw patientError;

      toast.success('Patient registered successfully');
      form.reset();
    } catch (error) {
      toast.error('Registration failed');
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="firstName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>First Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="lastName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Last Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="dateOfBirth"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date of Birth</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="gender"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Gender</FormLabel>
              <FormControl>
                <select {...field} className="border rounded px-2 py-1">
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="Other">Other</option>
                </select>
              </FormControl>
            </FormItem>
          )}
        />
        <Button type="submit">Register Patient</Button>
      </form>
    </Form>
  );
};
```

---

## 5. Lab Technician Dashboard Implementation

### 5.1 ResultEntry Component

```typescript
// src/components/lab/ResultEntry.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const resultSchema = z.object({
  test_name: z.string(),
  result_value: z.string(),
  reference_range: z.string().optional(),
  unit: z.string().optional()
});

type ResultFormData = z.infer<typeof resultSchema>;

export const ResultEntry = ({ labOrderId }: { labOrderId: string }) => {
  const supabase = useSupabaseClient();
  const form = useForm<ResultFormData>({
    resolver: zodResolver(resultSchema)
  });

  const onSubmit = async (data: ResultFormData) => {
    const { error } = await supabase.from('lab_results').insert({
      lab_order_id: labOrderId,
      ...data,
      status: 'pending_review'
    });

    if (error) {
      toast.error('Failed to enter results');
      return;
    }

    toast.success('Results entered successfully');
    form.reset();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="test_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Test Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="result_value"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Result Value</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="reference_range"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reference Range</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="unit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Unit</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        <Button type="submit">Submit Results</Button>
      </form>
    </Form>
  );
};
```

---

## 6. Patient Portal Implementation

### 6.1 MedicalRecords Component

```typescript
// src/components/patient/MedicalRecords.tsx
import { useQuery } from '@tanstack/react-query';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const MedicalRecords = () => {
  const supabase = useSupabaseClient();
  const { user } = useAuth();

  const { data: consultations = [] } = useQuery({
    queryKey: ['consultations', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('consultations')
        .select('*')
        .eq('patient_id', user?.id)
        .order('consultation_date', { ascending: false });
      return data || [];
    }
  });

  const { data: prescriptions = [] } = useQuery({
    queryKey: ['prescriptions', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('prescriptions')
        .select('*')
        .eq('patient_id', user?.id)
        .order('created_at', { ascending: false });
      return data || [];
    }
  });

  const { data: labResults = [] } = useQuery({
    queryKey: ['lab-results', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('lab_results')
        .select('*')
        .order('created_at', { ascending: false });
      return data || [];
    }
  });

  return (
    <Tabs defaultValue="consultations">
      <TabsList>
        <TabsTrigger value="consultations">Consultations</TabsTrigger>
        <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
        <TabsTrigger value="lab-results">Lab Results</TabsTrigger>
      </TabsList>
      <TabsContent value="consultations" className="space-y-4">
        {consultations.map(c => (
          <Card key={c.id}>
            <CardHeader>
              <CardTitle>{new Date(c.consultation_date).toLocaleDateString()}</CardTitle>
            </CardHeader>
            <CardContent>
              <p><strong>Complaint:</strong> {c.chief_complaint}</p>
              <p><strong>Diagnosis:</strong> {c.diagnosis}</p>
            </CardContent>
          </Card>
        ))}
      </TabsContent>
      <TabsContent value="prescriptions" className="space-y-4">
        {prescriptions.map(p => (
          <Card key={p.id}>
            <CardHeader>
              <CardTitle>{p.medication_id}</CardTitle>
            </CardHeader>
            <CardContent>
              <p><strong>Dosage:</strong> {p.dosage}</p>
              <p><strong>Frequency:</strong> {p.frequency}</p>
              <p><strong>Duration:</strong> {p.duration}</p>
            </CardContent>
          </Card>
        ))}
      </TabsContent>
      <TabsContent value="lab-results" className="space-y-4">
        {labResults.map(r => (
          <Card key={r.id}>
            <CardHeader>
              <CardTitle>{r.test_name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p><strong>Result:</strong> {r.result_value} {r.unit}</p>
              <p><strong>Reference:</strong> {r.reference_range}</p>
            </CardContent>
          </Card>
        ))}
      </TabsContent>
    </Tabs>
  );
};
```

---

## 7. Testing Implementation

### 7.1 Unit Test Example

```typescript
// src/test/components/pharmacist/PrescriptionQueue.test.ts
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PrescriptionQueue } from '@/components/pharmacist/PrescriptionQueue';

describe('PrescriptionQueue', () => {
  it('should display pending prescriptions', () => {
    render(<PrescriptionQueue />);
    expect(screen.getByText('Pending Prescriptions')).toBeInTheDocument();
  });

  it('should have verify button for each prescription', () => {
    render(<PrescriptionQueue />);
    const buttons = screen.getAllByText('Verify & Dispense');
    expect(buttons.length).toBeGreaterThan(0);
  });
});
```

### 7.2 E2E Test Example

```typescript
// tests/e2e/consultation-workflow.spec.ts
import { test, expect } from '@playwright/test';

test('complete consultation workflow', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[type="email"]', 'doctor@test.com');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');

  await page.goto('/doctor/patients');
  await page.click('text=John Doe');
  
  await page.fill('textarea[name="chief_complaint"]', 'Headache');
  await page.fill('textarea[name="diagnosis"]', 'Migraine');
  await page.click('button:has-text("Save Consultation")');

  await expect(page).toHaveURL(/\/doctor\/patients/);
});
```

