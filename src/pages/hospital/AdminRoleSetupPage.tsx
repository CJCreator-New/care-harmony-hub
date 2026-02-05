import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Activity,
  Users,
  UserPlus,
  Shield,
  Stethoscope,
  UserCog,
  ClipboardList,
  Pill,
  TestTube2,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Trash2,
  Mail,
} from 'lucide-react';
import { UserRole } from '@/types/auth';
import { cn } from '@/lib/utils';
import { getRoleLabel } from '@/types/rbac';

interface PendingStaff {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

const roleOptions: { role: UserRole; label: string; description: string; icon: React.ReactNode }[] = [
  { role: 'admin', label: getRoleLabel('admin'), description: 'Full system access and management', icon: <UserCog className="h-5 w-5" /> },
  { role: 'doctor', label: getRoleLabel('doctor'), description: 'Patient consultations and medical records', icon: <Stethoscope className="h-5 w-5" /> },
  { role: 'nurse', label: getRoleLabel('nurse'), description: 'Patient care and vitals management', icon: <UserCog className="h-5 w-5" /> },
  { role: 'receptionist', label: getRoleLabel('receptionist'), description: 'Appointments and patient check-in', icon: <ClipboardList className="h-5 w-5" /> },
  { role: 'pharmacist', label: getRoleLabel('pharmacist'), description: 'Medication dispensing and management', icon: <Pill className="h-5 w-5" /> },
  { role: 'lab_technician', label: getRoleLabel('lab_technician'), description: 'Laboratory tests and results', icon: <TestTube2 className="h-5 w-5" /> },
];

export default function AdminRoleSetupPage() {
  const navigate = useNavigate();
  const { user, hospital, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [pendingStaff, setPendingStaff] = useState<PendingStaff[]>([]);
  const [isSendingInvites, setIsSendingInvites] = useState(false);

  // Form state for adding staff
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffFirstName, setNewStaffFirstName] = useState('');
  const [newStaffLastName, setNewStaffLastName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<UserRole>('doctor');

  useEffect(() => {
    // Redirect if not authenticated or no hospital
    if (!authLoading && (!user || !hospital)) {
      navigate('/hospital/login');
    }
  }, [user, hospital, authLoading, navigate]);

  const handleAddStaff = () => {
    if (!newStaffEmail.trim() || !newStaffFirstName.trim() || !newStaffLastName.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all fields.',
        variant: 'destructive',
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newStaffEmail)) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address.',
        variant: 'destructive',
      });
      return;
    }

    // Check for duplicate email
    if (pendingStaff.some(s => s.email.toLowerCase() === newStaffEmail.toLowerCase())) {
      toast({
        title: 'Duplicate Email',
        description: 'This email has already been added.',
        variant: 'destructive',
      });
      return;
    }

    const newStaff: PendingStaff = {
      id: crypto.randomUUID(),
      email: newStaffEmail.trim(),
      firstName: newStaffFirstName.trim(),
      lastName: newStaffLastName.trim(),
      role: newStaffRole,
    };

    setPendingStaff([...pendingStaff, newStaff]);
    setNewStaffEmail('');
    setNewStaffFirstName('');
    setNewStaffLastName('');
    setNewStaffRole('doctor');
    setIsAddDialogOpen(false);

    toast({
      title: 'Staff Added',
      description: `${newStaff.firstName} ${newStaff.lastName} has been added as ${getRoleLabel(newStaffRole)}.`,
    });
  };

  const handleRemoveStaff = (id: string) => {
    setPendingStaff(pendingStaff.filter(s => s.id !== id));
  };

  const handleSendInvitations = async () => {
    if (pendingStaff.length === 0) {
      navigate('/hospital/profile-setup');
      return;
    }

    setIsSendingInvites(true);

    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('Not authenticated');

      // Create invitations for each staff member
      const invitations = pendingStaff.map(staff => ({
        hospital_id: hospital?.id,
        email: staff.email,
        role: staff.role,
        invited_by: currentUser.id,
        token: crypto.randomUUID(),
        status: 'pending' as const,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }));

      const { error } = await supabase.from('staff_invitations').insert(invitations);
      if (error) throw error;

      toast({
        title: 'Invitations Sent!',
        description: `${pendingStaff.length} invitation(s) have been created.`,
      });

      navigate('/hospital/profile-setup');
    } catch (error) {
      console.error('Error sending invitations:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send invitations',
        variant: 'destructive',
      });
    } finally {
      setIsSendingInvites(false);
    }
  };

  const handleSkip = () => {
    toast({
      title: 'Setup Skipped',
      description: 'You can add staff members later from the Admin Dashboard.',
    });
    navigate('/hospital/profile-setup');
  };

  const getRoleIcon = (role: UserRole) => {
    const option = roleOptions.find(r => r.role === role);
    return option?.icon || <Users className="h-5 w-5" />;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-2/5 gradient-hero p-12 flex-col justify-between text-white">
        <div>
          <Link to="/hospital" className="flex items-center gap-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/20 backdrop-blur">
              <Activity className="w-6 h-6" />
            </div>
            <span className="text-2xl font-bold">AROCORD-HIMS</span>
          </Link>
        </div>

        <div className="space-y-6">
          <h1 className="text-4xl font-bold leading-tight">
            Build Your
            <br />
            Healthcare Team
          </h1>
          <p className="text-lg text-white/80 max-w-md">
            Assign roles to your staff members. Each role has specific permissions 
            and access to different parts of the system.
          </p>

          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-white/10 backdrop-blur">
              <Shield className="w-5 h-5" />
              <div>
                <p className="font-medium">You're signed in as Admin</p>
                <p className="text-sm text-white/70">Full system access and management</p>
              </div>
              <CheckCircle2 className="w-5 h-5 ml-auto text-green-300" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-4">
            {roleOptions.slice(0, 4).map((option) => (
              <div key={option.role} className="flex items-center gap-2 p-2 rounded-lg bg-white/5">
                <div className="p-1.5 rounded bg-white/10">
                  {option.icon}
                </div>
                <span className="text-sm">{option.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="text-sm text-white/60">
          © {new Date().getFullYear()} AROCORD Healthcare Solutions
        </div>
      </div>

      {/* Right Panel - Role Assignment */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-2xl space-y-6">
          <div className="lg:hidden flex items-center justify-center mb-8">
            <Link to="/hospital" className="flex items-center gap-2">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary">
                <Activity className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-2xl font-bold">AROCORD-HIMS</span>
            </Link>
          </div>

          <div>
            <Badge variant="outline" className="mb-4">Step 3 of 4</Badge>
            <h2 className="text-3xl font-bold">Assign Staff Roles</h2>
            <p className="text-muted-foreground mt-2">
              Add your team members and assign their roles. They'll receive an invitation to join {hospital?.name || 'your hospital'}.
            </p>
          </div>

          {/* Current Admin Info */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Administrator (You)</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
                <Badge>Admin</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Pending Staff List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Staff Members</CardTitle>
                  <CardDescription>
                    {pendingStaff.length === 0 
                      ? 'No staff members added yet' 
                      : `${pendingStaff.length} staff member(s) to invite`
                    }
                  </CardDescription>
                </div>
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Staff
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {pendingStaff.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed rounded-lg">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">
                    Click "Add Staff" to invite team members
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    You can also skip this step and add staff later
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingStaff.map((staff) => (
                    <div 
                      key={staff.id} 
                      className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="p-2 rounded-lg bg-muted">
                        {getRoleIcon(staff.role)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {staff.firstName} {staff.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {staff.email}
                        </p>
                      </div>
                      <Badge variant="secondary">{getRoleLabel(staff.role)}</Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleRemoveStaff(staff.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button variant="outline" className="flex-1" onClick={handleSkip}>
              Skip for Now
            </Button>
            <Button 
              className="flex-1" 
              onClick={handleSendInvitations}
              disabled={isSendingInvites}
            >
              {isSendingInvites ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending Invitations...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Invitations & Continue
                </>
              )}
            </Button>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Staff members will receive an email invitation to create their account and join your hospital.
          </p>
        </div>
      </div>

      {/* Add Staff Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Staff Member</DialogTitle>
            <DialogDescription>
              Enter the staff member's details and assign their role.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  placeholder="John"
                  value={newStaffFirstName}
                  onChange={(e) => setNewStaffFirstName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  placeholder="Doe"
                  value={newStaffLastName}
                  onChange={(e) => setNewStaffLastName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="john.doe@example.com"
                value={newStaffEmail}
                onChange={(e) => setNewStaffEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={newStaffRole} onValueChange={(value) => setNewStaffRole(value as UserRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((option) => (
                    <SelectItem key={option.role} value={option.role}>
                      <div className="flex items-center gap-2">
                        {option.icon}
                        <span>{option.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {roleOptions.find(r => r.role === newStaffRole)?.description}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddStaff}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Staff Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
