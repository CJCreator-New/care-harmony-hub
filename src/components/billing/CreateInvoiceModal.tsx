import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Plus, Trash2, Sparkles, ArrowDownToLine, CheckSquare } from 'lucide-react';
import { usePatients } from '@/lib/hooks/patients';
import { useCreateInvoice } from '@/hooks/useBilling';
import { useUnbilledCharges, UnbilledChargeItem } from '@/hooks/useUnbilledCharges';
import { toast } from 'sonner';
import { formatCurrency, CURRENCY_SYMBOL } from '@/lib/currency';

// ── Zod schema ────────────────────────────────────────────────────────────────

const invoiceItemSchema = z.object({
  id: z.string(),
  description: z.string().min(1, 'Description is required'),
  quantity: z.coerce.number().int().min(1, 'Minimum 1'),
  unit_price: z.coerce.number().min(0.01, 'Price must be greater than 0'),
  item_type: z.string().min(1),
});

const invoiceSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  discountPercent: z.coerce.number().min(0).max(100).default(0),
  items: z.array(invoiceItemSchema).min(1),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function createInvoiceItem() {
  return {
    id:
      globalThis.crypto?.randomUUID?.() ??
      `item-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    description: '',
    quantity: 1,
    unit_price: 0 as number,
    item_type: 'service',
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

interface CreateInvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateInvoiceModal({ open, onOpenChange }: CreateInvoiceModalProps) {
  const { data: patientsData } = usePatients();
  const patientsList = patientsData?.patients || [];
  const createInvoice = useCreateInvoice();

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      patientId: '',
      dueDate: '',
      notes: '',
      discountPercent: 0,
      items: [createInvoiceItem()],
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const watchedPatientId = form.watch('patientId');
  const { data: unbilledCharges, isLoading: unbilledLoading } = useUnbilledCharges(
    watchedPatientId || undefined
  );
  const [selectedUnbilledIds, setSelectedUnbilledIds] = useState<string[]>([]);

  // Automatically select all unbilled charges when new unbilled charges load
  useEffect(() => {
    if (unbilledCharges && unbilledCharges.length > 0) {
      setSelectedUnbilledIds(unbilledCharges.map((c) => c.id));
    } else {
      setSelectedUnbilledIds([]);
    }
  }, [unbilledCharges, watchedPatientId]);

  // Live totals computed from watched form values
  const watchedItems = form.watch('items');
  const watchedDiscount = form.watch('discountPercent');
  const subtotal = watchedItems.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0),
    0
  );
  const TAX_RATE = 0.05; // 5% GST
  const discountAmount = subtotal * ((Number(watchedDiscount) || 0) / 100);
  const taxAmount = (subtotal - discountAmount) * TAX_RATE;
  const total = subtotal - discountAmount + taxAmount;

  const handleOpenChange = (value: boolean) => {
    if (!value) {
      form.reset();
      setSelectedUnbilledIds([]);
    }
    onOpenChange(value);
  };

  const handleToggleUnbilledItem = (id: string) => {
    setSelectedUnbilledIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleImportUnbilledCharges = () => {
    if (!unbilledCharges || unbilledCharges.length === 0) return;

    const itemsToImport = unbilledCharges.filter((c) => selectedUnbilledIds.includes(c.id));
    if (itemsToImport.length === 0) {
      toast.warning('Please select at least one unbilled item to import.');
      return;
    }

    const newFormItems = itemsToImport.map((item) => ({
      id:
        globalThis.crypto?.randomUUID?.() ??
        `item-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      item_type:
        item.sourceType === 'lab'
          ? 'lab'
          : item.sourceType === 'medication'
            ? 'medication'
            : item.sourceType === 'bed'
              ? 'procedure'
              : 'service',
    }));

    // If existing items list contains only one empty item, replace it
    if (fields.length === 1 && !fields[0].description && fields[0].unit_price === 0) {
      replace(newFormItems);
    } else {
      newFormItems.forEach((item) => append(item));
    }

    toast.success(`Imported ${itemsToImport.length} unbilled charges into invoice.`);
  };

  const onSubmit = (data: InvoiceFormData) => {
    createInvoice.mutate(
      {
        patientId: data.patientId,
        items: data.items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          item_type: item.item_type,
        })),
        notes: data.notes || undefined,
        dueDate: data.dueDate || undefined,
      },
      {
        onSuccess: () => {
          form.reset();
          setSelectedUnbilledIds([]);
          onOpenChange(false);
          toast.success('Invoice created', {
            description: 'The invoice has been added to the billing queue.',
          });
        },
        onError: (err) => {
          toast.error('Failed to create invoice', { description: err.message });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Itemized Invoice</DialogTitle>
          <DialogDescription>
            Generate a bill by importing unbilled clinical charges or manually entering items.
            Fields marked <span className="text-destructive font-semibold">*</span> are required.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* Patient selector */}
            <FormField
              control={form.control}
              name="patientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Patient <span className="text-destructive">*</span>
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select patient to load clinical charges" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="z-[200]">
                      {patientsList.map((patient) => (
                        <SelectItem key={patient.id} value={patient.id}>
                          {patient.first_name} {patient.last_name} ({patient.mrn})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Unbilled Clinical Charges Drawer */}
            {watchedPatientId && unbilledCharges && unbilledCharges.length > 0 && (
              <div className="border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="font-semibold text-sm text-blue-900 dark:text-blue-300">
                      Unbilled Clinical Orders ({unbilledCharges.length} Available)
                    </span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleImportUnbilledCharges}
                    className="border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50"
                  >
                    <ArrowDownToLine className="h-3.5 w-3.5 mr-1.5" />
                    Import Selected ({selectedUnbilledIds.length})
                  </Button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {unbilledCharges.map((charge) => {
                    const isChecked = selectedUnbilledIds.includes(charge.id);
                    return (
                      <div
                        key={charge.id}
                        onClick={() => handleToggleUnbilledItem(charge.id)}
                        className={`flex items-center justify-between p-2 rounded-md border text-xs cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-white dark:bg-slate-900 border-blue-300 dark:border-blue-700'
                            : 'bg-white/50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 opacity-70'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => handleToggleUnbilledItem(charge.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div>
                            <span className="font-medium text-foreground">
                              {charge.description}
                            </span>
                            <span className="ml-2 text-[10px] text-muted-foreground">
                              Qty: {charge.quantity} × {formatCurrency(charge.unitPrice)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                            {charge.statusBadge}
                          </Badge>
                          <span className="font-bold text-foreground">
                            {formatCurrency(charge.total)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Invoice items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium leading-none">
                  Invoice Items <span className="text-destructive">*</span>
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append(createInvoiceItem())}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Add Custom Item
                </Button>
              </div>

              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="flex gap-2 items-start p-3 border rounded-lg bg-card"
                >
                  <div className="flex-1 space-y-2">
                    {/* Description */}
                    <FormField
                      control={form.control}
                      name={`items.${index}.description`}
                      render={({ field: f }) => (
                        <FormItem>
                          <FormLabel className="sr-only">Item description (required)</FormLabel>
                          <FormControl>
                            <Input placeholder="Description *" aria-required="true" {...f} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex gap-2">
                      {/* Item type */}
                      <FormField
                        control={form.control}
                        name={`items.${index}.item_type`}
                        render={({ field: f }) => (
                          <FormItem className="w-[140px]">
                            <Select onValueChange={f.onChange} value={f.value}>
                              <FormControl>
                                <SelectTrigger className="w-[140px]">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="z-[200]">
                                <SelectItem value="service">Service</SelectItem>
                                <SelectItem value="medication">Medication</SelectItem>
                                <SelectItem value="lab">Lab Test</SelectItem>
                                <SelectItem value="procedure">Procedure</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />

                      {/* Quantity */}
                      <FormField
                        control={form.control}
                        name={`items.${index}.quantity`}
                        render={({ field: f }) => (
                          <FormItem className="w-20">
                            <FormControl>
                              <Input
                                type="number"
                                min="1"
                                placeholder="Qty"
                                aria-label={`Quantity for item ${index + 1}`}
                                {...f}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Unit price */}
                      <FormField
                        control={form.control}
                        name={`items.${index}.unit_price`}
                        render={({ field: f }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                  {CURRENCY_SYMBOL}
                                </span>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  placeholder="Price"
                                  className="pl-7"
                                  aria-label={`Unit price for item ${index + 1}`}
                                  {...f}
                                  value={f.value || ''}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Line total */}
                      <div className="w-24 text-right font-medium pt-2">
                        {formatCurrency(
                          (Number(watchedItems[index]?.quantity) || 0) *
                            (Number(watchedItems[index]?.unit_price) || 0)
                        )}
                      </div>
                    </div>
                  </div>

                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                      aria-label={`Remove item ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Discount field */}
            <FormField
              control={form.control}
              name="discountPercent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Discount{' '}
                    <span className="text-xs text-muted-foreground font-normal">
                      (% Concession)
                    </span>
                  </FormLabel>
                  <FormControl>
                    <div className="relative w-36">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        placeholder="0"
                        {...field}
                        value={field.value || ''}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                        %
                      </span>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Invoice breakdown */}
            <div className="p-3.5 bg-muted/60 border rounded-lg space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-green-700 dark:text-green-400">
                  <span>Discount ({Number(watchedDiscount) || 0}%)</span>
                  <span>− {formatCurrency(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-muted-foreground">
                <span>GST (5%)</span>
                <span>{formatCurrency(taxAmount)}</span>
              </div>
              <div className="flex justify-between font-bold text-base border-t pt-1.5 mt-1">
                <span>Total Due</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Due date and Notes in 2 columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Due Date{' '}
                      <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
                    </FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Notes{' '}
                      <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Additional notes or encounter reference..." {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="border-t pt-4">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createInvoice.isPending} className="bg-primary">
                {createInvoice.isPending ? 'Creating...' : 'Create Invoice'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
