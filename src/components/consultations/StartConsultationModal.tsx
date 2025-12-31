import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Loader2 } from "lucide-react";
import { usePatients } from "@/hooks/usePatients";
import { useCreateConsultation } from "@/hooks/useConsultations";

interface StartConsultationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StartConsultationModal({
  open,
  onOpenChange,
}: StartConsultationModalProps) {
  const navigate = useNavigate();
  const { data: patients, isLoading: patientsLoading } = usePatients();
  const createConsultation = useCreateConsultation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  const filteredPatients = patients?.filter(
    (patient) =>
      patient.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.mrn.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleStartConsultation = async () => {
    if (!selectedPatientId) return;

    try {
      const consultation = await createConsultation.mutateAsync({
        patient_id: selectedPatientId,
      });
      onOpenChange(false);
      navigate(`/consultations/${consultation.id}`);
    } catch (error) {
      // Error handled by hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Start New Consultation</DialogTitle>
          <DialogDescription>
            Select a patient to begin a new consultation workflow.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Search Patient</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or MRN..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="border rounded-md max-h-64 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>MRN</TableHead>
                  <TableHead>DOB</TableHead>
                  <TableHead>Gender</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patientsLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : filteredPatients?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No patients found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPatients?.map((patient) => (
                    <TableRow
                      key={patient.id}
                      className={`cursor-pointer transition-colors ${
                        selectedPatientId === patient.id
                          ? "bg-primary/10"
                          : "hover:bg-muted/50"
                      }`}
                      onClick={() => setSelectedPatientId(patient.id)}
                    >
                      <TableCell className="font-medium">
                        {patient.first_name} {patient.last_name}
                      </TableCell>
                      <TableCell>{patient.mrn}</TableCell>
                      <TableCell>{patient.date_of_birth}</TableCell>
                      <TableCell className="capitalize">{patient.gender}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleStartConsultation}
              disabled={!selectedPatientId || createConsultation.isPending}
            >
              {createConsultation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Start Consultation
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
