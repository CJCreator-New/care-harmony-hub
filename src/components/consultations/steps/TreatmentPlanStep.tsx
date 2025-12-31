import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, X, Pill, FlaskConical, UserPlus } from "lucide-react";

interface TreatmentPlanStepProps {
  data: Record<string, any>;
  onUpdate: (field: string, value: any) => void;
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
}

interface Referral {
  specialty: string;
  reason: string;
  urgency: string;
}

export function TreatmentPlanStep({ data, onUpdate }: TreatmentPlanStepProps) {
  const [newPrescription, setNewPrescription] = useState<Prescription>({
    medication: "",
    dosage: "",
    frequency: "",
    duration: "",
    instructions: "",
  });
  const [newLabOrder, setNewLabOrder] = useState<LabOrder>({
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
  const labOrders = data.lab_orders || [];
  const referrals = data.referrals || [];

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
      onUpdate("lab_orders", [...labOrders, { ...newLabOrder }]);
      setNewLabOrder({ test: "", priority: "routine", notes: "" });
    }
  };

  const removeLabOrder = (index: number) => {
    onUpdate(
      "lab_orders",
      labOrders.filter((_: LabOrder, i: number) => i !== index)
    );
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
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <Input
              placeholder="Medication"
              value={newPrescription.medication}
              onChange={(e) =>
                setNewPrescription({ ...newPrescription, medication: e.target.value })
              }
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
            <Button type="button" onClick={addPrescription}>
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
          <CardTitle className="text-base flex items-center gap-2">
            <FlaskConical className="h-4 w-4" />
            Lab Orders
          </CardTitle>
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
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-md"
                >
                  <div>
                    <p className="font-medium">{order.test}</p>
                    <p className="text-sm text-muted-foreground capitalize">
                      Priority: {order.priority}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => removeLabOrder(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
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
