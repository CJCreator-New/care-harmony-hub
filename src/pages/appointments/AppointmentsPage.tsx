import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Plus,
  Search,
  Calendar as CalendarIcon,
  List,
  CheckCircle,
  Clock,
  User,
  XCircle,
  Loader2,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format, isSameDay, parseISO } from "date-fns";
import {
  useCheckInAppointment,
  useUpdateAppointment,
  useAppointmentsRealtime,
} from "@/hooks/useAppointments";
import { usePaginatedQuery } from "@/hooks/usePaginatedQuery";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { APPOINTMENT_COLUMNS } from "@/lib/queryColumns";
import { ScheduleAppointmentModal } from "@/components/appointments/ScheduleAppointmentModal";
import { Pagination } from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  scheduled: { label: "Scheduled", color: "bg-blue-100 text-blue-800", icon: <Clock className="h-3 w-3" /> },
  checked_in: { label: "Checked In", color: "bg-yellow-100 text-yellow-800", icon: <CheckCircle className="h-3 w-3" /> },
  in_progress: { label: "In Progress", color: "bg-purple-100 text-purple-800", icon: <User className="h-3 w-3" /> },
  completed: { label: "Completed", color: "bg-green-100 text-green-800", icon: <CheckCircle className="h-3 w-3" /> },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800", icon: <XCircle className="h-3 w-3" /> },
  no_show: { label: "No Show", color: "bg-gray-100 text-gray-800", icon: <XCircle className="h-3 w-3" /> },
};

export default function AppointmentsPage() {
  const { profile } = useAuth();
  
  // Enable realtime updates
  useAppointmentsRealtime();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  // Debounce search term for server-side filtering
  const debouncedSearch = useDebouncedValue(searchTerm, 300);

  const dateString = format(selectedDate, "yyyy-MM-dd");

  // Build filters for the query
  const filters = {
    hospital_id: profile?.hospital_id,
    ...(viewMode === "list" && dateString && { scheduled_date: dateString }),
    ...(statusFilter !== "all" && { status: statusFilter }),
  };

  const {
    data: appointments,
    isLoading,
    isSearching,
    currentPage,
    totalPages,
    count: totalCount,
    nextPage,
    prevPage,
    goToPage,
  } = usePaginatedQuery({
    table: 'appointments',
    select: `${APPOINTMENT_COLUMNS.list},patient:patients(id, first_name, last_name, mrn, phone),doctor:profiles!appointments_doctor_id_fkey(id, first_name, last_name)`,
    filters,
    searchQuery: debouncedSearch,
    searchColumn: 'patient.first_name,patient.last_name,patient.mrn',
    orderBy: { column: 'scheduled_time', ascending: true },
    pageSize: viewMode === "calendar" ? 100 : 50, // Load more for calendar view
  });

  const checkIn = useCheckInAppointment();
  const updateAppointment = useUpdateAppointment();

  const handleCheckIn = (appointmentId: string) => {
    checkIn.mutate(appointmentId);
  };

  const handleCancel = (appointmentId: string) => {
    updateAppointment.mutate({ id: appointmentId, status: "cancelled" });
  };

  const handleMarkNoShow = (appointmentId: string) => {
    updateAppointment.mutate({ id: appointmentId, status: "no_show" });
  };

  const todayStats = {
    total: appointments?.length || 0,
    scheduled: appointments?.filter((a) => a.status === "scheduled").length || 0,
    checkedIn: appointments?.filter((a) => a.status === "checked_in").length || 0,
    completed: appointments?.filter((a) => a.status === "completed").length || 0,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Appointments</h1>
            <p className="text-muted-foreground">
              Schedule, manage, and track patient appointments
            </p>
          </div>
          <Button onClick={() => setIsScheduleModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Schedule Appointment
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Today</CardTitle>
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayStats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayStats.scheduled}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Checked In</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayStats.checkedIn}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayStats.completed}</div>
            </CardContent>
          </Card>
        </div>

        {/* View Toggle and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "list" | "calendar")}>
            <TabsList>
              <TabsTrigger value="list" className="gap-2">
                <List className="h-4 w-4" />
                List
              </TabsTrigger>
              <TabsTrigger value="calendar" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                Calendar
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex flex-1 gap-4">
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
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Content */}
        {viewMode === "list" ? (
          <div className="flex gap-6">
            {/* Calendar Sidebar */}
            <Card className="hidden lg:block">
              <CardContent className="p-4">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  className={cn("p-0 pointer-events-auto")}
                  modifiers={{
                    hasAppointments: (date) =>
                      (getAppointmentsForDate(date)?.length || 0) > 0,
                  }}
                  modifiersStyles={{
                    hasAppointments: {
                      fontWeight: "bold",
                      textDecoration: "underline",
                    },
                  }}
                />
              </CardContent>
            </Card>

            {/* Appointments List */}
            <Card className="flex-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">
                  {format(selectedDate, "EEEE, MMMM d, yyyy")}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Doctor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Queue #</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading || isSearching ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <div className="flex justify-center items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>{isSearching ? "Searching..." : "Loading appointments..."}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : appointments?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          {searchTerm ? "No appointments match your search" : "No appointments for this date"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      appointments?.map((appointment) => (
                        <AppointmentRow
                          key={appointment.id}
                          appointment={appointment}
                          onCheckIn={handleCheckIn}
                          onCancel={handleCancel}
                          onMarkNoShow={handleMarkNoShow}
                          isCheckingIn={checkIn.isPending}
                        />
                      ))
                    )}
                  </TableBody>
                </Table>
                
                {totalPages > 1 && (
                  <div className="mt-4">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={goToPage}
                      onPrevious={prevPage}
                      onNext={nextPage}
                      pageSize={viewMode === "calendar" ? 100 : 50}
                      totalCount={totalCount}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <CalendarView
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            appointments={appointments || []}
          />
        )}
      </div>

      <ScheduleAppointmentModal
        open={isScheduleModalOpen}
        onOpenChange={setIsScheduleModalOpen}
        selectedDate={selectedDate}
      />
    </DashboardLayout>
  );
}

interface AppointmentRowProps {
  appointment: Appointment;
  onCheckIn: (id: string) => void;
  onCancel: (id: string) => void;
  onMarkNoShow: (id: string) => void;
  isCheckingIn: boolean;
}

function AppointmentRow({
  appointment,
  onCheckIn,
  onCancel,
  onMarkNoShow,
  isCheckingIn,
}: AppointmentRowProps) {
  const status = STATUS_CONFIG[appointment.status] || STATUS_CONFIG.scheduled;

  return (
    <TableRow>
      <TableCell className="font-medium">
        {appointment.scheduled_time.slice(0, 5)}
      </TableCell>
      <TableCell>
        <div>
          <p className="font-medium">
            {appointment.patient?.first_name} {appointment.patient?.last_name}
          </p>
          <p className="text-sm text-muted-foreground">{appointment.patient?.mrn}</p>
        </div>
      </TableCell>
      <TableCell className="capitalize">{appointment.appointment_type}</TableCell>
      <TableCell>
        {appointment.doctor ? (
          `Dr. ${appointment.doctor.first_name} ${appointment.doctor.last_name}`
        ) : (
          <span className="text-muted-foreground">Unassigned</span>
        )}
      </TableCell>
      <TableCell>
        <Badge className={cn("gap-1", status.color)}>
          {status.icon}
          {status.label}
        </Badge>
      </TableCell>
      <TableCell>
        {appointment.queue_number ? (
          <Badge variant="outline">#{appointment.queue_number}</Badge>
        ) : (
          "-"
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          {appointment.status === "scheduled" && (
            <>
              <Button
                size="sm"
                variant="default"
                onClick={() => onCheckIn(appointment.id)}
                disabled={isCheckingIn}
              >
                Check In
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onCancel(appointment.id)}
              >
                Cancel
              </Button>
            </>
          )}
          {appointment.status === "checked_in" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onMarkNoShow(appointment.id)}
            >
              No Show
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

interface CalendarViewProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  appointments: Appointment[];
}

function CalendarView({ selectedDate, onDateSelect, appointments }: CalendarViewProps) {
  const getAppointmentsForDate = (date: Date) => {
    return appointments.filter((apt) => isSameDay(parseISO(apt.scheduled_date), date));
  };

  const dateAppointments = getAppointmentsForDate(selectedDate);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardContent className="p-4">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && onDateSelect(date)}
            className={cn("p-0 pointer-events-auto w-full")}
            modifiers={{
              hasAppointments: (date) =>
                getAppointmentsForDate(date).length > 0,
            }}
            modifiersStyles={{
              hasAppointments: {
                fontWeight: "bold",
                backgroundColor: "hsl(var(--primary) / 0.1)",
              },
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{format(selectedDate, "MMMM d, yyyy")}</CardTitle>
        </CardHeader>
        <CardContent>
          {dateAppointments.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No appointments scheduled
            </p>
          ) : (
            <div className="space-y-3">
              {dateAppointments
                .sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time))
                .map((apt) => {
                  const status = STATUS_CONFIG[apt.status];
                  return (
                    <div
                      key={apt.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-medium w-14">
                          {apt.scheduled_time.slice(0, 5)}
                        </div>
                        <div>
                          <p className="font-medium">
                            {apt.patient?.first_name} {apt.patient?.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground capitalize">
                            {apt.appointment_type}
                          </p>
                        </div>
                      </div>
                      <Badge className={status?.color}>{status?.label}</Badge>
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
