import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/types/auth';
import { getRoleLabel } from '@/types/rbac';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, User, Mail, Phone, Shield } from 'lucide-react';

interface StaffMember {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  roles: UserRole[];
  created_at: string;
}

interface EditStaffModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: StaffMember | null;
  onSuccess: () => void;
}

const availableRoles: { value: UserRole; label: string; description: string }[] = [
  { value: 'admin', label: getRoleLabel('admin'), description: 'Full system access' },
  { value: 'doctor', label: getRoleLabel('doctor'), description: 'Consultations, prescriptions, lab orders' },
  { value: 'nurse', label: getRoleLabel('nurse'), description: 'Vitals, patient prep, doctor assistance' },
  { value: 'receptionist', label: getRoleLabel('receptionist'), description: 'Check-in, appointments, billing' },
  { value: 'pharmacist', label: getRoleLabel('pharmacist'), description: 'Dispensing, inventory management' },
  { value: 'lab_technician', label: getRoleLabel('lab_technician'), description: 'Lab tests, results entry' },
];

const roleColors: Record<UserRole, string> = {
  admin: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  doctor: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  nurse: 'bg-green-500/10 text-green-500 border-green-500/20',
  receptionist: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  pharmacist: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
  lab_technician: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  patient: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
};

export function EditStaffModal({
  open,
  onOpenChange,
  staff,
  onSuccess,
}: EditStaffModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
  });
  const [selectedRoles, setSelectedRoles] = useState<UserRole[]>([]);

  useEffect(() => {
    if (staff) {
      setFormData({
        first_name: staff.first_name,
        last_name: staff.last_name,
        phone: staff.phone || '',
      });
      setSelectedRoles(staff.roles);
    }
  }, [staff]);

  const toggleRole = (role: UserRole) => {
    setSelectedRoles(prev =>
      prev.includes(role)
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staff) return;

    if (selectedRoles.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one role',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone || null,
        })
        .eq('id', staff.id);

      if (profileError) throw profileError;

      // Get current roles
      const { data: currentRoles } = await supabase
        .from('user_roles')
        .select('id, role')
        .eq('user_id', staff.user_id);

      const currentRoleValues = (currentRoles || []).map(r => r.role as UserRole);

      // Roles to add
      const rolesToAdd = selectedRoles.filter(r => !currentRoleValues.includes(r));
      
      // Roles to remove
      const rolesToRemove = currentRoleValues.filter(r => !selectedRoles.includes(r));

      // Add new roles
      if (rolesToAdd.length > 0) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('hospital_id')
          .eq('id', staff.id)
          .single();

        const { error: addError } = await supabase
          .from('user_roles')
          .insert(
            rolesToAdd.map(role => ({
              user_id: staff.user_id,
              role,
              hospital_id: profile?.hospital_id,
            }))
          );

        if (addError) throw addError;
      }

      // Remove old roles
      if (rolesToRemove.length > 0) {
        const roleIdsToRemove = (currentRoles || [])
          .filter(r => rolesToRemove.includes(r.role as UserRole))
          .map(r => r.id);

        const { error: removeError } = await supabase
          .from('user_roles')
          .delete()
          .in('id', roleIdsToRemove);

        if (removeError) throw removeError;
      }

      toast({
        title: 'Staff Updated',
        description: 'Staff member details have been updated successfully.',
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating staff:', error);
      toast({
        title: 'Error',
        description: 'Failed to update staff member. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Edit Staff Member
          </DialogTitle>
          <DialogDescription>
            Update staff member details and roles
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) =>
                    setFormData(prev => ({ ...prev, first_name: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) =>
                    setFormData(prev => ({ ...prev, last_name: e.target.value }))
                  }
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  value={staff?.email || ''}
                  disabled
                  className="pl-10 bg-muted"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Email cannot be changed
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData(prev => ({ ...prev, phone: e.target.value }))
                  }
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Roles */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Roles
            </Label>
            <div className="grid gap-2">
              {availableRoles.map((role) => (
                <label
                  key={role.value}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedRoles.includes(role.value)
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/50'
                  }`}
                >
                  <Checkbox
                    checked={selectedRoles.includes(role.value)}
                    onCheckedChange={() => toggleRole(role.value)}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={roleColors[role.value]}>
                        {role.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {role.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
