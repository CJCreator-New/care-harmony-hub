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
  Activity
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { PatientTimeline } from '@/components/patients/PatientTimeline';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StartConsultationModal } from '@/components/consultations/StartConsultationModal';

export default function PatientProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [consultationModalOpen, setConsultationModalOpen] = useState(false);

  const { data: patient, isLoading } = useQuery({
    queryKey: ['patient', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

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
            <Button variant="outline" className="gap-2">
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
              </div>
            </div>
          </div>

          {/* Right Column: Timeline and Details */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="clinical">
              <TabsList className="grid w-full grid-cols-4 mb-4">
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

              <TabsContent value="clinical" className="space-y-4">
                <PatientTimeline patientId={id!} />
              </TabsContent>
              
              <TabsContent value="vitals">
                <div className="p-12 text-center bg-muted/30 rounded-lg border-2 border-dashed">
                  <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                  <h4 className="font-semibold">No Vitals Trends Yet</h4>
                  <p className="text-sm text-muted-foreground">Historical vital signs will appear here once recorded in consultations.</p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      <StartConsultationModal
        open={consultationModalOpen}
        onOpenChange={setConsultationModalOpen}
      />
    </DashboardLayout>
  );
}
