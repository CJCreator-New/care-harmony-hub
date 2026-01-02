import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Activity, 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle2, 
  User, 
  Lock, 
  Heart,
  Loader2 
} from 'lucide-react';
import { cn } from '@/lib/utils';

const steps = [
  { id: 1, title: 'Basic Info', icon: User },
  { id: 2, title: 'Account', icon: Lock },
  { id: 3, title: 'Medical Info', icon: Heart },
  { id: 4, title: 'Confirm', icon: CheckCircle2 },
];

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  password: string;
  confirmPassword: string;
  securityQuestion: string;
  securityAnswer: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string;
  bloodType: string;
  allergies: string;
  chronicConditions: string;
  agreeToTerms: boolean;
  agreeToHipaa: boolean;
}

export default function PatientRegisterPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    password: '',
    confirmPassword: '',
    securityQuestion: '',
    securityAnswer: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
    bloodType: '',
    allergies: '',
    chronicConditions: '',
    agreeToTerms: false,
    agreeToHipaa: false,
  });

  const updateFormData = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.firstName || !formData.lastName || !formData.email || !formData.dateOfBirth || !formData.gender) {
          toast({ title: 'Missing Fields', description: 'Please fill in all required fields.', variant: 'destructive' });
          return false;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
          toast({ title: 'Invalid Email', description: 'Please enter a valid email address.', variant: 'destructive' });
          return false;
        }
        return true;
      case 2:
        if (!formData.password || !formData.confirmPassword) {
          toast({ title: 'Missing Fields', description: 'Please fill in password fields.', variant: 'destructive' });
          return false;
        }
        if (formData.password.length < 8) {
          toast({ title: 'Weak Password', description: 'Password must be at least 8 characters.', variant: 'destructive' });
          return false;
        }
        if (formData.password !== formData.confirmPassword) {
          toast({ title: 'Password Mismatch', description: 'Passwords do not match.', variant: 'destructive' });
          return false;
        }
        return true;
      case 3:
        return true; // Medical info is optional
      case 4:
        if (!formData.agreeToTerms || !formData.agreeToHipaa) {
          toast({ title: 'Agreement Required', description: 'Please agree to the terms and HIPAA notice.', variant: 'destructive' });
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) return;

    setIsLoading(true);
    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
          },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        // Update profile with security info
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            security_question: formData.securityQuestion,
            security_answer: formData.securityAnswer,
            is_staff: false,
          })
          .eq('user_id', authData.user.id);

        if (profileError) console.error('Profile update error:', profileError);

        // Assign patient role
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: authData.user.id,
            role: 'patient',
          });

        if (roleError) console.error('Role assignment error:', roleError);
      }

      toast({
        title: 'Registration Successful!',
        description: 'Your account has been created. Please check your email to verify your account.',
      });

      navigate('/patient-login');
    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        title: 'Registration Failed',
        description: error.message || 'An error occurred during registration.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-info/5 flex flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/hospital" className="flex items-center gap-2">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary">
              <Activity className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">AROCORD-HIMS</span>
          </Link>
          <Button variant="ghost" asChild>
            <Link to="/hospital">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Link>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center pt-24 pb-12 px-4">
        <div className="w-full max-w-2xl">
          {/* Progress Steps */}
          <div className="flex items-center justify-between mb-8">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center transition-colors',
                      currentStep >= step.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {currentStep > step.id ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <step.icon className="w-5 h-5" />
                    )}
                  </div>
                  <span className="text-xs mt-1 text-muted-foreground hidden sm:block">
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      'h-0.5 w-12 sm:w-20 mx-2',
                      currentStep > step.id ? 'bg-primary' : 'bg-muted'
                    )}
                  />
                )}
              </div>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>
                {currentStep === 1 && 'Personal Information'}
                {currentStep === 2 && 'Create Your Account'}
                {currentStep === 3 && 'Medical Information (Optional)'}
                {currentStep === 4 && 'Review & Confirm'}
              </CardTitle>
              <CardDescription>
                {currentStep === 1 && 'Enter your basic personal details'}
                {currentStep === 2 && 'Set up your login credentials'}
                {currentStep === 3 && 'Add any relevant medical information'}
                {currentStep === 4 && 'Review your information and agree to our terms'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Step 1: Basic Info */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        value={formData.firstName}
                        onChange={(e) => updateFormData('firstName', e.target.value)}
                        placeholder="John"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        value={formData.lastName}
                        onChange={(e) => updateFormData('lastName', e.target.value)}
                        placeholder="Doe"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateFormData('email', e.target.value)}
                      placeholder="john@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => updateFormData('phone', e.target.value)}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                      <Input
                        id="dateOfBirth"
                        type="date"
                        value={formData.dateOfBirth}
                        onChange={(e) => updateFormData('dateOfBirth', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gender">Gender *</Label>
                      <Select
                        value={formData.gender}
                        onValueChange={(value) => updateFormData('gender', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => updateFormData('address', e.target.value)}
                      placeholder="123 Main St"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => updateFormData('city', e.target.value)}
                        placeholder="New York"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        value={formData.state}
                        onChange={(e) => updateFormData('state', e.target.value)}
                        placeholder="NY"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zip">ZIP Code</Label>
                      <Input
                        id="zip"
                        value={formData.zip}
                        onChange={(e) => updateFormData('zip', e.target.value)}
                        placeholder="10001"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Account Creation */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => updateFormData('password', e.target.value)}
                      placeholder="Create a strong password"
                    />
                    <p className="text-xs text-muted-foreground">
                      Must be at least 8 characters with uppercase, lowercase, number, and symbol
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password *</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => updateFormData('confirmPassword', e.target.value)}
                      placeholder="Confirm your password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="securityQuestion">Security Question</Label>
                    <Select
                      value={formData.securityQuestion}
                      onValueChange={(value) => updateFormData('securityQuestion', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a security question" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pet">What was the name of your first pet?</SelectItem>
                        <SelectItem value="city">In what city were you born?</SelectItem>
                        <SelectItem value="school">What was the name of your first school?</SelectItem>
                        <SelectItem value="mother">What is your mother's maiden name?</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="securityAnswer">Security Answer</Label>
                    <Input
                      id="securityAnswer"
                      value={formData.securityAnswer}
                      onChange={(e) => updateFormData('securityAnswer', e.target.value)}
                      placeholder="Your answer"
                    />
                  </div>
                </div>
              )}

              {/* Step 3: Medical Info */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    This information helps us provide better care. All fields are optional.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="emergencyContactName">Emergency Contact Name</Label>
                      <Input
                        id="emergencyContactName"
                        value={formData.emergencyContactName}
                        onChange={(e) => updateFormData('emergencyContactName', e.target.value)}
                        placeholder="Jane Doe"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emergencyContactPhone">Emergency Contact Phone</Label>
                      <Input
                        id="emergencyContactPhone"
                        type="tel"
                        value={formData.emergencyContactPhone}
                        onChange={(e) => updateFormData('emergencyContactPhone', e.target.value)}
                        placeholder="(555) 123-4567"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emergencyContactRelationship">Relationship</Label>
                    <Select
                      value={formData.emergencyContactRelationship}
                      onValueChange={(value) => updateFormData('emergencyContactRelationship', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select relationship" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="spouse">Spouse</SelectItem>
                        <SelectItem value="parent">Parent</SelectItem>
                        <SelectItem value="child">Child</SelectItem>
                        <SelectItem value="sibling">Sibling</SelectItem>
                        <SelectItem value="friend">Friend</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bloodType">Blood Type</Label>
                    <Select
                      value={formData.bloodType}
                      onValueChange={(value) => updateFormData('bloodType', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select blood type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A+">A+</SelectItem>
                        <SelectItem value="A-">A-</SelectItem>
                        <SelectItem value="B+">B+</SelectItem>
                        <SelectItem value="B-">B-</SelectItem>
                        <SelectItem value="AB+">AB+</SelectItem>
                        <SelectItem value="AB-">AB-</SelectItem>
                        <SelectItem value="O+">O+</SelectItem>
                        <SelectItem value="O-">O-</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="allergies">Known Allergies</Label>
                    <Input
                      id="allergies"
                      value={formData.allergies}
                      onChange={(e) => updateFormData('allergies', e.target.value)}
                      placeholder="e.g., Penicillin, Peanuts (comma separated)"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="chronicConditions">Chronic Conditions</Label>
                    <Input
                      id="chronicConditions"
                      value={formData.chronicConditions}
                      onChange={(e) => updateFormData('chronicConditions', e.target.value)}
                      placeholder="e.g., Diabetes, Hypertension (comma separated)"
                    />
                  </div>
                </div>
              )}

              {/* Step 4: Review & Confirm */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <div className="rounded-lg bg-muted/50 p-4 space-y-3">
                    <h4 className="font-medium">Personal Information</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <span className="text-muted-foreground">Name:</span>
                      <span>{formData.firstName} {formData.lastName}</span>
                      <span className="text-muted-foreground">Email:</span>
                      <span>{formData.email}</span>
                      <span className="text-muted-foreground">Phone:</span>
                      <span>{formData.phone || 'Not provided'}</span>
                      <span className="text-muted-foreground">Date of Birth:</span>
                      <span>{formData.dateOfBirth}</span>
                      <span className="text-muted-foreground">Gender:</span>
                      <span className="capitalize">{formData.gender}</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="agreeToTerms"
                        checked={formData.agreeToTerms}
                        onCheckedChange={(checked) => updateFormData('agreeToTerms', checked as boolean)}
                      />
                      <Label htmlFor="agreeToTerms" className="text-sm leading-relaxed">
                        I agree to the <Link to="#" className="text-primary hover:underline">Terms of Service</Link> and{' '}
                        <Link to="#" className="text-primary hover:underline">Privacy Policy</Link> *
                      </Label>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="agreeToHipaa"
                        checked={formData.agreeToHipaa}
                        onCheckedChange={(checked) => updateFormData('agreeToHipaa', checked as boolean)}
                      />
                      <Label htmlFor="agreeToHipaa" className="text-sm leading-relaxed">
                        I acknowledge the <Link to="#" className="text-primary hover:underline">HIPAA Privacy Notice</Link> and 
                        consent to the electronic storage and sharing of my health information as described *
                      </Label>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-8">
                <Button
                  variant="outline"
                  onClick={prevStep}
                  disabled={currentStep === 1}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>
                {currentStep < 4 ? (
                  <Button onClick={nextStep}>
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button onClick={handleSubmit} disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Complete Registration
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <p className="text-center text-sm text-muted-foreground mt-4">
            Already have an account?{' '}
            <Link to="/patient-login" className="text-primary hover:underline">
              Sign in here
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}