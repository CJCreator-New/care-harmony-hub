import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { useActivityLog } from '@/hooks/useActivityLog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Activity, Eye, EyeOff, Loader2, ArrowLeft, Shield, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { TwoFactorVerifyModal } from '@/components/auth/TwoFactorVerifyModal';
import { BackupCodeVerifyModal } from '@/components/auth/BackupCodeVerifyModal';
import { clearDevTestRole } from '@/utils/devRoleSwitch';

// â”€â”€ Validation schema â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().default(false),
});

type LoginFormData = z.infer<typeof loginSchema>;

// â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);

  // 2FA state â€” separate from form state (flow concern, not input concern)
  const [showTwoFactorModal, setShowTwoFactorModal] = useState(false);
  const [showBackupCodeModal, setShowBackupCodeModal] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  const { login } = useAuth();
  const isE2EMockAuthEnabled = import.meta.env.VITE_E2E_MOCK_AUTH === 'true';
  const { logActivity } = useActivityLog();
  const navigate = useNavigate();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  const isLoading = form.formState.isSubmitting;

  useEffect(() => {
    const hadDevOverride =
      import.meta.env.DEV &&
      typeof window !== 'undefined' &&
      !!window.localStorage.getItem('testRole');
    clearDevTestRole();
    if (typeof window !== 'undefined') window.localStorage.removeItem('preferredRole');
    if (hadDevOverride) {
      toast.info('Dev role override cleared â€” login flow uses authenticated roles only.');
    }
  }, []);

  const checkTwoFactorRequired = async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('two_factor_enabled')
        .eq('user_id', userId)
        .single();
      if (error) return false;
      return data?.two_factor_enabled === true;
    } catch {
      return false;
    }
  };

  const onSubmit = async (data: LoginFormData) => {
    try {
      const { error } = await login(data.email, data.password);

      if (error) {
        form.setError('root', { message: error.message || 'Invalid email or password.' });
        toast.error('Login Failed', {
          description: error.message || 'Invalid email or password. Please try again.',
        });
        return;
      }

      if (isE2EMockAuthEnabled) {
        logActivity({ actionType: 'login', details: { email: data.email } });
        clearDevTestRole();
        toast.success('Welcome back!', { description: 'You have successfully logged in.' });
        navigate('/dashboard');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // Auth succeeded but session couldn't be read — sign out cleanly and ask user to retry
        await supabase.auth.signOut();
        form.setError('root', { message: 'Session could not be established. Please try again.' });
        toast.error('Login Failed', { description: 'Session could not be established. Please try again.' });
        return;
      }

      const requires2FA = await checkTwoFactorRequired(user.id);
      if (requires2FA) {
        setPendingUserId(user.id);
        setShowTwoFactorModal(true);
        return;
      }

      logActivity({ actionType: 'login', details: { email: data.email } });
      clearDevTestRole();
      toast.success('Welcome back!', { description: 'You have successfully logged in.' });
      navigate('/dashboard');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      form.setError('root', { message });
      toast.error('Login Failed', { description: message });
    }
  };

  const handleTwoFactorVerified = () => {
    setShowTwoFactorModal(false);
    setShowBackupCodeModal(false);
    setPendingUserId(null);
    logActivity({ actionType: 'login', details: { email: form.getValues('email'), twoFactorUsed: true } });
    clearDevTestRole();
    toast.success('Welcome back!', { description: 'You have successfully logged in with 2FA.' });
    navigate('/dashboard');
  };

  const handleCancelTwoFactor = async () => {
    await supabase.auth.signOut();
    setShowTwoFactorModal(false);
    setShowBackupCodeModal(false);
    setPendingUserId(null);
    toast.error('Login Cancelled', {
      description: 'Two-factor authentication is required for this account.',
    });
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-hero hero-panel-grid hero-panel-circle-br hero-panel-line surface-noise p-12 flex-col justify-between text-white relative overflow-hidden">
        {/* Inner content sits above pseudo-element overlays */}
        <div className="relative z-10">
          <Link to="/hospital" className="flex items-center gap-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/20 backdrop-blur">
              <Activity className="w-6 h-6" />
            </div>
            <span className="text-2xl font-bold tracking-tight">AROCORD-HIMS</span>
          </Link>
        </div>

        <div className="space-y-6 relative z-10">
          <h1 className="font-display font-normal italic text-5xl leading-tight">
            Secure Healthcare
            <br />
            <em className="not-italic font-normal">Information</em> Management
          </h1>
          <p className="text-lg text-white/75 max-w-md font-light leading-relaxed">
            Access your hospital's complete healthcare management system.
            Manage patients, appointments, prescriptions, and more.
          </p>
          <div className="flex items-center gap-3 p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 max-w-md">
            <Shield className="w-8 h-8 text-white/80 shrink-0" />
            <div>
              <p className="font-semibold">HIPAA Compliant</p>
              <p className="text-sm text-white/70">Your data is protected with enterprise-grade security</p>
            </div>
          </div>
        </div>

        <div className="text-sm text-white/50 relative z-10">
          © {new Date().getFullYear()} AROCORD Healthcare Solutions
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
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
            <h2 className="text-3xl font-bold">Welcome Back</h2>
            <p className="text-muted-foreground mt-2">
              Sign in to access your hospital dashboard
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
              {/* Email */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input
                        id="email"
                        type="email"
                        placeholder="admin@hospital.com"
                        autoComplete="email"
                        className="h-12"
                        aria-required="true"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Password */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Password</FormLabel>
                      <Link
                        to="/hospital/forgot-password"
                        className="text-sm text-primary hover:underline"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <FormControl>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                          autoComplete="current-password"
                          className="h-12 pr-12"
                          aria-required="true"
                          {...field}
                        />
                        <button
                          type="button"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Remember me */}
              <FormField
                control={form.control}
                name="rememberMe"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        id="remember"
                        checked={field.value}
                        onCheckedChange={(checked) => field.onChange(checked === true)}
                      />
                    </FormControl>
                    <FormLabel htmlFor="remember" className="text-sm font-normal cursor-pointer">
                      Remember me for 30 days
                    </FormLabel>
                  </FormItem>
                )}
              />

              {form.formState.errors.root && (
                <Alert variant="destructive" role="alert" aria-live="assertive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {form.formState.errors.root.message}
                  </AlertDescription>
                </Alert>
              )}

              <Button type="submit" size="xl" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
          </Form>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link to="/hospital/signup" className="text-primary font-medium hover:underline">
                Register your hospital
              </Link>
            </p>
          </div>

          {/* Dev / mock-auth credential hint — only visible when VITE_E2E_MOCK_AUTH=true */}
          {import.meta.env.VITE_E2E_MOCK_AUTH === 'true' && (
            <div className="rounded-xl border border-warning/40 bg-warning/10 p-4 space-y-3">
              <p className="text-xs font-semibold text-warning uppercase tracking-wide">Mock Auth Mode — Test Credentials</p>
              <p className="text-xs text-muted-foreground">All accounts share password: <code className="font-mono font-bold">TestPass123!</code></p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                {[
                  { role: 'Admin', email: 'admin@testgeneral.com' },
                  { role: 'Doctor', email: 'doctor@testgeneral.com' },
                  { role: 'Nurse', email: 'nurse@testgeneral.com' },
                  { role: 'Receptionist', email: 'reception@testgeneral.com' },
                  { role: 'Pharmacist', email: 'pharmacy@testgeneral.com' },
                  { role: 'Lab Tech', email: 'lab@testgeneral.com' },
                  { role: 'Patient', email: 'patient@testgeneral.com' },
                ].map(({ role, email }) => (
                  <button
                    key={role}
                    type="button"
                    className="text-left hover:text-primary transition-colors py-0.5"
                    onClick={() => {
                      form.setValue('email', email);
                      form.setValue('password', 'TestPass123!');
                    }}
                  >
                    <span className="font-medium">{role}:</span>{' '}
                    <span className="text-muted-foreground">{email}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2FA Modals */}
      {pendingUserId && (
        <>
          <TwoFactorVerifyModal
            open={showTwoFactorModal}
            onOpenChange={(open) => { if (!open) handleCancelTwoFactor(); }}
            userId={pendingUserId}
            onVerified={handleTwoFactorVerified}
            onUseBackupCode={() => {
              setShowTwoFactorModal(false);
              setShowBackupCodeModal(true);
            }}
          />
          <BackupCodeVerifyModal
            open={showBackupCodeModal}
            onOpenChange={(open) => { if (!open) handleCancelTwoFactor(); }}
            onVerified={handleTwoFactorVerified}
            onBack={() => {
              setShowBackupCodeModal(false);
              setShowTwoFactorModal(true);
            }}
          />
        </>
      )}
    </div>
  );
}
