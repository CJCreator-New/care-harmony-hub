import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Video, 
  Calendar, 
  Clock, 
  User,
  Phone,
  Search,
  Plus,
  Play,
} from 'lucide-react';
import { VideoCallModal } from '@/components/telemedicine/VideoCallModal';
import { useAppointments } from '@/hooks/useAppointments';
import { usePatients } from '@/hooks/usePatients';
import { format, parseISO, isToday } from 'date-fns';

export default function TelemedicinePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isPatientPickerOpen, setIsPatientPickerOpen] = useState(false);
  const [pickerPatientId, setPickerPatientId] = useState<string>('');

  const { data: appointments, isLoading } = useAppointments();
  const { data: patients = [] } = usePatients();

  // Filter for telemedicine appointments
  const telemedicineAppointments = appointments?.filter(
    (apt) =>
      apt.appointment_type?.toLowerCase().includes('telemedicine') ||
      apt.appointment_type?.toLowerCase().includes('video') ||
      apt.appointment_type?.toLowerCase().includes('virtual')
  ) || [];

  const todayAppointments = telemedicineAppointments.filter(
    (apt) => isToday(parseISO(apt.scheduled_date))
  );

  const filteredAppointments = telemedicineAppointments.filter((apt) => {
    const patientName = `${apt.patient?.first_name} ${apt.patient?.last_name}`.toLowerCase();
    return patientName.includes(searchTerm.toLowerCase()) ||
           apt.patient?.mrn?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleStartCall = (appointment: any) => {
    setSelectedPatient(appointment.patient);
    setIsVideoModalOpen(true);
  };

  const handleStartNewCall = () => {
    setPickerPatientId('');
    setIsPatientPickerOpen(true);
  };

  const handleConfirmPatientPick = () => {
    const patient = patients.find((p: any) => p.id === pickerPatientId);
    if (!patient) return;
    setSelectedPatient(patient);
    setIsPatientPickerOpen(false);
    setIsVideoModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge variant="secondary">Scheduled</Badge>;
      case 'checked_in':
        return <Badge variant="default">Ready</Badge>;
      case 'in_progress':
        return <Badge className="bg-green-500">In Progress</Badge>;
      case 'completed':
        return <Badge variant="outline">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Video className="h-6 w-6 text-primary" />
              Telemedicine
            </h1>
            <p className="text-muted-foreground">
              Conduct virtual consultations with patients
            </p>
          </div>
          <Button onClick={handleStartNewCall}>
            <Plus className="mr-2 h-4 w-4" />
            Start New Call
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Sessions</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayAppointments.length}</div>
              <p className="text-xs text-muted-foreground">Telemedicine appointments</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {telemedicineAppointments.filter(a => a.status === 'scheduled').length}
              </div>
              <p className="text-xs text-muted-foreground">Scheduled sessions</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ready to Join</CardTitle>
              <Phone className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {telemedicineAppointments.filter(a => a.status === 'checked_in').length}
              </div>
              <p className="text-xs text-muted-foreground">Patients waiting</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {todayAppointments.filter(a => a.status === 'completed').length}
              </div>
              <p className="text-xs text-muted-foreground">Sessions finished</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search patients..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Appointments Table */}
        <Card>
          <CardHeader>
            <CardTitle>Telemedicine Sessions</CardTitle>
            <CardDescription>
              Virtual consultation appointments
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredAppointments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <Video className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">No telemedicine appointments found</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Schedule a telemedicine appointment to get started
                      </p>
                      <Button className="mt-4" onClick={handleStartNewCall}>
                        <Plus className="h-4 w-4 mr-2" />
                        Schedule Test Session
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAppointments.map((appointment) => (
                    <TableRow key={appointment.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {appointment.patient
                              ? `${appointment.patient.first_name} ${appointment.patient.last_name}`.trim() || 'Unknown Patient'
                              : 'Unknown Patient'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {appointment.patient?.mrn || '—'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {format(parseISO(appointment.scheduled_date), 'MMM d, yyyy')}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {appointment.scheduled_time}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {appointment.appointment_type}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(appointment.status || 'scheduled')}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => handleStartCall(appointment)}
                          disabled={appointment.status === 'completed' || appointment.status === 'cancelled'}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Join Call
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

      <VideoCallModal
        open={isVideoModalOpen}
        onOpenChange={setIsVideoModalOpen}
        patient={selectedPatient}
      />

      {/* Patient picker for ad-hoc calls */}
      <Dialog open={isPatientPickerOpen} onOpenChange={setIsPatientPickerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select a Patient</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Select value={pickerPatientId} onValueChange={setPickerPatientId}>
              <SelectTrigger>
                <SelectValue placeholder="Search and select a patient..." />
              </SelectTrigger>
              <SelectContent>
                {patients.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.first_name} {p.last_name} — {p.mrn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPatientPickerOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!pickerPatientId} onClick={handleConfirmPatientPick}>
              <Video className="h-4 w-4 mr-2" />
              Start Call
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
