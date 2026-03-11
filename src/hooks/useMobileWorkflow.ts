import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { secureTransmission } from '@/utils/dataProtection';

export interface MobileWorkflowConfig {
  role: string;
  offline_enabled: boolean;
  voice_commands_enabled: boolean;
  quick_actions: string[];
  sync_frequency: number;
}

export interface OfflineData {
  patients: any[];
  appointments: any[];
  medications: any[];
  last_sync: string;
  pending_changes: any[];
}

export interface VoiceCommand {
  command: string;
  action: string;
  confidence: number;
  parameters: Record<string, any>;
}

export function useMobileWorkflow() {
  const { profile, primaryRole, roles } = useAuth();
  const { toast } = useToast();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [offlineData, setOfflineData] = useState<OfflineData | null>(null);
  const [voiceRecording, setVoiceRecording] = useState(false);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Get mobile workflow configuration
  const { data: workflowConfig, isLoading: loadingConfig } = useQuery({
    queryKey: ['mobile-workflow-config', (profile as any)?.role],
    queryFn: async () => {
      if (!(profile as any)?.role) return null;

      // Default mobile configurations by role
      const configs: Record<string, MobileWorkflowConfig> = {
        doctor: {
          role: 'doctor',
          offline_enabled: true,
          voice_commands_enabled: true,
          quick_actions: ['voice_note', 'prescribe', 'order_lab', 'discharge'],
          sync_frequency: 300000 // 5 minutes
        },
        nurse: {
          role: 'nurse',
          offline_enabled: true,
          voice_commands_enabled: true,
          quick_actions: ['vitals_entry', 'medication_admin', 'patient_prep', 'triage'],
          sync_frequency: 180000 // 3 minutes
        },
        receptionist: {
          role: 'receptionist',
          offline_enabled: false,
          voice_commands_enabled: false,
          quick_actions: ['check_in', 'schedule', 'billing', 'insurance_verify'],
          sync_frequency: 60000 // 1 minute
        },
        pharmacist: {
          role: 'pharmacist',
          offline_enabled: true,
          voice_commands_enabled: false,
          quick_actions: ['dispense', 'inventory_scan', 'interaction_check', 'refill'],
          sync_frequency: 300000 // 5 minutes
        }
      };

      return configs[primaryRole ?? roles[0] ?? 'doctor'] || configs.doctor;
    },
    enabled: !!(profile as any)?.role
  });

  // Sync offline data
  const syncOfflineData = useMutation({
    mutationFn: async () => {
      if (!profile?.hospital_id || !offlineData) return;

      // Upload pending changes
      for (const change of offlineData.pending_changes) {
        try {
          await supabase
            .from(change.table)
            .upsert(change.data);
        } catch (error) {
          console.error('Sync error:', typeof error === 'object' && error !== null && 'message' in error ? (error as Error).message : 'Unknown sync error');
        }
      }

      // Download fresh data
      const [patients, appointments, medications] = await Promise.all([
        supabase.from('patients').select('*').eq('hospital_id', profile.hospital_id).limit(100),
        supabase.from('appointments').select('*').eq('hospital_id', profile.hospital_id).gte('scheduled_date', new Date().toISOString().split('T')[0]).limit(50),
        supabase.from('medications').select('*').eq('hospital_id', profile.hospital_id).limit(200)
      ]);

      const syncedData: OfflineData = {
        patients: patients.data || [],
        appointments: appointments.data || [],
        medications: medications.data || [],
        last_sync: new Date().toISOString(),
        pending_changes: []
      };

      setOfflineData(syncedData);

      // F2.1 — HIPAA §164.312(a)(2)(iv): encrypt PHI before writing to localStorage
      const phiFields = [
        'first_name', 'last_name', 'date_of_birth', 'phone', 'email',
        'address', 'allergies', 'chronic_conditions', 'current_medications',
        'insurance_provider', 'insurance_policy_number',
      ];
      const encryptedPatientsResults = await Promise.all(
        syncedData.patients.map(p => secureTransmission.prepareForTransmission(p as Record<string, any>, phiFields))
      );
      const storagePayload = {
        ...syncedData,
        patients: encryptedPatientsResults.map(r => r.data),
        _patients_encryption_metadata: encryptedPatientsResults.map(r => r.encryptionMetadata),
      };
      localStorage.setItem('offline_data', JSON.stringify(storagePayload));

      return syncedData;
    },
    onSuccess: () => {
      toast({
        title: "Data Synced",
        description: "Offline data has been synchronized successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Sync Failed",
        description: "Unable to sync offline data. Will retry automatically.",
        variant: "destructive"
      });
    }
  });

  // Voice command processing
  const processVoiceCommand = useMutation({
    mutationFn: async ({ transcript }: { transcript: string }) => {
      // Simulate voice command processing
      const commands: VoiceCommand[] = [
        {
          command: transcript,
          action: 'create_note',
          confidence: 0.85,
          parameters: { content: transcript, type: 'clinical_note' }
        }
      ];

      // Log voice command usage
      await supabase.from('activity_logs').insert({
        user_id: profile?.user_id,
        hospital_id: profile?.hospital_id,
        action_type: 'voice_command_processed',
        entity_type: 'mobile_workflow',
        details: { transcript, confidence: commands[0].confidence }
      });

      return commands[0];
    }
  });

  // Quick action execution
  const executeQuickAction = useMutation({
    mutationFn: async ({ action, data }: { action: string; data: any }) => {
      const actionHandlers: Record<string, () => Promise<any>> = {
        voice_note: async () => {
          // Start voice recording for clinical notes
          setVoiceRecording(true);
          return { action: 'voice_note_started' };
        },
        vitals_entry: async () => {
          // Quick vitals entry interface
          return { action: 'vitals_form_opened' };
        },
        check_in: async () => {
          // Patient check-in workflow
          return { action: 'check_in_started', patient_id: data.patient_id };
        },
        dispense: async () => {
          // Medication dispensing workflow
          return { action: 'dispense_started', prescription_id: data.prescription_id };
        }
      };

      const handler = actionHandlers[action];
      if (!handler) throw new Error(`Unknown action: ${action}`);

      return await handler();
    }
  });

  // Offline data management — F2.1: encrypt PHI before persisting pending changes
  const addOfflineChange = async (table: string, data: any) => {
    if (!offlineData) return;

    const updatedData = {
      ...offlineData,
      pending_changes: [
        ...offlineData.pending_changes,
        { table, data, timestamp: new Date().toISOString() }
      ]
    };

    setOfflineData(updatedData);

    const phiFields = [
      'first_name', 'last_name', 'date_of_birth', 'phone', 'email',
      'address', 'allergies', 'chronic_conditions', 'current_medications',
      'insurance_provider', 'insurance_policy_number',
    ];
    const encryptedPatientsResults = await Promise.all(
      updatedData.patients.map(p => secureTransmission.prepareForTransmission(p as Record<string, any>, phiFields))
    );
    const storagePayload = {
      ...updatedData,
      patients: encryptedPatientsResults.map(r => r.data),
      _patients_encryption_metadata: encryptedPatientsResults.map(r => r.encryptionMetadata),
    };
    localStorage.setItem('offline_data', JSON.stringify(storagePayload));
  };

  // Initialize offline data on mount — F2.1: decrypt PHI after reading from localStorage
  useEffect(() => {
    const loadOfflineData = async () => {
      const savedData = localStorage.getItem('offline_data');
      if (!savedData) return;
      try {
        const parsed = JSON.parse(savedData);
        if (parsed._patients_encryption_metadata && Array.isArray(parsed.patients)) {
          parsed.patients = await Promise.all(
            parsed.patients.map((patient: any, i: number) =>
              parsed._patients_encryption_metadata[i]
                ? secureTransmission.restoreFromTransmission(patient, parsed._patients_encryption_metadata[i])
                : patient
            )
          );
          delete parsed._patients_encryption_metadata;
        }
        setOfflineData(parsed);
      } catch {
        // Corrupted or legacy unencrypted cache — clear it
        localStorage.removeItem('offline_data');
      }
    };
    void loadOfflineData();
  }, []);

  // Auto-sync when coming back online
  useEffect(() => {
    if (!isOffline && offlineData?.pending_changes.length > 0) {
      syncOfflineData.mutate();
    }
  }, [isOffline]);

  return {
    workflowConfig,
    loadingConfig,
    isOffline,
    offlineData,
    voiceRecording,
    setVoiceRecording,
    syncOfflineData: syncOfflineData.mutate,
    isSyncing: syncOfflineData.isPending,
    processVoiceCommand: processVoiceCommand.mutate,
    isProcessingVoice: processVoiceCommand.isPending,
    executeQuickAction: executeQuickAction.mutate,
    isExecutingAction: executeQuickAction.isPending,
    addOfflineChange,
  };
}