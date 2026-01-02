import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Activity, 
  ArrowLeft, 
  Eye, 
  EyeOff, 
  Loader2,
  Shield,
  Calendar,
  FileText,
  MessageSquare,
  HeartPulse,
} from 'lucide-react';

export default function PatientLoginPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Check if account is locked
      const { data: lockData } = await supabase.rpc('is_account_locked', {
        _user_id: email,
      });

      if (lockData === true) {
        toast({
          title: 'Account Locked',
          description: 'Your account is temporarily locked due to multiple failed login attempts. Please try again in 30 minutes.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Increment failed login attempts
        if (data?.user?.id) {
          await supabase.rpc('increment_failed_login', {
            _user_id: data.user.id,
          });
        }
        throw error;
      }

      if (data.user) {
        // Reset failed login attempts
        await supabase.rpc('reset_failed_login', {
          _user_id: data.user.id,
        });

        // Check if user is a patient
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', data.user.id)
          .eq('role', 'patient')
          .single();

        if (!roleData) {
          await supabase.auth.signOut();
          toast({
            title: 'Access Denied',
            description: 'This login is for patients only. Staff members should use the staff login.',
            variant: 'destructive',
          });
          setIsLoading(false);
          return;
        }

        toast({
          title: 'Welcome Back!',
          description: 'You have successfully logged in.',
        });

        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast({
        title: 'Login Failed',
        description: error.message || 'Invalid email or password.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    { icon: Calendar, title: 'Book Appointments', description: 'Schedule visits with your healthcare providers' },
    { icon: FileText, title: 'View Records', description: 'Access your medical history and lab results' },
    { icon: MessageSquare, title: 'Secure Messaging', description: 'Communicate directly with your care team' },
    { icon: HeartPulse, title: 'Track Health', description: 'Monitor your vitals and health metrics' },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-12 flex-col">
        <Link to="/hospital" className="flex items-center gap-2 mb-12">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary-foreground/20">
            <Activity className="w-6 h-6" />
          </div>
          <span className="text-2xl font-bold">AROCORD-HIMS</span>
        </Link>

        <div className="flex-1 flex flex-col justify-center">
          <h1 className="text-4xl font-bold mb-4">Patient Portal</h1>
          <p className="text-lg text-primary-foreground/80 mb-12">
            Access your health information, book appointments, and communicate 
            with your healthcare team - all in one secure place.
          </p>

          <div className="grid grid-cols-2 gap-6">
            {features.map((feature) => (
              <div key={feature.title} className="bg-primary-foreground/10 rounded-lg p-4">
                <feature.icon className="w-8 h-8 mb-3" />
                <h3 className="font-semibold mb-1">{feature.title}</h3>
                <p className="text-sm text-primary-foreground/70">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-primary-foreground/60">
          <Shield className="w-4 h-4" />
          <span>HIPAA Compliant & Secure</span>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="p-4 flex justify-between items-center border-b border-border lg:border-none">
          <Link to="/hospital" className="flex items-center gap-2 lg:hidden">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
              <Activity className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold">AROCORD-HIMS</span>
          </Link>
          <Button variant="ghost" asChild className="ml-auto">
            <Link to="/hospital">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Link>
          </Button>
        </header>

        {/* Login Form */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Patient Sign In</CardTitle>
                <CardDescription>
                  Enter your credentials to access your health portal
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      autoComplete="email"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <Link 
                        to="/patient/forgot-password" 
                        className="text-xs text-primary hover:underline"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        required
                        autoComplete="current-password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="remember"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    />
                    <Label htmlFor="remember" className="text-sm font-normal">
                      Remember me on this device
                    </Label>
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Signing In...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </form>

                <div className="mt-6 text-center text-sm">
                  <span className="text-muted-foreground">Don't have an account? </span>
                  <Link to="/patient-register" className="text-primary hover:underline font-medium">
                    Register here
                  </Link>
                </div>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">or</span>
                  </div>
                </div>

                <Button variant="outline" className="w-full" asChild>
                  <Link to="/hospital/login">
                    Staff / Hospital Login
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}