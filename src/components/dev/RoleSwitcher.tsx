import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
  Shield,
  Stethoscope,
  Heart,
  ClipboardList,
  Pill,
  FlaskConical,
  User,
  ChevronDown,
  TestTube2,
} from 'lucide-react';

const ROLE_CONFIG = {
  admin: { label: 'Administrator', icon: Shield, color: 'bg-purple-500' },
  doctor: { label: 'Doctor', icon: Stethoscope, color: 'bg-blue-500' },
  nurse: { label: 'Nurse', icon: Heart, color: 'bg-pink-500' },
  receptionist: { label: 'Receptionist', icon: ClipboardList, color: 'bg-green-500' },
  pharmacist: { label: 'Pharmacist', icon: Pill, color: 'bg-orange-500' },
  lab_technician: { label: 'Lab Technician', icon: FlaskConical, color: 'bg-cyan-500' },
  patient: { label: 'Patient', icon: User, color: 'bg-gray-500' },
} as const;

type RoleKey = keyof typeof ROLE_CONFIG;

interface RoleSwitcherProps {
  onRoleChange: (role: RoleKey) => void;
  currentRole: RoleKey;
}

export function RoleSwitcher({ onRoleChange, currentRole }: RoleSwitcherProps) {
  const config = ROLE_CONFIG[currentRole];
  const Icon = config.icon;

  const handleRoleChange = (role: RoleKey) => {
    onRoleChange(role);
  };

  const handleClearTestRole = () => {
    localStorage.removeItem('testRole');
    window.location.reload(); // Reload to reset to actual role
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            className="gap-2 shadow-lg border-2 bg-background"
          >
            <TestTube2 className="h-4 w-4 text-yellow-500" />
            <span className="hidden sm:inline">Test Mode:</span>
            <Badge variant="secondary" className="gap-1">
              <Icon className="h-3 w-3" />
              {config.label}
            </Badge>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel className="flex items-center gap-2">
            <TestTube2 className="h-4 w-4 text-yellow-500" />
            Switch Role (Testing)
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {(Object.keys(ROLE_CONFIG) as RoleKey[]).map((role) => {
            const roleConfig = ROLE_CONFIG[role];
            const RoleIcon = roleConfig.icon;
            const isActive = currentRole === role;
            
            return (
              <DropdownMenuItem
                key={role}
                onClick={() => handleRoleChange(role)}
                className={isActive ? 'bg-accent' : ''}
              >
                <RoleIcon className="h-4 w-4 mr-2" />
                {roleConfig.label}
                {isActive && (
                  <Badge variant="secondary" className="ml-auto text-xs">
                    Active
                  </Badge>
                )}
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleClearTestRole}
            className="text-destructive focus:text-destructive"
          >
            <TestTube2 className="h-4 w-4 mr-2" />
            Reset to Actual Role
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
