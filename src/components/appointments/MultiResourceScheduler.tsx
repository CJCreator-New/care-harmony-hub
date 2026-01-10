import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Clock, MapPin, Stethoscope, AlertCircle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { 
  HospitalResource, 
  SchedulingSlot, 
  MultiResourceBookingRequest,
  APPOINTMENT_TYPES 
} from '@/types/scheduling';

interface MultiResourceSchedulerProps {
  patientId: string;
  onBookingComplete: (booking: MultiResourceBookingRequest) => void;
  availableResources: HospitalResource[];
  availableDoctors: any[];
}

export const MultiResourceScheduler: React.FC<MultiResourceSchedulerProps> = ({
  patientId,
  onBookingComplete,
  availableResources,
  availableDoctors
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedDoctor, setSelectedDoctor] = useState<string>('');
  const [appointmentType, setAppointmentType] = useState<string>('');
  const [duration, setDuration] = useState<number>(30);
  const [selectedResources, setSelectedResources] = useState<string[]>([]);
  const [availableSlots, setAvailableSlots] = useState<SchedulingSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<SchedulingSlot | null>(null);
  const [loading, setLoading] = useState(false);

  const roomResources = availableResources.filter(r => r.resource_type === 'room');
  const equipmentResources = availableResources.filter(r => r.resource_type === 'equipment');

  const handleResourceToggle = (resourceId: string) => {
    setSelectedResources(prev => 
      prev.includes(resourceId) 
        ? prev.filter(id => id !== resourceId)
        : [...prev, resourceId]
    );
  };

  const checkAvailability = async () => {
    if (!selectedDate || !selectedDoctor || !appointmentType) return;

    setLoading(true);
    try {
      // Simulate API call to check availability
      const slots = generateTimeSlots(selectedDate, duration);
      setAvailableSlots(slots);
    } catch (error) {
      console.error('Error checking availability:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateTimeSlots = (date: Date, durationMinutes: number): SchedulingSlot[] => {
    const slots: SchedulingSlot[] = [];
    const startHour = 8; // 8 AM
    const endHour = 17; // 5 PM
    const slotInterval = 30; // 30-minute intervals

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += slotInterval) {
        const startTime = new Date(date);
        startTime.setHours(hour, minute, 0, 0);
        
        const endTime = new Date(startTime);
        endTime.setMinutes(endTime.getMinutes() + durationMinutes);

        // Check if slot fits within working hours
        if (endTime.getHours() <= endHour) {
          const slot: SchedulingSlot = {
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            available: Math.random() > 0.3, // Simulate availability
            doctor_available: Math.random() > 0.2,
            resources_available: selectedResources.map(resourceId => {
              const resource = availableResources.find(r => r.id === resourceId);
              return {
                resource_id: resourceId,
                resource_name: resource?.name || '',
                resource_type: resource?.resource_type || '',
                available: Math.random() > 0.25
              };
            })
          };
          slots.push(slot);
        }
      }
    }

    return slots;
  };

  const handleBooking = () => {
    if (!selectedSlot || !selectedDate || !selectedDoctor) return;

    const booking: MultiResourceBookingRequest = {
      patient_id: patientId,
      doctor_id: selectedDoctor,
      appointment_type: appointmentType,
      start_time: selectedSlot.start_time,
      duration_minutes: duration,
      required_resources: selectedResources,
      reason_for_visit: ''
    };

    onBookingComplete(booking);
  };

  const isSlotAvailable = (slot: SchedulingSlot) => {
    return slot.available && 
           slot.doctor_available && 
           slot.resources_available.every(r => r.available);
  };

  const getSlotStatusColor = (slot: SchedulingSlot) => {
    if (isSlotAvailable(slot)) return 'bg-green-100 text-green-800 hover:bg-green-200';
    if (!slot.doctor_available) return 'bg-red-100 text-red-800';
    if (slot.resources_available.some(r => !r.available)) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  useEffect(() => {
    if (selectedDate && selectedDoctor && appointmentType && selectedResources.length > 0) {
      checkAvailability();
    }
  }, [selectedDate, selectedDoctor, appointmentType, selectedResources, duration]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Multi-Resource Appointment Scheduler
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Appointment Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="appointment-type">Appointment Type</Label>
              <Select value={appointmentType} onValueChange={setAppointmentType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {APPOINTMENT_TYPES.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="doctor">Doctor</Label>
              <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                <SelectTrigger>
                  <SelectValue placeholder="Select doctor" />
                </SelectTrigger>
                <SelectContent>
                  {availableDoctors.map(doctor => (
                    <SelectItem key={doctor.id} value={doctor.id}>
                      Dr. {doctor.first_name} {doctor.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Select value={duration.toString()} onValueChange={(v) => setDuration(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date Selection */}
          <div>
            <Label>Select Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => date < new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Resource Selection */}
          <div className="space-y-4">
            <h3 className="font-medium">Required Resources</h3>
            
            {/* Rooms */}
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <MapPin className="h-4 w-4" />
                Examination Rooms
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {roomResources.map(resource => (
                  <div key={resource.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={resource.id}
                      checked={selectedResources.includes(resource.id)}
                      onCheckedChange={() => handleResourceToggle(resource.id)}
                    />
                    <Label htmlFor={resource.id} className="text-sm">
                      {resource.name}
                      {resource.floor && ` (Floor ${resource.floor})`}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Equipment */}
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <Stethoscope className="h-4 w-4" />
                Equipment (Optional)
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {equipmentResources.map(resource => (
                  <div key={resource.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={resource.id}
                      checked={selectedResources.includes(resource.id)}
                      onCheckedChange={() => handleResourceToggle(resource.id)}
                    />
                    <Label htmlFor={resource.id} className="text-sm">
                      {resource.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Available Time Slots */}
      {availableSlots.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Available Time Slots
              <Badge variant="outline">
                {format(selectedDate!, 'MMM d, yyyy')}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {availableSlots.map((slot, index) => {
                const startTime = new Date(slot.start_time);
                const available = isSlotAvailable(slot);
                
                return (
                  <Button
                    key={index}
                    variant={selectedSlot === slot ? 'default' : 'outline'}
                    className={`h-auto p-3 flex flex-col items-center ${getSlotStatusColor(slot)}`}
                    onClick={() => available && setSelectedSlot(slot)}
                    disabled={!available}
                  >
                    <div className="font-medium">
                      {format(startTime, 'h:mm a')}
                    </div>
                    <div className="text-xs mt-1">
                      {available ? (
                        <CheckCircle className="h-3 w-3 text-green-600" />
                      ) : (
                        <AlertCircle className="h-3 w-3 text-red-600" />
                      )}
                    </div>
                  </Button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
                <span>Available</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div>
                <span>Doctor Unavailable</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded"></div>
                <span>Resource Conflict</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-100 border border-gray-300 rounded"></div>
                <span>Unavailable</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected Slot Details */}
      {selectedSlot && (
        <Card>
          <CardHeader>
            <CardTitle>Booking Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date & Time</Label>
                <p className="font-medium">
                  {format(new Date(selectedSlot.start_time), 'PPP p')} - 
                  {format(new Date(selectedSlot.end_time), 'p')}
                </p>
              </div>
              <div>
                <Label>Duration</Label>
                <p className="font-medium">{duration} minutes</p>
              </div>
            </div>

            <div>
              <Label>Selected Resources</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {selectedResources.map(resourceId => {
                  const resource = availableResources.find(r => r.id === resourceId);
                  return (
                    <Badge key={resourceId} variant="outline">
                      {resource?.name}
                    </Badge>
                  );
                })}
              </div>
            </div>

            <Button 
              onClick={handleBooking} 
              className="w-full"
              disabled={!selectedSlot || loading}
            >
              {loading ? 'Booking...' : 'Confirm Appointment'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};