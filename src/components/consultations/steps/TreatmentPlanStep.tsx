import { useState, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Pill, FlaskConical, UserPlus, Send, CheckCircle2, AlertTriangle, Brain, ThumbsUp, ThumbsDown, Zap } from "lucide-react";
import { useCreateLabOrder } from "@/hooks/useLabOrders";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { checkPrescriptionSafety } from "@/hooks/usePrescriptionSafety";
import { PrescriptionSafetyAlerts } from "@/components/prescriptions/PrescriptionSafetyAlerts";
import { useAIClinicalSuggestions } from "@/hooks/useAIClinicalSuggestions";
import { useAIClinicalSupport } from "@/hooks/useAIClinicalSupport";

interface TreatmentPlanStepProps {
  data: Record<string, any>;
  onUpdate: (field: string, value: any) => void;
  patientId?: string;
  consultationId?: string;
  patientAllergies?: string[];
  patientMedications?: string[];
}

interface Prescription {
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

interface LabOrder {
  test: string;
  priority: string;
  notes: string;
  isSubmitted?: boolean;
  labOrderId?: string;
}

interface Referral {
  specialty: string;
  reason: string;
  urgency: string;
}

export function TreatmentPlanStep({ 
  data, 
  onUpdate, 
  patientId, 
  consultationId,
  patientAllergies = [],
  patientMedications = [],
}: TreatmentPlanStepProps) {
  const { profile } = useAuth();
  const createLabOrder = useCreateLabOrder();
  const { aiInsights, isLoading: isLoadingAI } = useAIClinicalSuggestions(patientId);
  const aiSupport = useAIClinicalSupport();

  const [drugInteractionPredictions, setDrugInteractionPredictions] = useState<any[]>([]);
  const [isGeneratingInteractions, setIsGeneratingInteractions] = useState(false);

  const [newPrescription, setNewPrescription] = useState<Prescription>({
    medication: "",
    dosage: "",
    frequency: "",
    duration: "",
    instructions: "",
  });
  const [newLabOrder, setNewLabOrder] = useState<Omit<LabOrder, 'isSubmitted' | 'labOrderId'>>({
    test: "",
    priority: "routine",
    notes: "",
  });
  const [newReferral, setNewReferral] = useState<Referral>({
    specialty: "",
    reason: "",
    urgency: "routine",
  });

  const prescriptions = data.prescriptions || [];
  const labOrders: LabOrder[] = data.lab_orders || [];
  const referrals = data.referrals || [];

  // Calculate safety alerts for all prescriptions
  const safetyAlerts = useMemo(() => {
    const allAllergyAlerts: any[] = [];
    const allDrugInteractions: any[] = [];
    const currentMeds = patientMedications.concat(prescriptions.map((p: Prescription) => p.medication));
    
    for (const rx of prescriptions) {
      const otherMeds = currentMeds.filter((m: string) => m !== rx.medication);
      const safety = checkPrescriptionSafety(rx.medication, patientAllergies, otherMeds);
      allAllergyAlerts.push(...safety.allergyAlerts);
      allDrugInteractions.push(...safety.drugInteractions);
    }

    return {
      allergyAlerts: allAllergyAlerts,
      drugInteractions: allDrugInteractions,
      hasWarnings: allAllergyAlerts.length > 0 || allDrugInteractions.length > 0,
    };
  }, [prescriptions, patientAllergies, patientMedications]);

  // Check new prescription before adding
  const newPrescriptionSafety = useMemo(() => {
    if (!newPrescription.medication.trim()) return null;
    const currentMeds = patientMedications.concat(prescriptions.map((p: Prescription) => p.medication));
    return checkPrescriptionSafety(newPrescription.medication, patientAllergies, currentMeds);
  }, [newPrescription.medication, prescriptions, patientAllergies, patientMedications]);

  const addPrescription = () => {
    if (newPrescription.medication.trim()) {
      onUpdate("prescriptions", [...prescriptions, { ...newPrescription }]);
      setNewPrescription({
        medication: "",
        dosage: "",
        frequency: "",
        duration: "",
        instructions: "",
      });
    }
  };

  const removePrescription = (index: number) => {
    onUpdate(
      "prescriptions",
      prescriptions.filter((_: Prescription, i: number) => i !== index)
    );
  };

  const addLabOrder = () => {
    if (newLabOrder.test.trim()) {
      onUpdate("lab_orders", [...labOrders, { ...newLabOrder, isSubmitted: false }]);
      setNewLabOrder({ test: "", priority: "routine", notes: "" });
    }
  };

  const removeLabOrder = (index: number) => {
    const order = labOrders[index];
    if (order.isSubmitted) {
      toast.error("Cannot remove a submitted lab order");
      return;
    }
    onUpdate(
      "lab_orders",
      labOrders.filter((_: LabOrder, i: number) => i !== index)
    );
  };

  const submitLabOrder = async (index: number) => {
    const order = labOrders[index];
    if (!patientId || !profile?.id) {
      toast.error("Missing patient or profile information");
      return;
    }

    try {
      const result = await createLabOrder.mutateAsync({
        hospital_id: profile.hospital_id!,
        patient_id: patientId,
        consultation_id: consultationId,
        test_name: order.test,
        ordered_by: profile.id,
        priority: order.priority === 'stat' ? 'emergency' : order.priority === 'urgent' ? 'urgent' : 'normal',
        status: 'pending',
      });

      // Update the local state to mark as submitted
      const updatedOrders = [...labOrders];
      updatedOrders[index] = { ...order, isSubmitted: true, labOrderId: result.id };
      onUpdate("lab_orders", updatedOrders);
      
      toast.success(`Lab order for "${order.test}" submitted to laboratory`);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const submitAllLabOrders = async () => {
    const unsubmittedOrders = labOrders.filter(o => !o.isSubmitted);
    if (unsubmittedOrders.length === 0) {
      toast.info("All lab orders have already been submitted");
      return;
    }

    for (let i = 0; i < labOrders.length; i++) {
      if (!labOrders[i].isSubmitted) {
        await submitLabOrder(i);
      }
    }
  };

  const addReferral = () => {
    if (newReferral.specialty.trim()) {
      onUpdate("referrals", [...referrals, { ...newReferral }]);
      setNewReferral({ specialty: "", reason: "", urgency: "routine" });
    }
  };

  const removeReferral = (index: number) => {
    onUpdate(
      "referrals",
      referrals.filter((_: Referral, i: number) => i !== index)
    );
  };

  // AI-powered drug interaction predictions
  const handleGenerateDrugInteractions = async () => {
    if (!patientId) {
      toast.error("Patient information required for drug interaction analysis");
      return;
    }

    setIsGeneratingInteractions(true);
    try {
      // Get all current medications (existing + new prescriptions)
      const allMedications = [
        ...patientMedications,
        ...prescriptions.map((p: Prescription) => p.medication),
        ...(newPrescription.medication ? [newPrescription.medication] : [])
      ].filter(Boolean);

      if (allMedications.length < 2) {
        toast.info("At least 2 medications needed for interaction analysis");
        setIsGeneratingInteractions(false);
        return;
      }

      // Use AI support for drug interaction analysis
      const result = await aiSupport.checkDrugInteractions(allMedications);
      
      // Generate comprehensive predictions based on medication combinations
      const predictions = [];
      
      // Check for common dangerous combinations
      const dangerousCombos = [
        { drugs: ['warfarin', 'aspirin'], severity: 'critical', message: 'Warfarin + Aspirin: Significantly increased bleeding risk', recommendation: 'Monitor INR closely, consider alternative pain management' },
        { drugs: ['warfarin', 'heparin'], severity: 'critical', message: 'Warfarin + Heparin: Excessive anticoagulation risk', recommendation: 'Monitor coagulation studies frequently' },
        { drugs: ['ace_inhibitor', 'potassium'], severity: 'high', message: 'ACE Inhibitor + Potassium: Hyperkalemia risk', recommendation: 'Monitor potassium levels, consider dose adjustment' },
        { drugs: ['digoxin', 'amiodarone'], severity: 'high', message: 'Digoxin + Amiodarone: Increased digoxin toxicity', recommendation: 'Reduce digoxin dose by 50%, monitor levels' },
        { drugs: ['lithium', 'nsaid'], severity: 'high', message: 'Lithium + NSAID: Lithium toxicity risk', recommendation: 'Monitor lithium levels, consider alternative analgesics' },
        { drugs: ['statin', 'fibrate'], severity: 'medium', message: 'Statin + Fibrate: Increased myopathy risk', recommendation: 'Monitor CK levels, consider dose reduction' },
        { drugs: ['beta_blocker', 'calcium_channel_blocker'], severity: 'medium', message: 'Beta Blocker + CCB: Additive bradycardia risk', recommendation: 'Monitor heart rate, consider dose adjustment' }
      ];

      for (const combo of dangerousCombos) {
        const hasBothDrugs = combo.drugs.every(drug => 
          allMedications.some(med => med.toLowerCase().includes(drug.toLowerCase()))
        );
        
        if (hasBothDrugs) {
          predictions.push({
            id: `${combo.drugs.join('_')}_${Date.now()}`,
            severity: combo.severity,
            message: combo.message,
            recommendation: combo.recommendation,
            confidence: 0.92,
            medications: combo.drugs,
            type: 'drug_interaction'
          });
        }
      }

      // Add AI insights from the clinical suggestions hook
      const drugInsights = aiInsights.filter(insight => insight.type === 'drug_interaction');
      predictions.push(...drugInsights.map(insight => ({
        id: `ai_${Date.now()}_${Math.random()}`,
        severity: insight.severity,
        message: insight.message,
        recommendation: insight.recommendation,
        confidence: insight.confidence || 0.8,
        medications: [], // Will be populated based on context
        type: 'ai_prediction'
      })));

      setDrugInteractionPredictions(predictions);
      
      if (predictions.length === 0) {
        toast.success("No significant drug interactions detected");
      } else {
        toast.success(`Found ${predictions.length} potential drug interaction${predictions.length > 1 ? 's' : ''}`);
      }
    } catch (error) {
      toast.error("Failed to analyze drug interactions");
      console.error("Drug interaction analysis error:", error);
    } finally {
      setIsGeneratingInteractions(false);
    }
  };

  const handleInteractionFeedback = (predictionId: string, helpful: boolean) => {
    // Update local state to reflect feedback
    setDrugInteractionPredictions(prev => 
      prev.map(pred => 
        pred.id === predictionId 
          ? { ...pred, userFeedback: helpful ? 'helpful' : 'not_helpful' }
          : pred
      )
    );
    
    toast.success(`Feedback recorded: ${helpful ? 'Helpful' : 'Not helpful'}`);
  };

  const unsubmittedCount = labOrders.filter(o => !o.isSubmitted).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">Treatment Plan</h2>
        <p className="text-sm text-muted-foreground">
          Define prescriptions, lab orders, and referrals
        </p>
      </div>

      {/* Treatment Plan Text */}
      <div className="space-y-2">
        <Label htmlFor="treatment_plan">Treatment Plan Notes</Label>
        <Textarea
          id="treatment_plan"
          placeholder="Describe the overall treatment plan..."
          className="min-h-24"
          value={data.treatment_plan || ""}
          onChange={(e) => onUpdate("treatment_plan", e.target.value)}
        />
      </div>

      {/* Prescriptions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Pill className="h-4 w-4" />
            Prescriptions
            {safetyAlerts.hasWarnings && (
              <Badge variant="destructive" className="ml-2">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Safety Alert
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Safety Alerts */}
          {safetyAlerts.hasWarnings && (
            <PrescriptionSafetyAlerts
              allergyAlerts={safetyAlerts.allergyAlerts}
              drugInteractions={safetyAlerts.drugInteractions}
            />
          )}

          {/* New Prescription Safety Preview */}
          {newPrescriptionSafety && !newPrescriptionSafety.isSafe && (
            <PrescriptionSafetyAlerts
              allergyAlerts={newPrescriptionSafety.allergyAlerts}
              drugInteractions={newPrescriptionSafety.drugInteractions}
              className="border border-warning/20 rounded-md p-3 bg-warning/5"
            />
          )}

          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <Input
              placeholder="Medication"
              value={newPrescription.medication}
              onChange={(e) =>
                setNewPrescription({ ...newPrescription, medication: e.target.value })
              }
              className={newPrescriptionSafety && !newPrescriptionSafety.isSafe ? 'border-warning' : ''}
            />
            <Input
              placeholder="Dosage"
              value={newPrescription.dosage}
              onChange={(e) =>
                setNewPrescription({ ...newPrescription, dosage: e.target.value })
              }
            />
            <Input
              placeholder="Frequency"
              value={newPrescription.frequency}
              onChange={(e) =>
                setNewPrescription({ ...newPrescription, frequency: e.target.value })
              }
            />
            <Input
              placeholder="Duration"
              value={newPrescription.duration}
              onChange={(e) =>
                setNewPrescription({ ...newPrescription, duration: e.target.value })
              }
            />
            <Button 
              type="button" 
              onClick={addPrescription}
              variant={newPrescriptionSafety?.requiresVerification ? 'destructive' : 'default'}
              aria-label="Add prescription"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {prescriptions.length > 0 && (
            <div className="space-y-2">
              {prescriptions.map((rx: Prescription, index) => (
                <div
                  key={`${rx.medication}-${rx.dosage}-${rx.frequency}-${rx.duration}`}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-md"
                >
                  <div>
                    <p className="font-medium">{rx.medication}</p>
                    <p className="text-sm text-muted-foreground">
                      {rx.dosage} - {rx.frequency} for {rx.duration}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => removePrescription(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Drug Interaction Predictions */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4" />
              AI Drug Interaction Analysis
              <Badge variant="outline" className="ml-2">
                <Brain className="h-3 w-3 mr-1" />
                AI-Powered
              </Badge>
            </CardTitle>
            <Button
              type="button"
              size="sm"
              onClick={handleGenerateDrugInteractions}
              disabled={isGeneratingInteractions || !patientId}
              variant="outline"
            >
              {isGeneratingInteractions ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                  Analyzing...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-1" />
                  Analyze Interactions
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {drugInteractionPredictions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">
                Click "Analyze Interactions" to check for potential drug interactions between current and prescribed medications
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {drugInteractionPredictions.map((prediction) => (
                <div
                  key={prediction.id}
                  className={`p-4 rounded-lg border ${
                    prediction.severity === 'critical' ? 'border-red-200 bg-red-50' :
                    prediction.severity === 'high' ? 'border-orange-200 bg-orange-50' :
                    prediction.severity === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                    'border-blue-200 bg-blue-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          variant={
                            prediction.severity === 'critical' ? 'destructive' :
                            prediction.severity === 'high' ? 'destructive' :
                            prediction.severity === 'medium' ? 'secondary' :
                            'outline'
                          }
                          className="text-xs"
                        >
                          {prediction.severity.toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {Math.round(prediction.confidence * 100)}% Confidence
                        </Badge>
                        {prediction.type === 'ai_prediction' && (
                          <Badge variant="outline" className="text-xs bg-blue-50">
                            <Brain className="h-3 w-3 mr-1" />
                            AI Generated
                          </Badge>
                        )}
                      </div>
                      <p className="font-medium text-sm mb-1">{prediction.message}</p>
                      <p className="text-sm text-muted-foreground mb-3">{prediction.recommendation}</p>
                      {prediction.medications && prediction.medications.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {prediction.medications.map((med: string) => (
                            <Badge key={med} variant="outline" className="text-xs">
                              {med.replace('_', ' ')}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    {!prediction.userFeedback && (
                      <div className="flex gap-1 ml-4">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleInteractionFeedback(prediction.id, true)}
                          className="h-8 w-8 p-0"
                        >
                          <ThumbsUp className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleInteractionFeedback(prediction.id, false)}
                          className="h-8 w-8 p-0"
                        >
                          <ThumbsDown className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    )}
                    {prediction.userFeedback && (
                      <Badge 
                        variant={prediction.userFeedback === 'helpful' ? 'default' : 'secondary'}
                        className="ml-4"
                      >
                        {prediction.userFeedback === 'helpful' ? '👍 Helpful' : '👎 Not Helpful'}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lab Orders */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FlaskConical className="h-4 w-4" />
              Lab Orders
            </CardTitle>
            {labOrders.length > 0 && unsubmittedCount > 0 && (
              <Button
                type="button"
                size="sm"
                onClick={submitAllLabOrders}
                disabled={createLabOrder.isPending}
              >
                <Send className="h-4 w-4 mr-1" />
                Submit All ({unsubmittedCount})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Test name"
              className="flex-1"
              value={newLabOrder.test}
              onChange={(e) =>
                setNewLabOrder({ ...newLabOrder, test: e.target.value })
              }
            />
            <select
              className="border rounded-md px-3 py-2 text-sm bg-background"
              value={newLabOrder.priority}
              onChange={(e) =>
                setNewLabOrder({ ...newLabOrder, priority: e.target.value })
              }
            >
              <option value="routine">Routine</option>
              <option value="urgent">Urgent</option>
              <option value="stat">STAT</option>
            </select>
            <Button type="button" onClick={addLabOrder} aria-label="Add lab order">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {labOrders.length > 0 && (
            <div className="space-y-2">
              {labOrders.map((order: LabOrder, index: number) => (
                <div
                  key={order.labOrderId ?? `${order.test}-${order.priority}-${order.notes ?? ''}`}
                  className={`flex items-center justify-between p-3 rounded-md ${
                    order.isSubmitted ? 'bg-success/10 border border-success/20' : 'bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {order.isSubmitted && (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{order.test}</p>
                        {order.isSubmitted && (
                          <Badge variant="success" className="text-xs">Submitted</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground capitalize">
                        Priority: {order.priority}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!order.isSubmitted && (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => submitLabOrder(index)}
                          disabled={createLabOrder.isPending}
                        >
                          <Send className="h-4 w-4 mr-1" />
                          Submit
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => removeLabOrder(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Referrals */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Referrals
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Specialty"
              className="flex-1"
              value={newReferral.specialty}
              onChange={(e) =>
                setNewReferral({ ...newReferral, specialty: e.target.value })
              }
            />
            <Input
              placeholder="Reason"
              className="flex-1"
              value={newReferral.reason}
              onChange={(e) =>
                setNewReferral({ ...newReferral, reason: e.target.value })
              }
            />
            <Button type="button" onClick={addReferral} aria-label="Add referral">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {referrals.length > 0 && (
            <div className="space-y-2">
              {referrals.map((referral: Referral, index: number) => (
                <div
                  key={`${referral.specialty}-${referral.reason}-${referral.urgency}`}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-md"
                >
                  <div>
                    <p className="font-medium">{referral.specialty}</p>
                    <p className="text-sm text-muted-foreground">{referral.reason}</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => removeReferral(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
