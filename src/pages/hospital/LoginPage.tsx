import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Activity, Eye, EyeOff, Loader2, ArrowLeft, Shield } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await login(email, password);
      
      if (error) {
        toast({
          title: 'Login Failed',
          description: error.message || 'Invalid email or password. Please try again.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Welcome back!',
          description: 'You have successfully logged in.',
        });
        navigate('/dashboard');
      }
    } catch (error) {
      toast({
        title: 'Login Failed',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-hero p-12 flex-col justify-between text-white">
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
            Secure Healthcare
            <br />
            Information Management
          </h1>
          <p className="text-lg text-white/80 max-w-md">
            Access your hospital's complete healthcare management system. 
            Manage patients, appointments, prescriptions, and more.
          </p>

          <div className="flex items-center gap-3 p-4 rounded-xl bg-white/10 backdrop-blur max-w-md">
            <Shield className="w-8 h-8 text-white/80" />
            <div>
              <p className="font-semibold">HIPAA Compliant</p>
              <p className="text-sm text-white/70">Your data is protected with enterprise-grade security</p>
            </div>
          </div>
        </div>

        <div className="text-sm text-white/60">
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

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@hospital.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  to="/hospital/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
              />
              <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">
                Remember me for 30 days
              </Label>
            </div>

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

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link to="/hospital/signup" className="text-primary font-medium hover:underline">
                Register your hospital
              </Link>
            </p>
          </div>

          {/* Note about demo */}
          <div className="p-4 rounded-xl bg-muted border border-border">
            <p className="text-sm font-medium mb-2">Getting Started:</p>
            <p className="text-sm text-muted-foreground">
              Create a new account via the signup page to get started with your hospital.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
