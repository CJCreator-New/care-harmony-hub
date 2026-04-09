import { useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  PrescriptionSchema,
  PrescriptionFormData,
  type Drug,
  validateClinicalSafety,
  getAgeAppropriateStrengths,
} from '@/lib/schemas/prescriptionSchema';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Trash2, Plus, Pill } from 'lucide-react';
import { toast } from 'sonner';
import { sanitizeForLog } from '@/utils/sanitize';

interface EnhancedPrescriptionFormProps {
  patientId: string;
  patientAge: number;
  patientAllergies?: string[];
  patientPregnant?: boolean;
  patientLactating?: boolean;
  onSave: (prescription: PrescriptionFormData) => Promise<void>;
  prescriberId: string;
  facilityId: string;
  hospitalId: string;
}

/**
 * Clinically-safe prescription form using React Hook Form + Zod
 * Enforces medical validation rules per hims-clinical-forms skill
 */
export function EnhancedPrescriptionForm({
  patientId,
  patientAge,
  patientAllergies = [],
  patientPregnant = false,
  patientLactating = false,
  onSave,
  prescriberId,
  facilityId,
  hospitalId,
}: EnhancedPrescriptionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clinicalWarnings, setClinicalWarnings] = useState<string[]>([]);

  // Mock drug database - in production, fetch from API
  const mockDrugs: Drug[] = [
    {
      id: '1',
      name: 'Lisinopril',
      genericName: 'Lisinopril',
      dosageForms: ['Tablet'],
      strengths: ['5 mg', '10 mg', '20 mg', '40 mg'],
      ageRestrictions: { minAge: 18, category: 'adult' },
      pregnancyCategory: 'D',
      renalClearance: true,
    },
    {
      id: '2',
      name: 'Metformin',
      genericName: 'Metformin HCl',
      dosageForms: ['Tablet'],
      strengths: ['500 mg', '850 mg', '1000 mg'],
      ageRestrictions: { minAge: 10, category: 'unrestricted' },
      pregnancyCategory: 'B',
      renalClearance: true,
    },
    {
      id: '3',
      name: 'Amoxicillin',
      genericName: 'Amoxicillin Trihydrate',
      dosageForms: ['Tablet', 'Capsule', 'Suspension'],
      strengths: ['250 mg', '500 mg', '875 mg'],
      ageRestrictions: { minAge: 0, category: 'unrestricted' },
      pregnancyCategory: 'B',
    },
    {
      id: '4',
      name: 'Ibuprofen',
      genericName: 'Ibuprofen',
      dosageForms: ['Tablet', 'Liquid'],
      strengths: ['200 mg', '400 mg', '600 mg', '800 mg'],
      ageRestrictions: { minAge: 6, category: 'unrestricted' },
      pregnancyCategory: 'C',
    },
    {
      id: '5',
      name: 'Thalidomide',
      genericName: 'Thalidomide',
      dosageForms: ['Capsule'],
      strengths: ['50 mg', '100 mg'],
      ageRestrictions: { minAge: 18, category: 'adult' },
      pregnancyCategory: 'X',
    },
  ];

  // React Hook Form setup with Zod validation
  const {
    control,
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
    setValue,
  } = useForm<PrescriptionFormData>({
    resolver: zodResolver(PrescriptionSchema),
    mode: 'onChange',
    defaultValues: {
      patientId,
      patientAge,
      patientPregnant,
      patientLactating,
      patientAllergies,
      items: [{ id: '1', drug: mockDrugs[0] }] as any,
      status: 'draft',
    },
  });

  // Manage prescription items (medications)
  const { fields: itemFields, append: appendItem, remove: removeItem } = useFieldArray({
    control,
    name: 'items',
  });

  const watchedItems = watch('items');

  // Check for clinical warnings when items change
  const handleItemsChange = (items: any[]) => {
    if (items && items.length > 0) {
      const { warnings } = validateClinicalSafety(
        items.map(item => ({
          ...item,
          id: item.id || '1',
          skipDuplicationCheck: false,
          skipInteractionCheck: false,
        })),
        patientAge,
        patientPregnant,
        patientLactating,
        patientAllergies
      );
      setClinicalWarnings(warnings);
    }
  };

  // Trigger warnings when watched items update
  React.useEffect(() => {
    handleItemsChange(watchedItems);
  }, [watchedItems]);

  // Form submission handler
  const onSubmit = async (data: PrescriptionFormData) => {
    try {
      setIsSubmitting(true);

      // Log prescription creation (sanitized for PHI protection)
      console.log(
        'Prescription submitted:',
        sanitizeForLog({
          prescriber_id: data.prescriber.id,
          item_count: data.items.length,
          status: data.status,
          patient_age: data.patientAge,
        })
      );

      // Validate clinical safety one more time
      const { safe, warnings } = validateClinicalSafety(
        data.items,
        patientAge,
        patientPregnant,
        patientLactating,
        patientAllergies
      );

      if (!safe && data.items.some(item => !item.skipInteractionCheck)) {
        toast.error('Cannot submit: Clinical safety warnings present', {
          description: warnings.join('; '),
        });
        return;
      }

      // Call save handler (typically triggers API call)
      await onSave(data);

      toast.success('Prescription saved successfully');
    } catch (error) {
      console.error('Prescription submission error:', sanitizeForLog(error));
      toast.error('Failed to save prescription', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Patient Information (Read-only Display) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pill className="w-5 h-5" />
            Patient Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Patient ID</label>
              <p className="text-muted-foreground">{patientId}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Age</label>
              <p className="text-muted-foreground">{patientAge} years</p>
            </div>
            {patientPregnant && (
              <Badge variant="destructive">Pregnant</Badge>
            )}
            {patientLactating && (
              <Badge variant="secondary">Lactating</Badge>
            )}
            {patientAllergies.length > 0 && (
              <div>
                <label className="text-sm font-medium">Allergies</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {patientAllergies.map(allergy => (
                    <Badge key={allergy} variant="outline">{allergy}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Clinical Warnings Section */}
      {clinicalWarnings.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
              <div className="space-y-2">
                <h4 className="font-semibold text-yellow-900">Clinical Warnings</h4>
                <ul className="space-y-1 text-sm text-yellow-800">
                  {clinicalWarnings.map((warning, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-yellow-600">•</span>
                      <span>{warning}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Medications Section */}
      <Card>
        <CardHeader>
          <CardTitle>Medications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {itemFields.map((field, index) => (
            <PrescriptionItemField
              key={field.id}
              control={control}
              register={register}
              index={index}
              errors={errors}
              mockDrugs={mockDrugs}
              patientAge={patientAge}
              onRemove={() => removeItem(index)}
              showRemove={itemFields.length > 1}
            />
          ))}

          {/* Add Medication Button */}
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              appendItem({
                id: crypto.randomUUID(),
                drug: mockDrugs[0],
                strength: '',
                dosage: '',
                dosageUnit: 'mg' as const,
                frequency: 'once_daily' as const,
                route: 'oral' as const,
                duration: '7_days' as const,
                quantity: 1,
                refills: 0,
              } as any)
            }
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Medication
          </Button>
        </CardContent>
      </Card>

      {/* Prescriber Information (Prefilled) */}
      <Card>
        <CardHeader>
          <CardTitle>Prescriber</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Prescriber ID: {prescriberId} | Facility: {facilityId}
        </CardContent>
      </Card>

      {/* Clinical Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Clinical Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            {...register('items.0.notes')}
            placeholder="Add clinical notes (e.g., reason for therapy, patient education, monitoring instructions)"
            className="min-h-24"
          />
          {errors.items?.message && (
            <p className="text-sm text-destructive mt-2">{errors.items.message}</p>
          )}
        </CardContent>
      </Card>

      {/* Form Errors */}
      {Object.keys(errors).length > 0 && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-destructive mb-2">Validation Errors</h4>
                <ul className="space-y-1 text-sm text-destructive">
                  {Object.entries(errors).map(([key, error]: any) => (
                    <li key={key}>{error?.message || `Error in ${key}`}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isSubmitting || !isValid}
        className="w-full"
      >
        {isSubmitting ? 'Saving...' : 'Save Prescription'}
      </Button>
    </form>
  );
}

/**
 * Individual prescription item field component
 */
function PrescriptionItemField({
  control,
  register,
  index,
  errors,
  mockDrugs,
  patientAge,
  onRemove,
  showRemove,
}: {
  control: any;
  register: any;
  index: number;
  errors: any;
  mockDrugs: Drug[];
  patientAge: number;
  onRemove: () => void;
  showRemove: boolean;
}) {
  const itemErrors = errors.items?.[index];
  const watchedDrug = control._formValues.items?.[index]?.drug;

  return (
    <Card className="relative">
      <CardContent className="pt-6 space-y-4">
        {/* Drug Selection */}
        <div>
          <label className="text-sm font-medium">Medication</label>
          <Controller
            name={`items.${index}.drug`}
            control={control}
            render={({ field }) => (
              <Select value={field.value?.id} onValueChange={(drugId) => {
                const selectedDrug = mockDrugs.find(d => d.id === drugId);
                field.onChange(selectedDrug);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select medication" />
                </SelectTrigger>
                <SelectContent>
                  {mockDrugs.map(drug => (
                    <SelectItem key={drug.id} value={drug.id}>
                      {drug.name} ({drug.genericName})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        {/* Strength Selection (age-aware) */}
        <div>
          <label className="text-sm font-medium">Strength</label>
          <Controller
            name={`items.${index}.strength`}
            control={control}
            render={({ field }) => {
              const availableStrengths = watchedDrug
                ? getAgeAppropriateStrengths(watchedDrug, patientAge)
                : [];

              return (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select strength" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableStrengths.length > 0 ? (
                      availableStrengths.map(strength => (
                        <SelectItem key={strength} value={strength}>
                          {strength}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem disabled value="">
                        No strengths available for patient age
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              );
            }}
          />
        </div>

        {/* Frequency */}
        <div>
          <label className="text-sm font-medium">Frequency</label>
          <Controller
            name={`items.${index}.frequency`}
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="once_daily">Once daily</SelectItem>
                  <SelectItem value="twice_daily">Twice daily</SelectItem>
                  <SelectItem value="three_times_daily">Three times daily</SelectItem>
                  <SelectItem value="every_4_hours">Every 4 hours</SelectItem>
                  <SelectItem value="every_6_hours">Every 6 hours</SelectItem>
                  <SelectItem value="as_needed">As needed</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>

        {/* Route */}
        <div>
          <label className="text-sm font-medium">Route</label>
          <Controller
            name={`items.${index}.route`}
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select route" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="oral">Oral (by mouth)</SelectItem>
                  <SelectItem value="iv">IV (intravenous)</SelectItem>
                  <SelectItem value="im">IM (intramuscular)</SelectItem>
                  <SelectItem value="topical">Topical</SelectItem>
                  <SelectItem value="inhaled">Inhaled</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>

        {/* Duration */}
        <div>
          <label className="text-sm font-medium">Duration</label>
          <Controller
            name={`items.${index}.duration`}
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3_days">3 days</SelectItem>
                  <SelectItem value="5_days">5 days</SelectItem>
                  <SelectItem value="7_days">7 days</SelectItem>
                  <SelectItem value="14_days">14 days</SelectItem>
                  <SelectItem value="1_month">1 month</SelectItem>
                  <SelectItem value="ongoing">Ongoing</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>

        {/* Quantity & Refills */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Quantity</label>
            <Input
              type="number"
              {...register(`items.${index}.quantity`, { valueAsNumber: true })}
              min="1"
              max="9999"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Refills</label>
            <Input
              type="number"
              {...register(`items.${index}.refills`, { valueAsNumber: true })}
              min="0"
              max="11"
            />
          </div>
        </div>

        {/* Item Errors */}
        {itemErrors && (
          <div className="text-sm text-destructive space-y-1">
            {itemErrors.drug?.message && <p>• {itemErrors.drug.message}</p>}
            {itemErrors.strength?.message && <p>• {itemErrors.strength.message}</p>}
            {itemErrors.quantity?.message && <p>• {itemErrors.quantity.message}</p>}
          </div>
        )}

        {/* Remove Button */}
        {showRemove && (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={onRemove}
            className="w-full"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Remove Medication
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default EnhancedPrescriptionForm;
