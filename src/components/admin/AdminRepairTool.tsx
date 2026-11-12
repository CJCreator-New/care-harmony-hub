import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Loader2, Wrench, CheckCircle2, Building2 } from 'lucide-react';

interface AdminRepairToolProps {
  onSuccess?: () => void;
}

/**
 * Repairs an account that has no hospital yet (roadmap S0-03).
 *
 * Tenant membership and roles are server-managed: the profiles guard trigger
 * rejects a client-side `hospital_id` change and user_roles no longer accepts
 * self-assigned roles. The only self-service repair is the hospital sign-up
 * path (`create-hospital-admin` edge function via `createHospitalAndProfile`),
 * which creates the profile if missing, a new hospital, the tenant key and the
 * admin role in one server transaction, and only for an account that has no
 * hospital and no role. An account that already has a hospital but lacks the
 * admin role must be granted it by an existing admin of that hospital.
 */
export function AdminRepairTool({ onSuccess }: AdminRepairToolProps) {
  const { user, profile, hospital, roles, isLoading: authLoading, createHospitalAndProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isRepairing, setIsRepairing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [hospitalName, setHospitalName] = useState('My Hospital');

  const hasHospital = !!hospital || !!profile?.hospital_id;
  const hasAdminRole = roles.includes('admin');
  const needsRepair = !hasHospital || !hasAdminRole;
  const canSelfRepair = !hasHospital;

  const handleRepair = async () => {
    if (!user) {
      toast({
        title: 'Not authenticated',
        description: 'Please log in first.',
        variant: 'destructive',
      });
      return;
    }

    setIsRepairing(true);

    try {
      const { error } = await createHospitalAndProfile({
        name: hospitalName.trim() || 'My Hospital',
      });
      if (error) throw error;

      toast({
        title: 'Account repaired!',
        description: 'Your hospital and admin access have been configured. Refreshing...',
      });

      setDialogOpen(false);
      onSuccess?.();

      // Refresh auth session then navigate instead of doing a full page reload
      await supabase.auth.refreshSession();
      navigate('/dashboard');
    } catch (error) {
      console.error('Repair failed:', error);
      toast({
        title: 'Repair failed',
        description: error instanceof Error ? error.message : 'Something went wrong.',
        variant: 'destructive',
      });
    } finally {
      setIsRepairing(false);
    }
  };

  if (authLoading) {
    return null;
  }

  if (!needsRepair) {
    return (
      <Card className="border-green-500/50 bg-green-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="h-5 w-5" />
            Account Configured
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Your account is properly configured with hospital and admin access.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-yellow-500/50 bg-yellow-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-yellow-600">
          <AlertTriangle className="h-5 w-5" />
          Account Setup Incomplete
        </CardTitle>
        <CardDescription>
          {!hasHospital && !hasAdminRole
            ? 'Your account is missing hospital assignment and admin role.'
            : !hasHospital
            ? 'Your account is not assigned to a hospital.'
            : 'Your account is missing the admin role.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!canSelfRepair ? (
          <p className="text-sm text-muted-foreground">
            Roles are granted by an administrator of your hospital. Ask an existing admin to assign you the
            admin role from Staff Management.
          </p>
        ) : (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="default" className="w-full">
                <Wrench className="h-4 w-4 mr-2" />
                Repair Account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Repair Admin Account
                </DialogTitle>
                <DialogDescription>
                  This will create a new hospital and make you its admin.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-2 py-4">
                <Label htmlFor="hospitalName">Hospital Name</Label>
                <Input
                  id="hospitalName"
                  value={hospitalName}
                  onChange={(e) => setHospitalName(e.target.value)}
                  placeholder="Enter hospital name"
                />
              </div>

              <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
                <p className="font-medium">This action will:</p>
                <ul className="list-disc list-inside text-muted-foreground">
                  <li>Create a new hospital</li>
                  <li>Assign your account to this hospital</li>
                  <li>Grant you the admin role for it</li>
                </ul>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleRepair} disabled={isRepairing}>
                  {isRepairing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Repairing...
                    </>
                  ) : (
                    <>
                      <Wrench className="h-4 w-4 mr-2" />
                      Repair Now
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}
