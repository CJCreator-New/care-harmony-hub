import { useEffect, useRef, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, Stethoscope, Clock, User } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useConsultations, CONSULTATION_STEPS, useGetOrCreateConsultation } from "@/hooks/useConsultations";
import { differenceInHours, format, isToday } from "date-fns";
import { StartConsultationModal } from "@/components/consultations/StartConsultationModal";
import { usePermissions } from '@/lib/hooks';

export default function ConsultationsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: consultations, isLoading } = useConsultations();
  const getOrCreateConsultation = useGetOrCreateConsultation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  const permissions = usePermissions();
  const quickStartHandledRef = useRef<string | null>(null);
  const canStartConsultation = permissions.can('consultations:write');

  useEffect(() => {
    const patientId = searchParams.get('patientId');
    if (!patientId || !canStartConsultation) return;
    if (quickStartHandledRef.current === patientId) return;
    if (getOrCreateConsultation.isPending) return;

    quickStartHandledRef.current = patientId;

    (async () => {
      try {
        const consultation = await getOrCreateConsultation.mutateAsync(patientId);
        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete('patientId');
        setSearchParams(nextParams, { replace: true });
        navigate(`/consultations/${consultation.id}`);
      } catch {
        // Error toast is handled inside hook
        quickStartHandledRef.current = null;
      }
    })();
  }, [
    canStartConsultation,
    getOrCreateConsultation,
    navigate,
    searchParams,
    setSearchParams,
  ]);

  const filteredConsultations = consultations?.filter((consultation) => {
    const matchesSearch =
      consultation.patient?.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      consultation.patient?.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      consultation.patient?.mrn.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || consultation.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const isStaleConsultation = (consultation: { status: string; started_at: string | null; created_at: string }) => {
    if (consultation.status === "completed") return false;
    const referenceTime = consultation.started_at || consultation.created_at;
    return differenceInHours(new Date(), new Date(referenceTime)) > 24;
  };

  const latestConsultationDate = consultations?.[0]?.created_at
    ? new Date(consultations[0].created_at)
    : null;
  const todaysTotal = consultations?.filter((c) => isToday(new Date(c.created_at))).length || 0;
  const fallbackDayTotal = latestConsultationDate
    ? consultations?.filter((c) => format(new Date(c.created_at), "yyyy-MM-dd") === format(latestConsultationDate, "yyyy-MM-dd")).length || 0
    : 0;
  const totalLabel = todaysTotal > 0
    ? "Today's Total"
    : latestConsultationDate
      ? `Latest Activity (${format(latestConsultationDate, "MMM d")})`
      : "Today's Total";

  const getStatusLabel = (status: string) => {
    const step = CONSULTATION_STEPS.find((s) => s.status === status);
    return step?.label || status;
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-muted text-muted-foreground",
      patient_overview: "bg-blue-100 text-blue-800",
      clinical_assessment: "bg-yellow-100 text-yellow-800",
      treatment_planning: "bg-purple-100 text-purple-800",
      final_review: "bg-orange-100 text-orange-800",
      handoff: "bg-green-100 text-green-800",
      completed: "bg-green-500 text-white",
    };
    return (
      <Badge className={colors[status] || "bg-muted"}>
        {getStatusLabel(status)}
      </Badge>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Consultations</h1>
            <p className="text-muted-foreground">
              Manage patient consultations and clinical workflows
            </p>
          </div>
          {canStartConsultation && (
            <Button onClick={() => setIsStartModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Start Consultation
            </Button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <Stethoscope className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {consultations?.filter((c) => c.status !== "completed" && !isStaleConsultation(c)).length || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {consultations?.filter((c) => c.status !== "completed" && isStaleConsultation(c)).length || 0} overdue
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Assessment</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {consultations?.filter((c) => c.status === "clinical_assessment").length || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Handoff</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {consultations?.filter((c) => c.status === "handoff").length || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{totalLabel}</CardTitle>
              <Stethoscope className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {todaysTotal > 0 ? todaysTotal : fallbackDayTotal}
              </div>
              {todaysTotal === 0 && latestConsultationDate && (
                <p className="text-xs text-muted-foreground">
                  Showing the most recent consultation day in the current dataset
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by patient name or MRN..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {CONSULTATION_STEPS.map((step) => (
                    <SelectItem key={step.status} value={step.status}>
                      {step.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Consultations Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="min-w-[1080px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>MRN</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Step</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div className="flex justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : !filteredConsultations?.length ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No consultations found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredConsultations?.map((consultation) => (
                      <TableRow key={consultation.id}>
                        <TableCell className="font-medium whitespace-nowrap">
                          {consultation.patient?.first_name} {consultation.patient?.last_name}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{consultation.patient?.mrn}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(consultation.status)}
                            {isStaleConsultation(consultation) && (
                              <Badge className="bg-amber-100 text-amber-800">Overdue</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">Step {consultation.current_step} of 5</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {consultation.started_at
                            ? format(new Date(consultation.started_at), "MMM d, h:mm a")
                            : "-"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          Dr. {consultation.doctor?.first_name} {consultation.doctor?.last_name}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/consultations/${consultation.id}`)}
                          >
                            {consultation.status === 'completed' ? 'View' : 'Continue'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {canStartConsultation && (
        <StartConsultationModal
          open={isStartModalOpen}
          onOpenChange={setIsStartModalOpen}
        />
      )}
    </DashboardLayout>
  );
}
