import { useState, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Pill, FlaskConical, UserPlus, Send, CheckCircle2, AlertTriangle } from "lucide-react";
import { useCreateLabOrder } from "@/hooks/useLabOrders";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { checkPrescriptionSafety } from "@/hooks/usePrescriptionSafety";
import { PrescriptionSafetyAlerts } from "@/components/prescriptions/PrescriptionSafetyAlerts";

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
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {prescriptions.length > 0 && (
            <div className="space-y-2">
              {prescriptions.map((rx: Prescription, index: number) => (
                <div
                  key={index}
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
            <Button type="button" onClick={addLabOrder}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {labOrders.length > 0 && (
            <div className="space-y-2">
              {labOrders.map((order: LabOrder, index: number) => (
                <div
                  key={index}
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
            <Button type="button" onClick={addReferral}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {referrals.length > 0 && (
            <div className="space-y-2">
              {referrals.map((referral: Referral, index: number) => (
                <div
                  key={index}
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
