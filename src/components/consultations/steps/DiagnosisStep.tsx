import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, X, AlertCircle, CheckCircle } from "lucide-react";
import { ICD10Autocomplete } from "../ICD10Autocomplete";
import { ICD10Code } from "@/types/icd10";

interface DiagnosisStepProps {
  data: Record<string, any>;
  onUpdate: (field: string, value: any) => void;
}

export function DiagnosisStep({ data, onUpdate }: DiagnosisStepProps) {
  const provisionalDiagnosis = data.provisional_diagnosis || [];
  const finalDiagnosis = data.final_diagnosis || [];

  const addProvisionalDiagnosis = (code: ICD10Code) => {
    // Check if code already exists
    const exists = provisionalDiagnosis.some((d: ICD10Code) => d.code === code.code);
    if (!exists) {
      onUpdate("provisional_diagnosis", [...provisionalDiagnosis, code]);
    }
  };

  const removeProvisionalDiagnosis = (index: number) => {
    onUpdate(
      "provisional_diagnosis",
      provisionalDiagnosis.filter((_: ICD10Code, i: number) => i !== index)
    );
  };

  const addFinalDiagnosis = (code: ICD10Code) => {
    // Check if code already exists
    const exists = finalDiagnosis.some((d: ICD10Code) => d.code === code.code);
    if (!exists) {
      onUpdate("final_diagnosis", [...finalDiagnosis, code]);
    }
  };

  const removeFinalDiagnosis = (index: number) => {
    onUpdate(
      "final_diagnosis",
      finalDiagnosis.filter((_: ICD10Code, i: number) => i !== index)
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
          <ICD10Autocomplete
            onSelect={addProvisionalDiagnosis}
            placeholder="Search and add provisional diagnosis..."
            className="w-full"
          />
          {provisionalDiagnosis.length > 0 ? (
            <div className="space-y-2">
              {provisionalDiagnosis.map((diagnosis: ICD10Code, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-md"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs">
                      {diagnosis.code}
                    </Badge>
                    <span className="text-sm">{diagnosis.description}</span>
                  </div>
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
          <ICD10Autocomplete
            onSelect={addFinalDiagnosis}
            placeholder="Search and add final diagnosis..."
            className="w-full"
          />
          {finalDiagnosis.length > 0 ? (
            <div className="space-y-2">
              {finalDiagnosis.map((diagnosis: ICD10Code, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded-md"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs">
                      {diagnosis.code}
                    </Badge>
                    <span className="text-sm font-medium">{diagnosis.description}</span>
                  </div>
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
