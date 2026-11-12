import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAudit } from '@/hooks/useAudit';
import { UserRole } from '@/types/auth';
import { getRoleLabel } from '@/types/rbac';
import { ConfirmDestructiveAction } from '@/components/common/ConfirmDestructiveAction';
import { Badge } from '@/components/ui/badge';

interface StaffMember {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  roles: UserRole[];
}

interface DeactivateStaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: StaffMember | null;
  onSuccess: () => void;
}

export function DeactivateStaffDialog({
  open,
  onOpenChange,
  staff,
  onSuccess,
}: DeactivateStaffDialogProps) {
  const { toast } = useToast();
  const { profile } = useAuth();
  const { logActivity } = useAudit();
  const [isLoading, setIsLoading] = useState(false);

  // Throws on failure so the confirmation stays open and the reason is kept.
  const handleDeactivate = async (reason: string) => {
    if (!staff || !profile?.hospital_id) return;

    setIsLoading(true);
    try {
      // Prevent removing the last admin for this hospital.
      if (staff.roles.includes('admin')) {
        const { count, error: countError } = await supabase
          .from('user_roles')
          .select('*', { count: 'exact', head: true })
          .eq('hospital_id', profile.hospital_id)
          .eq('role', 'admin');

        if (countError) throw countError;
        if ((count ?? 0) <= 1) {
          throw new Error('Cannot deactivate the last active admin for this hospital');
        }
      }

      // Remove roles only for the current hospital context.
      const { error: roleError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', staff.user_id)
        .eq('hospital_id', profile.hospital_id);

      if (roleError) throw roleError;

      void logActivity({
        actionType: 'staff_deactivate',
        entityType: 'user_roles',
        entityId: staff.user_id,
        details: { reason, roles_removed: staff.roles },
        severity: 'warning',
      });

      toast({
        title: 'Staff Deactivated',
        description: `${staff.first_name} ${staff.last_name} has been removed from this hospital.`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error deactivating staff:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to deactivate staff member. Please try again.',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ConfirmDestructiveAction
      open={open}
      onOpenChange={onOpenChange}
      title="Deactivate staff member?"
      description={
        <div className="space-y-4">
          <p>This action will:</p>
          <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
            <li>Remove all their roles and permissions</li>
            <li>Remove their access to the hospital</li>
            <li>Stop them logging in to this hospital</li>
          </ul>

          {staff && (
            <div className="p-4 rounded-lg bg-muted">
              <p className="font-medium text-foreground">
                {staff.first_name} {staff.last_name}
              </p>
              <p className="text-sm text-muted-foreground">{staff.email}</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {staff.roles.map((role) => (
                  <Badge key={role} variant="secondary">
                    {getRoleLabel(role)}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <p className="text-sm font-medium text-destructive">
            The user will need to be re-invited to regain access.
          </p>
        </div>
      }
      confirmLabel="Deactivate"
      reasonLabel="Reason for deactivation (recorded in the audit log)"
      reasonPlaceholder="e.g. Left the hospital; contract ended on 31 October."
      isPending={isLoading}
      onConfirm={handleDeactivate}
    />
  );
}
