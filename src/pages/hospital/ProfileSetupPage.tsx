import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Activity, Loader2, Check, Stethoscope, Syringe, UserCog, ClipboardList, Pill, TestTube2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserRole } from '@/types/auth';

interface RoleOption {
  id: UserRole;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
}

const roleOptions: RoleOption[] = [
  {
    id: 'doctor',
    title: 'Doctor',
    description: 'Medical consultations, prescriptions, and treatment planning',
    icon: Stethoscope,
    color: 'bg-doctor/10 text-doctor border-doctor/20 hover:border-doctor/50',
  },
  {
    id: 'nurse',
    title: 'Nurse',
    description: 'Patient vitals, documentation, and care coordination',
    icon: Syringe,
    color: 'bg-nurse/10 text-nurse border-nurse/20 hover:border-nurse/50',
  },
  {
    id: 'admin',
    title: 'Administrator',
    description: 'System management, analytics, and user administration',
    icon: UserCog,
    color: 'bg-admin/10 text-admin border-admin/20 hover:border-admin/50',
  },
  {
    id: 'receptionist',
    title: 'Receptionist',
    description: 'Patient registration, scheduling, and billing',
    icon: ClipboardList,
    color: 'bg-receptionist/10 text-receptionist border-receptionist/20 hover:border-receptionist/50',
  },
  {
    id: 'pharmacist',
    title: 'Pharmacist',
    description: 'Prescription processing, inventory, and patient counseling',
    icon: Pill,
    color: 'bg-pharmacy/10 text-pharmacy border-pharmacy/20 hover:border-pharmacy/50',
  },
  {
    id: 'lab_technician',
    title: 'Lab Technician',
    description: 'Laboratory testing, result entry, and quality control',
    icon: TestTube2,
    color: 'bg-info/10 text-info border-info/20 hover:border-info/50',
  },
];

export default function ProfileSetupPage() {
  const [selectedRoles, setSelectedRoles] = useState<UserRole[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const { setHospitalRoles, hospital } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const toggleRole = (roleId: UserRole) => {
    setSelectedRoles(prev =>
      prev.includes(roleId)
        ? prev.filter(r => r !== roleId)
        : [...prev, roleId]
    );
  };

  const handleContinue = async () => {
    if (selectedRoles.length === 0) {
      toast({
        title: 'Select Roles',
        description: 'Please select at least one role for your hospital.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    setHospitalRoles(selectedRoles);

    toast({
      title: 'Setup Complete!',
      description: 'Your hospital profile has been configured successfully.',
    });

    navigate('/dashboard');
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary">
              <Activity className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">AROCORD-HIMS</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold mb-2">Configure Your Hospital</h1>
            <p className="text-muted-foreground">
              Select the roles that will be used at {hospital?.name || 'your hospital'}. 
              You can always add more roles later.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-10">
            {roleOptions.map((role) => {
              const isSelected = selectedRoles.includes(role.id);
              return (
                <button
                  key={role.id}
                  onClick={() => toggleRole(role.id)}
                  className={cn(
                    'relative flex items-start gap-4 p-5 rounded-xl border-2 text-left transition-all',
                    role.color,
                    isSelected && 'ring-2 ring-primary ring-offset-2'
                  )}
                >
                  {isSelected && (
                    <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                  <div className={cn(
                    'flex items-center justify-center w-12 h-12 rounded-xl shrink-0',
                    role.color.split(' ')[0]
                  )}>
                    <role.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{role.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {role.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col items-center gap-4">
            <Button
              size="xl"
              className="w-full max-w-md"
              onClick={handleContinue}
              disabled={isLoading || selectedRoles.length === 0}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Setting up...
                </>
              ) : (
                <>
                  Continue to Dashboard
                  {selectedRoles.length > 0 && (
                    <span className="ml-2 px-2 py-0.5 rounded-full bg-primary-foreground/20 text-xs">
                      {selectedRoles.length} selected
                    </span>
                  )}
                </>
              )}
            </Button>
            <p className="text-sm text-muted-foreground">
              You can modify these settings later from the admin panel
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
