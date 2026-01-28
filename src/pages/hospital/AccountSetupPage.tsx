import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/types/auth';
import { 
  Building2, 
  User, 
  Shield, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft,
  Stethoscope,
  UserCog,
  ClipboardList,
  FlaskConical,
  Pill,
  Users
} from 'lucide-react';

type SetupStep = 'profile' | 'hospital' | 'role' | 'complete';

interface RoleOption {
  role: UserRole;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const roleOptions: RoleOption[] = [
  { role: 'admin', label: 'Administrator', description: 'Full system access and management', icon: <Shield className="h-6 w-6" /> },
  { role: 'doctor', label: 'Doctor', description: 'Patient consultations and medical records', icon: <Stethoscope className="h-6 w-6" /> },
  { role: 'nurse', label: 'Nurse', description: 'Patient care and vitals management', icon: <UserCog className="h-6 w-6" /> },
  { role: 'receptionist', label: 'Receptionist', description: 'Appointments and patient check-in', icon: <ClipboardList className="h-6 w-6" /> },
  { role: 'lab_technician', label: 'Lab Technician', description: 'Laboratory tests and results', icon: <FlaskConical className="h-6 w-6" /> },
  { role: 'pharmacist', label: 'Pharmacist', description: 'Prescriptions and medication dispensing', icon: <Pill className="h-6 w-6" /> },
];

export default function AccountSetupPage() {
  const navigate = useNavigate();
  const { user, profile, hospital, roles, isLoading } = useAuth();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState<SetupStep>('profile');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Profile form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  // Hospital form state
  const [hospitalName, setHospitalName] = useState('');
  const [hospitalAddress, setHospitalAddress] = useState('');
  const [hospitalCity, setHospitalCity] = useState('');
  const [hospitalState, setHospitalState] = useState('');
  const [hospitalZip, setHospitalZip] = useState('');
  const [hospitalPhone, setHospitalPhone] = useState('');
  const [hospitalEmail, setHospitalEmail] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');

  // Role selection state
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  // Determine starting step based on what's missing
  useEffect(() => {
    if (isLoading) return;

    if (!profile) {
      setCurrentStep('profile');
    } else if (!hospital) {
      setCurrentStep('hospital');
    } else if (roles.length === 0) {
      setCurrentStep('role');
    } else {
      // Everything is set up, redirect to dashboard
      navigate('/dashboard', { replace: true });
    }
  }, [profile, hospital, roles, isLoading, navigate]);

  // Pre-fill form data from user metadata or existing profile
  useEffect(() => {
    if (user?.user_metadata) {
      const meta = user.user_metadata;
      if (meta.first_name) setFirstName(meta.first_name);
      if (meta.last_name) setLastName(meta.last_name);
    }
    if (profile) {
      setFirstName(profile.first_name || '');
      setLastName(profile.last_name || '');
      setPhone(profile.phone || '');
    }
    if (hospital) {
      setHospitalName(hospital.name || '');
      setHospitalAddress(hospital.address || '');
      setHospitalCity(hospital.city || '');
      setHospitalState(hospital.state || '');
      setHospitalZip(hospital.zip || '');
      setHospitalPhone(hospital.phone || '');
      setHospitalEmail(hospital.email || '');
      setLicenseNumber(hospital.license_number || '');
    }
    if (roles.length > 0) {
      setSelectedRole(roles[0]);
    }
  }, [user, profile, hospital, roles]);

  const stepProgress = {
    profile: 25,
    hospital: 50,
    role: 75,
    complete: 100,
  };

  const handleProfileSubmit = async () => {
    if (!user) return;
    if (!firstName.trim() || !lastName.trim()) {
      toast({ title: 'Error', description: 'First and last name are required', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingProfile) {
        // Update existing profile
        const { error } = await supabase
          .from('profiles')
          .update({
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            phone: phone.trim() || null,
          })
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Create new profile
        const { error } = await supabase.from('profiles').insert({
          user_id: user.id,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: user.email!,
          phone: phone.trim() || null,
        });

        if (error && error.code !== '23505') throw error;
      }

      toast({ title: 'Profile saved', description: 'Your profile has been updated.' });
      setCurrentStep('hospital');
    } catch (error) {
      console.error('Profile error:', error);
      toast({ title: 'Error', description: 'Failed to save profile. Please try again.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleHospitalSubmit = async () => {
    if (!user) return;
    if (!hospitalName.trim()) {
      toast({ title: 'Error', description: 'Hospital name is required', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const newHospitalId = crypto.randomUUID();

      // Create hospital
      const { error: hospitalError } = await supabase.from('hospitals').insert({
        id: newHospitalId,
        name: hospitalName.trim(),
        address: hospitalAddress.trim() || null,
        city: hospitalCity.trim() || null,
        state: hospitalState.trim() || null,
        zip: hospitalZip.trim() || null,
        phone: hospitalPhone.trim() || null,
        email: hospitalEmail.trim() || null,
        license_number: licenseNumber.trim() || null,
      });

      if (hospitalError) throw hospitalError;

      // Update profile with hospital_id
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ hospital_id: newHospitalId })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      toast({ title: 'Hospital created', description: 'Your hospital has been registered.' });
      setCurrentStep('role');
    } catch (error) {
      console.error('Hospital error:', error);
      toast({ title: 'Error', description: 'Failed to create hospital. Please try again.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleSubmit = async () => {
    if (!user || !selectedRole) {
      toast({ title: 'Error', description: 'Please select a role', variant: 'destructive' });
      return;
    }

    // Do not perform a client-side insert into `user_roles` here.
    // Instead record the user's selection locally and show confirmation
    // so an admin or server-side process can grant the role.
    setIsSubmitting(true);
    try {
      // Verify hospital exists on the profile so we can record the intent
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('hospital_id')
        .eq('user_id', user.id)
        .single();

      if (!userProfile?.hospital_id) {
        throw new Error('Hospital not found. Please go back and create a hospital first.');
      }

      // Inform the user that role assignment requires admin approval
      toast({
        title: 'Role request submitted',
        description: 'Your role selection has been noted and will be approved by an administrator.',
      });
      setCurrentStep('complete');

      // Navigate to dashboard after a short delay
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1500);
    } catch (error: any) {
      console.error('Role error:', error);
      toast({ title: 'Error', description: error.message || 'Failed to save role selection. Please try again.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-foreground">Account Setup</h1>
            <Badge variant="outline" className="text-sm">
              Step {currentStep === 'profile' ? 1 : currentStep === 'hospital' ? 2 : currentStep === 'role' ? 3 : 4} of 4
            </Badge>
          </div>
          <Progress value={stepProgress[currentStep]} className="h-2" />
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span className={currentStep === 'profile' ? 'text-primary font-medium' : ''}>Profile</span>
            <span className={currentStep === 'hospital' ? 'text-primary font-medium' : ''}>Hospital</span>
            <span className={currentStep === 'role' ? 'text-primary font-medium' : ''}>Role</span>
            <span className={currentStep === 'complete' ? 'text-primary font-medium' : ''}>Complete</span>
          </div>
        </div>

        {/* Step Content */}
        {currentStep === 'profile' && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Your Profile</CardTitle>
                  <CardDescription>Tell us a bit about yourself</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="John"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number (Optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                />
              </div>
              <div className="flex justify-end pt-4">
                <Button onClick={handleProfileSubmit} disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Continue'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 'hospital' && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Hospital Details</CardTitle>
                  <CardDescription>Register your healthcare facility</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="hospitalName">Hospital Name *</Label>
                <Input
                  id="hospitalName"
                  value={hospitalName}
                  onChange={(e) => setHospitalName(e.target.value)}
                  placeholder="General Hospital"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hospitalAddress">Address</Label>
                <Input
                  id="hospitalAddress"
                  value={hospitalAddress}
                  onChange={(e) => setHospitalAddress(e.target.value)}
                  placeholder="123 Medical Drive"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hospitalCity">City</Label>
                  <Input
                    id="hospitalCity"
                    value={hospitalCity}
                    onChange={(e) => setHospitalCity(e.target.value)}
                    placeholder="Springfield"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hospitalState">State</Label>
                  <Input
                    id="hospitalState"
                    value={hospitalState}
                    onChange={(e) => setHospitalState(e.target.value)}
                    placeholder="IL"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hospitalZip">ZIP</Label>
                  <Input
                    id="hospitalZip"
                    value={hospitalZip}
                    onChange={(e) => setHospitalZip(e.target.value)}
                    placeholder="62701"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hospitalPhone">Phone</Label>
                  <Input
                    id="hospitalPhone"
                    value={hospitalPhone}
                    onChange={(e) => setHospitalPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hospitalEmail">Email</Label>
                  <Input
                    id="hospitalEmail"
                    type="email"
                    value={hospitalEmail}
                    onChange={(e) => setHospitalEmail(e.target.value)}
                    placeholder="contact@hospital.com"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="licenseNumber">License Number</Label>
                <Input
                  id="licenseNumber"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  placeholder="HC-12345"
                />
              </div>
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setCurrentStep('profile')}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button onClick={handleHospitalSubmit} disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Continue'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 'role' && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Select Your Role</CardTitle>
                  <CardDescription>Choose your primary role in the hospital</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {roleOptions.map((option) => (
                  <button
                    key={option.role}
                    onClick={() => setSelectedRole(option.role)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      selectedRole === option.role
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 rounded-lg ${selectedRole === option.role ? 'bg-primary/20' : 'bg-muted'}`}>
                        {option.icon}
                      </div>
                      <span className="font-medium">{option.label}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                  </button>
                ))}
              </div>
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setCurrentStep('hospital')}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button onClick={handleRoleSubmit} disabled={isSubmitting || !selectedRole}>
                  {isSubmitting ? 'Setting up...' : 'Complete Setup'}
                  <CheckCircle2 className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 'complete' && (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl font-bold mb-2">All Set!</h2>
              <p className="text-muted-foreground mb-6">
                Your account is ready. Redirecting to dashboard...
              </p>
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto" />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
