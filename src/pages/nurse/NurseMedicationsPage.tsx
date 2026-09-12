import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Pill,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ShieldAlert,
  Syringe,
  XCircle,
  Scan,
  User,
  HeartPulse,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import { usePrescriptions } from '@/lib/hooks/pharmacy/usePrescriptions';
import { usePatient, usePatients } from '@/lib/hooks/patients';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

import { BarcodeVerificationModal } from '@/components/nurse/BarcodeVerificationModal';
import { MedicationAdministrationModal } from '@/components/nurse/MedicationAdministrationModal';
import { DoseWithholdingModal } from '@/components/nurse/DoseWithholdingModal';
import { PRNAdministrationModal } from '@/components/nurse/PRNAdministrationModal';
import { PRNEffectivenessModal } from '@/components/nurse/PRNEffectivenessModal';
import { isHighAlertMedication } from '@/lib/clinical/medicationAdministrationRules';

export default function NurseMedicationsPage() {
  const { user, profile, hospital } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('scheduled');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatientFilter, setSelectedPatientFilter] = useState<string>('all');

  // Modals state
  const [bcmaModalOpen, setBcmaModalOpen] = useState(false);
  const [administerModalOpen, setAdministerModalOpen] = useState(false);
  const [withholdingModalOpen, setWithholdingModalOpen] = useState(false);
  const [prnAdminModalOpen, setPrnAdminModalOpen] = useState(false);
  const [prnOutcomeModalOpen, setPrnOutcomeModalOpen] = useState(false);

  // Selected item targets
  const [targetItem, setTargetItem] = useState<any>(null);
  const [targetPatient, setTargetPatient] = useState<any>(null);
  const [selectedAdminRecord, setSelectedAdminRecord] = useState<any>(null);

  // Data fetching
  const { data: prescriptions, isLoading: isLoadingPrescriptions } = usePrescriptions();
  const { data: patientsList } = usePatients();

  // Fetch real medication administrations log
  const { data: administrations, isLoading: isLoadingAdmins } = useQuery({
    queryKey: ['medication-administrations', hospital?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medication_administrations')
        .select('*')
        .order('administered_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: !!hospital?.id,
  });

  // Flat scheduled prescription items
  const scheduledItems = useMemo(() => {
    if (!prescriptions) return [];
    const flat: any[] = [];
    for (const rx of prescriptions) {
      if (
        rx.status === 'approved' ||
        rx.status === 'dispensed' ||
        rx.status === 'partially_dispensed'
      ) {
        const items =
          rx.items && rx.items.length > 0
            ? rx.items
            : [
                {
                  id: `${rx.id}-default`,
                  prescription_id: rx.id,
                  medication_name: (rx as any).medication_name || 'Standard Medication',
                  dosage: (rx as any).dosage || 'Standard Dose',
                  frequency: (rx as any).frequency || 'Daily',
                  instructions: rx.notes || '',
                },
              ];

        for (const item of items) {
          const isPRN =
            (item.frequency || '').toLowerCase().includes('prn') ||
            (item.instructions || '').toLowerCase().includes('prn') ||
            (item.instructions || '').toLowerCase().includes('as needed');
          flat.push({
            ...item,
            prescription_id: rx.id,
            patient_id: rx.patient_id,
            patient: rx.patient,
            isPRN,
            status: rx.status,
          });
        }
      }
    }
    return flat;
  }, [prescriptions]);

  // Filter items by search and tab
  const filteredScheduled = useMemo(() => {
    return scheduledItems.filter((item) => {
      if (item.isPRN) return false;
      if (selectedPatientFilter !== 'all' && item.patient_id !== selectedPatientFilter)
        return false;
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      const medName = (item.medication_name || '').toLowerCase();
      const patName = item.patient
        ? `${item.patient.first_name} ${item.patient.last_name}`.toLowerCase()
        : '';
      return medName.includes(term) || patName.includes(term);
    });
  }, [scheduledItems, selectedPatientFilter, searchTerm]);

  const filteredPRN = useMemo(() => {
    return scheduledItems.filter((item) => {
      if (!item.isPRN) return false;
      if (selectedPatientFilter !== 'all' && item.patient_id !== selectedPatientFilter)
        return false;
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      const medName = (item.medication_name || '').toLowerCase();
      const patName = item.patient
        ? `${item.patient.first_name} ${item.patient.last_name}`.toLowerCase()
        : '';
      return medName.includes(term) || patName.includes(term);
    });
  }, [scheduledItems, selectedPatientFilter, searchTerm]);

  // Record Administration Mutation
  const recordAdminMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await supabase
        .from('medication_administrations')
        .insert({
          hospital_id: hospital?.id,
          patient_id: payload.patientId,
          prescription_id: payload.prescriptionId,
          medication_name: payload.medicationName,
          dosage: payload.dosage,
          route: payload.route,
          administered_by: profile?.id || user?.id,
          administered_at: new Date().toISOString(),
          witness_id: payload.witnessId || null,
          status: payload.status || 'administered',
          notes: payload.notes || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medication-administrations'] });
    },
  });

  // Update Administration Outcome Mutation
  const updateOutcomeMutation = useMutation({
    mutationFn: async (payload: any) => {
      const existing = (administrations || []).find((a) => a.id === payload.administrationId);
      const updatedNotes = `${existing?.notes ? existing.notes + ' | ' : ''}Reassessment: ${payload.postDoseScore} (${payload.outcomeResponse})${payload.outcomeNotes ? ' - ' + payload.outcomeNotes : ''}`;

      const { data, error } = await supabase
        .from('medication_administrations')
        .update({
          notes: updatedNotes,
        })
        .eq('id', payload.administrationId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medication-administrations'] });
      toast.success('PRN outcome reassessment recorded.');
      setPrnOutcomeModalOpen(false);
    },
  });

  // Action handlers
  const handleStartAdministrationFlow = (item: any) => {
    setTargetItem(item);
    setTargetPatient(
      item.patient ||
        (patientsList || []).find((p) => p.id === item.patient_id) || {
          id: item.patient_id,
          first_name: 'Patient',
          last_name: item.patient_id.slice(0, 6),
        }
    );
    setBcmaModalOpen(true);
  };

  const handleBcmaVerified = () => {
    setBcmaModalOpen(false);
    setAdministerModalOpen(true);
  };

  const handleConfirmAdministration = async (data: any) => {
    await recordAdminMutation.mutateAsync({
      ...data,
      status: 'administered',
      notes:
        `${data.site ? `Site: ${data.site}. ` : ''}${data.preconditionValue !== undefined ? `Pre-vital: ${data.preconditionValue}. ` : ''}${data.witnessName ? `Witness: ${data.witnessName}. ` : ''}${data.notes || ''}`.trim(),
    });
    setAdministerModalOpen(false);
    setTargetItem(null);
    toast.success(`Medication administered: ${data.medicationName}`);
  };

  const handleOpenWithholdingModal = (item: any) => {
    setTargetItem(item);
    setTargetPatient(
      item.patient ||
        (patientsList || []).find((p) => p.id === item.patient_id) || {
          id: item.patient_id,
          first_name: 'Patient',
          last_name: item.patient_id.slice(0, 6),
        }
    );
    setWithholdingModalOpen(true);
  };

  const handleConfirmWithhold = async (data: any) => {
    await recordAdminMutation.mutateAsync({
      ...data,
      route: 'N/A',
      notes: `${data.reasonLabel}. Context: ${data.clinicalNotes}`,
    });
    setWithholdingModalOpen(false);
    setTargetItem(null);
    toast.info(`Dose marked as ${data.status}: ${data.medicationName}`);
  };

  const handleOpenPRNModal = (item: any) => {
    setTargetItem(item);
    setTargetPatient(
      item.patient ||
        (patientsList || []).find((p) => p.id === item.patient_id) || {
          id: item.patient_id,
          first_name: 'Patient',
          last_name: item.patient_id.slice(0, 6),
        }
    );
    setPrnAdminModalOpen(true);
  };

  const handleConfirmPRNAdmin = async (data: any) => {
    await recordAdminMutation.mutateAsync({
      ...data,
      status: 'administered',
      notes:
        `PRN for ${data.indication}. Pre-score: ${data.baselineScore}. ${data.notes || ''}`.trim(),
    });
    setPrnAdminModalOpen(false);
    setTargetItem(null);
    toast.success(`PRN dose administered: ${data.medicationName}. Reassessment scheduled.`);
  };

  const handleOpenOutcomeModal = (adminRecord: any) => {
    setSelectedAdminRecord(adminRecord);
    setTargetPatient(
      (patientsList || []).find((p) => p.id === adminRecord.patient_id) || {
        id: adminRecord.patient_id,
        first_name: 'Patient',
        last_name: adminRecord.patient_id.slice(0, 6),
      }
    );
    setPrnOutcomeModalOpen(true);
  };

  // Stats calculation
  const totalScheduledCount = filteredScheduled.length;
  const administeredTodayCount = (administrations || []).filter(
    (a) =>
      a.status === 'administered' &&
      a.administered_at?.startsWith(new Date().toISOString().split('T')[0])
  ).length;
  const withheldCount = (administrations || []).filter(
    (a) => a.status === 'withheld' || a.status === 'refused'
  ).length;
  const highAlertCount = scheduledItems.filter((i) =>
    isHighAlertMedication(i.medication_name)
  ).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Inpatient eMAR & BCMA</h1>
            <p className="text-muted-foreground">
              Electronic Medication Administration Record with barcode verification, 5 Rights, and
              high-alert double-check
            </p>
          </div>
        </div>

        {/* Clinical Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-blue-500/10 text-blue-600">
                  <Clock className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalScheduledCount}</p>
                  <p className="text-xs text-muted-foreground">Scheduled Doses Due</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-600">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{administeredTodayCount}</p>
                  <p className="text-xs text-muted-foreground">Administered Today</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-amber-500/10 text-amber-600">
                  <XCircle className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{withheldCount}</p>
                  <p className="text-xs text-muted-foreground">Withheld / Refused</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-destructive/10 text-destructive">
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{highAlertCount}</p>
                  <p className="text-xs text-muted-foreground">High-Alert Drugs</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Bar */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search medication, dosage, or patient..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 text-xs h-9"
                />
              </div>
              <div className="w-full md:w-64">
                <select
                  value={selectedPatientFilter}
                  onChange={(e) => setSelectedPatientFilter(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="all">All Inpatients</option>
                  {(patientsList || []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.first_name} {p.last_name} ({p.mrn || 'N/A'})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="scheduled" className="text-xs">
              Scheduled eMAR ({filteredScheduled.length})
            </TabsTrigger>
            <TabsTrigger value="prn" className="text-xs">
              PRN As-Needed ({filteredPRN.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs">
              Administration History
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Scheduled Maintenance Doses */}
          <TabsContent value="scheduled" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Scheduled Administration Rounding Manifest
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingPrescriptions ? (
                  <div className="py-12 text-center text-xs text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                    Loading active inpatient eMAR...
                  </div>
                ) : filteredScheduled.length === 0 ? (
                  <div className="py-12 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
                    No scheduled medications pending administration.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40 text-xs">
                          <TableHead>Patient</TableHead>
                          <TableHead>Medication & Dose</TableHead>
                          <TableHead>Frequency / Route</TableHead>
                          <TableHead>Instructions / Warnings</TableHead>
                          <TableHead className="text-right">Administration Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredScheduled.map((item) => {
                          const isHigh = isHighAlertMedication(item.medication_name);
                          const patientName = item.patient
                            ? `${item.patient.first_name} ${item.patient.last_name}`
                            : 'Inpatient';

                          return (
                            <TableRow
                              key={item.id}
                              className={isHigh ? 'bg-destructive/5' : undefined}
                            >
                              <TableCell className="font-medium text-xs">
                                <div>{patientName}</div>
                                <span className="text-[11px] text-muted-foreground font-mono">
                                  MRN: {item.patient?.mrn || 'N/A'}
                                </span>
                              </TableCell>
                              <TableCell className="text-xs">
                                <div className="font-bold flex items-center gap-1.5">
                                  {item.medication_name}
                                  {isHigh && (
                                    <Badge
                                      variant="destructive"
                                      className="text-[9px] px-1 py-0 uppercase"
                                    >
                                      High Alert
                                    </Badge>
                                  )}
                                </div>
                                <span className="text-[11px] text-muted-foreground">
                                  {item.dosage}
                                </span>
                              </TableCell>
                              <TableCell className="text-xs">
                                <div>{item.frequency}</div>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                                {item.instructions || '--'}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1.5">
                                  <Button
                                    size="sm"
                                    onClick={() => handleStartAdministrationFlow(item)}
                                    className="h-8 text-xs font-semibold gap-1 bg-blue-600 hover:bg-blue-700 text-white"
                                  >
                                    <Scan className="h-3.5 w-3.5" />
                                    Scan & Give
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleOpenWithholdingModal(item)}
                                    className="h-8 text-xs text-destructive hover:bg-destructive/10"
                                  >
                                    <XCircle className="h-3.5 w-3.5 mr-1" />
                                    Hold
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: PRN Medications */}
          <TabsContent value="prn" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Pill className="h-4 w-4 text-indigo-600" />
                  Active Inpatient PRN (As-Needed) Orders
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingPrescriptions ? (
                  <div className="py-12 text-center text-xs text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                    Loading PRN orders...
                  </div>
                ) : filteredPRN.length === 0 ? (
                  <div className="py-12 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
                    No active PRN medication orders for current inpatients.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40 text-xs">
                          <TableHead>Patient</TableHead>
                          <TableHead>PRN Drug & Dose</TableHead>
                          <TableHead>Indication & Criteria</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPRN.map((item) => {
                          const isHigh = isHighAlertMedication(item.medication_name);
                          const patientName = item.patient
                            ? `${item.patient.first_name} ${item.patient.last_name}`
                            : 'Inpatient';

                          return (
                            <TableRow
                              key={item.id}
                              className={isHigh ? 'bg-destructive/5' : undefined}
                            >
                              <TableCell className="font-medium text-xs">
                                <div>{patientName}</div>
                                <span className="text-[11px] text-muted-foreground font-mono">
                                  MRN: {item.patient?.mrn || 'N/A'}
                                </span>
                              </TableCell>
                              <TableCell className="text-xs">
                                <div className="font-bold flex items-center gap-1.5">
                                  {item.medication_name}
                                  {isHigh && (
                                    <Badge
                                      variant="destructive"
                                      className="text-[9px] px-1 py-0 uppercase"
                                    >
                                      High Alert
                                    </Badge>
                                  )}
                                </div>
                                <span className="text-[11px] text-muted-foreground">
                                  {item.dosage}
                                </span>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {item.instructions || item.frequency}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  size="sm"
                                  onClick={() => handleOpenPRNModal(item)}
                                  className="h-8 text-xs font-semibold gap-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                                >
                                  <Syringe className="h-3.5 w-3.5" />
                                  Give PRN Dose
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: History & Closed-Loop Outcomes */}
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  eMAR Administration Audit Trail & Closed-Loop Outcomes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingAdmins ? (
                  <div className="py-12 text-center text-xs text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                    Loading administration records...
                  </div>
                ) : (administrations || []).length === 0 ? (
                  <div className="py-12 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
                    No medication administration events recorded yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40 text-xs">
                          <TableHead>Time</TableHead>
                          <TableHead>Medication</TableHead>
                          <TableHead>Dose / Route</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Clinical Notes / Outcome</TableHead>
                          <TableHead className="text-right">PRN Follow-up</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(administrations || []).map((admin) => {
                          const isPRN = (admin.notes || '').toLowerCase().includes('prn');
                          const hasOutcome = (admin.notes || '')
                            .toLowerCase()
                            .includes('reassessment:');

                          return (
                            <TableRow key={admin.id}>
                              <TableCell className="text-xs font-mono text-muted-foreground">
                                {format(new Date(admin.administered_at), 'MMM d, h:mm a')}
                              </TableCell>
                              <TableCell className="font-bold text-xs">
                                {admin.medication_name}
                              </TableCell>
                              <TableCell className="text-xs">
                                {admin.dosage} ({admin.route || 'Oral'})
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    admin.status === 'administered'
                                      ? 'outline'
                                      : admin.status === 'withheld'
                                        ? 'secondary'
                                        : 'destructive'
                                  }
                                  className={
                                    admin.status === 'administered'
                                      ? 'text-emerald-700 bg-emerald-50 border-emerald-300 capitalize'
                                      : 'capitalize'
                                  }
                                >
                                  {admin.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground max-w-sm truncate">
                                {admin.notes || '--'}
                              </TableCell>
                              <TableCell className="text-right">
                                {isPRN && !hasOutcome && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleOpenOutcomeModal(admin)}
                                    className="h-7 text-[11px] text-indigo-700 border-indigo-300 hover:bg-indigo-50"
                                  >
                                    <HeartPulse className="h-3 w-3 mr-1 text-indigo-600" />
                                    Reassess
                                  </Button>
                                )}
                                {isPRN && hasOutcome && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] text-emerald-700 bg-emerald-50"
                                  >
                                    Reassessed
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* BCMA Patient Barcode Modal */}
      <BarcodeVerificationModal
        open={bcmaModalOpen}
        onOpenChange={setBcmaModalOpen}
        patient={targetPatient}
        onVerified={handleBcmaVerified}
      />

      {/* 5 Rights & High-Alert Witness Administration Modal */}
      <MedicationAdministrationModal
        open={administerModalOpen}
        onOpenChange={setAdministerModalOpen}
        prescription={targetItem}
        patient={targetPatient}
        onAdminister={handleConfirmAdministration}
        isLoading={recordAdminMutation.isPending}
      />

      {/* Dose Withholding & Clinical Hold Modal */}
      <DoseWithholdingModal
        open={withholdingModalOpen}
        onOpenChange={setWithholdingModalOpen}
        prescription={targetItem}
        patient={targetPatient}
        onWithhold={handleConfirmWithhold}
        isLoading={recordAdminMutation.isPending}
      />

      {/* PRN Administration Modal */}
      <PRNAdministrationModal
        open={prnAdminModalOpen}
        onOpenChange={setPrnAdminModalOpen}
        prescription={targetItem}
        patient={targetPatient}
        onAdministerPRN={handleConfirmPRNAdmin}
        isLoading={recordAdminMutation.isPending}
      />

      {/* PRN Effectiveness Closed-Loop Modal */}
      <PRNEffectivenessModal
        open={prnOutcomeModalOpen}
        onOpenChange={setPrnOutcomeModalOpen}
        administrationRecord={selectedAdminRecord}
        patient={targetPatient}
        onRecordOutcome={async (data) => {
          await updateOutcomeMutation.mutateAsync(data);
        }}
        isLoading={updateOutcomeMutation.isPending}
      />
    </DashboardLayout>
  );
}
