import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Activity, Eye, EyeOff, Loader2, ArrowLeft, Check, X, Building2, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FormErrors {
  [key: string]: string;
}

const passwordRequirements = [
  { regex: /.{8,}/, label: 'At least 8 characters' },
  { regex: /[A-Z]/, label: 'One uppercase letter' },
  { regex: /[a-z]/, label: 'One lowercase letter' },
  { regex: /[0-9]/, label: 'One number' },
  { regex: /[!@#$%^&*]/, label: 'One special character (!@#$%^&*)' },
];

export default function SignupPage() {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  // Hospital details
  const [hospitalName, setHospitalName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [phone, setPhone] = useState('');
  const [hospitalEmail, setHospitalEmail] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');

  // Admin details
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const { signup } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const validateStep1 = () => {
    const newErrors: FormErrors = {};

    if (!hospitalName.trim()) newErrors.hospitalName = 'Hospital name is required';
    if (!address.trim()) newErrors.address = 'Address is required';
    if (!city.trim()) newErrors.city = 'City is required';
    if (!state.trim()) newErrors.state = 'State is required';
    if (!zip.trim()) newErrors.zip = 'ZIP code is required';
    if (!phone.trim()) newErrors.phone = 'Phone is required';
    if (!hospitalEmail.trim()) newErrors.hospitalEmail = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(hospitalEmail)) {
      newErrors.hospitalEmail = 'Invalid email format';
    }
    if (!licenseNumber.trim()) newErrors.licenseNumber = 'License number is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: FormErrors = {};

    if (!firstName.trim()) newErrors.firstName = 'First name is required';
    if (!lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!username.trim()) newErrors.username = 'Username is required';
    if (!adminEmail.trim()) newErrors.adminEmail = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
      newErrors.adminEmail = 'Invalid email format';
    }

    const allPasswordRequirementsMet = passwordRequirements.every(req => req.regex.test(password));
    if (!allPasswordRequirementsMet) {
      newErrors.password = 'Password does not meet requirements';
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateStep2()) return;

    setIsLoading(true);

    try {
      await signup({
        hospital: {
          name: hospitalName,
          address,
          city,
          state,
          zip,
          phone,
          email: hospitalEmail,
          licenseNumber,
        },
        admin: {
          username,
          email: adminEmail,
          password,
          firstName,
          lastName,
        },
      });

      toast({
        title: 'Registration Successful!',
        description: 'Welcome to AROCORD-HIMS. Let\'s set up your roles.',
      });
      navigate('/hospital/profile-setup');
    } catch (error) {
      toast({
        title: 'Registration Failed',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

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
            Register Your
            <br />
            Healthcare Facility
          </h1>
          <p className="text-lg text-white/80 max-w-md">
            Join hundreds of hospitals using AROCORD-HIMS to streamline 
            their healthcare operations.
          </p>

          {/* Steps indicator */}
          <div className="space-y-4">
            <div className={cn(
              "flex items-center gap-3 p-4 rounded-xl transition-all",
              step >= 1 ? "bg-white/20 backdrop-blur" : "bg-white/5"
            )}>
              <div className={cn(
                "flex items-center justify-center w-10 h-10 rounded-full",
                step >= 1 ? "bg-white text-primary" : "bg-white/10 text-white/50"
              )}>
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold">Hospital Information</p>
                <p className="text-sm text-white/70">Facility details and contact info</p>
              </div>
              {step > 1 && <Check className="w-5 h-5 ml-auto" />}
            </div>

            <div className={cn(
              "flex items-center gap-3 p-4 rounded-xl transition-all",
              step >= 2 ? "bg-white/20 backdrop-blur" : "bg-white/5"
            )}>
              <div className={cn(
                "flex items-center justify-center w-10 h-10 rounded-full",
                step >= 2 ? "bg-white text-primary" : "bg-white/10 text-white/50"
              )}>
                <User className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold">Administrator Account</p>
                <p className="text-sm text-white/70">Create your admin credentials</p>
              </div>
            </div>
          </div>
        </div>

        <div className="text-sm text-white/60">
          © {new Date().getFullYear()} AROCORD Healthcare Solutions
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-lg space-y-8">
          <div className="lg:hidden flex items-center justify-center mb-8">
            <Link to="/hospital" className="flex items-center gap-2">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary">
                <Activity className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-2xl font-bold">AROCORD-HIMS</span>
            </Link>
          </div>

          <div>
            <Link
              to="/hospital"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Home
            </Link>
            <h2 className="text-3xl font-bold">
              {step === 1 ? 'Hospital Information' : 'Administrator Account'}
            </h2>
            <p className="text-muted-foreground mt-2">
              {step === 1 
                ? 'Enter your healthcare facility details'
                : 'Create your administrator login credentials'
              }
            </p>
          </div>

          <form onSubmit={step === 1 ? (e) => { e.preventDefault(); handleNext(); } : handleSubmit}>
            {step === 1 ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="hospitalName">Hospital Name *</Label>
                  <Input
                    id="hospitalName"
                    placeholder="City General Hospital"
                    value={hospitalName}
                    onChange={(e) => setHospitalName(e.target.value)}
                    className={cn(errors.hospitalName && 'border-destructive')}
                  />
                  {errors.hospitalName && (
                    <p className="text-sm text-destructive">{errors.hospitalName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address *</Label>
                  <Input
                    id="address"
                    placeholder="123 Medical Center Drive"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className={cn(errors.address && 'border-destructive')}
                  />
                  {errors.address && (
                    <p className="text-sm text-destructive">{errors.address}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      placeholder="New York"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className={cn(errors.city && 'border-destructive')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State *</Label>
                    <Input
                      id="state"
                      placeholder="NY"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className={cn(errors.state && 'border-destructive')}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="zip">ZIP Code *</Label>
                    <Input
                      id="zip"
                      placeholder="10001"
                      value={zip}
                      onChange={(e) => setZip(e.target.value)}
                      className={cn(errors.zip && 'border-destructive')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone *</Label>
                    <Input
                      id="phone"
                      placeholder="+1-555-0123"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className={cn(errors.phone && 'border-destructive')}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hospitalEmail">Hospital Email *</Label>
                  <Input
                    id="hospitalEmail"
                    type="email"
                    placeholder="info@hospital.com"
                    value={hospitalEmail}
                    onChange={(e) => setHospitalEmail(e.target.value)}
                    className={cn(errors.hospitalEmail && 'border-destructive')}
                  />
                  {errors.hospitalEmail && (
                    <p className="text-sm text-destructive">{errors.hospitalEmail}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="licenseNumber">License Number *</Label>
                  <Input
                    id="licenseNumber"
                    placeholder="LIC-123456"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    className={cn(errors.licenseNumber && 'border-destructive')}
                  />
                  {errors.licenseNumber && (
                    <p className="text-sm text-destructive">{errors.licenseNumber}</p>
                  )}
                </div>

                <Button type="submit" size="lg" className="w-full mt-6">
                  Continue
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      placeholder="John"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className={cn(errors.firstName && 'border-destructive')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      placeholder="Doe"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className={cn(errors.lastName && 'border-destructive')}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username">Username *</Label>
                  <Input
                    id="username"
                    placeholder="johndoe"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={cn(errors.username && 'border-destructive')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adminEmail">Admin Email *</Label>
                  <Input
                    id="adminEmail"
                    type="email"
                    placeholder="admin@hospital.com"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className={cn(errors.adminEmail && 'border-destructive')}
                  />
                  {errors.adminEmail && (
                    <p className="text-sm text-destructive">{errors.adminEmail}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={cn('pr-12', errors.password && 'border-destructive')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                  {/* Password requirements */}
                  <div className="mt-2 space-y-1">
                    {passwordRequirements.map((req) => {
                      const isMet = req.regex.test(password);
                      return (
                        <div
                          key={req.label}
                          className={cn(
                            'flex items-center gap-2 text-sm',
                            isMet ? 'text-success' : 'text-muted-foreground'
                          )}
                        >
                          {isMet ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <X className="w-4 h-4" />
                          )}
                          <span>{req.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={cn(errors.confirmPassword && 'border-destructive')}
                  />
                  {errors.confirmPassword && (
                    <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                  )}
                </div>

                <div className="flex gap-4 mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="flex-1"
                    onClick={() => setStep(1)}
                  >
                    Back
                  </Button>
                  <Button type="submit" size="lg" className="flex-1" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </Button>
                </div>
              </div>
            )}
          </form>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/hospital/login" className="text-primary font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
