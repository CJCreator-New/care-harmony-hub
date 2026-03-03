import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, Search, Loader2 } from "lucide-react";

/** Converts "HH:MM" to 12-hour format: "8:00 AM" */
function formatTime12h(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h < 12 ? 'AM' : 'PM';
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useSearchPatients, usePatients } from "@/hooks/usePatients";
import { useCreateAppointment } from "@/hooks/useAppointments";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const formSchema = z.object({
  patient_id: z.string().min(1, "Patient is required"),
  doctor_id: z.string().optional(),
  scheduled_date: z.date({ required_error: "Please select a date" }),
  scheduled_time: z.string().min(1, "Please select a time"),
  appointment_type: z.string().min(1, "Please select appointment type"),
  duration_minutes: z.number().min(15).max(240),
  priority: z.enum(["low", "normal", "high", "urgent", "emergency"]),
  reason_for_visit: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface ScheduleAppointmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate?: Date;
}

const APPOINTMENT_TYPES = [
  "Check-up",
  "Follow-up",
  "Consultation",
  "Emergency",
  "Lab Work",
  "Vaccination",
  "Physical Exam",
  "Specialist Referral",
  "Other",
];

const TIME_SLOTS = Array.from({ length: 24 }, (_, hour) =>
  ["00", "30"].map((min) => `${String(hour).padStart(2, "0")}:${min}`)
).flat();

export function ScheduleAppointmentModal({
  open,
  onOpenChange,
  selectedDate,
}: ScheduleAppointmentModalProps) {
  const { hospital } = useAuth();
  // Declare state BEFORE hooks that depend on it to avoid temporal dead zone
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<{
    id: string;
    name: string;
    mrn: string;
  } | null>(null);

  // Load all active patients for initial display
  const { data: allPatientsData, isLoading: allPatientsLoading } = usePatients({ limit: 100 });
  // Search patients when user types
  const { data: searchResults, isLoading: searchLoading } = useSearchPatients(patientSearch);

  // Use search results when searching (≥2 chars), otherwise show all patients
  const filteredPatients = patientSearch.length >= 2 ? (searchResults || []) : (allPatientsData?.patients || []);
  // Also show loading when hospital context isn't ready yet (prevents false "no patients" flash)
  const patientsLoading = !hospital?.id || (patientSearch.length >= 2 ? searchLoading : allPatientsLoading);

  const createAppointment = useCreateAppointment();

  // Fetch doctors
  const { data: doctors } = useQuery({
    queryKey: ["doctors", hospital?.id],
    queryFn: async () => {
      if (!hospital?.id) return [];
      
      // 'hospital_id' filter on profiles: cast column name to satisfy Supabase
      // JS v2 strict generic inference for columns not yet in generated types.
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .eq("hospital_id" as any, hospital.id);
      
      if (error) throw error;
      return (data || []) as Array<{ id: string; first_name: string; last_name: string }>;
    },
    enabled: !!hospital?.id,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      patient_id: "",
      doctor_id: "",
      scheduled_date: selectedDate || new Date(),
      scheduled_time: "09:00",
      appointment_type: "",
      duration_minutes: 30,
      priority: "normal",
      reason_for_visit: "",
      notes: "",
    },
  });

  const handlePatientSelect = (patient: (typeof filteredPatients)[number]) => {
    setSelectedPatient({
      id: patient.id,
      name: `${patient.first_name} ${patient.last_name}`,
      mrn: patient.mrn,
    });
    form.setValue("patient_id", patient.id, { shouldValidate: true });
    setPatientSearch("");
  };

  const onSubmit = async (data: FormData) => {
    try {
      await createAppointment.mutateAsync({
        patient_id: data.patient_id,
        doctor_id: data.doctor_id || null,
        scheduled_date: format(data.scheduled_date, "yyyy-MM-dd"),
        scheduled_time: data.scheduled_time,
        appointment_type: data.appointment_type,
        duration_minutes: data.duration_minutes,
        priority: data.priority,
        reason_for_visit: data.reason_for_visit,
        notes: data.notes,
      });
      
      // Reset form and close modal
      form.reset();
      setSelectedPatient(null);
      onOpenChange(false);
    } catch (error) {
      // Error is already handled by the mutation hook
      console.error('Appointment creation failed:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule New Appointment</DialogTitle>
          <DialogDescription>
            Create a new appointment for a patient
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Patient Selection */}
            <FormField
              control={form.control}
              name="patient_id"
              render={() => (
                <FormItem>
                  <FormLabel>Patient *</FormLabel>
                  {selectedPatient ? (
                    <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                      <div>
                        <p className="font-medium">{selectedPatient.name}</p>
                        <p className="text-sm text-muted-foreground">
                          MRN: {selectedPatient.mrn}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedPatient(null);
                          form.setValue("patient_id", "");
                        }}
                      >
                        Change
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Search patient by name or MRN..."
                          className="pl-9"
                          value={patientSearch}
                          onChange={(e) => setPatientSearch(e.target.value)}
                        />
                      </div>
                      <div className="border rounded-md max-h-48 overflow-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>MRN</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {patientsLoading ? (
                              <TableRow>
                                <TableCell colSpan={2} className="text-center py-4">
                                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                                </TableCell>
                              </TableRow>
                            ) : filteredPatients?.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={2} className="text-center py-4 text-muted-foreground">
                                  {patientSearch ? "No patients found" : "No patients available"}
                                </TableCell>
                              </TableRow>
                            ) : (
                              filteredPatients.slice(0, 10).map((patient: (typeof filteredPatients)[number]) => (
                                <TableRow
                                  key={patient.id}
                                  className="cursor-pointer hover:bg-muted/50"
                                  onClick={() => handlePatientSelect(patient)}
                                >
                                  <TableCell>
                                    {patient.first_name} {patient.last_name}
                                  </TableCell>
                                  <TableCell>{patient.mrn}</TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="scheduled_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="scheduled_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select time" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-60">
                        {(() => {
                          const slots = TIME_SLOTS.filter(
                            (t) => { const h = parseInt(t); return h >= 7 && h < 20; }
                          );
                          const morning = slots.filter(t => { const h = parseInt(t); return h >= 7 && h < 12; });
                          const afternoon = slots.filter(t => { const h = parseInt(t); return h >= 12 && h < 17; });
                          const evening = slots.filter(t => { const h = parseInt(t); return h >= 17 && h < 20; });
                          const groups = [{ label: 'Morning', items: morning }, { label: 'Afternoon', items: afternoon }, { label: 'Evening', items: evening }];
                          return groups.filter(g => g.items.length > 0).map(group => (
                            <SelectGroup key={group.label}>
                              <SelectLabel>{group.label}</SelectLabel>
                              {group.items.map(time => (
                                <SelectItem key={time} value={time}>{formatTime12h(time)}</SelectItem>
                              ))}
                            </SelectGroup>
                          ));
                        })()}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Appointment Type and Doctor */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="appointment_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Appointment Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {APPOINTMENT_TYPES.map((type) => (
                          <SelectItem key={type} value={type.toLowerCase()}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="doctor_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Doctor</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select doctor (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {doctors?.map((doctor) => (
                          <SelectItem key={doctor.id} value={doctor.id}>
                            Dr. {doctor.first_name} {doctor.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Duration and Priority */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="duration_minutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (minutes)</FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(parseInt(v))}
                      value={String(field.value)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="45">45 minutes</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="90">1.5 hours</SelectItem>
                        <SelectItem value="120">2 hours</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                        <SelectItem value="emergency">Emergency</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Reason for Visit */}
            <FormField
              control={form.control}
              name="reason_for_visit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for Visit</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief description of the reason for this appointment..."
                      className="min-h-20"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any additional notes for this appointment..."
                      className="min-h-20"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submit */}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createAppointment.isPending}>
                {createAppointment.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Schedule Appointment
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
