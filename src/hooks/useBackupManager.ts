import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface BackupJob {
  id: string;
  type: 'full' | 'incremental' | 'critical';
  status: 'pending' | 'running' | 'completed' | 'failed';
  tables: string[];
  size_mb: number;
  created_at: string;
  completed_at?: string;
  error_message?: string;
}

export function useBackupManager() {
  const queryClient = useQueryClient();

  const { data: backups, isLoading } = useQuery({
    queryKey: ['backups'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('backup-manager', {
        body: { action: 'list_backups' }
      });
      if (error) throw error;
      return data.backups as BackupJob[];
    },
  });

  const createBackup = useMutation({
    mutationFn: async ({ type, tables }: { type: string; tables?: string[] }) => {
      const { data, error } = await supabase.functions.invoke('backup-manager', {
        body: { action: 'create_backup', data: { type, tables } }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backups'] });
    },
  });

  const restoreBackup = useMutation({
    mutationFn: async (backupId: string) => {
      const { data, error } = await supabase.functions.invoke('backup-manager', {
        body: { action: 'restore_backup', data: { backup_id: backupId } }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backups'] });
    },
  });

  const scheduleBackup = useMutation({
    mutationFn: async ({ type, frequency }: { type: string; frequency: string }) => {
      const { data, error } = await supabase.functions.invoke('backup-manager', {
        body: { action: 'schedule_backup', data: { schedule_type: type, frequency } }
      });
      if (error) throw error;
      return data;
    },
  });

  return {
    backups,
    isLoading,
    createBackup: createBackup.mutate,
    restoreBackup: restoreBackup.mutate,
    scheduleBackup: scheduleBackup.mutate,
    isCreatingBackup: createBackup.isPending,
    isRestoring: restoreBackup.isPending,
  };
}