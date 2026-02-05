import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { useSuppliers, useCreatePurchaseOrder } from '@/hooks/useSuppliers';
import { useMedications } from '@/hooks/useMedications';

interface OrderItem {
  medication_id: string | null;
  item_name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface CreatePurchaseOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreatePurchaseOrderModal({ open, onOpenChange }: CreatePurchaseOrderModalProps) {
  const [supplierId, setSupplierId] = useState('');
  const [notes, setNotes] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [items, setItems] = useState<OrderItem[]>([
    { medication_id: null, item_name: '', quantity: 1, unit_price: 0, total: 0 },
  ]);

  const { data: suppliers } = useSuppliers();
  const { data: medications } = useMedications();
  const createOrder = useCreatePurchaseOrder();

  const updateItem = (index: number, field: keyof OrderItem, value: string | number | null) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    
    // Recalculate total
    if (field === 'quantity' || field === 'unit_price') {
      updated[index].total = updated[index].quantity * updated[index].unit_price;
    }
    
    // If selecting medication, auto-fill name and price
    if (field === 'medication_id' && value) {
      const med = medications?.find((m) => m.id === value);
      if (med) {
        updated[index].item_name = med.name;
        updated[index].unit_price = med.unit_price || 0;
        updated[index].total = updated[index].quantity * updated[index].unit_price;
      }
    }
    
    setItems(updated);
  };

  const addItem = () => {
    setItems([...items, { medication_id: null, item_name: '', quantity: 1, unit_price: 0, total: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const totalAmount = items.reduce((sum, item) => sum + item.total, 0);

  const handleSubmit = () => {
    if (!supplierId || items.every((i) => !i.item_name)) return;

    createOrder.mutate(
      {
        supplier_id: supplierId,
        items: items.filter((i) => i.item_name),
        notes,
        expected_delivery_date: expectedDate || undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setSupplierId('');
          setNotes('');
          setExpectedDate('');
          setItems([{ medication_id: null, item_name: '', quantity: 1, unit_price: 0, total: 0 }]);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Purchase Order</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Supplier Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Supplier *</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger data-autofocus="true">
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers?.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Expected Delivery</Label>
              <Input
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
              />
            </div>
          </div>

          {/* Order Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Order Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div
                  key={`${item.medication_id ?? item.item_name}-${item.quantity}-${item.unit_price}`}
                  className="flex gap-3 items-start p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex-1 grid grid-cols-4 gap-3">
                    <div className="col-span-2">
                      <Label className="text-xs">Medication</Label>
                      <Select
                        value={item.medication_id || ''}
                        onValueChange={(v) => updateItem(index, 'medication_id', v || null)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select or enter custom" />
                        </SelectTrigger>
                        <SelectContent>
                          {medications?.map((med) => (
                            <SelectItem key={med.id} value={med.id}>
                              {med.name} ({med.strength})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {!item.medication_id && (
                        <Input
                          className="mt-2"
                          placeholder="Custom item name"
                          value={item.item_name}
                          onChange={(e) => updateItem(index, 'item_name', e.target.value)}
                        />
                      )}
                    </div>
                    <div>
                      <Label className="text-xs">Quantity</Label>
                      <Input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Unit Price</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        value={item.unit_price}
                        onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <Label className="text-xs">Total</Label>
                    <div className="font-medium">${item.total.toFixed(2)}</div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(index)}
                    disabled={items.length === 1}
                    aria-label="Remove item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
              rows={2}
            />
          </div>

          {/* Total and Submit */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-lg font-semibold" aria-live="polite">
              Total: ${totalAmount.toFixed(2)}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createOrder.isPending || !supplierId}
              >
                {createOrder.isPending ? 'Creating...' : 'Create Order'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
