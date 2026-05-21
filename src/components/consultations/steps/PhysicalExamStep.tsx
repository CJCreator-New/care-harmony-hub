import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, X } from "lucide-react";

interface PhysicalExamStepProps {
  data: Record<string, any>;
  onUpdate: (field: string, value: any) => void;
}

const EXAM_SYSTEMS = [
  { key: "general", label: "General Appearance" },
  { key: "heent", label: "HEENT" },
  { key: "cardiovascular", label: "Cardiovascular" },
  { key: "respiratory", label: "Respiratory" },
  { key: "gastrointestinal", label: "Gastrointestinal" },
  { key: "musculoskeletal", label: "Musculoskeletal" },
  { key: "neurological", label: "Neurological" },
  { key: "skin", label: "Skin" },
];

export function PhysicalExamStep({ data, onUpdate }: PhysicalExamStepProps) {
  const [newSymptom, setNewSymptom] = useState("");
  const physicalExam = data.physical_examination || {};
  const symptoms = data.symptoms || [];

  
  const handleExamChange = (system: string, value: string) => {
    onUpdate("physical_examination", { ...physicalExam, [system]: value });
  };

  const addSymptom = () => {
    const val = newSymptom.trim();
    if (!val) return;
    try {
      // Defer the parent update slightly to avoid synchronous heavy re-renders
      setTimeout(() => {
        try {
          onUpdate("symptoms", [...symptoms, val]);
        } catch (err) {
          // Log but don't let parent errors crash the UI
          // eslint-disable-next-line no-console
          console.error('Failed to add symptom:', err);
        }
      }, 0);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed scheduling symptom add:', err);
    }
    setNewSymptom("");
  };

  const removeSymptom = (index: number) => {
    try {
      const next = symptoms.filter((_: string, i: number) => i !== index);
      // Defer to avoid synchronous render spikes
      setTimeout(() => {
        try {
          onUpdate("symptoms", next);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('Failed to remove symptom:', err);
        }
      }, 0);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error computing symptom removal:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">Physical Examination</h2>
        <p className="text-sm text-muted-foreground">
          Document findings from the physical examination
        </p>
      </div>

      {/* Symptoms */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Reported Symptoms</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Add a symptom..."
              value={newSymptom}
              onChange={(e) => setNewSymptom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addSymptom();
                }
              }}
            />
            <Button type="button" size="icon" onClick={addSymptom} aria-label="Add symptom">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {symptoms.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {symptoms.map((symptom: string, index: number) => (
                <Badge key={`${symptom}-${index}`} variant="secondary" className="gap-1">
                  {symptom}
                  <button
                    type="button"
                    onClick={() => removeSymptom(index)}
                    className="hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* System-Based Examination */}
      <div className="space-y-4">
        <h3 className="font-medium text-foreground">System-Based Examination</h3>
        <div className="grid gap-4">
          {EXAM_SYSTEMS.map((system) => (
            <div key={system.key} className="space-y-2">
              <Label htmlFor={system.key}>{system.label}</Label>
              <Textarea
                id={system.key}
                placeholder={`Document ${system.label.toLowerCase()} findings...`}
                className="min-h-20"
                value={physicalExam[system.key] || ""}
                onChange={(e) => handleExamChange(system.key, e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
