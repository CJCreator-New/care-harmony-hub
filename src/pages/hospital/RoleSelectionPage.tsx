import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/auth';
import { Activity, ShieldCheck, Stethoscope, HeartPulse, ClipboardList, Pill, TestTube2, User, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ── Role meta ──────────────────────────────────────────────────────────────

interface RoleMeta {
  label: string;
  description: string;
  icon: React.ElementType;
  accent: string; // Tailwind bg + text utility pair for the icon bubble
}

const ROLE_META: Record<UserRole, RoleMeta> = {
  admin: {
    label: 'Administrator',
    description: 'Manage staff, hospital settings, and system-wide configuration.',
    icon: ShieldCheck,
    accent: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400',
  },
  doctor: {
    label: 'Doctor',
    description: 'Conduct consultations, review labs, and manage patient care plans.',
    icon: Stethoscope,
    accent: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  },
  nurse: {
    label: 'Nurse',
    description: 'Triage patients, record vitals, and coordinate care workflows.',
    icon: HeartPulse,
    accent: 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400',
  },
  receptionist: {
    label: 'Receptionist',
    description: 'Schedule appointments, manage the queue, and register patients.',
    icon: ClipboardList,
    accent: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
  },
  pharmacist: {
    label: 'Pharmacist',
    description: 'Dispense medications, verify prescriptions, and manage inventory.',
    icon: Pill,
    accent: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  },
  lab_technician: {
    label: 'Lab Technician',
    description: 'Process lab orders, enter results, and manage specimens.',
    icon: TestTube2,
    accent: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  },
  patient: {
    label: 'Patient',
    description: 'View appointments, prescriptions, lab results, and medical history.',
    icon: User,
    accent: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  },
};

// ── Component ─────────────────────────────────────────────────────────────

export default function RoleSelectionPage() {
  const { roles, profile, confirmRoleSelection, logout } = useAuth();
  const navigate = useNavigate();
  // When unchecked the role preference is NOT persisted to localStorage so
  // the selector will appear again on the next login.
  const [remember, setRemember] = useState(true);

  const handleSelect = (role: UserRole) => {
    confirmRoleSelection(role);
    // If the user explicitly opted out of remembering, clear the stored preference
    // so the selector shows again on the next login.
    if (!remember) {
      try { localStorage.removeItem('preferredRole'); } catch { /* ignore */ }
    }
    toast.success(`Signed in as ${ROLE_META[role]?.label ?? role}`, {
      description: 'Welcome! Your workspace is ready.',
    });
    // Patients go to their portal; all other roles go to the main dashboard.
    navigate(role === 'patient' ? '/patient/portal' : '/dashboard', { replace: true });
  };

  const handleSignOut = async () => {
    await logout();
    navigate('/hospital/login', { replace: true });
  };

  // Render only roles that have full meta definitions (guards against unknown roles)
  const available = roles.filter((r): r is UserRole => r in ROLE_META);

  return (
    <div className="min-h-screen flex">
      {/* ── Left branding panel (hidden on mobile) ─────────────────────── */}
      <div className="hidden lg:flex lg:w-2/5 xl:w-1/3 gradient-hero p-12 flex-col justify-between text-white shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/20 backdrop-blur">
            <Activity className="w-6 h-6" />
          </div>
          <span className="text-2xl font-bold">AROCORD-HIMS</span>
        </div>

        <div className="space-y-4">
          <h1 className="text-3xl font-bold leading-snug">
            Choose your<br />workspace
          </h1>
          <p className="text-white/75 text-base max-w-xs">
            You have access to multiple roles in this hospital. Select the one you'd
            like to work in for this session.
          </p>
          <p className="text-white/50 text-sm">
            You can switch roles anytime from the top navigation.
          </p>
        </div>

        <p className="text-sm text-white/50">
          © {new Date().getFullYear()} AROCORD Healthcare Solutions
        </p>
      </div>

      {/* ── Right: role picker ─────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-background">
        <div className="w-full max-w-lg space-y-6">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-2">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary">
              <Activity className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">AROCORD-HIMS</span>
          </div>

          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Welcome back{profile?.first_name ? `, ${profile.first_name}` : ''}!
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Select the role you want to use for this session.
            </p>
          </div>

          {/* Role cards — radiogroup for accessibility */}
          <div className="space-y-3" role="radiogroup" aria-label="Select your role">
            {available.map((role) => {
              const meta = ROLE_META[role];
              const Icon = meta.icon;
              return (
                <button
                  key={role}
                  onClick={() => handleSelect(role)}
                  role="radio"
                  aria-checked="false"
                  className={cn(
                    'group w-full flex items-center gap-4 rounded-xl border p-4 text-left',
                    'bg-card hover:bg-accent/50 transition-colors duration-150',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  )}
                >
                  <div className={cn('flex items-center justify-center w-11 h-11 rounded-lg shrink-0', meta.accent)}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm leading-none mb-1">{meta.label}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{meta.description}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 transition-transform group-hover:translate-x-0.5" />
                </button>
              );
            })}
          </div>

          {/* Remember preference */}
          <div className="flex items-center gap-2 pt-1">
            <Checkbox
              id="remember-role"
              checked={remember}
              onCheckedChange={(v) => setRemember(v === true)}
            />
            <Label htmlFor="remember-role" className="text-sm text-muted-foreground cursor-pointer font-normal">
              Remember my choice for future logins
            </Label>
          </div>

          {/* Sign out link */}
          <div className="pt-2 text-center">
            <Button variant="ghost" size="sm" className="text-muted-foreground text-xs" onClick={handleSignOut}>
              Sign out and use a different account
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
