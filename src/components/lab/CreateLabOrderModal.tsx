import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Search } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateLabOrder } from '@/hooks/useLabOrders';
import { usePatients, useSearchPatients } from '@/hooks/usePatients';

const TEST_CATEGORIES = [
  'Hematology',
  'Chemistry',
  'Microbiology',
  'Immunology',
  'Urinalysis',
  'Pathology',
  'Radiology',
  'Cardiology',
  'Other',
];

const SAMPLE_TYPES = [
  'Blood',
  'Urine',
  'Stool',
  'Sputum',
  'Swab',
  'Tissue',
  'CSF',
  'Other',
];

const formSchema = z.object({
  test_name: z.string().min(1, 'Test name is required'),
  test_category: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  sample_type: z.string().optional(),
  test_code: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface CreateLabOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateLabOrderModal({ open, onOpenChange }: CreateLabOrderModalProps) {
  const { hospital, profile } = useAuth();
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<{
    id: string;
    name: string;
    mrn: string;
  } | null>(null);

  const { data: allPatientsData, isLoading: allPatientsLoading } = usePatients({ limit: 100 });
  const { data: searchResults, isLoading: searchLoading } = useSearchPatients(patientSearch);
  const createOrder = useCreateLabOrder();

  const filteredPatients =
    patientSearch.length >= 2 ? (searchResults || []) : (allPatientsData?.patients || []);
  const patientsLoading =
    !hospital?.id || (patientSearch.length >= 2 ? searchLoading : allPatientsLoading);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      test_name: '',
      test_category: '',
      priority: 'normal',
      sample_type: '',
      test_code: '',
    },
  });

  const handlePatientSelect = (patient: (typeof filteredPatients)[number]) => {
    setSelectedPatient({
      id: patient.id,
      name: `${patient.first_name} ${patient.last_name}`,
      mrn: patient.mrn,
    });
    setPatientSearch('');
  };

  const onSubmit = async (data: FormData) => {
    if (!selectedPatient || !hospital?.id || !profile?.id) return;

    await createOrder.mutateAsync({
      hospital_id: hospital.id,
      patient_id: selectedPatient.id,
      ordered_by: profile.id,
      test_name: data.test_name,
      test_category: data.test_category || null,
      test_code: data.test_code || null,
      priority: (data.priority as any) || 'normal',
      sample_type: data.sample_type || null,
      status: 'pending',
    });

    form.reset();
    setSelectedPatient(null);
    setPatientSearch('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Lab Order</DialogTitle>
          <DialogDescription>Create a manual lab order for a patient.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* Patient selection */}
            <div className="space-y-2">
              <FormLabel>Patient *</FormLabel>
              {selectedPatient ? (
                <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                  <div>
                    <p className="font-medium">{selectedPatient.name}</p>
                    <p className="text-sm text-muted-foreground">MRN: {selectedPatient.mrn}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedPatient(null)}
                  >
                    Change
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search patient by name or MRN…"
                      className="pl-9"
                      value={patientSearch}
                      onChange={(e) => setPatientSearch(e.target.value)}
                    />
                  </div>
                  <div className="border rounded-md max-h-40 overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>MRN</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {patientsLoading ? (
                          <TableRow>
                            <TableCell colSpan={2} className="text-center py-4">
                              <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                            </TableCell>
                          </TableRow>
                        ) : filteredPatients.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={2} className="text-center py-4 text-muted-foreground">
                              {patientSearch ? 'No patients found' : 'No patients available'}
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredPatients.slice(0, 8).map((patient) => (
                            <TableRow
                              key={patient.id}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => handlePatientSelect(patient)}
                            >
                              <TableCell>
                                {patient.first_name} {patient.last_name}
                              </TableCell>
                              <TableCell className="text-muted-foreground">{patient.mrn}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>

            {/* Test name */}
            <FormField
              control={form.control}
              name="test_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Test Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Complete Blood Count" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              {/* Test category */}
              <FormField
                control={form.control}
                name="test_category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TEST_CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Priority */}
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Sample type */}
              <FormField
                control={form.control}
                name="sample_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sample Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SAMPLE_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Test code */}
              <FormField
                control={form.control}
                name="test_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Test Code</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. CBC-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!selectedPatient || createOrder.isPending}
              >
                {createOrder.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Lab Order
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
