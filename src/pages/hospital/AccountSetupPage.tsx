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
import { 
  Building2, 
  User, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft,
  Users
} from 'lucide-react';

type SetupStep = 'profile' | 'hospital' | 'role' | 'complete';

export default function AccountSetupPage() {
  const navigate = useNavigate();
  const { user, profile, hospital, roles, isLoading, createHospitalAndProfile, logout } = useAuth();
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
      const { error } = await createHospitalAndProfile({
        name: hospitalName.trim(),
        address: hospitalAddress.trim() || null,
        city: hospitalCity.trim() || null,
        state: hospitalState.trim() || null,
        zip: hospitalZip.trim() || null,
        phone: hospitalPhone.trim() || null,
        email: hospitalEmail.trim() || null,
        license_number: licenseNumber.trim() || null,
      });

      if (error) throw error;

      toast({ title: 'Hospital created', description: 'Your hospital has been registered.' });
      navigate('/hospital/role-setup');
    } catch (error) {
      console.error('Hospital error:', error);
      toast({ title: 'Error', description: 'Failed to create hospital. Please try again.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    navigate('/hospital/login');
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
                  <CardTitle>Role Assignment Required</CardTitle>
                  <CardDescription>Roles are assigned by hospital administrators</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
                If you were invited, please use the invitation link sent to your email. Otherwise, contact your hospital administrator to request access.
              </div>
              <div className="flex justify-end pt-4">
                <Button onClick={handleSignOut}>Sign out</Button>
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
