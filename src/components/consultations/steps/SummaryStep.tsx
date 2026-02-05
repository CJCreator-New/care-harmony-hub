import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  FileText,
  Calendar,
  Send,
  Pill,
  FlaskConical,
  Stethoscope,
} from "lucide-react";
import { Consultation } from "@/hooks/useConsultations";
import { VitalsTrendChart } from "@/components/consultations/VitalsTrendChart";

interface SummaryStepProps {
  data: Record<string, any>;
  onUpdate: (field: string, value: any) => void;
  consultation: Consultation;
}

export function SummaryStep({ data, onUpdate, consultation }: SummaryStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">Summary & Handoff</h2>
        <p className="text-sm text-muted-foreground">
          Review the consultation and prepare for handoff
        </p>
      </div>

      {/* Consultation Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Consultation Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Chief Complaint */}
          <div>
            <h4 className="text-sm font-medium mb-1">Chief Complaint</h4>
            <p className="text-sm text-muted-foreground">
              {data.chief_complaint || "Not documented"}
            </p>
          </div>

          <Separator />

          {/* Diagnoses */}
          <div>
            <h4 className="text-sm font-medium mb-2">Final Diagnosis</h4>
            {data.final_diagnosis?.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {data.final_diagnosis.map((dx: string) => (
                  <Badge key={dx} variant="default">
                    {dx}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No diagnoses confirmed</p>
            )}
          </div>

          <Separator />

          {/* Prescriptions Summary */}
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Pill className="h-4 w-4" />
              Prescriptions ({data.prescriptions?.length || 0})
            </h4>
            {data.prescriptions?.length > 0 ? (
              <ul className="text-sm text-muted-foreground space-y-1">
                {data.prescriptions.map((rx: any) => (
                  <li key={`${rx.medication}-${rx.dosage}-${rx.frequency}`}>
                    {rx.medication} - {rx.dosage}, {rx.frequency}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No prescriptions</p>
            )}
          </div>

          <Separator />

          {/* Lab Orders Summary */}
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <FlaskConical className="h-4 w-4" />
              Lab Orders ({data.lab_orders?.length || 0})
            </h4>
            {data.lab_orders?.length > 0 ? (
              <ul className="text-sm text-muted-foreground space-y-1">
                {data.lab_orders.map((order: any) => (
                  <li key={`${order.test}-${order.priority}`}>
                    {order.test} ({order.priority})
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No lab orders</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Clinical Notes */}
      <div className="space-y-2">
        <Label htmlFor="clinical_notes" className="flex items-center gap-2">
          <Stethoscope className="h-4 w-4" />
          Clinical Notes
        </Label>
        <Textarea
          id="clinical_notes"
          placeholder="Additional clinical notes and observations..."
          className="min-h-24"
          value={data.clinical_notes || ""}
          onChange={(e) => onUpdate("clinical_notes", e.target.value)}
        />
      </div>

      {/* SOAP Notes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            SOAP Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Subjective */}
          <div className="space-y-2">
            <Label htmlFor="soap_subjective" className="text-sm font-medium text-blue-700">
              S - Subjective (Patient's Report)
            </Label>
            <Textarea
              id="soap_subjective"
              placeholder="Patient's chief complaint, history of present illness, relevant medical history..."
              className="min-h-20"
              value={data.soap_subjective || data.chief_complaint || ""}
              onChange={(e) => onUpdate("soap_subjective", e.target.value)}
            />
          </div>

          <Separator />

          {/* Objective */}
          <div className="space-y-2">
            <Label htmlFor="soap_objective" className="text-sm font-medium text-green-700">
              O - Objective (Clinical Findings)
            </Label>
            <Textarea
              id="soap_objective"
              placeholder="Physical examination findings, vital signs, lab results, imaging..."
              className="min-h-20"
              value={data.soap_objective || ""}
              onChange={(e) => onUpdate("soap_objective", e.target.value)}
            />
          </div>

          <Separator />

          {/* Assessment */}
          <div className="space-y-2">
            <Label htmlFor="soap_assessment" className="text-sm font-medium text-orange-700">
              A - Assessment (Diagnosis)
            </Label>
            <Textarea
              id="soap_assessment"
              placeholder="Clinical impression, differential diagnosis, diagnostic reasoning..."
              className="min-h-20"
              value={data.soap_assessment || ""}
              onChange={(e) => onUpdate("soap_assessment", e.target.value)}
            />
          </div>

          <Separator />

          {/* Plan */}
          <div className="space-y-2">
            <Label htmlFor="soap_plan" className="text-sm font-medium text-purple-700">
              P - Plan (Management)
            </Label>
            <Textarea
              id="soap_plan"
              placeholder="Treatment plan, medications, follow-up, patient education..."
              className="min-h-20"
              value={data.soap_plan || ""}
              onChange={(e) => onUpdate("soap_plan", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Vitals Clinical Trends */}
      <VitalsTrendChart />

      {/* Follow-up */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Follow-up
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="follow_up_date">Follow-up Date</Label>
              <Input
                id="follow_up_date"
                type="date"
                value={data.follow_up_date || ""}
                onChange={(e) => onUpdate("follow_up_date", e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="follow_up_notes">Follow-up Instructions</Label>
            <Textarea
              id="follow_up_notes"
              placeholder="Instructions for follow-up..."
              value={data.follow_up_notes || ""}
              onChange={(e) => onUpdate("follow_up_notes", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Handoff */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Send className="h-4 w-4" />
            Handoff & Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="handoff_notes">Handoff Notes</Label>
            <Textarea
              id="handoff_notes"
              placeholder="Notes for pharmacy, lab, or billing..."
              value={data.handoff_notes || ""}
              onChange={(e) => onUpdate("handoff_notes", e.target.value)}
            />
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="text-sm font-medium">Notify Departments</h4>
            <div className="flex flex-col gap-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="pharmacy_notified"
                  checked={data.pharmacy_notified || false}
                  onCheckedChange={(checked) =>
                    onUpdate("pharmacy_notified", checked)
                  }
                />
                <label
                  htmlFor="pharmacy_notified"
                  className="text-sm cursor-pointer"
                >
                  Notify Pharmacy (for prescriptions)
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="lab_notified"
                  checked={data.lab_notified || false}
                  onCheckedChange={(checked) => onUpdate("lab_notified", checked)}
                />
                <label htmlFor="lab_notified" className="text-sm cursor-pointer">
                  Notify Laboratory (for lab orders)
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="billing_notified"
                  checked={data.billing_notified || false}
                  onCheckedChange={(checked) =>
                    onUpdate("billing_notified", checked)
                  }
                />
                <label
                  htmlFor="billing_notified"
                  className="text-sm cursor-pointer"
                >
                  Notify Billing Department
                </label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
