import { useState } from 'react';
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

export function AdminRepairTool({ onSuccess }: AdminRepairToolProps) {
  const { user, profile, hospital, roles, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isRepairing, setIsRepairing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [hospitalName, setHospitalName] = useState('My Hospital');

  const hasHospital = !!hospital || !!profile?.hospital_id;
  const hasAdminRole = roles.includes('admin');
  const needsRepair = !hasHospital || !hasAdminRole;

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
      let hospitalId = profile?.hospital_id;

      // Step 1: Create hospital if missing
      if (!hospitalId) {
        const { data: newHospital, error: hospitalError } = await supabase
          .from('hospitals')
          .insert({ name: hospitalName.trim() || 'My Hospital' })
          .select()
          .single();

        if (hospitalError) {
          console.error('Hospital creation error:', hospitalError);
          throw new Error(`Failed to create hospital: ${hospitalError.message}`);
        }
        hospitalId = newHospital.id;

        // Update profile with hospital_id
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ hospital_id: hospitalId })
          .eq('user_id', user.id);

        if (profileError) {
          console.error('Profile update error:', profileError);
          throw new Error(`Failed to update profile: ${profileError.message}`);
        }
      }

      // Step 2: Create admin role if missing
      if (!hasAdminRole && hospitalId) {
        // Check if role already exists
        const { data: existingRole } = await supabase
          .from('user_roles')
          .select('id')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle();

        if (!existingRole) {
          const { error: roleError } = await supabase.from('user_roles').insert({
            user_id: user.id,
            role: 'admin',
            hospital_id: hospitalId,
          });

          if (roleError) {
            console.error('Role creation error:', roleError);
            throw new Error(`Failed to create admin role: ${roleError.message}`);
          }
        }
      }

      toast({
        title: 'Account repaired!',
        description: 'Your admin access has been configured. Refreshing...',
      });

      setDialogOpen(false);
      onSuccess?.();

      // Force page reload to refresh auth context
      setTimeout(() => window.location.reload(), 1000);
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
                This will create a hospital (if needed) and assign you the admin role.
              </DialogDescription>
            </DialogHeader>

            {!hasHospital && (
              <div className="space-y-2 py-4">
                <Label htmlFor="hospitalName">Hospital Name</Label>
                <Input
                  id="hospitalName"
                  value={hospitalName}
                  onChange={(e) => setHospitalName(e.target.value)}
                  placeholder="Enter hospital name"
                />
              </div>
            )}

            <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
              <p className="font-medium">This action will:</p>
              <ul className="list-disc list-inside text-muted-foreground">
                {!hasHospital && <li>Create a new hospital</li>}
                {!hasHospital && <li>Assign your account to this hospital</li>}
                {!hasAdminRole && <li>Grant you the admin role</li>}
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
      </CardContent>
    </Card>
  );
}
