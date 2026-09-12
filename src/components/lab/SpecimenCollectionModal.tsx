import React, { useState, useEffect } from 'react';
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
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TestTube2, QrCode, CheckCircle2, AlertTriangle, User, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export interface SpecimenCollectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any;
  onCollect: (data: {
    orderId: string;
    specimenType: string;
    containerType: string;
    barcode: string;
    collectionSite: string;
    integrityVerified: boolean;
  }) => void;
  isLoading?: boolean;
}

export function SpecimenCollectionModal({
  open,
  onOpenChange,
  order,
  onCollect,
  isLoading = false,
}: SpecimenCollectionModalProps) {
  const [specimenType, setSpecimenType] = useState('Whole Blood (Venous)');
  const [containerType, setContainerType] = useState('Lavender (K2 EDTA)');
  const [barcode, setBarcode] = useState('');
  const [collectionSite, setCollectionSite] = useState('Left antecubital fossa');
  const [volumeVerified, setVolumeVerified] = useState(false);
  const [integrityVerified, setIntegrityVerified] = useState(false);

  // Auto-generate accession barcode when opened
  useEffect(() => {
    if (order?.id && open) {
      const generated = `ACC-${Date.now().toString(36).toUpperCase()}-${order.id.slice(0, 4).toUpperCase()}`;
      setBarcode(generated);

      // Auto-suggest container based on test name
      const name = (order.test_name || '').toLowerCase();
      if (name.includes('cbc') || name.includes('blood count') || name.includes('hgb')) {
        setContainerType('Lavender (K2 EDTA)');
        setSpecimenType('Whole Blood (Venous)');
      } else if (name.includes('coag') || name.includes('pt') || name.includes('inr')) {
        setContainerType('Light Blue (Sodium Citrate 3.2%)');
        setSpecimenType('Plasma');
      } else if (name.includes('urine')) {
        setContainerType('Sterile Specimen Cup');
        setSpecimenType('Clean Catch Urine');
      } else {
        setContainerType('Gold (SST Gel Separator)');
        setSpecimenType('Serum');
      }

      setVolumeVerified(false);
      setIntegrityVerified(false);
    }
  }, [order, open]);

  const canSubmit = volumeVerified && integrityVerified && barcode.trim().length >= 4;

  const handleSubmit = () => {
    if (!order?.id || !canSubmit) {
      toast.error(
        'Please complete all specimen integrity and barcode checks before confirming collection.'
      );
      return;
    }

    onCollect({
      orderId: order.id,
      specimenType,
      containerType,
      barcode: barcode.trim(),
      collectionSite,
      integrityVerified: true,
    });
  };

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <TestTube2 className="h-5 w-5 text-blue-600" />
            Specimen Accessioning & Collection
          </DialogTitle>
          <DialogDescription>
            Record tube container color, accession barcode, and pre-analytical integrity checks
            prior to laboratory processing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-sm">
          {/* Order info summary */}
          <div className="rounded-lg border bg-muted/40 p-3 space-y-1">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-foreground">{order.test_name}</span>
              <Badge variant="outline" className="capitalize">
                {order.priority || 'Normal'}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-1">
              <div>
                Patient:{' '}
                <strong>
                  {order.patient?.first_name} {order.patient?.last_name}
                </strong>
              </div>
              <div>
                MRN: <span className="font-mono">{order.patient?.mrn || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Accession Barcode */}
          <div className="space-y-1.5">
            <Label
              htmlFor="specimen-barcode"
              className="text-xs font-semibold flex items-center gap-1.5"
            >
              <QrCode className="h-3.5 w-3.5 text-primary" />
              Accession / Specimen Barcode *
            </Label>
            <Input
              id="specimen-barcode"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              className="h-8 text-xs font-mono font-medium"
            />
          </div>

          {/* Specimen & Container Types */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Specimen Matrix *</Label>
              <Select value={specimenType} onValueChange={setSpecimenType}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Whole Blood (Venous)">Whole Blood (Venous)</SelectItem>
                  <SelectItem value="Serum">Serum</SelectItem>
                  <SelectItem value="Plasma">Plasma</SelectItem>
                  <SelectItem value="Clean Catch Urine">Clean Catch Urine</SelectItem>
                  <SelectItem value="24-hr Urine">24-hr Urine</SelectItem>
                  <SelectItem value="Nasopharyngeal Swab">Nasopharyngeal Swab</SelectItem>
                  <SelectItem value="Sputum">Sputum</SelectItem>
                  <SelectItem value="CSF">Cerebrospinal Fluid (CSF)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Tube / Container Color *</Label>
              <Select value={containerType} onValueChange={setContainerType}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Lavender (K2 EDTA)">Lavender (K2 EDTA)</SelectItem>
                  <SelectItem value="Gold (SST Gel Separator)">Gold (SST Gel Separator)</SelectItem>
                  <SelectItem value="Light Blue (Sodium Citrate 3.2%)">
                    Light Blue (Sodium Citrate)
                  </SelectItem>
                  <SelectItem value="Green (Lithium Heparin)">Green (Lithium Heparin)</SelectItem>
                  <SelectItem value="Red (No additive / plain)">Red (No additive)</SelectItem>
                  <SelectItem value="Grey (Sodium Fluoride)">Grey (Sodium Fluoride)</SelectItem>
                  <SelectItem value="Sterile Specimen Cup">Sterile Specimen Cup</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Collection Site */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Collection Anatomical Site</Label>
            <Input
              value={collectionSite}
              onChange={(e) => setCollectionSite(e.target.value)}
              className="h-8 text-xs"
              placeholder="e.g., Left antecubital fossa, dorsal hand vein, central catheter..."
            />
          </div>

          {/* Mandatory Integrity Verification (A3) */}
          <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 space-y-2 dark:border-blue-900/40 dark:bg-blue-950/20">
            <span className="font-semibold text-xs text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Pre-Analytical Quality & Integrity Gate
            </span>
            <div className="space-y-2 pt-1 text-xs">
              <div className="flex items-center gap-2.5">
                <Checkbox
                  id="volumeCheck"
                  checked={volumeVerified}
                  onCheckedChange={(checked) => setVolumeVerified(checked === true)}
                />
                <label
                  htmlFor="volumeCheck"
                  className="text-xs cursor-pointer text-blue-950 dark:text-blue-200"
                >
                  Specimen volume meets minimum analytical filling threshold (No QNS)
                </label>
              </div>
              <div className="flex items-center gap-2.5">
                <Checkbox
                  id="integrityCheck"
                  checked={integrityVerified}
                  onCheckedChange={(checked) => setIntegrityVerified(checked === true)}
                />
                <label
                  htmlFor="integrityCheck"
                  className="text-xs cursor-pointer text-blue-950 dark:text-blue-200"
                >
                  Visual inspection confirmed: No visible clotting, excessive hemolysis, or labeling
                  discrepancy
                </label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !canSubmit}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
            )}
            Confirm Specimen Intake
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
