import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft, 
  User, 
  Calendar, 
  Phone, 
  Mail, 
  MapPin, 
  Clock,
  Plus,
  FileText,
  BadgeInfo,
  History,
  Activity,
  Droplets,
  AlertTriangle,
  Upload,
  ShieldCheck
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { PatientTimeline } from '@/components/patients/PatientTimeline';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StartConsultationModal } from '@/components/consultations/StartConsultationModal';
import { usePatientVitalSigns } from '@/hooks/useVitalSigns';
import { usePatient } from '@/hooks/usePatients';
import { EditPatientModal } from '@/components/patients/EditPatientModal';
import { differenceInYears, format as formatDate } from 'date-fns';
import { toast } from 'sonner';

export default function PatientProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [consultationModalOpen, setConsultationModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const { data: patient, isLoading } = usePatient(id);

  const { data: vitalSigns = [] } = usePatientVitalSigns(id || '');

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-[400px] lg:col-span-1" />
            <Skeleton className="h-[400px] lg:col-span-2" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Go back to patients list">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{patient?.first_name} {patient?.last_name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="font-mono">{patient?.mrn}</Badge>
              <Badge variant="secondary">Active Patient</Badge>
            </div>
          </div>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" className="gap-2" onClick={() => setEditModalOpen(true)}>
              Edit Details
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => {
                toast.promise(
                  new Promise(resolve => setTimeout(resolve, 1500)),
                  {
                    loading: `Generating EMR export for ${patient?.first_name} ${patient?.last_name}…`,
                    success: 'EMR export ready — download will be available once document module is enabled.',
                    error: 'Export failed.',
                  }
                );
              }}
            >
              <FileText className="h-4 w-4" />
              EMR Export
            </Button>
            <Button className="gap-2" onClick={() => setConsultationModalOpen(true)}>
              <Plus className="h-4 w-4" />
              New Consultation
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Basic Info */}
          <div className="space-y-6">
            <div className="rounded-xl border bg-card p-6">
              <div className="flex flex-col items-center text-center pb-6 border-b">
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <User className="w-12 h-12 text-primary" />
                </div>
                <h3 className="font-bold text-lg">{patient?.first_name} {patient?.last_name}</h3>
                <p className="text-sm text-muted-foreground">Registered on {patient?.created_at ? new Date(patient.created_at).toLocaleDateString() : 'N/A'}</p>
              </div>
              
              <div className="pt-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div className="text-sm">
                    <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Date of Birth</p>
                    <p>{patient?.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString() : 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <BadgeInfo className="h-4 w-4 text-muted-foreground" />
                  <div className="text-sm">
                    <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Gender</p>
                    <p className="capitalize">{patient?.gender || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div className="text-sm">
                    <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Phone</p>
                    <p>{patient?.phone || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div className="text-sm">
                    <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Email</p>
                    <p>{patient?.email || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div className="text-sm">
                    <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Age</p>
                    <p>{(() => {
                    if (!patient?.date_of_birth) return 'N/A';
                    const age = differenceInYears(new Date(), new Date(patient.date_of_birth));
                    return isNaN(age) || age < 0 ? 'N/A' : `${age} yrs`;
                  })()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Droplets className="h-4 w-4 text-muted-foreground" />
                  <div className="text-sm">
                    <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Blood Type</p>
                    <p>{patient?.blood_type || 'N/A'}</p>
                  </div>
                </div>
                {(patient?.emergency_contact_name || patient?.emergency_contact_phone) && (
                  <div className="flex items-start gap-3 pt-2 border-t">
                    <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
                    <div className="text-sm">
                      <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Emergency Contact</p>
                      <p className="font-medium">{patient.emergency_contact_name || 'N/A'}</p>
                      {patient.emergency_contact_relationship && (
                        <p className="text-xs text-muted-foreground capitalize">{patient.emergency_contact_relationship}</p>
                      )}
                      {patient.emergency_contact_phone && (
                        <p className="text-xs">{patient.emergency_contact_phone}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Timeline and Details */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="clinical">
              <div className="overflow-x-auto pb-2">
              <TabsList className="inline-grid min-w-[720px] w-full grid-cols-4 mb-2">
                <TabsTrigger value="clinical" className="gap-2">
                  <History className="h-4 w-4" />
                  Clinical History
                </TabsTrigger>
                <TabsTrigger value="vitals" className="gap-2">
                  <Activity className="h-4 w-4" />
                  Vitals
                </TabsTrigger>
                <TabsTrigger value="documents" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Documents
                </TabsTrigger>
                <TabsTrigger value="insurance" className="gap-2">
                  <MapPin className="h-4 w-4" />
                  Insurance
                </TabsTrigger>
              </TabsList>
              </div>

              <TabsContent value="clinical" className="space-y-4">
                <PatientTimeline patientId={id!} />
              </TabsContent>
              
              <TabsContent value="vitals" className="space-y-4">
                {vitalSigns.length === 0 ? (
                  <div className="p-12 text-center bg-muted/30 rounded-lg border-2 border-dashed">
                    <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                    <h4 className="font-semibold">No Vitals Recorded Yet</h4>
                    <p className="text-sm text-muted-foreground">Vital signs will appear here once recorded during consultations.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-sm text-muted-foreground">{vitalSigns.length} vital sign reading{vitalSigns.length !== 1 ? 's' : ''} recorded</div>
                    {vitalSigns.map((vs) => (
                      <div key={vs.id} className="rounded-lg border bg-card p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground font-medium">
                            {vs.recorded_at ? formatDate(new Date(vs.recorded_at), 'MMM d, yyyy — h:mm a') : 'N/A'}
                          </span>
                          {vs.recorder && (
                            <span className="text-xs text-muted-foreground">by {vs.recorder.first_name} {vs.recorder.last_name}</span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {vs.blood_pressure_systolic && vs.blood_pressure_diastolic && (
                            <div className="text-center p-2 rounded-md bg-muted/50">
                              <p className="text-xs text-muted-foreground">Blood Pressure</p>
                              <p className="font-bold text-sm">{vs.blood_pressure_systolic}/{vs.blood_pressure_diastolic} <span className="text-xs font-normal">mmHg</span></p>
                            </div>
                          )}
                          {vs.heart_rate && (
                            <div className="text-center p-2 rounded-md bg-muted/50">
                              <p className="text-xs text-muted-foreground">Heart Rate</p>
                              <p className="font-bold text-sm">{vs.heart_rate} <span className="text-xs font-normal">bpm</span></p>
                            </div>
                          )}
                          {vs.temperature && (
                            <div className="text-center p-2 rounded-md bg-muted/50">
                              <p className="text-xs text-muted-foreground">Temperature</p>
                              <p className="font-bold text-sm">{vs.temperature} <span className="text-xs font-normal">°F</span></p>
                            </div>
                          )}
                          {vs.oxygen_saturation && (
                            <div className="text-center p-2 rounded-md bg-muted/50">
                              <p className="text-xs text-muted-foreground">O₂ Saturation</p>
                              <p className="font-bold text-sm">{vs.oxygen_saturation}<span className="text-xs font-normal">%</span></p>
                            </div>
                          )}
                          {vs.respiratory_rate && (
                            <div className="text-center p-2 rounded-md bg-muted/50">
                              <p className="text-xs text-muted-foreground">Resp. Rate</p>
                              <p className="font-bold text-sm">{vs.respiratory_rate} <span className="text-xs font-normal">br/min</span></p>
                            </div>
                          )}
                          {vs.weight && (
                            <div className="text-center p-2 rounded-md bg-muted/50">
                              <p className="text-xs text-muted-foreground">Weight</p>
                              <p className="font-bold text-sm">{vs.weight} <span className="text-xs font-normal">kg</span></p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="documents">
                <div className="p-12 text-center bg-muted/30 rounded-lg border-2 border-dashed">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                  <h4 className="font-semibold">No Documents Uploaded</h4>
                  <p className="text-sm text-muted-foreground mb-4">Patient documents such as lab reports, referrals, and consent forms will appear here.</p>
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => toast.info('Document upload module is coming soon.')}
                  >
                    <Upload className="h-4 w-4" />
                    Upload Document
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="insurance">
                {patient?.insurance_provider ? (
                  <div className="rounded-xl border bg-card p-6 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <ShieldCheck className="h-5 w-5 text-primary" />
                      <h4 className="font-semibold text-lg">Insurance Details</h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Provider</p>
                        <p className="text-sm font-medium">{patient.insurance_provider}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Policy Number</p>
                        <p className="text-sm font-medium font-mono">{patient.insurance_policy_number || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Group Number</p>
                        <p className="text-sm font-medium font-mono">{patient.insurance_group_number || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-12 text-center bg-muted/30 rounded-lg border-2 border-dashed">
                    <ShieldCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                    <h4 className="font-semibold">No Insurance Information</h4>
                    <p className="text-sm text-muted-foreground mb-4">Insurance details and coverage information will be displayed once added to the patient record.</p>
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() => toast.info('Edit the patient record to add insurance information.')}
                    >
                      <Plus className="h-4 w-4" />
                      Add Insurance
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      <StartConsultationModal
        open={consultationModalOpen}
        onOpenChange={setConsultationModalOpen}
      />
      <EditPatientModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        patient={patient}
      />
    </DashboardLayout>
  );
}
