import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { isValidRoleTransition } from '@/utils/roleInterconnectionValidator';
import { ROLE_INFO } from '@/types/rbac';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Users } from 'lucide-react';
import { toast } from 'sonner';

export function RoleSwitcher() {
  const { roles, primaryRole, switchRole } = useAuth();
  const [switching, setSwitching] = useState(false);

  const handleRoleSwitch = async (targetRole: string) => {
    if (!primaryRole) return;

    // Validate transition before switching
    const validation = isValidRoleTransition(primaryRole, targetRole as any, roles);

    if (!validation.valid) {
      toast.error(`Cannot switch to ${targetRole}: ${validation.reason}`);
      return;
    }

    setSwitching(true);
    try {
      const { error } = await switchRole(targetRole as any);
      if (error) throw error;
      toast.success(`Switched to ${ROLE_INFO[targetRole as keyof typeof ROLE_INFO]?.label}`);
    } catch (error) {
      toast.error('Failed to switch role');
    } finally {
      setSwitching(false);
    }
  };

  // Filter to only show valid transition targets
  const availableRoles = primaryRole
    ? roles.filter(role => {
        if (role === primaryRole) return false;
        const validation = isValidRoleTransition(primaryRole, role, roles);
        return validation.valid;
      })
    : [];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={switching || !primaryRole}>
          <Users className="h-4 w-4 mr-2" />
          {ROLE_INFO[primaryRole as keyof typeof ROLE_INFO]?.label || 'Select Role'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
