import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAppointmentOptimization } from '@/hooks/useAppointmentOptimization';
import { Calendar, Clock, AlertCircle, CheckCircle } from 'lucide-react';

interface SmartSchedulerProps {
  patientId: string;
}

export function SmartScheduler({ patientId }: SmartSchedulerProps) {
  const [priority, setPriority] = useState<'routine' | 'urgent' | 'follow-up'>('routine');
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const { optimizeSlot, predictWaitTime } = useAppointmentOptimization();

  // Mock available slots
  const availableSlots = [
    { time: '09:00 AM', available: true, score: 80, doctor: 'Dr. Smith' },
    { time: '10:30 AM', available: true, score: 75, doctor: 'Dr. Johnson' },
    { time: '02:00 PM', available: true, score: 60, doctor: 'Dr. Smith' },
    { time: '03:30 PM', available: true, score: 55, doctor: 'Dr. Williams' },
  ];

  const optimizedSlots = optimizeSlot({ priority }, availableSlots);
  const recommendedSlot = optimizedSlots[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Smart Appointment Scheduler
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium">Priority Level</label>
          <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="routine">Routine</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="follow-up">Follow-up</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {recommendedSlot && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-900">Recommended Slot</span>
            </div>
            <div className="space-y-1 text-sm">
              <p><Clock className="h-4 w-4 inline mr-1" />{recommendedSlot.time}</p>
              <p>Doctor: {recommendedSlot.doctor}</p>
              <p>Est. Wait: {predictWaitTime(recommendedSlot.time, 2)} min</p>
              <Badge className="mt-2">Score: {recommendedSlot.finalScore}</Badge>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">Available Slots</label>
          {optimizedSlots.map((slot, idx) => (
            <div
              key={slot.time}
              className={`p-3 border rounded-lg cursor-pointer hover:bg-muted ${
                selectedSlot === slot.time ? 'border-primary bg-primary/5' : ''
              }`}
              onClick={() => setSelectedSlot(slot.time)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{slot.time}</p>
                  <p className="text-sm text-muted-foreground">{slot.doctor}</p>
                </div>
                <div className="text-right">
                  <Badge variant={idx === 0 ? 'default' : 'secondary'}>
                    {idx === 0 ? 'Best Match' : `#${idx + 1}`}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    {predictWaitTime(slot.time, idx)} min wait
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <Button className="w-full" disabled={!selectedSlot}>
          Book Appointment
        </Button>
      </CardContent>
    </Card>
  );
}
