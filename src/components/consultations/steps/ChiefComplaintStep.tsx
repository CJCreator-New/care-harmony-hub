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
import { inferTemperatureUnit } from "@/modules/vital-signs";
import {
  HEIGHT_UNITS,
  TEMPERATURE_UNITS,
  WEIGHT_UNITS,
  buildNurseVitalsPatch,
  heightNeedsUnit,
  isTemperatureUnit,
  switchTemperatureUnit,
  switchWeightUnit,
  weightNeedsUnit,
} from "./consultationVitals";

function UnitToggle<T extends string>({
  name,
  value,
  options,
  onChange,
}: {
  name: string;
  value: unknown;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div role="group" aria-label={`${name} unit`} className="inline-flex rounded-md border">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          aria-label={`${name} in ${o.label}`}
          onClick={() => onChange(o.value)}
          className={`px-1.5 text-xs leading-5 first:rounded-l-md last:rounded-r-md ${
            value === o.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

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

  // Only fill fields the doctor has NOT already entered — prevents silent overwrite.
  // Weight/height are copied without a unit (CLIN-09): the doctor must state it.
  const handleUseNurseVitals = () => {
    const patch = buildNurseVitalsPatch(vitals, latestVitals);
    if (Object.keys(patch).length > 0) {
      onUpdate("vitals", { ...vitals, ...patch });
    }
  };

  const handleVitalsChange = (key: string, value: string) => {
    onUpdate("vitals", { ...vitals, [key]: value });
  };

  const statedTemperatureUnit = isTemperatureUnit(vitals.temperature_unit) ? vitals.temperature_unit : undefined;
  const inferredTemperatureUnit =
    !statedTemperatureUnit && vitals.temperature
      ? inferTemperatureUnit(parseFloat(vitals.temperature))
      : undefined;

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
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="consult-temperature" className="flex items-center gap-2">
                  <Thermometer className="h-4 w-4" />
                  Temperature
                </Label>
                <UnitToggle
                  name="Temperature"
                  value={statedTemperatureUnit ?? inferredTemperatureUnit}
                  options={TEMPERATURE_UNITS}
                  onChange={(unit) => onUpdate("vitals", { ...vitals, ...switchTemperatureUnit(vitals, unit) })}
                />
              </div>
              <Input
                id="consult-temperature"
                type="number"
                step="0.1"
                placeholder={statedTemperatureUnit === "fahrenheit" ? "98.6" : "37.0"}
                value={vitals.temperature || ""}
                onChange={(e) => handleVitalsChange("temperature", e.target.value)}
              />
              {inferredTemperatureUnit && (
                <p className="text-xs text-muted-foreground">
                  Unit not stated; read as {inferredTemperatureUnit === "celsius" ? "°C" : "°F"} from the value.
                </p>
              )}
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
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="consult-weight">Weight</Label>
                <UnitToggle
                  name="Weight"
                  value={vitals.weight_unit}
                  options={WEIGHT_UNITS}
                  onChange={(unit) => onUpdate("vitals", { ...vitals, ...switchWeightUnit(vitals, unit) })}
                />
              </div>
              <Input
                id="consult-weight"
                type="number"
                step="0.1"
                placeholder={vitals.weight_unit === "lb" ? "150" : "70"}
                value={vitals.weight || ""}
                onChange={(e) => handleVitalsChange("weight", e.target.value)}
                aria-invalid={weightNeedsUnit(vitals)}
              />
              {weightNeedsUnit(vitals) && (
                <p role="alert" className="text-xs text-amber-700">
                  Select kg or lb. Weight without a unit is not used for dose checks.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="consult-height">Height</Label>
                <UnitToggle
                  name="Height"
                  value={vitals.height_unit}
                  options={HEIGHT_UNITS}
                  onChange={(unit) => handleVitalsChange("height_unit", unit)}
                />
              </div>
              <Input
                id="consult-height"
                type="number"
                placeholder={vitals.height_unit === "in" ? "68" : "170"}
                value={vitals.height || ""}
                onChange={(e) => handleVitalsChange("height", e.target.value)}
                aria-invalid={heightNeedsUnit(vitals)}
              />
              {heightNeedsUnit(vitals) && (
                <p role="alert" className="text-xs text-amber-700">
                  Select cm or in.
                </p>
              )}
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
