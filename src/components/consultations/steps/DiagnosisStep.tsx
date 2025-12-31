import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, X, AlertCircle, CheckCircle } from "lucide-react";

interface DiagnosisStepProps {
  data: Record<string, any>;
  onUpdate: (field: string, value: any) => void;
}

export function DiagnosisStep({ data, onUpdate }: DiagnosisStepProps) {
  const [newProvisional, setNewProvisional] = useState("");
  const [newFinal, setNewFinal] = useState("");

  const provisionalDiagnosis = data.provisional_diagnosis || [];
  const finalDiagnosis = data.final_diagnosis || [];

  const addProvisionalDiagnosis = () => {
    if (newProvisional.trim()) {
      onUpdate("provisional_diagnosis", [
        ...provisionalDiagnosis,
        newProvisional.trim(),
      ]);
      setNewProvisional("");
    }
  };

  const removeProvisionalDiagnosis = (index: number) => {
    onUpdate(
      "provisional_diagnosis",
      provisionalDiagnosis.filter((_: string, i: number) => i !== index)
    );
  };

  const addFinalDiagnosis = () => {
    if (newFinal.trim()) {
      onUpdate("final_diagnosis", [...finalDiagnosis, newFinal.trim()]);
      setNewFinal("");
    }
  };

  const removeFinalDiagnosis = (index: number) => {
    onUpdate(
      "final_diagnosis",
      finalDiagnosis.filter((_: string, i: number) => i !== index)
    );
  };

  const moveToFinal = (index: number) => {
    const diagnosis = provisionalDiagnosis[index];
    removeProvisionalDiagnosis(index);
    onUpdate("final_diagnosis", [...finalDiagnosis, diagnosis]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">Diagnosis</h2>
        <p className="text-sm text-muted-foreground">
          Document provisional and final diagnoses
        </p>
      </div>

      {/* Provisional Diagnosis */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-yellow-500" />
            Provisional Diagnosis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Add provisional diagnosis..."
              value={newProvisional}
              onChange={(e) => setNewProvisional(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && addProvisionalDiagnosis()}
            />
            <Button type="button" size="icon" onClick={addProvisionalDiagnosis}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {provisionalDiagnosis.length > 0 ? (
            <div className="space-y-2">
              {provisionalDiagnosis.map((diagnosis: string, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-md"
                >
                  <span className="text-sm">{diagnosis}</span>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => moveToFinal(index)}
                      title="Move to final diagnosis"
                    >
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => removeProvisionalDiagnosis(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No provisional diagnoses added
            </p>
          )}
        </CardContent>
      </Card>

      {/* Final Diagnosis */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            Final Diagnosis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Add final diagnosis..."
              value={newFinal}
              onChange={(e) => setNewFinal(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && addFinalDiagnosis()}
            />
            <Button type="button" size="icon" onClick={addFinalDiagnosis}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {finalDiagnosis.length > 0 ? (
            <div className="space-y-2">
              {finalDiagnosis.map((diagnosis: string, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded-md"
                >
                  <span className="text-sm font-medium">{diagnosis}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => removeFinalDiagnosis(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No final diagnoses confirmed
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
