import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Check, X } from 'lucide-react';

interface PasswordStrengthMeterProps {
  password: string;
  className?: string;
}

interface Requirement {
  label: string;
  met: boolean;
}

export function PasswordStrengthMeter({ password, className }: PasswordStrengthMeterProps) {
  const requirements = useMemo((): Requirement[] => [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'At least one uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'At least one lowercase letter', met: /[a-z]/.test(password) },
    { label: 'At least one number', met: /[0-9]/.test(password) },
    { label: 'At least one special character (!@#$%^&*)', met: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
  ], [password]);

  const strength = useMemo(() => {
    const metCount = requirements.filter(r => r.met).length;
    if (metCount === 0) return { level: 0, label: '', color: '' };
    if (metCount <= 2) return { level: 1, label: 'Weak', color: 'bg-destructive' };
    if (metCount <= 3) return { level: 2, label: 'Fair', color: 'bg-yellow-500' };
    if (metCount <= 4) return { level: 3, label: 'Good', color: 'bg-blue-500' };
    return { level: 4, label: 'Strong', color: 'bg-green-500' };
  }, [requirements]);

  if (!password) return null;

  return (
    <div className={cn('space-y-3', className)}>
      {/* Strength bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Password strength</span>
          <span className={cn(
            'font-medium',
            strength.level <= 1 && 'text-destructive',
            strength.level === 2 && 'text-yellow-600',
            strength.level === 3 && 'text-blue-600',
            strength.level === 4 && 'text-green-600',
          )}>
            {strength.label}
          </span>
        </div>
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div
            className={cn('h-full transition-all duration-300', strength.color)}
            style={{ width: `${(strength.level / 4) * 100}%` }}
          />
        </div>
      </div>

      {/* Requirements list */}
      <ul className="space-y-1">
        {requirements.map((req) => (
          <li
            key={req.label}
            className={cn(
              'flex items-center gap-2 text-xs transition-colors',
              req.met ? 'text-green-600' : 'text-muted-foreground'
            )}
          >
            {req.met ? (
              <Check className="h-3 w-3" />
            ) : (
              <X className="h-3 w-3" />
            )}
            {req.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function isPasswordStrong(password: string): boolean {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[!@#$%^&*(),.?":{}|<>]/.test(password)
  );
}
