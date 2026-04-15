/**
 * TelehealthPrescriptionIssuance.tsx
 * React component for doctors to issue prescriptions during active telehealth sessions
 * 
 * Clinical Workflow:
 * 1. Doctor has active Zoom/Twilio session with patient
 * 2. Doctor selects medications from hospital formulary
 * 3. System validates: quantity, dosage, patient allergies, drug interactions
 * 4. Doctor reviews prescription summary and confirms
 * 5. System sends EDI-formatted prescription to patient's pharmacy
 * 6. Patient receives email + encrypted prescription details
 * 7. Audit trail recorded (HIPAA 164.312(a)(2)(ii))
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useHIPAACompliance } from '@/hooks/useHIPAACompliance';
import { usePermissions } from '@/hooks/usePermissions';
import { sanitizeForLog } from '@/lib/security/sanitization';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, AlertCircle, CheckCircle2, Pill, Clock, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Validation Schema for Individual Medication
 */
const MedicationItemSchema = z.object({
  medication_id: z.string().min(1, 'Medication is required'),
  dosage: z.string().min(1, 'Dosage is required'),
  frequency: z.enum(['once_daily', 'twice_daily', 'three_times_daily', 'four_times_daily', 'as_needed'], {
    errorMap: () => ({ message: 'Valid frequency required' }),
  }),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  refills: z.number().min(0, 'Refills cannot be negative').max(11, 'Max 11 refills allowed'),
  duration_days: z.number().min(1, 'Duration must be at least 1 day'),
  special_instructions: z.string().optional().nullable(),
});

/**
 * Main Form Schema
 */
const PrescriptionFormSchema = z.object({
  session_id: z.string().min(1, 'Telehealth session is required'),
  medications: z.array(MedicationItemSchema).min(1, 'At least one medication required'),
  patient_instructions: z.string().optional().nullable(),
  confirm_reviewed: z.boolean().refine(val => val === true, 'Must confirm you reviewed prescription'),
});

type PrescriptionFormData = z.infer<typeof PrescriptionFormSchema>;

/**
 * Type Definitions
 */
interface TelehealthSession {
  id: string;
  patient_id: string;
  doctor_id: string;
  patient_name: string;
  started_at: string;
  status: 'active' | 'completed' | 'ended';
  duration_minutes: number;
}

interface Medication {
  id: string;
  code: string;
  name: string;
  generic_name: string;
  dosage_forms: string[];
  available_strengths: string[];
  is_controlled: boolean;
  pregnancy_category: 'A' | 'B' | 'C' | 'D' | 'X' | null;
  contra_indications: string[];
  side_effects: string[];
}

interface PatientAllergyProfile {
  patient_id: string;
  allergies: string[]; // NDC codes of medications patient is allergic to
  restrictions: string[]; // General allergy types (e.g., "penicillin-based")
}

interface DrugInteractionCheck {
  severity: 'none' | 'mild' | 'moderate' | 'severe';
  interactions: Array<{
    medication1: string;
    medication2: string;
    description: string;
    recommendation: 'proceed_with_caution' | 'monitor' | 'contraindicated';
  }>;
}

interface TelehealthPrescriptionIssuanceProps {
  sessionId: string;
  patientId: string;
  onPrescriptionIssued?: (prescriptionId: string) => void;
  onClose?: () => void;
}

/**
 * Main Component
 */
export const TelehealthPrescriptionIssuance: React.FC<TelehealthPrescriptionIssuanceProps> = ({
  sessionId,
  patientId,
  onPrescriptionIssued,
  onClose,
}) => {
  const { role } = usePermissions();
  const { encryptSensitiveData } = useHIPAACompliance();
  const [activeTab, setActiveTab] = useState<'medications' | 'review'>('medications');
  const [selectedMedications, setSelectedMedications] = useState<Map<string, Medication>>(new Map());
  const [drugInteractions, setDrugInteractions] = useState<DrugInteractionCheck | null>(null);
  const [highZIndicator, setHighZIndicator] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Check authorization
  if (role !== 'doctor' && role !== 'nurse_practitioner' && role !== 'physician_assistant') {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Unauthorized: Only licensed prescribers can issue prescriptions</AlertDescription>
      </Alert>
    );
  }

  /**
   * QUERY: Fetch active telehealth session
   */
  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ['telehealth-session', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('telehealth_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) throw error;
      if (data?.status !== 'active') {
        throw new Error('Telehealth session is not active');
      }

      return data as TelehealthSession;
    },
    staleTime: 5000, // Refresh every 5 seconds
    enabled: !!sessionId,
  });

  /**
   * QUERY: Fetch hospital formulary (available medications)
   */
  const { data: formulary } = useQuery({
    queryKey: ['hospital-formulary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hospital_formulary')
        .select('*')
        .eq('active', true)
        .order('name');

      if (error) throw error;
      return data as Medication[];
    },
  });

  /**
   * QUERY: Fetch patient allergy profile
   */
  const { data: allergyProfile } = useQuery({
    queryKey: ['patient-allergies', patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patient_allergy_profiles')
        .select('*')
        .eq('patient_id', patientId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
      return (data || { allergies: [], restrictions: [] }) as PatientAllergyProfile;
    },
  });

  /**
   * MUTATION: Check drug interactions
   */
  const checkDrugInteractionsMutation = useMutation({
    mutationFn: async (medicationIds: string[]) => {
      const { data, error } = await supabase.functions.invoke('check-drug-interactions', {
        body: {
          medication_ids: medicationIds,
          patient_id: patientId,
        },
      });

      if (error) throw error;
      return data as DrugInteractionCheck;
    },
    onSuccess: (data) => {
      setDrugInteractions(data);
      if (data.severity === 'severe') {
        toast.error('Severe drug interaction detected. Please review before issuing.');
      } else if (data.severity === 'moderate') {
        toast.warning('Moderate drug interaction. Verify patient monitoring.');
      }
    },
    onError: (error) => {
      toast.error('Failed to check drug interactions');
      console.error(sanitizeForLog(error));
    },
  });

  /**
   * MUTATION: Issue telehealth prescription
   */
  const issuePrescriptionMutation = useMutation({
    mutationFn: async (formData: PrescriptionFormData) => {
      // Validate doctor permissions
      const { data: doctorCheck, error: doctorError } = await supabase
        .from('doctors')
        .select('prescriber_license, dea_number')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (doctorError || !doctorCheck) {
        throw new Error('Doctor not found or unauthorized');
      }

      if (!doctorCheck.prescriber_license || !doctorCheck.dea_number) {
        throw new Error('Doctor missing required prescriber credentials');
      }

      // Encrypt prescription data
      const encryptedData = await encryptSensitiveData({
        medications: formData.medications,
        patient_instructions: formData.patient_instructions,
        created_at: new Date().toISOString(),
      });

      // Call Edge Function to issue prescription
      const { data, error } = await supabase.functions.invoke('issue-telehealth-prescription', {
        body: {
          session_id: formData.session_id,
          patient_id: patientId,
          medications: formData.medications,
          patient_instructions: formData.patient_instructions,
          encryption_metadata: encryptedData.metadata,
        },
      });

      if (error) throw error;
      return data as { prescription_id: string; pharmacy_notification_sent: boolean };
    },
    onSuccess: (data) => {
      toast.success(`Prescription issued successfully (ID: ${data.prescription_id})`);
      onPrescriptionIssued?.(data.prescription_id);
      form.reset();
      onClose?.();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to issue prescription');
      console.error(sanitizeForLog(error));
    },
  });

  /**
   * React Hook Form Setup
   */
  const form = useForm<PrescriptionFormData>({
    resolver: zodResolver(PrescriptionFormSchema),
    defaultValues: {
      session_id: sessionId,
      medications: [
        {
          medication_id: '',
          dosage: '',
          frequency: 'three_times_daily',
          quantity: 30,
          refills: 0,
          duration_days: 30,
          special_instructions: '',
        },
      ],
      patient_instructions: '',
      confirm_reviewed: false,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'medications',
  });

  /**
   * Handle medication selection and check interactions
   */
  const handleMedicationChange = useCallback(
    (fieldIndex: number, medicationId: string) => {
      const medication = formulary?.find(m => m.id === medicationId);
      if (medication) {
        const newMap = new Map(selectedMedications);
        newMap.set(`field-${fieldIndex}`, medication);
        setSelectedMedications(newMap);

        // Check for allergies
        if (allergyProfile?.allergies.includes(medication.code)) {
          toast.error(`⚠️ ALLERGY ALERT: Patient allergic to ${medication.name}`);
          setHighZIndicator(true);
        }

        // Re-check drug interactions across all selected medications
        const allMedicationIds = Array.from(newMap.values()).map(m => m.id);
        checkDrugInteractionsMutation.mutate(allMedicationIds);
      }
    },
    [formulary, allergyProfile, selectedMedications]
  );

  if (sessionLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Loading telehealth session...</span>
      </div>
    );
  }

  if (!session) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Telehealth session not found or no longer active</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      {/* High-Z Indicator */}
      {highZIndicator && (
        <Alert variant="default" className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            ⚠️ ALLERGY or INTERACTION WARNING: Review patient profile carefully before confirming
          </AlertDescription>
        </Alert>
      )}

      {/* Session Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Telehealth Prescription Issuance</CardTitle>
              <CardDescription>Patient: {session.patient_name}</CardDescription>
            </div>
            <Badge variant="outline" className="bg-green-50">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Session Active
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Main Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(data => issuePrescriptionMutation.mutate(data))} className="space-y-6">
          <Tabs value={activeTab} onValueChange={value => setActiveTab(value as 'medications' | 'review')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="medications">Medications ({fields.length})</TabsTrigger>
              <TabsTrigger value="review">Review & Confirm</TabsTrigger>
            </TabsList>

            {/* TAB 1: MEDICATIONS */}
            <TabsContent value="medications" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Add Medications</CardTitle>
                  <CardDescription>Select from hospital formulary (all medications clinically verified)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ScrollArea className="h-[600px] rounded-md border p-4">
                    {fields.map((field, index) => (
                      <div key={field.id} className="mb-6 pb-6 border-b last:border-b-0">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-medium">Medication {index + 1}</h4>
                          {fields.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => remove(index)}
                              className="text-red-600 hover:text-red-700"
                            >
                              Remove
                            </Button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Medication Selection */}
                          <FormField
                            control={form.control}
                            name={`medications.${index}.medication_id`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Medication Name *</FormLabel>
                                <Select value={field.value} onValueChange={val => {
                                  field.onChange(val);
                                  handleMedicationChange(index, val);
                                }}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select medication" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {formulary?.map(med => (
                                      <SelectItem key={med.id} value={med.id}>
                                        {med.name} ({med.generic_name})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* Dosage */}
                          <FormField
                            control={form.control}
                            name={`medications.${index}.dosage`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Dosage *</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g., 500mg" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* Frequency */}
                          <FormField
                            control={form.control}
                            name={`medications.${index}.frequency`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Frequency *</FormLabel>
                                <Select value={field.value} onValueChange={field.onChange}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="once_daily">Once Daily</SelectItem>
                                    <SelectItem value="twice_daily">Twice Daily</SelectItem>
                                    <SelectItem value="three_times_daily">Three Times Daily</SelectItem>
                                    <SelectItem value="four_times_daily">Four Times Daily</SelectItem>
                                    <SelectItem value="as_needed">As Needed</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* Quantity */}
                          <FormField
                            control={form.control}
                            name={`medications.${index}.quantity`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Quantity *</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    min="1" 
                                    {...field} 
                                    onChange={e => field.onChange(Number(e.target.value))}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* Refills */}
                          <FormField
                            control={form.control}
                            name={`medications.${index}.refills`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Refills (0-11)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    min="0" 
                                    max="11" 
                                    {...field} 
                                    onChange={e => field.onChange(Number(e.target.value))}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* Duration */}
                          <FormField
                            control={form.control}
                            name={`medications.${index}.duration_days`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Duration (Days) *</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    min="1" 
                                    {...field} 
                                    onChange={e => field.onChange(Number(e.target.value))}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* Special Instructions */}
                          <FormField
                            control={form.control}
                            name={`medications.${index}.special_instructions`}
                            render={({ field }) => (
                              <FormItem className="md:col-span-2">
                                <FormLabel>Special Instructions</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="e.g., Take with food, Avoid dairy products"
                                    {...field}
                                    value={field.value || ''}
                                  />
                                </FormControl>
                                <FormDescription>Optional clinical guidance for patient</FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Controlled Substance Indicator */}
                        {selectedMedications.get(`field-${index}`)?.is_controlled && (
                          <Alert className="mt-4 border-red-200 bg-red-50">
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                            <AlertDescription className="text-red-800">
                              ⚠️ CONTROLLED SUBSTANCE: DEA tracking required
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    ))}
                  </ScrollArea>

                  {/* Add Medication Button */}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      append({
                        medication_id: '',
                        dosage: '',
                        frequency: 'three_times_daily',
                        quantity: 30,
                        refills: 0,
                        duration_days: 30,
                        special_instructions: '',
                      })
                    }
                    className="w-full"
                  >
                    <Pill className="h-4 w-4 mr-2" />
                    Add Another Medication
                  </Button>
                </CardContent>
              </Card>

              {/* Patient Instructions Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Patient Instructions</CardTitle>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="patient_instructions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>General Instructions (Optional)</FormLabel>
                        <FormControl>
                          <textarea
                            className="w-full p-3 border rounded-md text-sm"
                            rows={3}
                            placeholder="e.g., Take all antibiotics even if you feel better, Schedule follow-up in 2 weeks"
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormDescription>Clinical notes for patient adherence</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Drug Interactions Display */}
              {drugInteractions && drugInteractions.severity !== 'none' && (
                <Card className={drugInteractions.severity === 'severe' ? 'border-red-200' : 'border-yellow-200'}>
                  <CardHeader>
                    <CardTitle className="text-base">Drug Interactions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {drugInteractions.interactions.map((interaction, idx) => (
                      <div key={idx} className="text-sm p-3 bg-gray-50 rounded-md">
                        <div className="font-medium">
                          {interaction.medication1} + {interaction.medication2}
                        </div>
                        <div className="text-gray-600 mt-1">{interaction.description}</div>
                        <div className="mt-2">
                          <Badge variant={interaction.recommendation === 'contraindicated' ? 'destructive' : 'outline'}>
                            {interaction.recommendation.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Navigation */}
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={() => setActiveTab('review')}>
                  Continue to Review
                </Button>
              </div>
            </TabsContent>

            {/* TAB 2: REVIEW & CONFIRM */}
            <TabsContent value="review" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Prescription Summary</CardTitle>
                  <CardDescription>Review before final issuance</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Medications Summary Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b">
                        <tr className="text-left">
                          <th className="pb-2 font-medium">Medication</th>
                          <th className="pb-2 font-medium">Dosage</th>
                          <th className="pb-2 font-medium">Frequency</th>
                          <th className="pb-2 font-medium">Qty</th>
                          <th className="pb-2 font-medium">Duration</th>
                          <th className="pb-2 font-medium">Refills</th>
                        </tr>
                      </thead>
                      <tbody>
                        {form.watch('medications').map((med, idx) => (
                          <tr key={idx} className="border-b">
                            <td className="py-2">
                              {formulary?.find(m => m.id === med.medication_id)?.name || 'N/A'}
                            </td>
                            <td>{med.dosage}</td>
                            <td>{med.frequency.replace(/_/g, ' ')}</td>
                            <td>{med.quantity}</td>
                            <td>{med.duration_days} days</td>
                            <td>{med.refills}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Patient Instructions */}
                  {form.watch('patient_instructions') && (
                    <div className="bg-blue-50 p-3 rounded-md text-sm">
                      <div className="font-medium mb-1">Patient Instructions</div>
                      <div>{form.watch('patient_instructions')}</div>
                    </div>
                  )}

                  {/* Confirmation Checkbox */}
                  <FormField
                    control={form.control}
                    name="confirm_reviewed"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2 space-y-0 pt-4">
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            className="h-4 w-4 border rounded"
                          />
                        </FormControl>
                        <FormLabel className="font-normal cursor-pointer">
                          I confirm that I have reviewed this prescription and it is appropriate for the patient
                        </FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Session Duration Info */}
                  <Alert>
                    <Clock className="h-4 w-4" />
                    <AlertDescription>
                      Session duration: {Math.round((new Date().getTime() - new Date(session.started_at).getTime()) / 60000)} minutes
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              {/* Navigation & Submit */}
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setActiveTab('medications')}>
                  Back to Medications
                </Button>
                <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                  <DialogTrigger asChild>
                    <Button disabled={!form.watch('confirm_reviewed') || issuePrescriptionMutation.isPending}>
                      {issuePrescriptionMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Issue Prescription
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Confirm Prescription Issuance</DialogTitle>
                      <DialogDescription>
                        This will send the prescription to the patient's pharmacy and create an audit trail.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="p-3 bg-gray-50 rounded-md text-sm">
                        <div className="font-medium mb-2">Medicines to be sent:</div>
                        <ul className="space-y-1">
                          {form.watch('medications').map((med, idx) => (
                            <li key={idx}>
                              • {formulary?.find(m => m.id === med.medication_id)?.name} {med.dosage}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
                          Cancel
                        </Button>
                        <Button
                          onClick={() => {
                            form.handleSubmit(data => {
                              issuePrescriptionMutation.mutate(data);
                              setShowConfirmDialog(false);
                            })();
                          }}
                          disabled={issuePrescriptionMutation.isPending}
                        >
                          {issuePrescriptionMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          Confirm & Issue
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </TabsContent>
          </Tabs>
        </form>
      </Form>
    </div>
  );
};

export default TelehealthPrescriptionIssuance;
