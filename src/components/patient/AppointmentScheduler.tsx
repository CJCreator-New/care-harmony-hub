import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface TimeSlot {
  time: string;
  available: boolean;
}

export const AppointmentScheduler = ({ onBook }: { onBook: (date: Date, time: string) => void }) => {
  const [date, setDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>();
  const { toast } = useToast();

  const timeSlots: TimeSlot[] = [
    { time: '09:00', available: true },
    { time: '10:00', available: true },
    { time: '11:00', available: false },
    { time: '14:00', available: true },
    { time: '15:00', available: true },
    { time: '16:00', available: true }
  ];

  const handleBook = () => {
    if (date && selectedTime) {
      onBook(date, selectedTime);
      toast({ title: 'Appointment booked successfully' });
    }
  };

  return (
    <Card className="p-4">
      <Calendar mode="single" selected={date} onSelect={setDate} className="mb-4" />
      {date && (
        <div className="space-y-2">
          <h3 className="font-semibold">Available Times</h3>
          <div className="grid grid-cols-3 gap-2">
            {timeSlots.map(slot => (
              <Button
                key={slot.time}
                variant={selectedTime === slot.time ? 'default' : 'outline'}
                disabled={!slot.available}
                onClick={() => setSelectedTime(slot.time)}
                className="w-full"
              >
                {slot.time}
              </Button>
            ))}
          </div>
          <Button onClick={handleBook} disabled={!selectedTime} className="w-full mt-4">
            Book Appointment
          </Button>
        </div>
      )}
    </Card>
  );
};
