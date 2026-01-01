import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Plus,
  Clock,
  CalendarDays,
  Video,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  useDoctorAvailability,
  useCreateAvailability,
  useDeleteAvailability,
  useTimeSlots,
  useGenerateTimeSlots,
  getDayName,
} from '@/hooks/useDoctorAvailability';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

export default function SchedulingPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [isAddAvailabilityOpen, setIsAddAvailabilityOpen] = useState(false);
  const [newAvailability, setNewAvailability] = useState({
    day_of_week: 1,
    start_time: '09:00',
    end_time: '17:00',
    slot_duration_minutes: 30,
    is_telemedicine: false,
  });

  const { hospital, roles, profile } = useAuth();
  const isDoctor = roles.includes('doctor');
  const doctorId = isDoctor ? profile?.id : selectedDoctorId;

  // Fetch all doctors
  const { data: doctors } = useQuery({
    queryKey: ['doctors', hospital?.id],
    queryFn: async () => {
      if (!hospital?.id) return [];
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('hospital_id', hospital.id)
        .eq('role', 'doctor');
      
      if (!roles || roles.length === 0) return [];
      
      const { data } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('hospital_id', hospital.id)
        .in('user_id', roles.map(r => r.user_id));
      return (data || []) as Array<{ id: string; first_name: string; last_name: string }>;
    },
    enabled: !!hospital?.id,
  });

  const { data: availability, isLoading: availabilityLoading } = useDoctorAvailability(doctorId || undefined);
  const { data: timeSlots, isLoading: slotsLoading } = useTimeSlots(
    format(selectedDate, 'yyyy-MM-dd'),
    doctorId || undefined
  );
  const createAvailability = useCreateAvailability();
  const deleteAvailability = useDeleteAvailability();
  const generateSlots = useGenerateTimeSlots();

  const handleAddAvailability = () => {
    if (!doctorId) return;
    createAvailability.mutate(
      {
        ...newAvailability,
        doctor_id: doctorId,
      },
      {
        onSuccess: () => {
          setIsAddAvailabilityOpen(false);
          setNewAvailability({
            day_of_week: 1,
            start_time: '09:00',
            end_time: '17:00',
            slot_duration_minutes: 30,
            is_telemedicine: false,
          });
        },
      }
    );
  };

  const handleGenerateSlots = () => {
    if (!doctorId) return;
    generateSlots.mutate({
      doctorId,
      date: format(selectedDate, 'yyyy-MM-dd'),
    });
  };

  const bookedSlots = timeSlots?.filter((s) => s.is_booked).length || 0;
  const availableSlots = timeSlots?.filter((s) => !s.is_booked).length || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Scheduling</h1>
            <p className="text-muted-foreground">Manage doctor availability and time slots</p>
          </div>
          {!isDoctor && (
            <Select value={selectedDoctorId} onValueChange={setSelectedDoctorId}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Select a doctor" />
              </SelectTrigger>
              <SelectContent>
              {doctors?.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    Dr. {d.first_name} {d.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Slots</CardTitle>
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{timeSlots?.length || 0}</div>
              <p className="text-xs text-muted-foreground">
                {availableSlots} available, {bookedSlots} booked
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Availability Rules</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{availability?.length || 0}</div>
              <p className="text-xs text-muted-foreground">Weekly recurring slots</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Telemedicine</CardTitle>
              <Video className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {availability?.filter((a) => a.is_telemedicine).length || 0}
              </div>
              <p className="text-xs text-muted-foreground">Virtual visit slots</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="availability">
          <TabsList>
            <TabsTrigger value="availability">Availability Rules</TabsTrigger>
            <TabsTrigger value="slots">Time Slots</TabsTrigger>
          </TabsList>

          <TabsContent value="availability" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Weekly Availability</CardTitle>
                  <CardDescription>Set recurring availability for each day of the week</CardDescription>
                </div>
                <Dialog open={isAddAvailabilityOpen} onOpenChange={setIsAddAvailabilityOpen}>
                  <DialogTrigger asChild>
                    <Button disabled={!doctorId}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Availability
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Availability</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>Day of Week</Label>
                        <Select
                          value={String(newAvailability.day_of_week)}
                          onValueChange={(v) =>
                            setNewAvailability({ ...newAvailability, day_of_week: parseInt(v) })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DAYS_OF_WEEK.map((day) => (
                              <SelectItem key={day.value} value={String(day.value)}>
                                {day.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Start Time</Label>
                          <Input
                            type="time"
                            value={newAvailability.start_time}
                            onChange={(e) =>
                              setNewAvailability({ ...newAvailability, start_time: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>End Time</Label>
                          <Input
                            type="time"
                            value={newAvailability.end_time}
                            onChange={(e) =>
                              setNewAvailability({ ...newAvailability, end_time: e.target.value })
                            }
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Slot Duration (minutes)</Label>
                        <Select
                          value={String(newAvailability.slot_duration_minutes)}
                          onValueChange={(v) =>
                            setNewAvailability({ ...newAvailability, slot_duration_minutes: parseInt(v) })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="15">15 minutes</SelectItem>
                            <SelectItem value="30">30 minutes</SelectItem>
                            <SelectItem value="45">45 minutes</SelectItem>
                            <SelectItem value="60">60 minutes</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Telemedicine</Label>
                          <p className="text-sm text-muted-foreground">Enable for virtual visits</p>
                        </div>
                        <Switch
                          checked={newAvailability.is_telemedicine}
                          onCheckedChange={(checked) =>
                            setNewAvailability({ ...newAvailability, is_telemedicine: checked })
                          }
                        />
                      </div>
                      <Button onClick={handleAddAvailability} className="w-full" disabled={createAvailability.isPending}>
                        {createAvailability.isPending ? 'Adding...' : 'Add Availability'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Day</TableHead>
                      <TableHead>Time Range</TableHead>
                      <TableHead>Slot Duration</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {availabilityLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          <div className="flex justify-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : !doctorId ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          Please select a doctor to view availability
                        </TableCell>
                      </TableRow>
                    ) : availability?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No availability set. Add availability rules to enable scheduling.
                        </TableCell>
                      </TableRow>
                    ) : (
                      availability?.map((avail) => (
                        <TableRow key={avail.id}>
                          <TableCell className="font-medium">{getDayName(avail.day_of_week)}</TableCell>
                          <TableCell>
                            {avail.start_time.slice(0, 5)} - {avail.end_time.slice(0, 5)}
                          </TableCell>
                          <TableCell>{avail.slot_duration_minutes} min</TableCell>
                          <TableCell>
                            {avail.is_telemedicine ? (
                              <Badge variant="secondary" className="gap-1">
                                <Video className="h-3 w-3" />
                                Telemedicine
                              </Badge>
                            ) : (
                              <Badge variant="outline">In-Person</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteAvailability.mutate(avail.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="slots" className="mt-4">
            <div className="grid gap-6 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Select Date</CardTitle>
                </CardHeader>
                <CardContent>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    className="p-0"
                  />
                  <Button
                    className="w-full mt-4"
                    onClick={handleGenerateSlots}
                    disabled={!doctorId || generateSlots.isPending}
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${generateSlots.isPending ? 'animate-spin' : ''}`} />
                    Generate Slots
                  </Button>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Time Slots for {format(selectedDate, 'MMMM d, yyyy')}</CardTitle>
                  <CardDescription>
                    {timeSlots?.length || 0} slots • {availableSlots} available • {bookedSlots} booked
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {slotsLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                    </div>
                  ) : !doctorId ? (
                    <p className="text-center py-8 text-muted-foreground">
                      Please select a doctor to view time slots
                    </p>
                  ) : timeSlots?.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">
                      No slots for this date. Click "Generate Slots" to create them.
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                      {timeSlots?.map((slot) => (
                        <div
                          key={slot.id}
                          className={`p-2 rounded-lg text-center text-sm ${
                            slot.is_booked
                              ? 'bg-destructive/10 text-destructive border border-destructive/20'
                              : 'bg-primary/10 text-primary border border-primary/20'
                          }`}
                        >
                          <div className="font-medium">{slot.start_time.slice(0, 5)}</div>
                          <div className="text-xs">
                            {slot.is_booked ? 'Booked' : 'Available'}
                          </div>
                          {slot.is_telemedicine && (
                            <Video className="h-3 w-3 mx-auto mt-1" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
