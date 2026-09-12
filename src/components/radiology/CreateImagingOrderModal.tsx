/**
 * CreateImagingOrderModal.tsx
 * Diagnostic Imaging Order Entry Modal
 *
 * Implements:
 * - Modality routing (X-Ray, CT, MRI, Ultrasound, Mammography)
 * - Anatomical region and laterality specification
 * - Contrast protocol assignment
 * - Clinical indication with diagnostic suggestions
 */

import React, { useState } from 'react';
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
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Sparkles, Scan, Loader2, AlertTriangle } from 'lucide-react';
import { usePatients } from '@/lib/hooks/patients';
import { useRadiologyOrders } from '@/hooks/useRadiologyOrders';
import {
  ImagingModality,
  ContrastProtocol,
  AnatomicalRegion,
  MODALITY_CONFIGS,
} from '@/lib/clinical/radiologyWorkflowRules';
import { toast } from 'sonner';

interface CreateImagingOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedPatientId?: string;
}

const COMMON_INDICATIONS = [
  'Rule out acute pulmonary infiltrate / consolidation',
  'Suspected acute intracranial hemorrhage / stroke protocol',
  'RLQ acute abdominal pain / rule out appendicitis',
  'Trauma workup / acute spinal injury',
  'Severe pleuritic chest pain / rule out pulmonary embolism',
  'Suspected bone fracture following fall',
];

export function CreateImagingOrderModal({
  open,
  onOpenChange,
  preselectedPatientId,
}: CreateImagingOrderModalProps) {
  const { data: patientsData } = usePatients();
  const patientsList = patientsData?.patients || [];
  const { createImagingOrder } = useRadiologyOrders();

  const [patientId, setPatientId] = useState<string>(preselectedPatientId || '');
  const [modality, setModality] = useState<ImagingModality>('xray');
  const [region, setRegion] = useState<AnatomicalRegion>('chest');
  const [laterality, setLaterality] = useState<string>('Axial / Bilateral');
  const [contrastProtocol, setContrastProtocol] = useState<ContrastProtocol>('none');
  const [priority, setPriority] = useState<'normal' | 'urgent'>('normal');
  const [clinicalIndication, setClinicalIndication] = useState<string>('');

  React.useEffect(() => {
    if (preselectedPatientId) {
      setPatientId(preselectedPatientId);
    }
  }, [preselectedPatientId]);

  const config = MODALITY_CONFIGS[modality];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!patientId) {
      toast.error('Please select a patient.');
      return;
    }
    if (!clinicalIndication.trim()) {
      toast.error('Clinical indication / reason for study is required.');
      return;
    }

    createImagingOrder.mutate(
      {
        patientId,
        modality,
        anatomicalRegion: region,
        laterality,
        contrastProtocol,
        clinicalIndication: clinicalIndication.trim(),
        priority,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setClinicalIndication('');
          setContrastProtocol('none');
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scan className="h-5 w-5 text-primary" />
            Order Diagnostic Imaging Study
          </DialogTitle>
          <DialogDescription>
            Specify modality, anatomical targets, and contrast protocols for the radiology worklist.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Patient Selection */}
          <div className="space-y-2">
            <Label htmlFor="img-patient">Patient *</Label>
            <Select value={patientId} onValueChange={setPatientId} required>
              <SelectTrigger id="img-patient">
                <SelectValue placeholder="Select patient" />
              </SelectTrigger>
              <SelectContent className="z-[200]">
                {patientsList.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.first_name} {p.last_name} ({p.mrn})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Modality Selection */}
          <div className="space-y-2">
            <Label>Imaging Modality *</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(Object.keys(MODALITY_CONFIGS) as ImagingModality[]).map((key) => {
                const mod = MODALITY_CONFIGS[key];
                const isSelected = modality === key;
                return (
                  <div
                    key={key}
                    onClick={() => setModality(key)}
                    className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-primary/10 border-primary text-primary font-semibold'
                        : 'bg-card hover:bg-muted/50 text-foreground'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{mod.name.split(' ')[0]}</span>
                      {mod.isIonizing && (
                        <Badge
                          variant="outline"
                          className="text-[9px] text-amber-600 border-amber-400"
                        >
                          Ionizing
                        </Badge>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 truncate">
                      {mod.defaultViews[0]}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Anatomical Region & Laterality */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="img-region">Anatomical Region *</Label>
              <Select value={region} onValueChange={(v: any) => setRegion(v)}>
                <SelectTrigger id="img-region">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[200]">
                  <SelectItem value="chest">Chest / Thorax</SelectItem>
                  <SelectItem value="abdomen_pelvis">Abdomen & Pelvis</SelectItem>
                  <SelectItem value="brain_head">Brain / Head</SelectItem>
                  <SelectItem value="spine_cervical">Cervical Spine</SelectItem>
                  <SelectItem value="spine_lumbar">Lumbar Spine</SelectItem>
                  <SelectItem value="extremity_upper">Upper Extremity</SelectItem>
                  <SelectItem value="extremity_lower">Lower Extremity</SelectItem>
                  <SelectItem value="neck">Neck Soft Tissues</SelectItem>
                  <SelectItem value="cardiac">Cardiac</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="img-laterality">Laterality</Label>
              <Select value={laterality} onValueChange={setLaterality}>
                <SelectTrigger id="img-laterality">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[200]">
                  <SelectItem value="Axial / Bilateral">Axial / Bilateral</SelectItem>
                  <SelectItem value="Left">Left</SelectItem>
                  <SelectItem value="Right">Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Contrast Protocol & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="img-contrast">Contrast Protocol</Label>
              <Select value={contrastProtocol} onValueChange={(v: any) => setContrastProtocol(v)}>
                <SelectTrigger id="img-contrast">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[200]">
                  <SelectItem value="none">Non-Contrast (Plain)</SelectItem>
                  <SelectItem value="iv_contrast">IV Contrast Only</SelectItem>
                  <SelectItem value="oral_contrast">Oral Contrast Only</SelectItem>
                  <SelectItem value="iv_oral">IV + Oral Contrast</SelectItem>
                  <SelectItem value="triple_phase">Triple-Phase / Angiogram</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="img-priority">Order Priority</Label>
              <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                <SelectTrigger id="img-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[200]">
                  <SelectItem value="normal">Routine / Normal</SelectItem>
                  <SelectItem value="urgent">Urgent / Stat</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Contrast Nephrotoxicity Alert Notice */}
          {contrastProtocol !== 'none' && config.requiresRenalScreeningForContrast && (
            <div className="flex items-center gap-2 p-2.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-md text-xs text-blue-800 dark:text-blue-300">
              <AlertTriangle className="h-4 w-4 shrink-0 text-blue-600" />
              <span>
                Technician will verify recent renal function (eGFR/Creatinine) during pre-scan
                safety gate to prevent CIN.
              </span>
            </div>
          )}

          {/* Clinical Indication */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="img-indication">Clinical Indication / Reason for Study *</Label>
            </div>
            <Textarea
              id="img-indication"
              placeholder="e.g. 54yo M with sudden onset severe pleuritic chest pain and dyspnea, D-dimer elevated..."
              value={clinicalIndication}
              onChange={(e) => setClinicalIndication(e.target.value)}
              rows={2}
              required
            />
          </div>

          {/* Quick Suggestions Chips */}
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1 mr-1">
              <Sparkles className="h-3 w-3 text-amber-500" /> Templates:
            </span>
            {COMMON_INDICATIONS.slice(0, 3).map((template, idx) => (
              <Badge
                key={idx}
                variant="outline"
                className="cursor-pointer hover:bg-muted text-[10px]"
                onClick={() => setClinicalIndication(template)}
              >
                {template.split('/')[0].trim()}
              </Badge>
            ))}
          </div>

          <DialogFooter className="border-t pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createImagingOrder.isPending || !patientId || !clinicalIndication.trim()}
              className="bg-primary"
            >
              {createImagingOrder.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Routing to Radiology...
                </>
              ) : (
                'Dispatch Imaging Order'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
