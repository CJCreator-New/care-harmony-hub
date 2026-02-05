import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { isValidRoleTransition } from '@/utils/roleInterconnectionValidator';
import { getRoleLabel, ROLE_INFO } from '@/types/rbac';
import { UserRole } from '@/types/auth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TestTube2, Users } from 'lucide-react';
import { toast } from 'sonner';

export interface RoleSwitcherProps {
  roles?: UserRole[];
  currentRole?: UserRole | null;
  onSwitchRole?: (role: UserRole) => Promise<{ error: Error | null } | void> | void;
  onReset?: () => void;
  variant?: 'default' | 'dev';
  align?: 'start' | 'end';
}

export function RoleSwitcher({
  roles: rolesProp,
  currentRole,
  onSwitchRole,
  onReset,
  variant = 'default',
  align,
}: RoleSwitcherProps) {
  const { roles: authRoles, primaryRole, switchRole } = useAuth();
  const roles = rolesProp ?? authRoles;
  const activeRole = currentRole ?? primaryRole;
  const [switching, setSwitching] = useState(false);
  const isDev = variant === 'dev';
  const menuAlign = align ?? (isDev ? 'end' : 'start');
  const Icon = isDev ? TestTube2 : Users;

  const handleRoleSwitch = async (targetRole: UserRole) => {
    if (!activeRole) return;

    const validation = isValidRoleTransition(activeRole, targetRole, roles);
    if (!validation.valid) {
      toast.error(`Cannot switch to ${getRoleLabel(targetRole)}: ${validation.reason}`);
      return;
    }

    setSwitching(true);
    try {
      const result = onSwitchRole
        ? await onSwitchRole(targetRole)
        : await switchRole(targetRole);
      const error =
        result && typeof result === 'object' && 'error' in result ? (result as any).error : null;
      if (error) throw error;
      toast.success(`Switched to ${getRoleLabel(targetRole)}`);
    } catch (error) {
      toast.error('Failed to switch role');
    } finally {
      setSwitching(false);
    }
  };

  const availableRoles = activeRole
    ? roles.filter(role => {
        if (role === activeRole) return false;
        const validation = isValidRoleTransition(activeRole, role, roles);
        return validation.valid;
      })
    : [];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          disabled={switching || !activeRole}
          className={isDev ? 'gap-2 shadow-lg border-2 bg-background' : undefined}
        >
          <Icon className={isDev ? 'h-4 w-4 text-yellow-500' : 'h-4 w-4 mr-2'} />
          {isDev && <span className="hidden sm:inline">Test Mode:</span>}
          {getRoleLabel(activeRole) || 'Select Role'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={menuAlign}>
        {isDev && (
          <>
            <DropdownMenuLabel className="flex items-center gap-2">
              <TestTube2 className="h-4 w-4 text-yellow-500" />
              Switch Role (Testing)
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        )}
        {availableRoles.map(role => (
          <DropdownMenuItem
            key={role}
            onClick={() => handleRoleSwitch(role)}
          >
            <span className={`mr-2 ${ROLE_INFO[role]?.color || 'text-gray-500'}`}>
              •
            </span>
            {ROLE_INFO[role]?.label || role}
          </DropdownMenuItem>
        ))}
        {availableRoles.length === 0 && (
          <DropdownMenuItem disabled>
            No other roles available
          </DropdownMenuItem>
        )}
        {isDev && onReset && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onReset}
              className="text-destructive focus:text-destructive"
            >
              Reset to Actual Role
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
