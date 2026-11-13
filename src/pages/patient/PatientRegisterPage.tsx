import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  IdCard,
  Lock,
  Loader2,
  Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Patient portal self-registration (roadmap S0-03: DB-01, SECF-10, FUNC-01).
 *
 * A patient registers by claiming the record their hospital already created:
 * hospital code, MRN, date of birth, last name and the email address on file.
 * Everything runs in the `register-patient` edge function: it verifies the
 * details (throttled), creates the account, links the record and assigns the
 * patient role in one server-side step. The hospital is taken from the matched
 * record; this page never sends or chooses a hospital id, and it no longer
 * collects a security question (SECF-11).
 */

const steps = [
  { id: 1, title: 'Your Record', icon: IdCard },
  { id: 2, title: 'Account', icon: Lock },
  { id: 3, title: 'Confirm', icon: CheckCircle2 },
];

interface FormData {
  hospitalCode: string;
  mrn: string;
  lastName: string;
  dateOfBirth: string;
  email: string;
  password: string;
  confirmPassword: string;
  agreeToTerms: boolean;
  agreeToHipaa: boolean;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Reads the `{ error }` body of a non-2xx edge-function response. */
async function functionErrorMessage(error: unknown): Promise<string | null> {
  const context = (error as { context?: { json?: () => Promise<unknown> } } | null)?.context;
  if (context?.json) {
    try {
      const body = (await context.json()) as { error?: unknown };
      if (typeof body?.error === 'string') return body.error;
    } catch {
      // not JSON
    }
  }
  return null;
}

export default function PatientRegisterPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    hospitalCode: '',
    mrn: '',
    lastName: '',
    dateOfBirth: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false,
    agreeToHipaa: false,
  });

  const updateFormData = (field: keyof FormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (
          !formData.hospitalCode.trim() ||
          !formData.mrn.trim() ||
          !formData.lastName.trim() ||
          !formData.dateOfBirth
        ) {
          toast({
            title: 'Missing Fields',
            description: 'Please fill in all required fields.',
            variant: 'destructive',
          });
          return false;
        }
        return true;
      case 2:
        if (!EMAIL_RE.test(formData.email.trim())) {
          toast({
            title: 'Invalid Email',
            description: 'Please enter a valid email address.',
            variant: 'destructive',
          });
          return false;
        }
        if (!formData.password || !formData.confirmPassword) {
          toast({
            title: 'Missing Fields',
            description: 'Please fill in password fields.',
            variant: 'destructive',
          });
          return false;
        }
        if (formData.password.length < 8) {
          toast({
            title: 'Weak Password',
            description: 'Password must be at least 8 characters.',
            variant: 'destructive',
          });
          return false;
        }
        if (formData.password !== formData.confirmPassword) {
          toast({
            title: 'Password Mismatch',
            description: 'Passwords do not match.',
            variant: 'destructive',
          });
          return false;
        }
        return true;
      case 3:
        if (!formData.agreeToTerms || !formData.agreeToHipaa) {
          toast({
            title: 'Agreement Required',
            description: 'Please agree to the terms and HIPAA notice.',
            variant: 'destructive',
          });
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length));
    }
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('register-patient', {
        body: {
          hospitalCode: formData.hospitalCode.trim(),
          mrn: formData.mrn.trim(),
          lastName: formData.lastName.trim(),
          dateOfBirth: formData.dateOfBirth,
          email: formData.email.trim(),
          password: formData.password,
        },
      });

      if (error) {
        throw new Error(
          (await functionErrorMessage(error)) ?? 'An error occurred during registration.'
        );
      }
      if (!data?.success) {
        throw new Error(
          typeof data?.error === 'string' ? data.error : 'An error occurred during registration.'
        );
      }

      toast({
        title: 'Registration Successful!',
        description:
          data.confirmation_email_sent === false
            ? 'Your account has been created. Please sign in.'
            : 'Your account has been created. Please check your email to verify your account, then sign in.',
      });

      navigate('/patient-login');
    } catch (error) {
      toast({
        title: 'Registration Failed',
        description:
          error instanceof Error ? error.message : 'An error occurred during registration.',
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
            <span className="text-xl font-bold">CareHarmony HIMS</span>
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
                      'h-0.5 w-16 sm:w-28 mx-2',
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
                {currentStep === 1 && 'Find Your Patient Record'}
                {currentStep === 2 && 'Create Your Account'}
                {currentStep === 3 && 'Review & Confirm'}
              </CardTitle>
              <CardDescription>
                {currentStep === 1 &&
                  'Use the details from your hospital registration card or visit summary'}
                {currentStep === 2 && 'Use the email address your hospital has on file for you'}
                {currentStep === 3 && 'Review your information and agree to our terms'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Step 1: Record details */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="hospitalCode" className="flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5" />
                      Hospital Code *
                    </Label>
                    <Input
                      id="hospitalCode"
                      value={formData.hospitalCode}
                      onChange={(e) => updateFormData('hospitalCode', e.target.value)}
                      placeholder="Hospital code provided by your healthcare provider"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mrn">Medical Record Number (MRN) *</Label>
                    <Input
                      id="mrn"
                      value={formData.mrn}
                      onChange={(e) => updateFormData('mrn', e.target.value)}
                      placeholder="e.g., MRN00001234"
                      autoComplete="off"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        value={formData.lastName}
                        onChange={(e) => updateFormData('lastName', e.target.value)}
                        placeholder="Doe"
                        autoComplete="family-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                      <Input
                        id="dateOfBirth"
                        type="date"
                        value={formData.dateOfBirth}
                        onChange={(e) => updateFormData('dateOfBirth', e.target.value)}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Don&apos;t have an MRN yet, or is your email missing from your record? Ask the
                    hospital&apos;s reception desk to register you or update your record first.
                  </p>
                </div>
              )}

              {/* Step 2: Account */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateFormData('email', e.target.value)}
                      placeholder="The email address on your hospital record"
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => updateFormData('password', e.target.value)}
                      placeholder="Create a strong password"
                      autoComplete="new-password"
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
                      autoComplete="new-password"
                    />
                  </div>
                </div>
              )}

              {/* Step 3: Review & Confirm */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="rounded-lg bg-muted/50 p-4 space-y-3">
                    <h4 className="font-medium">Your Details</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <span className="text-muted-foreground">Hospital Code:</span>
                      <span>{formData.hospitalCode}</span>
                      <span className="text-muted-foreground">MRN:</span>
                      <span>{formData.mrn}</span>
                      <span className="text-muted-foreground">Last Name:</span>
                      <span>{formData.lastName}</span>
                      <span className="text-muted-foreground">Date of Birth:</span>
                      <span>{formData.dateOfBirth}</span>
                      <span className="text-muted-foreground">Email:</span>
                      <span>{formData.email}</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="agreeToTerms"
                        checked={formData.agreeToTerms}
                        onCheckedChange={(checked) =>
                          updateFormData('agreeToTerms', checked as boolean)
                        }
                      />
                      <Label htmlFor="agreeToTerms" className="text-sm leading-relaxed">
                        I agree to the{' '}
                        <Link to="#" className="text-primary hover:underline">
                          Terms of Service
                        </Link>{' '}
                        and{' '}
                        <Link to="#" className="text-primary hover:underline">
                          Privacy Policy
                        </Link>{' '}
                        *
                      </Label>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="agreeToHipaa"
                        checked={formData.agreeToHipaa}
                        onCheckedChange={(checked) =>
                          updateFormData('agreeToHipaa', checked as boolean)
                        }
                      />
                      <Label htmlFor="agreeToHipaa" className="text-sm leading-relaxed">
                        I acknowledge the{' '}
                        <Link to="#" className="text-primary hover:underline">
                          HIPAA Privacy Notice
                        </Link>{' '}
                        and consent to the electronic storage and sharing of my health information
                        as described *
                      </Label>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-8">
                <Button variant="outline" onClick={prevStep} disabled={currentStep === 1}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>
                {currentStep < steps.length ? (
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
