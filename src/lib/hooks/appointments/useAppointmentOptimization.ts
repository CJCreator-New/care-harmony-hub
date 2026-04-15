interface AppointmentSlot {
  time: string;
  available: boolean;
  score: number;
  doctor: string;
}

interface OptimizationParams {
  priority: 'routine' | 'urgent' | 'follow-up';
  specialty?: string;
  preferredTime?: string;
}

export function useAppointmentOptimization() {
  const optimizeSlot = (params: OptimizationParams, availableSlots: AppointmentSlot[]) => {
    const scored = availableSlots.map(slot => {
      let score = slot.score;

      // Priority scoring
      if (params.priority === 'urgent') score += 50;
      else if (params.priority === 'follow-up') score += 20;

      // Preferred time matching
      if (params.preferredTime && slot.time.includes(params.preferredTime)) {
        score += 30;
      }

      // Morning slots bonus for routine
      if (params.priority === 'routine' && slot.time.includes('09:') || slot.time.includes('10:')) {
        score += 15;
      }

      return { ...slot, finalScore: score };
    });

    return scored.sort((a, b) => b.finalScore - a.finalScore);
  };

  const detectConflicts = (newAppointment: any, existingAppointments: any[]) => {
    return existingAppointments.filter(apt => {
      const newStart = new Date(newAppointment.start);
      const newEnd = new Date(newAppointment.end);
      const existingStart = new Date(apt.start);
      const existingEnd = new Date(apt.end);

      return (newStart < existingEnd && newEnd > existingStart);
    });
  };

  const predictWaitTime = (appointmentTime: string, queueLength: number) => {
    const baseTime = 15; // minutes per patient
    const bufferTime = 5; // buffer between appointments
    return queueLength * (baseTime + bufferTime);
  };

  return { optimizeSlot, detectConflicts, predictWaitTime };
}
