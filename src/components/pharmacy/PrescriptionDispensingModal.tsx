import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  AlertTriangle,
  CheckCircle2,
  Pill,
  User,
  Loader2,
  ShieldAlert,
  Lock,
  PackageCheck,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useMedications } from '@/lib/hooks/pharmacy';

const CONTROLLED_KEYWORDS = [
  'morphine',
  'fentanyl',
  'oxycodone',
  'codeine',
  'tramadol',
  'lorazepam',
  'diazepam',
  'midazolam',
  'alprazolam',
  'clonazepam',
  'methadone',
  'hydromorphone',
  'ketamine',
  'propofol',
  'buprenorphine',
  'pethidine',
  'meperidine',
  'insulin',
  'heparin',
  'potassium chloride',
  'warfarin',
];

const dispenseSchema = z.object({
  batchNumber: z.string().min(1, 'Batch number is required'),
  notes: z.string().optional(),
});

export interface PrescriptionDispensingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prescription: {
    id: string;
    patient_name: string;
    patient_mrn: string;
    doctor_name: string;
    items: Array<{
      id?: string;
      medication_name: string;
      dosage: string;
      frequency: string;
      duration: string;
      quantity: number;
      instructions: string;
    }>;
    created_at: string;
  } | null;
  onDispense: (data: {
    batchNumber: string;
    patientVerified: boolean;
    safetyChecksComplete: boolean;
    notes: string;
    items: Array<{
      itemId?: string;
      medicationName: string;
      prescribedQuantity: number;
      dispensedQuantity: number;
      batchNumber?: string;
    }>;
    witness?: {
      witnessName: string;
      witnessRole: string;
      photoIdVerified: boolean;
    };
  }) => void;
  isLoading?: boolean;
}

export function PrescriptionDispensingModal({
  open,
  onOpenChange,
  prescription,
  onDispense,
  isLoading = false,
}: PrescriptionDispensingModalProps) {
  const { data: inventoryMedications } = useMedications();
  const [patientVerified, setPatientVerified] = useState(false);
  const [safetyChecksComplete, setSafetyChecksComplete] = useState(false);

  // Controlled substance dual-witness states (A4)
  const [witnessName, setWitnessName] = useState('');
  const [witnessRole, setWitnessRole] = useState('Pharmacist');
  const [witnessVerified, setWitnessVerified] = useState(false);
  const [photoIdVerified, setPhotoIdVerified] = useState(false);

  // Partial dispensing allocations: item index -> dispensed quantity (A3)
  const [itemQuantities, setItemQuantities] = useState<Record<number, number>>({});

  const form = useForm<z.infer<typeof dispenseSchema>>({
    resolver: zodResolver(dispenseSchema),
    defaultValues: { batchNumber: '', notes: '' },
  });

  // Initialize item quantities and auto-populate batch from inventory
  useEffect(() => {
    if (prescription?.items) {
      const initialQtys: Record<number, number> = {};
      let suggestedBatch = '';

      prescription.items.forEach((item, idx) => {
        initialQtys[idx] = item.quantity;
        const match = inventoryMedications?.find(
          (m) =>
            m.name.toLowerCase().trim() === item.medication_name.toLowerCase().trim() ||
            (m.generic_name &&
              m.generic_name.toLowerCase().trim() === item.medication_name.toLowerCase().trim())
        );
        if (match?.batch_number && !suggestedBatch) {
          suggestedBatch = match.batch_number;
        }
      });

      setItemQuantities(initialQtys);
      if (suggestedBatch) {
        form.setValue('batchNumber', suggestedBatch);
      }
    }
  }, [prescription, inventoryMedications, form]);

  // Detect controlled or high-alert substances in the prescription (A4)
  const isControlledPrescription = useMemo(() => {
    if (!prescription?.items) return false;
    return prescription.items.some((item) => {
      const lower = item.medication_name.toLowerCase();
      return CONTROLLED_KEYWORDS.some((kw) => lower.includes(kw));
    });
  }, [prescription?.items]);

  // Calculate stock status and backorders for each item (A1 & A3)
  const itemStockStatus = useMemo(() => {
    if (!prescription?.items) return [];

    return prescription.items.map((item, idx) => {
      const match = inventoryMedications?.find(
        (m) =>
          m.name.toLowerCase().trim() === item.medication_name.toLowerCase().trim() ||
          (m.generic_name &&
            m.generic_name.toLowerCase().trim() === item.medication_name.toLowerCase().trim())
      );

      const availableStock = match ? match.current_stock : 999;
      const isExpired = match?.expiry_date ? new Date(match.expiry_date) < new Date() : false;
      const dispensedQty = itemQuantities[idx] ?? item.quantity;
      const backorderQty = Math.max(0, item.quantity - dispensedQty);

      return {
        item,
        idx,
        match,
        availableStock,
        isExpired,
        dispensedQty,
        backorderQty,
        isInsufficient: availableStock < dispensedQty,
      };
    });
  }, [prescription?.items, inventoryMedications, itemQuantities]);

  const hasExpiredMedication = itemStockStatus.some((s) => s.isExpired && s.dispensedQty > 0);
  const hasInsufficientStock = itemStockStatus.some((s) => s.isInsufficient && s.dispensedQty > 0);
  const hasPartialDispense = itemStockStatus.some((s) => s.backorderQty > 0);

  // Witness verification validation (A4)
  const isWitnessValid =
    !isControlledPrescription ||
    (witnessVerified && photoIdVerified && witnessName.trim().length >= 2);

  const handleDispense = form.handleSubmit((data) => {
    if (!patientVerified) {
      toast.error('Please verify patient identity before dispensing');
      return;
    }
    if (!safetyChecksComplete) {
      toast.error('Please complete all safety checks before dispensing');
      return;
    }
    if (hasExpiredMedication) {
      toast.error('Cannot dispense expired medications. Please replace batch.');
      return;
    }
    if (hasInsufficientStock) {
      toast.error('Insufficient stock in inventory for selected quantities.');
      return;
    }
    if (isControlledPrescription && !isWitnessValid) {
      toast.error(
        'Secondary clinical witness verification and photo ID check are mandatory for controlled substances.'
      );
      return;
    }

    const formattedItems = itemStockStatus.map((s) => ({
      itemId: s.item.id,
      medicationName: s.item.medication_name,
      prescribedQuantity: s.item.quantity,
      dispensedQuantity: s.dispensedQty,
      batchNumber: data.batchNumber,
    }));

    onDispense({
      batchNumber: data.batchNumber,
      patientVerified,
      safetyChecksComplete,
      notes: (data.notes ?? '').trim(),
      items: formattedItems,
      witness: isControlledPrescription
        ? {
            witnessName: witnessName.trim(),
            witnessRole,
            photoIdVerified,
          }
        : undefined,
    });

    form.reset();
    setPatientVerified(false);
    setSafetyChecksComplete(false);
    setWitnessVerified(false);
    setPhotoIdVerified(false);
    setWitnessName('');
  });

  if (!prescription) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5 text-primary" />
            Dispense Prescription & Deduct Stock
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleDispense} className="space-y-6">
            {/* Patient info */}
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4" />
                <h3 className="font-medium">Patient Information</h3>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Name:</span>
                  <p className="font-medium">{prescription.patient_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">MRN:</span>
                  <p className="font-medium font-mono">{prescription.patient_mrn}</p>
                </div>
              </div>
            </div>

            {/* Controlled Substance / High Alert Banner (A4) */}
            {isControlledPrescription && (
              <div className="rounded-lg border border-purple-300 bg-purple-50 p-3.5 dark:border-purple-900/60 dark:bg-purple-950/40">
                <div className="flex items-start gap-2.5">
                  <ShieldAlert className="h-5 w-5 text-purple-700 dark:text-purple-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-purple-900 dark:text-purple-200">
                        CONTROLLED SUBSTANCE (SCHEDULE II-IV) / HIGH-ALERT MEDICATION
                      </span>
                      <Badge className="bg-purple-600 text-white text-[10px] py-0">
                        MANDATORY WITNESS
                      </Badge>
                    </div>
                    <p className="text-xs text-purple-800 dark:text-purple-300">
                      Hospital Policy & DEA Compliance require patient photo identification and
                      dual-staff witness signoff before releasing this prescription.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Medications to Dispense with Real-time Stock Allocation & Partial Quantity Controls (A1 & A3) */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium flex items-center gap-1.5">
                  <PackageCheck className="h-4 w-4 text-primary" />
                  Medication Allocation & Stock Depletion
                </h3>
                {hasPartialDispense && (
                  <Badge
                    variant="secondary"
                    className="bg-amber-100 text-amber-800 border-amber-300"
                  >
                    Partial Dispensation Active
                  </Badge>
                )}
              </div>

              <div className="space-y-3">
                {itemStockStatus.map((status) => (
                  <div
                    key={`${status.item.medication_name}-${status.item.dosage}`}
                    className={`border rounded-lg p-3 space-y-2 ${
                      status.isExpired
                        ? 'border-red-300 bg-red-50/50 dark:bg-red-950/20'
                        : status.isInsufficient
                          ? 'border-amber-300 bg-amber-50/50 dark:bg-amber-950/20'
                          : 'border-border'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-primary text-sm">
                          {status.item.medication_name}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {status.item.dosage} • {status.item.frequency} • {status.item.duration}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground">Stock:</span>
                          <Badge
                            variant={status.availableStock < 5 ? 'destructive' : 'outline'}
                            className="text-xs"
                          >
                            {status.match
                              ? `${status.availableStock} in inventory`
                              : 'Unmatched med'}
                          </Badge>
                        </div>
                        {status.isExpired && (
                          <span className="text-[11px] text-red-600 font-bold block mt-0.5">
                            LOT EXPIRED ({status.match?.expiry_date})
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quantity controls for Partial Dispense (A3) */}
                    <div className="flex items-center justify-between pt-2 border-t text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          Prescribed: <strong>{status.item.quantity}</strong>
                        </span>
                        {status.backorderQty > 0 && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] bg-amber-100 text-amber-900"
                          >
                            Backorder: {status.backorderQty}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <label htmlFor={`qty-${status.idx}`} className="font-medium text-xs">
                          Dispensing Units:
                        </label>
                        <Input
                          id={`qty-${status.idx}`}
                          type="number"
                          min={0}
                          max={status.item.quantity}
                          value={status.dispensedQty}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            setItemQuantities((prev) => ({
                              ...prev,
                              [status.idx]: isNaN(val)
                                ? 0
                                : Math.min(status.item.quantity, Math.max(0, val)),
                            }));
                          }}
                          className="h-7 w-20 text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Standard Safety Verification */}
            <div className="space-y-3">
              <h3 className="font-medium flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Standard Clinical Checks
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="patientVerified"
                    checked={patientVerified}
                    onCheckedChange={(checked) => setPatientVerified(checked === true)}
                  />
                  <label htmlFor="patientVerified" className="text-xs cursor-pointer">
                    Patient identity verified against hospital wristband / MRN
                  </label>
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="safetyChecks"
                    checked={safetyChecksComplete}
                    onCheckedChange={(checked) => setSafetyChecksComplete(checked === true)}
                  />
                  <label htmlFor="safetyChecks" className="text-xs cursor-pointer">
                    Drug packaging, expiration dates, and labeling instructions verified
                  </label>
                </div>
              </div>
            </div>

            {/* Dual-Staff Witness Verification for Controlled Substances (A4) */}
            {isControlledPrescription && (
              <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-3.5 space-y-3 dark:border-purple-900/50 dark:bg-purple-950/30">
                <h4 className="font-semibold text-xs text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5" />
                  Secondary Clinical Witness Signoff (Mandatory)
                </h4>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-muted-foreground block mb-1">Witness Full Name *</label>
                    <Input
                      placeholder="e.g., Nurse Jane Doe / Dr. Smith"
                      value={witnessName}
                      onChange={(e) => setWitnessName(e.target.value)}
                      className="h-8 text-xs bg-white dark:bg-background"
                    />
                  </div>
                  <div>
                    <label className="text-muted-foreground block mb-1">
                      Witness Clinical Role *
                    </label>
                    <Select value={witnessRole} onValueChange={setWitnessRole}>
                      <SelectTrigger className="h-8 text-xs bg-white dark:bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pharmacist">Licensed Pharmacist</SelectItem>
                        <SelectItem value="Registered Nurse">Registered Nurse (RN)</SelectItem>
                        <SelectItem value="Attending Physician">Attending Physician</SelectItem>
                        <SelectItem value="Administrator">Clinical Administrator</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2 pt-1 border-t border-purple-200/60">
                  <div className="flex items-center gap-2.5">
                    <Checkbox
                      id="photoIdVerified"
                      checked={photoIdVerified}
                      onCheckedChange={(checked) => setPhotoIdVerified(checked === true)}
                    />
                    <label
                      htmlFor="photoIdVerified"
                      className="text-xs cursor-pointer text-purple-900 dark:text-purple-300"
                    >
                      Patient or designated representative presented valid government photo ID
                    </label>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Checkbox
                      id="witnessVerified"
                      checked={witnessVerified}
                      onCheckedChange={(checked) => setWitnessVerified(checked === true)}
                    />
                    <label
                      htmlFor="witnessVerified"
                      className="text-xs cursor-pointer text-purple-900 dark:text-purple-300"
                    >
                      I, the secondary licensed witness, have verified the count, packaging, and
                      patient identity
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Batch number */}
            <FormField
              control={form.control}
              name="batchNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">
                    Lot / Batch Number <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter or confirm lot/batch number..."
                      className="h-8 text-xs font-mono"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">
                    Dispensing Notes{' '}
                    <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Packaging notes, patient counseling remarks, backorder explanations..."
                      rows={2}
                      className="text-xs"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  isLoading ||
                  !patientVerified ||
                  !safetyChecksComplete ||
                  hasExpiredMedication ||
                  hasInsufficientStock ||
                  (isControlledPrescription && !isWitnessValid)
                }
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                {isLoading
                  ? 'Dispensing & Deducting…'
                  : hasPartialDispense
                    ? 'Partial Dispense'
                    : 'Complete Dispense'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
