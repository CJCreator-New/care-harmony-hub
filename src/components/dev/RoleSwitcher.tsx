import { RoleSwitcher as CoreRoleSwitcher } from '@/components/auth/RoleSwitcher';
import { UserRole } from '@/types/auth';

interface RoleSwitcherProps {
  onRoleChange: (role: UserRole) => void;
  currentRole: UserRole;
}

export function RoleSwitcher({ onRoleChange, currentRole }: RoleSwitcherProps) {
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <CoreRoleSwitcher
        variant="dev"
        currentRole={currentRole}
        onSwitchRole={async (role) => {
          onRoleChange(role);
          return { error: null };
        }}
        align="end"
      />
    </div>
  );
}
