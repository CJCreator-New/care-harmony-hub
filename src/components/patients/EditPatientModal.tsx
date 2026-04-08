import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { useUpdatePatient, type Patient } from '@/hooks/usePatients';
import { usePermissions } from '@/hooks/usePermissions';

const editPatientSchema = z.object({
  first_name: z.string().min(2, 'First name must be at least 2 characters'),
  last_name: z.string().min(2, 'Last name must be at least 2 characters'),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  emergency_contact_relationship: z.string().optional(),
  insurance_provider: z.string().optional(),
  insurance_policy_number: z.string().optional(),
  insurance_group_number: z.string().optional(),
  notes: z.string().optional(),
});

type EditPatientFormData = z.infer<typeof editPatientSchema>;

interface EditPatientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: Patient | null | undefined;
}

export function EditPatientModal({ open, onOpenChange, patient }: EditPatientModalProps) {
  const permissions = usePermissions();
  const updatePatient = useUpdatePatient();

  const canEditDemographics = permissions.can('patients:write');

  const form = useForm<EditPatientFormData>({
    resolver: zodResolver(editPatientSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      emergency_contact_relationship: '',
      insurance_provider: '',
      insurance_policy_number: '',
      insurance_group_number: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (!patient) return;
    form.reset({
      first_name: patient.first_name || '',
      last_name: patient.last_name || '',
      phone: patient.phone || '',
      email: patient.email || '',
      address: patient.address || '',
      city: patient.city || '',
      state: patient.state || '',
      zip: patient.zip || '',
      emergency_contact_name: patient.emergency_contact_name || '',
      emergency_contact_phone: patient.emergency_contact_phone || '',
      emergency_contact_relationship: patient.emergency_contact_relationship || '',
      insurance_provider: patient.insurance_provider || '',
      insurance_policy_number: patient.insurance_policy_number || '',
      insurance_group_number: patient.insurance_group_number || '',
      notes: patient.notes || '',
    });
  }, [patient, form]);

  const onSubmit = async (data: EditPatientFormData) => {
    if (!patient?.id) return;

    await updatePatient.mutateAsync({
      id: patient.id,
      updated_at: patient.updated_at,
      first_name: data.first_name,
      last_name: data.last_name,
      phone: data.phone || null,
      email: data.email || null,
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      zip: data.zip || null,
      emergency_contact_name: data.emergency_contact_name || null,
      emergency_contact_phone: data.emergency_contact_phone || null,
      emergency_contact_relationship: data.emergency_contact_relationship || null,
      insurance_provider: data.insurance_provider || null,
      insurance_policy_number: data.insurance_policy_number || null,
      insurance_group_number: data.insurance_group_number || null,
      notes: data.notes || null,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Patient Details</DialogTitle>
          <DialogDescription>
            Update demographic, contact, and insurance details for this patient.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={!canEditDemographics} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={!canEditDemographics} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={!canEditDemographics} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} disabled={!canEditDemographics} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={!canEditDemographics} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={!canEditDemographics} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={!canEditDemographics} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="zip"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ZIP</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={!canEditDemographics} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="insurance_provider"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Insurance Provider</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={!canEditDemographics} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="insurance_policy_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Policy Number</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={!canEditDemographics} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} disabled={!canEditDemographics} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!canEditDemographics || updatePatient.isPending}>
                {updatePatient.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
