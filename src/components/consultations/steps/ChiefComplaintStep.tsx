import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Thermometer, Heart, Droplets, Wind } from "lucide-react";

interface ChiefComplaintStepProps {
  data: Record<string, any>;
  onUpdate: (field: string, value: any) => void;
  patient?: {
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
          <CardTitle className="text-base">Vital Signs</CardTitle>
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

      {/* History of Present Illness */}
      <div className="space-y-2">
        <Label htmlFor="history">History of Present Illness</Label>
        <Textarea
          id="history"
          placeholder="Describe the history of the current illness including onset, duration, severity, associated symptoms, and any relevant medical history..."
          className="min-h-32"
          value={data.history_of_present_illness || ""}
          onChange={(e) => onUpdate("history_of_present_illness", e.target.value)}
        />
      </div>
    </div>
  );
}
