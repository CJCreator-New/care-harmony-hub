import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface SmartSchedulingFeatures {
  aiOptimization: {
    patientPriority: 'urgent' | 'routine' | 'follow-up';
    doctorSpecialty: string;
    estimatedDuration: number;
    conflictResolution: 'auto' | 'manual';
  };
  dynamicRescheduling: {
    emergencyHandling: boolean;
    waitTimeOptimization: boolean;
    resourceAvailability: boolean;
  };
}

interface AppointmentSlot {
  id: string;
  doctorId: string;
  startTime: Date;
  endTime: Date;
  isAvailable: boolean;
  priority: number;
}

export const useSmartScheduling = () => {
  const [isOptimizing, setIsOptimizing] = useState(false);

  const optimizeSchedule = async (
    patientId: string,
    appointmentType: 'urgent' | 'routine' | 'follow-up',
    preferredDoctorId?: string
  ) => {
    setIsOptimizing(true);
    
    try {
      // Get available slots
      const { data: slots } = await supabase
        .from('appointment_slots')
        .select('*')
        .eq('is_available', true)
        .gte('start_time', new Date().toISOString());

      // AI optimization logic
      const optimizedSlot = await findOptimalSlot(slots, {
        patientPriority: appointmentType,
        doctorSpecialty: preferredDoctorId ? await getDoctorSpecialty(preferredDoctorId) : 'general',
        estimatedDuration: getEstimatedDuration(appointmentType),
        conflictResolution: 'auto'
      });

      return optimizedSlot;
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleEmergencyRescheduling = async (emergencyPatientId: string) => {
    // Find next available urgent slot
    const { data: urgentSlots } = await supabase
      .from('appointment_slots')
      .select('*')
      .eq('priority_level', 'urgent')
      .eq('is_available', true)
      .order('start_time')
      .limit(1);

    if (urgentSlots?.length) {
      // Auto-reschedule existing appointments if needed
      await rescheduleConflictingAppointments(urgentSlots[0]);
      return urgentSlots[0];
    }

    return null;
  };

  return {
    optimizeSchedule,
    handleEmergencyRescheduling,
    isOptimizing
  };
};

const findOptimalSlot = async (slots: any[], features: SmartSchedulingFeatures['aiOptimization']) => {
  // AI scoring algorithm
  const scoredSlots = slots.map(slot => ({
    ...slot,
    score: calculateSlotScore(slot, features)
  }));

  return scoredSlots.sort((a, b) => b.score - a.score)[0];
};

const calculateSlotScore = (slot: any, features: SmartSchedulingFeatures['aiOptimization']) => {
  let score = 100;
  
  // Priority weighting
  if (features.patientPriority === 'urgent') score += 50;
  if (features.patientPriority === 'routine') score += 20;
  
  // Time preference (morning slots preferred)
  const hour = new Date(slot.start_time).getHours();
  if (hour >= 9 && hour <= 11) score += 30;
  
  // Doctor specialty match
  if (slot.doctor_specialty === features.doctorSpecialty) score += 40;
  
  return score;
};

const getDoctorSpecialty = async (doctorId: string) => {
  const { data } = await supabase
    .from('staff')
    .select('specialty')
    .eq('id', doctorId)
    .single();
  
  return data?.specialty || 'general';
};

const getEstimatedDuration = (type: string) => {
  const durations = {
    urgent: 45,
    routine: 30,
    'follow-up': 20
  };
  return durations[type] || 30;
};

const rescheduleConflictingAppointments = async (urgentSlot: any) => {
  // Find and reschedule non-urgent appointments in the same time slot
  const { data: conflicts } = await supabase
    .from('appointments')
    .select('*')
    .eq('appointment_date', urgentSlot.start_time)
    .neq('priority', 'urgent');

  for (const conflict of conflicts || []) {
    // Find alternative slot
    const { data: alternativeSlots } = await supabase
      .from('appointment_slots')
      .select('*')
      .eq('is_available', true)
      .gt('start_time', urgentSlot.start_time)
      .limit(1);

    if (alternativeSlots?.length) {
      await supabase
        .from('appointments')
        .update({ appointment_date: alternativeSlots[0].start_time })
        .eq('id', conflict.id);
    }
  }
};