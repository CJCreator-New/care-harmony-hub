import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, CheckCircle, X, Star, FileText, Stethoscope, DollarSign, Brain, ThumbsUp, ThumbsDown } from "lucide-react";
import { ICD10Autocomplete } from "../ICD10Autocomplete";
import { CPTCodeMapper } from "../CPTCodeMapper";
import { StructuredDiagnosis, DIAGNOSIS_TYPES, ICD10Code } from "@/types/icd10";
import { useAIClinicalSuggestions } from "@/hooks/useAIClinicalSuggestions";
import { useAIClinicalSupport } from "@/hooks/useAIClinicalSupport";

interface DiagnosisStepEnhancedProps {
  data: Record<string, any>;
  onUpdate: (field: string, value: any) => void;
  patientId?: string;
}

export function DiagnosisStepEnhanced({ data, onUpdate, patientId }: DiagnosisStepEnhancedProps) {
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");

  // AI Clinical Support
  const { generateDifferentialDiagnosis, isGeneratingDiagnosis } = useAIClinicalSupport();
  const { aiInsights } = useAIClinicalSuggestions(patientId);

  // Get diagnoses from data, supporting both old and new formats
  const structuredDiagnoses: StructuredDiagnosis[] = data.diagnoses || [];
  const legacyProvisional = data.provisional_diagnosis || [];
  const legacyFinal = data.final_diagnosis || [];

  const addDiagnosis = (icd10: ICD10Code, type: StructuredDiagnosis['type'] = 'primary') => {
    const newDiagnosis: StructuredDiagnosis = {
      id: crypto.randomUUID(),
      icd_code: icd10.code,
      description: icd10.short_description,
      type,
      added_at: new Date().toISOString(),
    };

    // Check if already added
    if (structuredDiagnoses.some(d => d.icd_code === icd10.code)) {
      return;
    }

    onUpdate("diagnoses", [...structuredDiagnoses, newDiagnosis]);
  };

  const removeDiagnosis = (id: string) => {
    onUpdate("diagnoses", structuredDiagnoses.filter(d => d.id !== id));
  };

  const updateDiagnosisType = (id: string, type: StructuredDiagnosis['type']) => {
    onUpdate("diagnoses", structuredDiagnoses.map(d => 
      d.id === id ? { ...d, type } : d
    ));
  };

  const handleGenerateDifferentialDiagnosis = async () => {
    if (!patientId) return;

    try {
      const symptoms = data.symptoms || [];
      const vitals = data.vitals || {};
      
      await generateDifferentialDiagnosis({
        symptoms,
        patientHistory: data.history_of_present_illness || '',
        vitals
      });
    } catch (error) {
      console.error('Failed to generate differential diagnosis:', error);
    }
  };

  const updateDiagnosisNotes = (id: string, notes: string) => {
    onUpdate("diagnoses", structuredDiagnoses.map(d => 
      d.id === id ? { ...d, notes } : d
    ));
    setEditingNotes(null);
    setNoteText("");
  };

  const setPrimaryDiagnosis = (id: string) => {
    onUpdate("diagnoses", structuredDiagnoses.map(d => ({
      ...d,
      type: d.id === id ? 'primary' : (d.type === 'primary' ? 'secondary' : d.type)
    })));
  };

  // Group diagnoses by type
  const primaryDiagnoses = structuredDiagnoses.filter(d => d.type === 'primary');
  const secondaryDiagnoses = structuredDiagnoses.filter(d => d.type === 'secondary');
  const differentialDiagnoses = structuredDiagnoses.filter(d => d.type === 'differential');
  const ruleOutDiagnoses = structuredDiagnoses.filter(d => d.type === 'rule-out');

  const DiagnosisCard = ({ diagnosis, showPrimaryAction = false }: { 
    diagnosis: StructuredDiagnosis; 
    showPrimaryAction?: boolean;
  }) => (
    <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg border">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="font-mono text-xs">
            {diagnosis.icd_code}
          </Badge>
          {diagnosis.type === 'primary' && (
            <Badge className="bg-primary/10 text-primary text-xs">
              <Star className="h-3 w-3 mr-1" />
              Primary
            </Badge>
          )}
        </div>
        <p className="text-sm font-medium mt-1">{diagnosis.description}</p>
        {diagnosis.notes && (
          <p className="text-xs text-muted-foreground mt-1 italic">
            Note: {diagnosis.notes}
          </p>
        )}
      </div>
      
      <div className="flex items-center gap-1 shrink-0">
        <Select 
          value={diagnosis.type} 
          onValueChange={(v) => updateDiagnosisType(diagnosis.id, v as StructuredDiagnosis['type'])}
        >
          <SelectTrigger className="h-8 w-28 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DIAGNOSIS_TYPES.map(t => (
              <SelectItem key={t.value} value={t.value} className="text-xs">
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {showPrimaryAction && diagnosis.type !== 'primary' && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => setPrimaryDiagnosis(diagnosis.id)}
            title="Set as primary"
            className="h-8 w-8"
          >
            <Star className="h-4 w-4" />
          </Button>
        )}

        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => {
            setEditingNotes(diagnosis.id);
            setNoteText(diagnosis.notes || "");
          }}
          title="Add note"
          className="h-8 w-8"
        >
          <FileText className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => removeDiagnosis(diagnosis.id)}
          className="h-8 w-8 text-destructive hover:text-destructive"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {editingNotes === diagnosis.id && (
        <div className="absolute inset-0 bg-background/95 p-3 rounded-lg flex flex-col gap-2 z-10">
          <Textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Add clinical notes for this diagnosis..."
            className="flex-1 min-h-[80px]"
          />
          <div className="flex gap-2 justify-end">
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              onClick={() => setEditingNotes(null)}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              size="sm"
              onClick={() => updateDiagnosisNotes(diagnosis.id, noteText)}
            >
              Save Note
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
          <Stethoscope className="h-5 w-5" />
          Assessment - Diagnosis
        </h2>
        <p className="text-sm text-muted-foreground">
          Search and add ICD-10 coded diagnoses. Designate primary, secondary, differential, or rule-out.
        </p>
      </div>

      {/* AI Differential Diagnosis Suggestions */}
      {patientId && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="h-4 w-4 text-blue-600" />
              AI Differential Diagnosis
              <Badge variant="secondary" className="text-xs">Beta</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Button
                onClick={handleGenerateDifferentialDiagnosis}
                disabled={isGeneratingDiagnosis}
                size="sm"
                className="flex items-center gap-2"
              >
                <Brain className="h-4 w-4" />
                {isGeneratingDiagnosis ? 'Analyzing...' : 'Generate AI Suggestions'}
              </Button>
            </div>

            {aiInsights.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Clinical Insights:</h4>
                {aiInsights.map((insight, idx) => (
                  <div key={`insight-${idx}`} className="flex items-start space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border">
                    <div className="flex-shrink-0 mt-0.5">
                      {insight.type === 'drug_interaction' && <Pill className="h-4 w-4 text-red-500" />}
                      {insight.type === 'clinical_guideline' && <Target className="h-4 w-4 text-yellow-500" />}
                      {insight.type === 'risk_assessment' && <CheckCircle className="h-4 w-4 text-green-500" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h5 className="text-sm font-medium">
                          {insight.type === 'drug_interaction' && 'Drug Interaction Alert'}
                          {insight.type === 'clinical_guideline' && 'Clinical Guideline'}
                          {insight.type === 'risk_assessment' && 'Risk Assessment'}
                        </h5>
                        <div className="flex items-center gap-2">
                          {insight.confidence && (
                            <Badge variant="outline" className="text-xs">
                              {Math.round(insight.confidence * 100)}% confidence
                            </Badge>
                          )}
                          <Badge 
                            className={
                              insight.severity === 'high' ? 'bg-red-100 text-red-800' :
                              insight.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }
                          >
                            {insight.severity}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">{insight.message}</p>
                      <p className="text-sm font-medium text-blue-600">{insight.recommendation}</p>
                      <div className="flex gap-1 mt-2">
                        <Button size="sm" variant="outline" className="h-7 text-xs">
                          <ThumbsUp className="h-3 w-3 mr-1" />
                          Helpful
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs">
                          <ThumbsDown className="h-3 w-3 mr-1" />
                          Not Helpful
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ICD-10 Search */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Add Diagnosis</CardTitle>
        </CardHeader>
        <CardContent>
          <ICD10Autocomplete
            onSelect={(code) => addDiagnosis(code, structuredDiagnoses.length === 0 ? 'primary' : 'secondary')}
            placeholder="Search by ICD-10 code or description..."
          />
          <p className="text-xs text-muted-foreground mt-2">
            First diagnosis added will be set as primary. You can change this later.
          </p>
        </CardContent>
      </Card>

      {/* Diagnoses List */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">
            All ({structuredDiagnoses.length})
          </TabsTrigger>
          <TabsTrigger value="primary">
            Primary ({primaryDiagnoses.length})
          </TabsTrigger>
          <TabsTrigger value="secondary">
            Secondary ({secondaryDiagnoses.length})
          </TabsTrigger>
          <TabsTrigger value="differential">
            Differential ({differentialDiagnoses.length})
          </TabsTrigger>
          <TabsTrigger value="ruleout">
            Rule Out ({ruleOutDiagnoses.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4 space-y-2">
          {structuredDiagnoses.length > 0 ? (
            structuredDiagnoses.map(d => (
              <DiagnosisCard key={d.id} diagnosis={d} showPrimaryAction />
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No diagnoses added yet</p>
              <p className="text-sm">Search for ICD-10 codes above to add diagnoses</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="primary" className="mt-4 space-y-2">
          {primaryDiagnoses.length > 0 ? (
            primaryDiagnoses.map(d => <DiagnosisCard key={d.id} diagnosis={d} />)
          ) : (
            <p className="text-center py-4 text-muted-foreground">No primary diagnosis set</p>
          )}
        </TabsContent>

        <TabsContent value="secondary" className="mt-4 space-y-2">
          {secondaryDiagnoses.length > 0 ? (
            secondaryDiagnoses.map(d => <DiagnosisCard key={d.id} diagnosis={d} showPrimaryAction />)
          ) : (
            <p className="text-center py-4 text-muted-foreground">No secondary diagnoses</p>
          )}
        </TabsContent>

        <TabsContent value="differential" className="mt-4 space-y-2">
          {differentialDiagnoses.length > 0 ? (
            differentialDiagnoses.map(d => <DiagnosisCard key={d.id} diagnosis={d} showPrimaryAction />)
          ) : (
            <p className="text-center py-4 text-muted-foreground">No differential diagnoses</p>
          )}
        </TabsContent>

        <TabsContent value="ruleout" className="mt-4 space-y-2">
          {ruleOutDiagnoses.length > 0 ? (
            ruleOutDiagnoses.map(d => <DiagnosisCard key={d.id} diagnosis={d} showPrimaryAction />)
          ) : (
            <p className="text-center py-4 text-muted-foreground">No rule-out diagnoses</p>
          )}
        </TabsContent>
      </Tabs>

      {/* CPT Code Mapping */}
      {primaryDiagnoses.length > 0 && (
        <CPTCodeMapper
          selectedCodes={data.cpt_codes || []}
          onChange={(codes) => onUpdate("cpt_codes", codes)}
          diagnosisCode={primaryDiagnoses[0]?.icd_code}
        />
      )}

      {/* Clinical Reasoning */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Clinical Reasoning</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={data.clinical_reasoning || ""}
            onChange={(e) => onUpdate("clinical_reasoning", e.target.value)}
            placeholder="Document your clinical reasoning for the diagnosis, including key findings that support your assessment..."
            className="min-h-24"
          />
        </CardContent>
      </Card>
      {(legacyProvisional.length > 0 || legacyFinal.length > 0) && (
        <Card className="border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Legacy Diagnoses (Pre-ICD-10)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {legacyProvisional.map((d: string, i: number) => (
              <Badge key={`prov-${i}`} variant="outline" className="mr-2">
                <AlertCircle className="h-3 w-3 mr-1 text-yellow-500" />
                {d} (Provisional)
              </Badge>
            ))}
            {legacyFinal.map((d: string, i: number) => (
              <Badge key={`final-${i}`} variant="outline" className="mr-2">
                <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                {d} (Final)
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
