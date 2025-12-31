import { useState } from "react";
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
import { useNavigate } from "react-router-dom";
import { useConsultations, CONSULTATION_STEPS } from "@/hooks/useConsultations";
import { format } from "date-fns";
import { StartConsultationModal } from "@/components/consultations/StartConsultationModal";

export default function ConsultationsPage() {
  const navigate = useNavigate();
  const { data: consultations, isLoading } = useConsultations();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);

  const filteredConsultations = consultations?.filter((consultation) => {
    const matchesSearch =
      consultation.patient?.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      consultation.patient?.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      consultation.patient?.mrn.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || consultation.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const step = CONSULTATION_STEPS.find((s) => s.status === status);
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
        {step?.label || status}
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
          <Button onClick={() => setIsStartModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Start Consultation
          </Button>
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
                {consultations?.filter((c) => c.status !== "completed").length || 0}
              </div>
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
              <CardTitle className="text-sm font-medium">Today's Total</CardTitle>
              <Stethoscope className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {consultations?.filter((c) => {
                  const today = new Date().toISOString().split("T")[0];
                  return c.created_at.startsWith(today);
                }).length || 0}
              </div>
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
            <Table>
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
                ) : filteredConsultations?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No consultations found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredConsultations?.map((consultation) => (
                    <TableRow key={consultation.id}>
                      <TableCell className="font-medium">
                        {consultation.patient?.first_name} {consultation.patient?.last_name}
                      </TableCell>
                      <TableCell>{consultation.patient?.mrn}</TableCell>
                      <TableCell>{getStatusBadge(consultation.status)}</TableCell>
                      <TableCell>Step {consultation.current_step} of 5</TableCell>
                      <TableCell>
                        {consultation.started_at
                          ? format(new Date(consultation.started_at), "MMM d, h:mm a")
                          : "-"}
                      </TableCell>
                      <TableCell>
                        Dr. {consultation.doctor?.first_name} {consultation.doctor?.last_name}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/consultations/${consultation.id}`)}
                        >
                          Continue
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <StartConsultationModal
        open={isStartModalOpen}
        onOpenChange={setIsStartModalOpen}
      />
    </DashboardLayout>
  );
}
