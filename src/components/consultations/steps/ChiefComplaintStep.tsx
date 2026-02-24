import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Thermometer, Heart, Droplets, Wind, ChevronDown } from "lucide-react";
import { HPITemplateSelector } from "../HPITemplateSelector";
import { HPIData } from "@/types/soap";
import { useLatestVitals } from "@/hooks/useVitalSigns";
import { format } from "date-fns";

interface ChiefComplaintStepProps {
  data: Record<string, any>;
  onUpdate: (field: string, value: any) => void;
  patient?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

export function ChiefComplaintStep({
  data,
  onUpdate,
  patient,
}: ChiefComplaintStepProps) {
  const vitals = data.vitals || {};
  const { data: latestVitals, isLoading: vitalsLoading } = useLatestVitals(patient?.id || "");

  // Only fill fields the doctor has NOT already entered — prevents silent overwrite
  const handleUseNurseVitals = () => {
    if (!latestVitals) return;
    const patch: Record<string, string> = {};
    if (!vitals.temperature && latestVitals.temperature)
      patch.temperature = latestVitals.temperature.toString();
    if (!vitals.heart_rate && latestVitals.heart_rate)
      patch.heart_rate = latestVitals.heart_rate.toString();
    if (!vitals.blood_pressure && latestVitals.blood_pressure_systolic && latestVitals.blood_pressure_diastolic)
      patch.blood_pressure = `${latestVitals.blood_pressure_systolic}/${latestVitals.blood_pressure_diastolic}`;
    if (!vitals.respiratory_rate && latestVitals.respiratory_rate)
      patch.respiratory_rate = latestVitals.respiratory_rate.toString();
    if (!vitals.oxygen_saturation && latestVitals.oxygen_saturation)
      patch.oxygen_saturation = latestVitals.oxygen_saturation.toString();
    if (!vitals.weight && latestVitals.weight)
      patch.weight = latestVitals.weight.toString();
    if (!vitals.height && latestVitals.height)
      patch.height = latestVitals.height.toString();
    if (!vitals.pain_level && latestVitals.pain_level)
      patch.pain_level = latestVitals.pain_level.toString();
    if (Object.keys(patch).length > 0) {
      onUpdate("vitals", { ...vitals, ...patch });
    }
  };

  const handleVitalsChange = (key: string, value: string) => {
    onUpdate("vitals", { ...vitals, [key]: value });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">Chief Complaint & History</h2>
        <p className="text-sm text-muted-foreground">
          Document the patient's primary complaint and relevant history
        </p>
      </div>

      {/* Vitals Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Vital Signs</span>
            {vitalsLoading && (
              <span className="text-xs text-muted-foreground">Loading vitals…</span>
            )}
          </CardTitle>
          {latestVitals && (
            <Alert className="mt-2 py-2 border-blue-200 bg-blue-50/50">
              <AlertDescription className="flex items-center justify-between gap-2 text-xs">
                <span className="text-blue-700">
                  <strong>Nurse vitals available</strong>
                  {latestVitals.recorder && (
                    <> — recorded by {latestVitals.recorder.first_name} {latestVitals.recorder.last_name}</>
                  )}
                  {latestVitals.recorded_at && (
                    <> at {format(new Date(latestVitals.recorded_at), 'MMM d, h:mm a')}</>
                  )}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-xs shrink-0 border-blue-300 hover:bg-blue-100"
                  onClick={handleUseNurseVitals}
                >
                  <ChevronDown className="h-3 w-3 mr-1" />
                  Use these vitals
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Thermometer className="h-4 w-4" />
                Temperature (°F)
              </Label>
              <Input
                type="number"
                step="0.1"
                placeholder="98.6"
                value={vitals.temperature || ""}
                onChange={(e) => handleVitalsChange("temperature", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Heart Rate (bpm)
              </Label>
              <Input
                type="number"
                placeholder="72"
                value={vitals.heart_rate || ""}
                onChange={(e) => handleVitalsChange("heart_rate", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Droplets className="h-4 w-4" />
                Blood Pressure
              </Label>
              <Input
                placeholder="120/80"
                value={vitals.blood_pressure || ""}
                onChange={(e) => handleVitalsChange("blood_pressure", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Wind className="h-4 w-4" />
                Resp. Rate (rpm)
              </Label>
              <Input
                type="number"
                placeholder="16"
                value={vitals.respiratory_rate || ""}
                onChange={(e) => handleVitalsChange("respiratory_rate", e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="space-y-2">
              <Label>O2 Saturation (%)</Label>
              <Input
                type="number"
                placeholder="98"
                value={vitals.oxygen_saturation || ""}
                onChange={(e) => handleVitalsChange("oxygen_saturation", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Weight (lbs)</Label>
              <Input
                type="number"
                placeholder="150"
                value={vitals.weight || ""}
                onChange={(e) => handleVitalsChange("weight", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Height (in)</Label>
              <Input
                type="number"
                placeholder="68"
                value={vitals.height || ""}
                onChange={(e) => handleVitalsChange("height", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Pain Level (0-10)</Label>
              <Input
                type="number"
                min="0"
                max="10"
                placeholder="0"
                value={vitals.pain_level || ""}
                onChange={(e) => handleVitalsChange("pain_level", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chief Complaint */}
      <div className="space-y-2">
        <Label htmlFor="chief_complaint">Chief Complaint *</Label>
        <Textarea
          id="chief_complaint"
          placeholder="Enter the patient's primary complaint in their own words..."
          className="min-h-24"
          value={data.chief_complaint || ""}
          onChange={(e) => onUpdate("chief_complaint", e.target.value)}
        />
      </div>

      {/* History of Present Illness - Structured */}
      <HPITemplateSelector
        value={data.hpi_data || { template_type: 'OLDCARTS' }}
        onChange={(hpi) => onUpdate("hpi_data", hpi)}
      />

      {/* Additional HPI Notes */}
      <div className="space-y-2">
        <Label htmlFor="hpi_notes">Additional HPI Notes</Label>
        <Textarea
          id="hpi_notes"
          placeholder="Any additional details about the present illness..."
          className="min-h-24"
          value={data.hpi_notes || ""}
          onChange={(e) => onUpdate("hpi_notes", e.target.value)}
        />
      </div>
    </div>
  );
}
