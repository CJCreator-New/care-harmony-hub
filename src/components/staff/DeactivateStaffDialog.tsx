import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/types/auth';
import { getRoleLabel } from '@/types/rbac';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle } from 'lucide-react';

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
  const [isLoading, setIsLoading] = useState(false);

  const handleDeactivate = async () => {
    if (!staff) return;

    setIsLoading(true);
    try {
      // Remove all roles for this user (effectively deactivating them)
      const { error: roleError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', staff.user_id);

      if (roleError) throw roleError;

      // Remove hospital association from profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ hospital_id: null })
        .eq('user_id', staff.user_id);

      if (profileError) throw profileError;

      toast({
        title: 'Staff Deactivated',
        description: `${staff.first_name} ${staff.last_name} has been removed from the hospital.`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error deactivating staff:', error);
      toast({
        title: 'Error',
        description: 'Failed to deactivate staff member. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Deactivate Staff Member
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                Are you sure you want to deactivate this staff member? This action will:
              </p>
              <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                <li>Remove all their roles and permissions</li>
                <li>Remove their access to the hospital</li>
                <li>They will no longer be able to log in to this hospital</li>
              </ul>

              {staff && (
                <div className="p-4 rounded-lg bg-muted">
                  <p className="font-medium">
                    {staff.first_name} {staff.last_name}
                  </p>
                  <p className="text-sm text-muted-foreground">{staff.email}</p>
                  <div className="flex gap-1 mt-2">
                    {staff.roles.map((role) => (
                      <Badge key={role} variant="secondary">
                        {getRoleLabel(role)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-sm font-medium text-destructive">
                This action cannot be undone. The user will need to be re-invited to regain access.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeactivate}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deactivating...
              </>
            ) : (
              'Deactivate'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
