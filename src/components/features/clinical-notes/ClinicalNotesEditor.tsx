import React, { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Sonner } from "sonner";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Textarea,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/index";

// Validation schema
const VitalSchema = z.object({
  blood_pressure: z.string().optional(),
  heart_rate: z.number().optional(),
  temperature: z.number().optional(),
  respiratory_rate: z.number().optional(),
  oxygen_saturation: z.number().optional(),
});

const MedicationSchema = z.object({
  medication: z.string().min(1, "Medication name required"),
  dosage: z.string().min(1, "Dosage required"),
  frequency: z.string().min(1, "Frequency required"),
});

const ClinicalNoteSchema = z.object({
  title: z.string().min(1, "Title required"),
  note_type: z.enum(["progress", "consultation", "procedure", "discharge", "follow_up"]),
  chief_complaint: z.string().min(1, "Chief complaint required"),
  findings: z.string().min(10, "Findings required (minimum 10 characters)"),
  assessment: z.string().min(10, "Assessment required (minimum 10 characters)"),
  plan: z.string().min(10, "Plan required (minimum 10 characters)"),
  medications_prescribed: z.array(MedicationSchema).default([]),
  vitals_recorded: VitalSchema.default({}),
});

type ClinicalNoteFormData = z.infer<typeof ClinicalNoteSchema>;

interface ClinicalNotesEditorProps {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  hospitalId: string;
  onSave?: (noteId: string) => void;
}

/**
 * Comprehensive Clinical Notes Editor Component
 * Supports creating, editing, signing clinical notes with full versioning
 */
export const ClinicalNotesEditor: React.FC<ClinicalNotesEditorProps> = ({
  appointmentId,
  patientId,
  doctorId,
  hospitalId,
  onSave,
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isSigningOpen, setIsSigningOpen] = useState(false);
  const [currentNoteId, setCurrentNoteId] = useState<string | null>(null);
  const [showObservationForm, setShowObservationForm] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<ClinicalNoteFormData>({
    resolver: zodResolver(ClinicalNoteSchema),
    defaultValues: {
      medications_prescribed: [],
      vitals_recorded: {},
    },
  });

  const { fields: medicationFields, append: appendMedication, remove: removeMedication } =
    useFieldArray({
      control,
      name: "medications_prescribed",
    });

  // Fetch existing notes
  const { data: existingNote } = useQuery({
    queryKey: ["clinical-note", appointmentId],
    queryFn: async () => {
      // Fetch from backend
      const response = await fetch(
        `/api/clinical-notes?appointment_id=${appointmentId}`
      );
      return response.json();
    },
  });

  // Create/Update note mutation
  const createNoteMutation = useMutation({
    mutationFn: async (data: ClinicalNoteFormData) => {
      const response = await fetch("/api/clinical-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointment_id: appointmentId,
          patient_id: patientId,
          doctor_id: doctorId,
          hospital_id: hospitalId,
          ...data,
        }),
      });
      if (!response.ok) throw new Error("Failed to save clinical note");
      return response.json();
    },
    onSuccess: (result) => {
      setCurrentNoteId(result.id);
      Sonner.success("Clinical note saved as draft");
      onSave?.(result.id);
      reset();
    },
    onError: (error) => {
      Sonner.error(`Error saving note: ${error.message}`);
    },
  });

  // Sign note mutation
  const signNoteMutation = useMutation({
    mutationFn: async (privateKey: string) => {
      const response = await fetch(`/api/clinical-notes/${currentNoteId}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ private_key: privateKey }),
      });
      if (!response.ok) throw new Error("Failed to sign clinical note");
      return response.json();
    },
    onSuccess: () => {
      Sonner.success("Clinical note digitally signed and locked");
      setIsSigningOpen(false);
      setCurrentNoteId(null);
    },
    onError: (error) => {
      Sonner.error(`Error signing note: ${error.message}`);
    },
  });

  const onSubmit = async (data: ClinicalNoteFormData) => {
    setIsSaving(true);
    await createNoteMutation.mutateAsync(data);
    setIsSaving(false);
  };

  const currentNoteType = watch("note_type");

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Clinical Note</CardTitle>
          <CardDescription>
            Create and sign clinical notes with full audit trail
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Title & Type */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Note Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., Office Visit Summary"
                  {...register("title")}
                  className={errors.title ? "border-red-500" : ""}
                />
                {errors.title && (
                  <span className="text-sm text-red-500">{errors.title.message}</span>
                )}
              </div>

              <div>
                <Label htmlFor="note_type">Note Type</Label>
                <Select defaultValue="progress">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="progress">Progress Note</SelectItem>
                    <SelectItem value="consultation">Consultation</SelectItem>
                    <SelectItem value="procedure">Procedure Note</SelectItem>
                    <SelectItem value="discharge">Discharge Summary</SelectItem>
                    <SelectItem value="follow_up">Follow-up Note</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Chief Complaint */}
            <div>
              <Label htmlFor="chief_complaint">Chief Complaint</Label>
              <Input
                id="chief_complaint"
                placeholder="Patient's main complaint"
                {...register("chief_complaint")}
                className={errors.chief_complaint ? "border-red-500" : ""}
              />
              {errors.chief_complaint && (
                <span className="text-sm text-red-500">
                  {errors.chief_complaint.message}
                </span>
              )}
            </div>

            {/* Vitals */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <h3 className="font-semibold mb-4">Vital Signs</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div>
                  <Label htmlFor="bp" className="text-sm">
                    Blood Pressure
                  </Label>
                  <Input
                    id="bp"
                    placeholder="120/80"
                    {...register("vitals_recorded.blood_pressure")}
                  />
                </div>
                <div>
                  <Label htmlFor="hr" className="text-sm">
                    Heart Rate
                  </Label>
                  <Input
                    id="hr"
                    type="number"
                    placeholder="72"
                    {...register("vitals_recorded.heart_rate", { valueAsNumber: true })}
                  />
                </div>
                <div>
                  <Label htmlFor="temp" className="text-sm">
                    Temp (°C)
                  </Label>
                  <Input
                    id="temp"
                    type="number"
                    placeholder="37.0"
                    {...register("vitals_recorded.temperature", {
                      valueAsNumber: true,
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="rr" className="text-sm">
                    Resp. Rate
                  </Label>
                  <Input
                    id="rr"
                    type="number"
                    placeholder="16"
                    {...register("vitals_recorded.respiratory_rate", {
                      valueAsNumber: true,
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="o2" className="text-sm">
                    O₂ Sat. (%)
                  </Label>
                  <Input
                    id="o2"
                    type="number"
                    placeholder="98"
                    {...register("vitals_recorded.oxygen_saturation", {
                      valueAsNumber: true,
                    })}
                  />
                </div>
              </div>
            </div>

            {/* Findings */}
            <div>
              <Label htmlFor="findings">Physical Examination Findings</Label>
              <Textarea
                id="findings"
                placeholder="Detailed clinical findings..."
                rows={4}
                {...register("findings")}
                className={errors.findings ? "border-red-500" : ""}
              />
              {errors.findings && (
                <span className="text-sm text-red-500">{errors.findings.message}</span>
              )}
            </div>

            {/* Assessment */}
            <div>
              <Label htmlFor="assessment">Clinical Assessment/Diagnosis</Label>
              <Textarea
                id="assessment"
                placeholder="Clinical impression and diagnosis..."
                rows={3}
                {...register("assessment")}
                className={errors.assessment ? "border-red-500" : ""}
              />
              {errors.assessment && (
                <span className="text-sm text-red-500">{errors.assessment.message}</span>
              )}
            </div>

            {/* Plan */}
            <div>
              <Label htmlFor="plan">Treatment Plan</Label>
              <Textarea
                id="plan"
                placeholder="Follow-up care, referrals, home instructions..."
                rows={3}
                {...register("plan")}
                className={errors.plan ? "border-red-500" : ""}
              />
              {errors.plan && (
                <span className="text-sm text-red-500">{errors.plan.message}</span>
              )}
            </div>

            {/* Medications */}
            <div className="border rounded-lg p-4 bg-blue-50">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Medications Prescribed</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendMedication({ medication: "", dosage: "", frequency: "" })}
                >
                  + Add Medication
                </Button>
              </div>

              {medicationFields.length === 0 ? (
                <p className="text-sm text-gray-500">No medications prescribed</p>
              ) : (
                <div className="space-y-3">
                  {medicationFields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-3 gap-3 items-end">
                      <div>
                        <Label className="text-sm">Medication</Label>
                        <Input
                          placeholder="Medication name"
                          {...register(`medications_prescribed.${index}.medication`)}
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Dosage</Label>
                        <Input
                          placeholder="e.g., 500mg"
                          {...register(`medications_prescribed.${index}.dosage`)}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="e.g., BID"
                          {...register(`medications_prescribed.${index}.frequency`)}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMedication(index)}
                          className="text-red-500"
                        >
                          ✕
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Button
                type="submit"
                disabled={isSaving || createNoteMutation.isPending}
                className="flex-1"
              >
                {isSaving ? "Saving..." : "Save as Draft"}
              </Button>

              {currentNoteId && (
                <Dialog open={isSigningOpen} onOpenChange={setIsSigningOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="flex-1">
                      🔐 Sign & Lock
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Sign Clinical Note</DialogTitle>
                      <DialogDescription>
                        This action will digitally sign and lock the note. No further edits will
                        be allowed.
                      </DialogDescription>
                    </DialogHeader>
                    <SignNoteDialog
                      noteId={currentNoteId}
                      onSign={(key) => signNoteMutation.mutate(key)}
                      isLoading={signNoteMutation.isPending}
                    />
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Nurse Observations Panel */}
      {currentNoteId && (
        <Card>
          <CardHeader>
            <CardTitle>Nurse Observations</CardTitle>
            <CardDescription>Append-only log of patient observations</CardDescription>
          </CardHeader>
          <CardContent>
            <NurseObservationsPanel
              noteId={currentNoteId}
              appointmentId={appointmentId}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

/**
 * Sign Note Dialog Component
 */
interface SignNoteDialogProps {
  noteId: string;
  onSign: (privateKey: string) => void;
  isLoading: boolean;
}

const SignNoteDialog: React.FC<SignNoteDialogProps> = ({
  noteId,
  onSign,
  isLoading,
}) => {
  const [privateKey, setPrivateKey] = useState("");

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="private-key">Digital Signature Private Key</Label>
        <Textarea
          id="private-key"
          value={privateKey}
          onChange={(e) => setPrivateKey(e.target.value)}
          placeholder="Paste your private key for signing..."
          rows={4}
          className="font-mono text-sm"
        />
        <p className="text-xs text-gray-500 mt-2">
          Your private key will be used to create a legally-binding digital signature.
        </p>
      </div>

      <Button
        onClick={() => onSign(privateKey)}
        disabled={!privateKey || isLoading}
        className="w-full"
      >
        {isLoading ? "Signing..." : "Sign & Lock Note"}
      </Button>
    </div>
  );
};

/**
 * Nurse Observations Panel
 */
interface NurseObservationsPanelProps {
  noteId: string;
  appointmentId: string;
}

const NurseObservationsPanel: React.FC<NurseObservationsPanelProps> = ({
  noteId,
  appointmentId,
}) => {
  const [observations, setObservations] = useState<any[]>([]);
  const [newObservation, setNewObservation] = useState("");
  const [category, setCategory] = useState<"vital_sign" | "patient_behavior" | "pain_level" | "medication_reaction" | "comfort" | "other">("other");

  const addObservationMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `/api/clinical-notes/${noteId}/observations`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            appointment_id: appointmentId,
            observation_text: newObservation,
            category,
          }),
        }
      );
      return response.json();
    },
    onSuccess: (newObs) => {
      setObservations([...observations, newObs]);
      setNewObservation("");
      Sonner.success("Observation recorded");
    },
  });

  return (
    <div className="space-y-4">
      {observations.length > 0 && (
        <div className="space-y-2">
          {observations.map((obs, idx) => (
            <div key={idx} className="p-3 bg-gray-50 rounded border-l-4 border-blue-500">
              <div className="flex justify-between items-start mb-1">
                <Badge variant="outline" className="text-xs">
                  {obs.category}
                </Badge>
                <span className="text-xs text-gray-500">{obs.observed_at}</span>
              </div>
              <p className="text-sm">{obs.observation_text}</p>
              <p className="text-xs text-gray-600 mt-1">By: {obs.observed_by}</p>
            </div>
          ))}
        </div>
      )}

      <div className="border rounded-lg p-4 bg-blue-50">
        <Label htmlFor="observation">Add Observation (Append-only)</Label>
        <Select value={category} onValueChange={(val: any) => setCategory(val)}>
          <SelectTrigger className="mb-3">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="vital_sign">Vital Sign</SelectItem>
            <SelectItem value="patient_behavior">Patient Behavior</SelectItem>
            <SelectItem value="pain_level">Pain Level</SelectItem>
            <SelectItem value="medication_reaction">Medication Reaction</SelectItem>
            <SelectItem value="comfort">Comfort</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
        <Textarea
          id="observation"
          value={newObservation}
          onChange={(e) => setNewObservation(e.target.value)}
          placeholder="Enter observation..."
          rows={2}
          className="mb-3"
        />
        <Button
          onClick={() => addObservationMutation.mutate()}
          disabled={!newObservation || addObservationMutation.isPending}
          size="sm"
        >
          {addObservationMutation.isPending ? "Recording..." : "Record Observation"}
        </Button>
      </div>
    </div>
  );
};

export default ClinicalNotesEditor;
