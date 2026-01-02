import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  UserPlus, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2,
  Shield,
  Mail,
  Loader2,
  Users,
  Stethoscope,
  ClipboardList,
  Pill,
  TestTube2,
  UserCog,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Role = 'admin' | 'doctor' | 'nurse' | 'receptionist' | 'pharmacist' | 'lab_technician';

const roleDetails: Record<Role, { icon: typeof Users; label: string; description: string; permissions: string[] }> = {
  admin: {
    icon: UserCog,
    label: 'Administrator',
    description: 'Full system access and management',
    permissions: ['Manage staff', 'System settings', 'View all reports', 'Full data access'],
  },
  doctor: {
    icon: Stethoscope,
    label: 'Doctor',
    description: 'Clinical care and patient management',
    permissions: ['View patients', 'Consultations', 'Prescriptions', 'Lab orders'],
  },
  nurse: {
    icon: Users,
    label: 'Nurse',
    description: 'Patient care and clinical support',
    permissions: ['View patients', 'Record vitals', 'Triage', 'Assist consultations'],
  },
  receptionist: {
    icon: ClipboardList,
    label: 'Receptionist',
    description: 'Front desk operations',
    permissions: ['Patient registration', 'Appointments', 'Check-in', 'Billing'],
  },
  pharmacist: {
    icon: Pill,
    label: 'Pharmacist',
    description: 'Medication dispensing and management',
    permissions: ['View prescriptions', 'Dispense medications', 'Inventory', 'Drug interactions'],
  },
  lab_technician: {
    icon: TestTube2,
    label: 'Lab Technician',
    description: 'Laboratory operations',
    permissions: ['Process lab orders', 'Enter results', 'Sample collection', 'QC'],
  },
};

interface StaffOnboardingWizardProps {
  onComplete?: () => void;
}

export function StaffOnboardingWizard({ onComplete }: StaffOnboardingWizardProps) {
  const { hospital } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    roles: [] as Role[],
    sendInvite: true,
    customMessage: '',
  });

  const toggleRole = (role: Role) => {
    setFormData(prev => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter(r => r !== role)
        : [...prev.roles, role],
    }));
  };

  const validateStep = (stepNum: number): boolean => {
    switch (stepNum) {
      case 1:
        if (!formData.firstName || !formData.lastName || !formData.email) {
          toast({ title: 'Missing fields', description: 'Please fill in all required fields.', variant: 'destructive' });
          return false;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
          toast({ title: 'Invalid email', description: 'Please enter a valid email address.', variant: 'destructive' });
          return false;
        }
        return true;
      case 2:
        if (formData.roles.length === 0) {
          toast({ title: 'No roles selected', description: 'Please select at least one role.', variant: 'destructive' });
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep(prev => Math.min(prev + 1, 3));
    }
  };

  const prevStep = () => {
    setStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!hospital?.id) return;

    setIsLoading(true);
    try {
      // Get current user ID for invited_by
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create staff invitations for each role
      const invitations = formData.roles.map(role => ({
        hospital_id: hospital.id,
        email: formData.email,
        role: role,
        invited_by: user.id,
        token: crypto.randomUUID(),
        status: 'pending' as const,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      }));

      const { error } = await supabase
        .from('staff_invitations')
        .insert(invitations);

      if (error) throw error;

      toast({
        title: 'Invitation sent!',
        description: `An invitation has been sent to ${formData.email}`,
      });

      // Reset and close
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        roles: [],
        sendInvite: true,
        customMessage: '',
      });
      setStep(1);
      setIsOpen(false);
      onComplete?.();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send invitation',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const allPermissions = formData.roles.flatMap(role => roleDetails[role].permissions);
  const uniquePermissions = [...new Set(allPermissions)];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Invite Staff Member
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Invite New Staff Member</DialogTitle>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="flex items-center justify-between mb-6 px-4">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                  step >= s
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {step > s ? <CheckCircle2 className="h-4 w-4" /> : s}
              </div>
              {s < 3 && (
                <div className={cn('w-20 h-0.5 mx-2', step > s ? 'bg-primary' : 'bg-muted')} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Enter the staff member's basic information.</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name *</Label>
                <Input
                  value={formData.firstName}
                  onChange={(e) => setFormData(p => ({ ...p, firstName: e.target.value }))}
                  placeholder="John"
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name *</Label>
                <Input
                  value={formData.lastName}
                  onChange={(e) => setFormData(p => ({ ...p, lastName: e.target.value }))}
                  placeholder="Doe"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email Address *</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                placeholder="john.doe@hospital.com"
              />
              <p className="text-xs text-muted-foreground">
                An invitation will be sent to this email address.
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Role Selection */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select the role(s) for {formData.firstName}. Multiple roles can be assigned.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {(Object.entries(roleDetails) as [Role, typeof roleDetails[Role]][]).map(([role, details]) => {
                const isSelected = formData.roles.includes(role);
                return (
                  <Card
                    key={role}
                    className={cn(
                      'cursor-pointer transition-all',
                      isSelected ? 'border-primary ring-1 ring-primary' : 'hover:border-muted-foreground/30'
                    )}
                    onClick={() => toggleRole(role)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          'p-2 rounded-lg',
                          isSelected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                        )}>
                          <details.icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-sm">{details.label}</h4>
                            {isSelected && <CheckCircle2 className="h-4 w-4 text-primary" />}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {details.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 3: Review & Confirm */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Review and confirm the invitation details.</p>
            
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-lg font-bold text-primary">
                      {formData.firstName[0]}{formData.lastName[0]}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-medium">{formData.firstName} {formData.lastName}</h4>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {formData.email}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">Assigned Roles</p>
                  <div className="flex flex-wrap gap-2">
                    {formData.roles.map(role => (
                      <Badge key={role} variant="secondary">
                        {roleDetails[role].label}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2 flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    Permissions
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {uniquePermissions.map(perm => (
                      <Badge key={perm} variant="outline" className="text-xs">
                        {perm}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="sendInvite"
                checked={formData.sendInvite}
                onCheckedChange={(checked) => setFormData(p => ({ ...p, sendInvite: checked as boolean }))}
              />
              <Label htmlFor="sendInvite" className="text-sm">
                Send email invitation immediately
              </Label>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <Button variant="outline" onClick={prevStep} disabled={step === 1}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          {step < 3 ? (
            <Button onClick={nextStep}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Invitation
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}