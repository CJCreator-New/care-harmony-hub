import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  CalendarIcon, 
  Clock, 
  Phone, 
  Mail, 
  MessageSquare, 
  Globe,
  AlertCircle,
  CheckCircle,
  Users,
  Bell
} from 'lucide-react';
import { format } from 'date-fns';
import { 
  AppointmentWaitlist, 
  APPOINTMENT_TYPES, 
  CONTACT_METHODS 
} from '@/types/scheduling';

interface WaitlistManagementCardProps {
  waitlistEntries: AppointmentWaitlist[];
  onAddToWaitlist: (entry: Partial<AppointmentWaitlist>) => void;
  onUpdateWaitlist: (id: string, updates: Partial<AppointmentWaitlist>) => void;
  onNotifyPatient: (id: string) => void;
  onBookFromWaitlist: (id: string) => void;
  availableDoctors: any[];
}

export const WaitlistManagementCard: React.FC<WaitlistManagementCardProps> = ({
  waitlistEntries,
  onAddToWaitlist,
  onUpdateWaitlist,
  onNotifyPatient,
  onBookFromWaitlist,
  availableDoctors
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEntry, setNewEntry] = useState<Partial<AppointmentWaitlist>>({
    preferred_times: [],
    priority: 'normal',
    urgency_level: 3,
    contact_method: 'phone',
    auto_book: false,
    max_notice_hours: 24
  });
  const [dateRange, setDateRange] = useState<{start?: Date, end?: Date}>({});

  const handleAddToWaitlist = () => {
    if (!newEntry.patient_id || !newEntry.appointment_type) return;

    onAddToWaitlist({
      ...newEntry,
      preferred_date_start: dateRange.start?.toISOString().split('T')[0],
      preferred_date_end: dateRange.end?.toISOString().split('T')[0],
      status: 'active'
    });

    setNewEntry({
      preferred_times: [],
      priority: 'normal',
      urgency_level: 3,
      contact_method: 'phone',
      auto_book: false,
      max_notice_hours: 24
    });
    setDateRange({});
    setShowAddForm(false);
  };

  const handleTimeToggle = (time: string) => {
    const times = newEntry.preferred_times || [];
    setNewEntry(prev => ({
      ...prev,
      preferred_times: times.includes(time)
        ? times.filter(t => t !== time)
        : [...times, time]
    }));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'normal': return 'bg-blue-100 text-blue-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'notified': return 'bg-yellow-100 text-yellow-800';
      case 'booked': return 'bg-blue-100 text-blue-800';
      case 'expired': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getContactIcon = (method: string) => {
    switch (method) {
      case 'phone': return <Phone className="h-3 w-3" />;
      case 'email': return <Mail className="h-3 w-3" />;
      case 'sms': return <MessageSquare className="h-3 w-3" />;
      case 'portal': return <Globe className="h-3 w-3" />;
      default: return <Phone className="h-3 w-3" />;
    }
  };

  const timeSlots = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
    '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
  ];

  const activeEntries = waitlistEntries.filter(e => e.status === 'active');
  const notifiedEntries = waitlistEntries.filter(e => e.status === 'notified');

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Appointment Waitlist
              <Badge variant="outline">
                {activeEntries.length} Active
              </Badge>
            </CardTitle>
            <Button onClick={() => setShowAddForm(true)} size="sm">
              Add to Waitlist
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Active Waitlist */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Active Requests</h4>
            {activeEntries.length > 0 ? (
              activeEntries.map(entry => (
                <div key={entry.id} className="p-3 border rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Patient ID: {entry.patient_id}</span>
                      <Badge className={getPriorityColor(entry.priority)}>
                        {entry.priority.toUpperCase()}
                      </Badge>
                      <Badge variant="outline">
                        Urgency: {entry.urgency_level}/5
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onNotifyPatient(entry.id)}
                      >
                        <Bell className="h-3 w-3 mr-1" />
                        Notify
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => onBookFromWaitlist(entry.id)}
                      >
                        Book Now
                      </Button>
                    </div>
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    <p><strong>Type:</strong> {entry.appointment_type}</p>
                    {entry.doctor_id && (
                      <p><strong>Doctor:</strong> {availableDoctors.find(d => d.id === entry.doctor_id)?.first_name}</p>
                    )}
                    <p><strong>Preferred Dates:</strong> {entry.preferred_date_start} to {entry.preferred_date_end}</p>
                    <p><strong>Preferred Times:</strong> {entry.preferred_times.join(', ')}</p>
                    <p><strong>Contact:</strong> 
                      <span className="inline-flex items-center gap-1 ml-1">
                        {getContactIcon(entry.contact_method)}
                        {entry.contact_method}
                      </span>
                    </p>
                    {entry.auto_book && (
                      <p className="text-green-600"><strong>Auto-book enabled</strong> (max {entry.max_notice_hours}h notice)</p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-4">No active waitlist requests</p>
            )}
          </div>

          {/* Notified Patients */}
          {notifiedEntries.length > 0 && (
            <div className="space-y-3 mt-6">
              <h4 className="font-medium text-sm">Recently Notified</h4>
              {notifiedEntries.map(entry => (
                <div key={entry.id} className="p-3 border rounded-lg bg-yellow-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Patient ID: {entry.patient_id}</span>
                      <Badge className={getStatusColor(entry.status)}>
                        {entry.status.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Notified: {entry.notified_at && format(new Date(entry.notified_at), 'MMM d, h:mm a')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add to Waitlist Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add Patient to Waitlist</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="patient-id">Patient ID</Label>
                <Input
                  id="patient-id"
                  value={newEntry.patient_id || ''}
                  onChange={(e) => setNewEntry(prev => ({ ...prev, patient_id: e.target.value }))}
                  placeholder="Enter patient ID"
                />
              </div>

              <div>
                <Label htmlFor="appointment-type">Appointment Type</Label>
                <Select 
                  value={newEntry.appointment_type} 
                  onValueChange={(value) => setNewEntry(prev => ({ ...prev, appointment_type: value }))}
                >
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="doctor">Preferred Doctor (Optional)</Label>
                <Select 
                  value={newEntry.doctor_id} 
                  onValueChange={(value) => setNewEntry(prev => ({ ...prev, doctor_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any doctor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any Available Doctor</SelectItem>
                    {availableDoctors.map(doctor => (
                      <SelectItem key={doctor.id} value={doctor.id}>
                        Dr. {doctor.first_name} {doctor.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="priority">Priority Level</Label>
                <Select 
                  value={newEntry.priority} 
                  onValueChange={(value) => setNewEntry(prev => ({ ...prev, priority: value as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date Range */}
            <div>
              <Label>Preferred Date Range</Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-start text-left">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.start ? format(dateRange.start, 'MMM d') : 'Start date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateRange.start}
                      onSelect={(date) => setDateRange(prev => ({ ...prev, start: date }))}
                      disabled={(date) => date < new Date()}
                    />
                  </PopoverContent>
                </Popover>
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-start text-left">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.end ? format(dateRange.end, 'MMM d') : 'End date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateRange.end}
                      onSelect={(date) => setDateRange(prev => ({ ...prev, end: date }))}
                      disabled={(date) => date < new Date() || (dateRange.start ? date < dateRange.start : false)}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Preferred Times */}
            <div>
              <Label>Preferred Times</Label>
              <div className="grid grid-cols-4 md:grid-cols-6 gap-2 mt-2">
                {timeSlots.map(time => (
                  <Button
                    key={time}
                    variant={newEntry.preferred_times?.includes(time) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleTimeToggle(time)}
                  >
                    {time}
                  </Button>
                ))}
              </div>
            </div>

            {/* Contact Preferences */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contact-method">Contact Method</Label>
                <Select 
                  value={newEntry.contact_method} 
                  onValueChange={(value) => setNewEntry(prev => ({ ...prev, contact_method: value as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTACT_METHODS.map(method => (
                      <SelectItem key={method.value} value={method.value}>
                        {method.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="notice-hours">Max Notice Hours</Label>
                <Input
                  id="notice-hours"
                  type="number"
                  value={newEntry.max_notice_hours}
                  onChange={(e) => setNewEntry(prev => ({ ...prev, max_notice_hours: parseInt(e.target.value) }))}
                  min="1"
                  max="168"
                />
              </div>
            </div>

            {/* Auto-booking */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="auto-book"
                checked={newEntry.auto_book}
                onCheckedChange={(checked) => setNewEntry(prev => ({ ...prev, auto_book: checked as boolean }))}
              />
              <Label htmlFor="auto-book">
                Enable automatic booking when slot becomes available
              </Label>
            </div>

            {/* Reason */}
            <div>
              <Label htmlFor="reason">Reason for Visit</Label>
              <Textarea
                id="reason"
                value={newEntry.reason_for_visit || ''}
                onChange={(e) => setNewEntry(prev => ({ ...prev, reason_for_visit: e.target.value }))}
                placeholder="Brief description of the reason for the appointment..."
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAddToWaitlist}
                disabled={!newEntry.patient_id || !newEntry.appointment_type}
              >
                Add to Waitlist
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};