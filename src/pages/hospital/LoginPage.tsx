import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { useActivityLog } from '@/hooks/useActivityLog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Activity, Eye, EyeOff, Loader2, ArrowLeft, Shield, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { MFA_REENROLL_LOGIN_STATE } from '@/lib/auth/mfa';
import { clearDevTestRole } from '@/utils/devRoleSwitch';
import { describeAuthError } from '@/lib/auth/authErrors';
import { consumeSignOutReason } from '@/lib/hooks/auth/useSessionTimeout';

// Validation schema

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().default(false),
});

type LoginFormData = z.infer<typeof loginSchema>;

// Component

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [signedOutForInactivity, setSignedOutForInactivity] = useState(false);
  const location = useLocation();
  const mustReenrollMfa =
    (location.state as { mfaReenroll?: boolean } | null)?.mfaReenroll ===
    MFA_REENROLL_LOGIN_STATE.mfaReenroll;

  const { login } = useAuth();
  const isE2EMockAuthEnabled = import.meta.env.VITE_E2E_MOCK_AUTH === 'true';
  const { logActivity } = useActivityLog();
  const navigate = useNavigate();

  const form = useForm<z.input<typeof loginSchema>, unknown, LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  const isLoading = form.formState.isSubmitting;

  useEffect(() => {
    if (consumeSignOutReason() === 'inactivity') setSignedOutForInactivity(true);
  }, []);

  useEffect(() => {
    const hadDevOverride =
      import.meta.env.DEV &&
      typeof window !== 'undefined' &&
      !!window.localStorage.getItem('testRole');
    clearDevTestRole();
    if (typeof window !== 'undefined') window.localStorage.removeItem('preferredRole');
    if (hadDevOverride) {
      toast.info('Dev role override cleared. Login uses authenticated roles only.');
    }
  }, []);

  const onSubmit = async (data: LoginFormData) => {
    try {
      const { error } = await login(data.email, data.password);

      if (error) {
        // Inline message only (role="alert" below). The toast title is kept for the e2e page object.
        form.setError('root', { message: describeAuthError(error, 'login') });
        toast.error('Login Failed');
        return;
      }

      if (isE2EMockAuthEnabled) {
        logActivity({ actionType: 'login', details: { email: data.email } });
        clearDevTestRole();
        toast.success('Welcome back!', { description: 'You have successfully logged in.' });
        navigate('/dashboard');
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user ?? null;

      if (!user) {
        // Auth succeeded but session couldn't be read — sign out cleanly and ask user to retry
        await supabase.auth.signOut();
        form.setError('root', { message: 'We could not start your session. Try again.' });
        toast.error('Login Failed');
        return;
      }

      // The second factor is enforced by the route guard (ProtectedRoute): a
      // user with a verified Supabase MFA factor is held on the challenge page
      // until the session is aal2, and admin/doctor without one are sent to
      // enrol. Nothing here decides whether 2FA applies.
      logActivity({ actionType: 'login', details: { email: data.email } });
      clearDevTestRole();
      toast.success('Welcome back!', { description: 'You have successfully logged in.' });
      navigate('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      form.setError('root', { message: describeAuthError(err, 'login') });
      toast.error('Login Failed');
    }
  };

  return (
    <div id="main-content" tabIndex={-1} className="min-h-screen flex">
      <Helmet>
        <title>Hospital Login | CareHarmony HIMS</title>
        <meta
          name="description"
          content="Sign in to your CareHarmony HIMS hospital account to manage patients, appointments, prescriptions, and clinical workflows."
        />
        <link rel="canonical" href="/hospital/login" />
        <meta property="og:title" content="Hospital Login | CareHarmony HIMS" />
        <meta
          property="og:description"
          content="Sign in to your CareHarmony HIMS hospital account."
        />
        <meta property="og:url" content="/hospital/login" />
      </Helmet>
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-hero hero-panel-grid hero-panel-circle-br hero-panel-line surface-noise p-12 flex-col justify-between text-white relative overflow-hidden">
        {/* Inner content sits above pseudo-element overlays */}
        <div className="relative z-10">
          <Link to="/hospital" className="flex items-center gap-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/20 backdrop-blur">
              <Activity className="w-6 h-6" />
            </div>
            <span className="text-2xl font-bold tracking-tight">CareHarmony HIMS</span>
          </Link>
        </div>

        <div className="space-y-6 relative z-10">
          <h1 className="font-display font-normal italic text-5xl leading-tight">
            Secure Healthcare
            <br />
            <em className="not-italic font-normal">Information</em> Management
          </h1>
          <p className="text-lg text-white/75 max-w-md font-light leading-relaxed">
            Access your hospital's complete healthcare management system. Manage patients,
            appointments, prescriptions, and more.
          </p>
          <div className="flex items-center gap-3 p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 max-w-md">
            <Shield className="w-8 h-8 text-white/80 shrink-0" />
            <div>
              <p className="font-semibold">HIPAA Compliant</p>
              <p className="text-sm text-white/70">
                Your data is protected with enterprise-grade security
              </p>
            </div>
          </div>
        </div>

        <div className="text-sm text-white/50 relative z-10">
          © {new Date().getFullYear()} CareHarmony
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
              <span className="text-2xl font-bold">CareHarmony HIMS</span>
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
            <h2 className="font-display font-normal italic text-4xl leading-tight">Welcome Back</h2>
            <p className="text-muted-foreground mt-2">Sign in to access your hospital dashboard</p>
          </div>

          {mustReenrollMfa && (
            <Alert role="status">
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Your backup code was accepted and your old authenticator was removed. Sign in again
                to set up a new one.
              </AlertDescription>
            </Alert>
          )}

          {signedOutForInactivity && (
            <Alert role="status">
              <Shield className="h-4 w-4" />
              <AlertDescription>
                You were signed out after 30 minutes without activity. Sign in again to continue.
              </AlertDescription>
            </Alert>
          )}

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
                          placeholder="••••••••"
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
                          {showPassword ? (
                            <EyeOff className="w-5 h-5" />
                          ) : (
                            <Eye className="w-5 h-5" />
                          )}
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
                  <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
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
              <p className="text-xs font-semibold text-warning uppercase tracking-wide">
                Mock Auth Mode — Test Credentials
              </p>
              <p className="text-xs text-muted-foreground">
                All mock accounts use the{' '}
                <code className="font-mono font-bold">VITE_E2E_MOCK_PASSWORD</code> value from{' '}
                <code className="font-mono">.env.test</code>.
              </p>
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
                      form.setValue(
                        'password',
                        import.meta.env.DEV ? (import.meta.env.VITE_E2E_MOCK_PASSWORD ?? '') : ''
                      );
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
    </div>
  );
}
