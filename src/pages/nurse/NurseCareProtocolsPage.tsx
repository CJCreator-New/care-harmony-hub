import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SmartChecklist } from '@/components/nurse/SmartChecklist';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft } from 'lucide-react';
import { usePatients } from '@/lib/hooks/patients';
import { useActiveQueue } from '@/hooks/useQueue';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default function NurseCareProtocolsPage() {
  const navigate = useNavigate();
  const [selectedPatient, setSelectedPatient] = useState<string>('');
  const { data: patientsData } = usePatients();
  const { data: activeQueue = [] } = useActiveQueue();
  const patients = patientsData?.patients || [];
  const queuePatients = activeQueue
    .map((entry) => entry.patient)
    .filter((patient): patient is { id: string; first_name: string; last_name: string; mrn: string } => Boolean(patient));
  const selectablePatients = patients.length > 0 ? patients : queuePatients;

  return (
    <DashboardLayout>
      <div className="container max-w-4xl mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Go back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Care Protocols</h1>
          <p className="text-muted-foreground">Smart checklists for patient care</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Patient</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedPatient} onValueChange={setSelectedPatient}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a patient..." />
            </SelectTrigger>
            <SelectContent>
              {selectablePatients.map((patient) => (
                <SelectItem key={patient.id} value={patient.id}>
                  {patient.first_name} {patient.last_name} - MRN: {patient.mrn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectablePatients.length === 0 && (
            <p className="text-sm text-muted-foreground mt-2">No patients available for protocol assignment.</p>
          )}
        </CardContent>
      </Card>

      {selectedPatient && (
        <SmartChecklist patientId={selectedPatient} />
      )}
      </div>
    </DashboardLayout>
  );
}
