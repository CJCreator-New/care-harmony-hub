import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SmartChecklist } from '@/components/nurse/SmartChecklist';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, CheckCircle2, ClipboardCheck, HeartPulse, ShieldCheck } from 'lucide-react';
import { usePatients } from '@/lib/hooks/patients';
import { useActiveQueue } from '@/hooks/useQueue';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

const PROTOCOL_TEMPLATES = [
  {
    id: 'fall-risk',
    title: 'Fall Risk Prevention',
    description: 'Mobility assessment, call bell access, assisted ambulation, and bedside safety checks.',
    icon: ShieldCheck,
    steps: ['Assess gait and transfer ability', 'Confirm bed rails and call bell', 'Document fall precautions'],
  },
  {
    id: 'post-procedure',
    title: 'Post-Procedure Observation',
    description: 'Focused vitals, pain scoring, wound/site checks, and escalation triggers.',
    icon: HeartPulse,
    steps: ['Record vitals at ordered interval', 'Assess pain and procedure site', 'Escalate abnormal findings'],
  },
  {
    id: 'med-safety',
    title: 'Medication Safety Round',
    description: 'Medication reconciliation, allergy confirmation, and missed-dose review.',
    icon: ClipboardCheck,
    steps: ['Verify active medication list', 'Confirm allergies', 'Review due and missed administrations'],
  },
];

export default function NurseCareProtocolsPage() {
  const navigate = useNavigate();
  const [selectedPatient, setSelectedPatient] = useState<string>('');
  const [selectedProtocol, setSelectedProtocol] = useState(PROTOCOL_TEMPLATES[0].id);
  const { data: patientsData } = usePatients();
  const { data: activeQueue = [] } = useActiveQueue();
  const patients = patientsData?.patients || [];
  const queuePatients = activeQueue
    .map((entry) => entry.patient)
    .filter((patient): patient is { id: string; first_name: string; last_name: string; mrn: string } => Boolean(patient));
  const selectablePatients = patients.length > 0 ? patients : queuePatients;
  const protocol = PROTOCOL_TEMPLATES.find((template) => template.id === selectedProtocol) || PROTOCOL_TEMPLATES[0];

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

      <div className="grid gap-4 md:grid-cols-3">
        {PROTOCOL_TEMPLATES.map((template) => {
          const Icon = template.icon;
          const isSelected = selectedProtocol === template.id;
          return (
            <button
              key={template.id}
              type="button"
              onClick={() => setSelectedProtocol(template.id)}
              className={`text-left rounded-lg border p-4 transition-colors ${
                isSelected ? 'border-primary bg-primary/5' : 'bg-card hover:bg-muted/50'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <Icon className="h-5 w-5 text-primary" />
                {isSelected && <Badge variant="secondary">Selected</Badge>}
              </div>
              <h2 className="mt-3 font-semibold">{template.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{template.description}</p>
            </button>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assign Protocol</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
          {selectedPatient && (
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="h-4 w-4 text-success" />
                {protocol.title}
              </div>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {protocol.steps.map((step) => (
                  <li key={step} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    {step}
                  </li>
                ))}
              </ul>
            </div>
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
