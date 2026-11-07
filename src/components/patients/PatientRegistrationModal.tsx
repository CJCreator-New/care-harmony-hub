import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useActivityLog } from '@/hooks/useActivityLog';
import { useHIPAACompliance } from '@/hooks/useDataProtection';
import { sanitizeInput, sanitizeArray } from '@/utils/sanitize';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { FormField } from '@/components/common/FormField';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, UserPlus, User, Phone, Heart, Shield } from 'lucide-react';

const patientSchema = z.object({
  first_name: z.string().trim().min(1, 'First name is required').min(2, 'First name must be at least 2 characters'),
  last_name: z.string().trim().min(1, 'Last name is required').min(2, 'Last name must be at least 2 characters'),
  date_of_birth: z.string().min(1, 'Date of birth is required'),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say'], {
    required_error: "Gender is required",
  }),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  blood_type: z.string().optional(),
  allergies: z.string().optional(),
  chronic_conditions: z.string().optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  emergency_contact_relationship: z.string().optional(),
  insurance_provider: z.string().optional(),
  insurance_policy_number: z.string().optional(),
  insurance_group_number: z.string().optional(),
  notes: z.string().optional(),
});

type PatientFormData = z.infer<typeof patientSchema>;

interface PatientRegistrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function PatientRegistrationModal({
  open,
  onOpenChange,
  onSuccess,
}: PatientRegistrationModalProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const { logActivity } = useActivityLog();
  const { encryptPHI, prepareSecureLog, validateCompliance } = useHIPAACompliance();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');

  const form = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    mode: 'onChange',
    defaultValues: {
      first_name: '',
      last_name: '',
      date_of_birth: '',
      gender: undefined,
      phone: '',
      email: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      blood_type: '',
      allergies: '',
      chronic_conditions: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      emergency_contact_relationship: '',
      insurance_provider: '',
      insurance_policy_number: '',
      insurance_group_number: '',
      notes: '',
    },
  });

  // Tab order for forward-navigation guard (BUG-15)
  const TAB_ORDER = ['personal', 'contact', 'medical', 'insurance'] as const;
  const PERSONAL_REQUIRED_FIELDS: Array<keyof PatientFormData> = [
    'first_name',
    'last_name',
    'date_of_birth',
    'gender',
  ];

  // Guard forward tab navigation: validate Personal required fields before advancing.
  const handleTabChange = async (newTab: string) => {
    const currentIndex = TAB_ORDER.indexOf(activeTab as typeof TAB_ORDER[number]);
    const newIndex = TAB_ORDER.indexOf(newTab as typeof TAB_ORDER[number]);

    if (newIndex > currentIndex && activeTab === 'personal') {
      const isValid = await form.trigger(PERSONAL_REQUIRED_FIELDS);
      if (!isValid) {
        toast({
          title: 'Required fields incomplete',
          description: 'Please fill in all required Personal fields before continuing.',
          variant: 'destructive',
        });
        return;
      }
    }
    setActiveTab(newTab);
  };

  // Derive which tabs have validation errors for visual indicators
  const { errors } = form.formState;
  const tabHasError = {
    personal: !!(errors.first_name || errors.last_name || errors.date_of_birth || errors.gender),
    contact: !!(errors.address || errors.city || errors.state || errors.zip ||
                errors.emergency_contact_name || errors.emergency_contact_phone),
    medical: !!(errors.blood_type || errors.allergies || errors.chronic_conditions),
    insurance: !!(errors.insurance_provider || errors.insurance_policy_number || errors.insurance_group_number),
  };

  // Reset form when modal closes
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      form.reset();
      setActiveTab('personal');
    }
    onOpenChange(isOpen);
  };

  const onSubmit = async (data: PatientFormData) => {
    if (!profile?.hospital_id) {
      toast({
        title: 'Error',
        description: 'No hospital associated with your account',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Generate MRN
      const { data: mrnData, error: mrnError } = await supabase.rpc('generate_mrn', {
        hospital_id: profile.hospital_id,
      });

      if (mrnError) throw mrnError;

      // Prepare patient data (PHI encryption temporarily disabled until fully implemented)
      const patientData = {
        hospital_id: profile.hospital_id,
        mrn: mrnData,
        first_name: sanitizeInput(data.first_name),
        last_name: sanitizeInput(data.last_name),
        date_of_birth: data.date_of_birth,
        gender: data.gender,
        phone: data.phone ? sanitizeInput(data.phone) : null,
        email: data.email ? sanitizeInput(data.email) : null,
        address: data.address ? sanitizeInput(data.address) : null,
        city: data.city ? sanitizeInput(data.city) : null,
        state: data.state ? sanitizeInput(data.state) : null,
        zip: data.zip ? sanitizeInput(data.zip) : null,
        blood_type: data.blood_type ? sanitizeInput(data.blood_type) : null,
        allergies: data.allergies ? sanitizeArray(data.allergies) : [],
        chronic_conditions: data.chronic_conditions ? sanitizeArray(data.chronic_conditions) : [],
        emergency_contact_name: data.emergency_contact_name ? sanitizeInput(data.emergency_contact_name) : null,
        emergency_contact_phone: data.emergency_contact_phone ? sanitizeInput(data.emergency_contact_phone) : null,
        emergency_contact_relationship: data.emergency_contact_relationship ? sanitizeInput(data.emergency_contact_relationship) : null,
        insurance_provider: data.insurance_provider ? sanitizeInput(data.insurance_provider) : null,
        insurance_policy_number: data.insurance_policy_number ? sanitizeInput(data.insurance_policy_number) : null,
        insurance_group_number: data.insurance_group_number ? sanitizeInput(data.insurance_group_number) : null,
        notes: data.notes ? sanitizeInput(data.notes) : null,
      };

      // Encrypt PHI fields if encryption is available
      let encryptionMetadata: Record<string, unknown> | null = null;
      let finalPatientData = patientData;

      try {
        const { data: encryptedData, metadata } = await encryptPHI(patientData as any);
        finalPatientData = encryptedData as any;
        encryptionMetadata = metadata;
      } catch (encryptError) {
        // If encryption fails, log but continue with unencrypted data
        console.warn('PHI encryption failed, proceeding with unencrypted data:', encryptError);
      }

      // Create patient record with encryption metadata if available
      const { data: patientRecord, error: insertError } = await supabase.from('patients').insert({
        ...finalPatientData,
        ...(encryptionMetadata && { encryption_metadata: encryptionMetadata }),
      }).select().single();

      if (insertError) throw insertError;

      // Log activity
      await logActivity({
        actionType: 'patient_create',
        entityType: 'patient',
        entityId: patientRecord.id,
        details: {
          patient_name: `${data.first_name} ${data.last_name}`,
          mrn: mrnData,
          registered_by: profile.id,
          gender: data.gender,
          blood_type: data.blood_type
        }
      });

      toast({
        title: 'Patient registered',
        description: `MRN: ${mrnData} - ${data.first_name} ${data.last_name}`,
      });

      form.reset();
      setActiveTab('personal');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error registering patient:', error);
      toast({
        title: 'Registration failed',
        description: error instanceof Error ? error.message : 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" onEscapeKeyDown={() => handleOpenChange(false)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Register New Patient
          </DialogTitle>
          <DialogDescription>
            Enter patient information to create a new medical record.
            <span className="ml-1 text-xs text-muted-foreground">Fields marked <span className="text-destructive font-semibold">*</span> are required.</span>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit, (fieldErrors) => {
              // Auto-navigate to the first tab containing an error
              if (fieldErrors.first_name || fieldErrors.last_name || fieldErrors.date_of_birth || fieldErrors.gender) {
                setActiveTab('personal');
              } else if (fieldErrors.address || fieldErrors.city || fieldErrors.state || fieldErrors.zip) {
                setActiveTab('contact');
              } else if (fieldErrors.blood_type || fieldErrors.allergies) {
                setActiveTab('medical');
              } else if (fieldErrors.insurance_provider) {
                setActiveTab('insurance');
              }
            })}
            className="space-y-6"
          >
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="personal" className="relative flex items-center gap-1">
                  <User className="h-4 w-4" />
                  <span>Personal</span>
                  {tabHasError.personal && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-destructive rounded-full" aria-hidden="true" />
                  )}
                </TabsTrigger>
                <TabsTrigger value="contact" className="relative flex items-center gap-1">
                  <Phone className="h-4 w-4" />
                  <span>Contact</span>
                  {tabHasError.contact && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-destructive rounded-full" aria-hidden="true" />
                  )}
                </TabsTrigger>
                <TabsTrigger value="medical" className="relative flex items-center gap-1">
                  <Heart className="h-4 w-4" />
                  <span>Medical</span>
                  {tabHasError.medical && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-destructive rounded-full" aria-hidden="true" />
                  )}
                </TabsTrigger>
                <TabsTrigger value="insurance" className="relative flex items-center gap-1">
                  <Shield className="h-4 w-4" />
                  <span>Insurance</span>
                  {tabHasError.insurance && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-destructive rounded-full" aria-hidden="true" />
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="personal" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="first_name" label="First Name" required>
                    {(field, controlProps) => (
                      <Input placeholder="John" {...field} {...controlProps} />
                    )}
                  </FormField>
                  <FormField control={form.control} name="last_name" label="Last Name" required>
                    {(field, controlProps) => (
                      <Input placeholder="Doe" {...field} {...controlProps} />
                    )}
                  </FormField>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="date_of_birth" label="Date of Birth" required>
                    {(field, controlProps) => (
                      <Input type="date" {...field} {...controlProps} />
                    )}
                  </FormField>
                  <FormField control={form.control} name="gender" label="Gender" required>
                    {(field, controlProps) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger {...controlProps}>
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                          <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </FormField>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="phone" label="Phone Number">
                    {(field, controlProps) => (
                      <Input type="tel" placeholder="+91 98765 43210" {...field} {...controlProps} />
                    )}
                  </FormField>
                  <FormField control={form.control} name="email" label="Email">
                    {(field, controlProps) => (
                      <Input type="email" placeholder="patient@email.com" {...field} {...controlProps} />
                    )}
                  </FormField>
                </div>
              </TabsContent>

              <TabsContent value="contact" className="space-y-4 mt-4">
                <FormField control={form.control} name="address" label="Street Address">
                  {(field, controlProps) => (
                    <Input placeholder="123 Main Street" {...field} {...controlProps} />
                  )}
                </FormField>

                <div className="grid grid-cols-3 gap-4">
                  <FormField control={form.control} name="city" label="City">
                    {(field, controlProps) => (
                      <Input placeholder="City" {...field} {...controlProps} />
                    )}
                  </FormField>
                  <FormField control={form.control} name="state" label="State">
                    {(field, controlProps) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger {...controlProps}>
                            <SelectValue placeholder="Select state" />
                          </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Andhra Pradesh">Andhra Pradesh</SelectItem>
                          <SelectItem value="Arunachal Pradesh">Arunachal Pradesh</SelectItem>
                          <SelectItem value="Assam">Assam</SelectItem>
                          <SelectItem value="Bihar">Bihar</SelectItem>
                          <SelectItem value="Chhattisgarh">Chhattisgarh</SelectItem>
                          <SelectItem value="Goa">Goa</SelectItem>
                          <SelectItem value="Gujarat">Gujarat</SelectItem>
                          <SelectItem value="Haryana">Haryana</SelectItem>
                          <SelectItem value="Himachal Pradesh">Himachal Pradesh</SelectItem>
                          <SelectItem value="Jharkhand">Jharkhand</SelectItem>
                          <SelectItem value="Karnataka">Karnataka</SelectItem>
                          <SelectItem value="Kerala">Kerala</SelectItem>
                          <SelectItem value="Madhya Pradesh">Madhya Pradesh</SelectItem>
                          <SelectItem value="Maharashtra">Maharashtra</SelectItem>
                          <SelectItem value="Manipur">Manipur</SelectItem>
                          <SelectItem value="Meghalaya">Meghalaya</SelectItem>
                          <SelectItem value="Mizoram">Mizoram</SelectItem>
                          <SelectItem value="Nagaland">Nagaland</SelectItem>
                          <SelectItem value="Odisha">Odisha</SelectItem>
                          <SelectItem value="Punjab">Punjab</SelectItem>
                          <SelectItem value="Rajasthan">Rajasthan</SelectItem>
                          <SelectItem value="Sikkim">Sikkim</SelectItem>
                          <SelectItem value="Tamil Nadu">Tamil Nadu</SelectItem>
                          <SelectItem value="Telangana">Telangana</SelectItem>
                          <SelectItem value="Tripura">Tripura</SelectItem>
                          <SelectItem value="Uttar Pradesh">Uttar Pradesh</SelectItem>
                          <SelectItem value="Uttarakhand">Uttarakhand</SelectItem>
                          <SelectItem value="West Bengal">West Bengal</SelectItem>
                          <SelectItem value="Andaman and Nicobar Islands">Andaman and Nicobar Islands</SelectItem>
                          <SelectItem value="Chandigarh">Chandigarh</SelectItem>
                          <SelectItem value="Dadra and Nagar Haveli and Daman and Diu">Dadra and Nagar Haveli and Daman and Diu</SelectItem>
                          <SelectItem value="Delhi">Delhi</SelectItem>
                          <SelectItem value="Jammu and Kashmir">Jammu and Kashmir</SelectItem>
                          <SelectItem value="Ladakh">Ladakh</SelectItem>
                          <SelectItem value="Lakshadweep">Lakshadweep</SelectItem>
                          <SelectItem value="Puducherry">Puducherry</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </FormField>
                  <FormField control={form.control} name="zip" label="PIN Code">
                    {(field, controlProps) => (
                      <Input placeholder="110001" {...field} {...controlProps} />
                    )}
                  </FormField>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-4">Emergency Contact</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <FormField control={form.control} name="emergency_contact_name" label="Contact Name">
                      {(field, controlProps) => (
                        <Input placeholder="Jane Doe" {...field} {...controlProps} />
                      )}
                    </FormField>
                    <FormField control={form.control} name="emergency_contact_phone" label="Contact Phone">
                      {(field, controlProps) => (
                        <Input type="tel" placeholder="+91 98765 43210" {...field} {...controlProps} />
                      )}
                    </FormField>
                    <FormField control={form.control} name="emergency_contact_relationship" label="Relationship">
                      {(field, controlProps) => (
                        <Input placeholder="Spouse, Parent, etc." {...field} {...controlProps} />
                      )}
                    </FormField>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="medical" className="space-y-4 mt-4">
                <FormField control={form.control} name="blood_type" label="Blood Type">
                  {(field, controlProps) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger {...controlProps}>
                          <SelectValue placeholder="Select blood type" />
                        </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A+">A+</SelectItem>
                        <SelectItem value="A-">A-</SelectItem>
                        <SelectItem value="B+">B+</SelectItem>
                        <SelectItem value="B-">B-</SelectItem>
                        <SelectItem value="AB+">AB+</SelectItem>
                        <SelectItem value="AB-">AB-</SelectItem>
                        <SelectItem value="O+">O+</SelectItem>
                        <SelectItem value="O-">O-</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </FormField>

                <FormField control={form.control} name="allergies" label="Allergies">
                  {(field, controlProps) => (
                    <Textarea
                      placeholder="Enter allergies separated by commas (e.g., Penicillin, Peanuts)"
                      {...field}
                      {...controlProps}
                    />
                  )}
                </FormField>

                <FormField control={form.control} name="chronic_conditions" label="Chronic Conditions">
                  {(field, controlProps) => (
                    <Textarea
                      placeholder="Enter conditions separated by commas (e.g., Diabetes, Hypertension)"
                      {...field}
                      {...controlProps}
                    />
                  )}
                </FormField>

                <FormField control={form.control} name="notes" label="Additional Notes">
                  {(field, controlProps) => (
                    <Textarea
                      placeholder="Any additional medical notes..."
                      {...field}
                      {...controlProps}
                    />
                  )}
                </FormField>
              </TabsContent>

              <TabsContent value="insurance" className="space-y-4 mt-4">
                <FormField control={form.control} name="insurance_provider" label="Insurance Provider">
                  {(field, controlProps) => (
                    <Input placeholder="Insurance Company Name" {...field} {...controlProps} />
                  )}
                </FormField>

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="insurance_policy_number" label="Policy Number">
                    {(field, controlProps) => (
                      <Input placeholder="Policy #" {...field} {...controlProps} />
                    )}
                  </FormField>
                  <FormField control={form.control} name="insurance_group_number" label="Group Number">
                    {(field, controlProps) => (
                      <Input placeholder="Group #" {...field} {...controlProps} />
                    )}
                  </FormField>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Register Patient
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
