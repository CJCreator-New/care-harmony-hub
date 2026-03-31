import type { ElementType } from 'react';
import {
  Activity,
  BarChart3,
  Brain,
  Building,
  Calendar,
  ClipboardList,
  Clock,
  CreditCard,
  FileText,
  Heart,
  Home,
  Mic,
  Package,
  Pill,
  Settings,
  Shield,
  Stethoscope,
  Target,
  TestTube2,
  Users,
  Video,
  Zap,
} from 'lucide-react';
import type { Permission } from '@/lib/permissions';
import type { UserRole } from '@/types/auth';

export type ReleaseTier = 'tier1' | 'tier2' | 'tier3';

export interface AppRouteManifestItem {
  label: string;
  href: string;
  icon: ElementType;
  allowedRoles: UserRole[];
  requiredPermission?: Permission;
  badge?: string;
  releaseTier: ReleaseTier;
  featureFlag?: string;
  testOwner: 'unit' | 'integration' | 'api-security' | 'e2e';
  description?: string;
}

export interface AppRouteManifestGroup {
  label: string;
  icon: ElementType;
  allowedRoles: UserRole[];
  defaultExpanded?: boolean;
  items: AppRouteManifestItem[];
}

export const routeManifest: AppRouteManifestGroup[] = [
  {
    label: 'Core Operations',
    icon: Building,
    allowedRoles: ['admin', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_technician', 'patient'],
    defaultExpanded: true,
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: Home, allowedRoles: ['admin', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_technician', 'patient'], releaseTier: 'tier1', testOwner: 'e2e' },
      { label: 'Patients', href: '/patients', icon: Users, allowedRoles: ['admin', 'doctor', 'nurse', 'receptionist'], requiredPermission: 'patients', releaseTier: 'tier1', testOwner: 'integration' },
      { label: 'Appointments', href: '/appointments', icon: Calendar, allowedRoles: ['admin', 'doctor', 'nurse', 'receptionist'], requiredPermission: 'appointments', releaseTier: 'tier1', testOwner: 'integration' },
      // Temporarily disabled: feature incomplete (BUG-005)
        // { label: 'Smart Scheduler', href: '/scheduler', icon: Clock, allowedRoles: ['admin', 'receptionist'], requiredPermission: 'appointments', releaseTier: 'tier2', testOwner: 'e2e' },
      { label: 'Queue Management', href: '/queue', icon: ClipboardList, allowedRoles: ['admin', 'doctor', 'nurse', 'receptionist'], requiredPermission: 'queue:read', releaseTier: 'tier1', testOwner: 'integration' },
    ],
  },
  {
    label: 'Clinical Care',
    icon: Heart,
    allowedRoles: ['admin', 'doctor', 'nurse'],
    defaultExpanded: true,
    items: [
      { label: 'Consultations', href: '/consultations', icon: Stethoscope, allowedRoles: ['admin', 'doctor', 'nurse'], requiredPermission: 'consultations:read', releaseTier: 'tier1', testOwner: 'integration' },
      { label: 'Telemedicine', href: '/telemedicine', icon: Video, allowedRoles: ['admin', 'doctor', 'nurse'], requiredPermission: 'telemedicine:read', releaseTier: 'tier2', testOwner: 'e2e' },
      { label: 'Voice Clinical Notes', href: '/voice-clinical-notes', icon: Mic, allowedRoles: ['admin', 'doctor', 'nurse'], requiredPermission: 'voice-clinical-notes', releaseTier: 'tier2', testOwner: 'integration' },
    ],
  },
  {
    label: 'Pharmacy & Inventory',
    icon: Pill,
    allowedRoles: ['admin', 'pharmacist', 'doctor', 'nurse'],
    items: [
      { label: 'Pharmacy', href: '/pharmacy', icon: Pill, allowedRoles: ['admin', 'pharmacist', 'doctor'], requiredPermission: 'pharmacy', releaseTier: 'tier1', testOwner: 'integration' },
      { label: 'Clinical Pharmacy', href: '/pharmacy/clinical', icon: Stethoscope, allowedRoles: ['admin', 'pharmacist'], requiredPermission: 'clinical-pharmacy', releaseTier: 'tier2', testOwner: 'integration' },
      { label: 'Inventory', href: '/inventory', icon: Package, allowedRoles: ['admin', 'pharmacist'], requiredPermission: 'inventory:read', releaseTier: 'tier2', testOwner: 'integration' },
    ],
  },
  {
    label: 'Laboratory',
    icon: TestTube2,
    allowedRoles: ['admin', 'lab_technician', 'doctor', 'nurse'],
    items: [
      { label: 'Lab Orders', href: '/laboratory', icon: TestTube2, allowedRoles: ['admin', 'lab_technician', 'doctor', 'nurse'], requiredPermission: 'lab:read', releaseTier: 'tier1', testOwner: 'integration' },
      { label: 'Lab Automation', href: '/laboratory/automation', icon: Activity, allowedRoles: ['admin', 'lab_technician'], requiredPermission: 'laboratory', releaseTier: 'tier2', testOwner: 'api-security' },
    ],
  },
  {
    label: 'AI & Analytics',
    icon: Brain,
    allowedRoles: ['admin', 'doctor'],
    items: [
      { label: 'AI Demo', href: '/ai-demo', icon: Brain, allowedRoles: ['admin', 'doctor'], requiredPermission: 'ai-demo', releaseTier: 'tier3', featureFlag: 'ai_demo', testOwner: 'integration' },
      { label: 'Differential Diagnosis', href: '/differential-diagnosis', icon: Stethoscope, allowedRoles: ['admin', 'doctor'], requiredPermission: 'differential-diagnosis', releaseTier: 'tier3', featureFlag: 'ai_clinical_tools', testOwner: 'integration' },
      { label: 'Treatment Recommendations', href: '/treatment-recommendations', icon: Pill, allowedRoles: ['admin', 'doctor'], requiredPermission: 'treatment-recommendations', releaseTier: 'tier3', featureFlag: 'ai_clinical_tools', testOwner: 'integration' },
      { label: 'Treatment Plan Optimization', href: '/treatment-plan-optimization', icon: Target, allowedRoles: ['admin', 'doctor'], requiredPermission: 'treatment-plan-optimization', releaseTier: 'tier3', featureFlag: 'ai_clinical_tools', testOwner: 'integration' },
      { label: 'Predictive Analytics', href: '/predictive-analytics', icon: BarChart3, allowedRoles: ['admin', 'doctor'], requiredPermission: 'predictive-analytics', releaseTier: 'tier3', featureFlag: 'ai_analytics', testOwner: 'integration' },
      { label: 'Length of Stay Forecasting', href: '/length-of-stay-forecasting', icon: Clock, allowedRoles: ['admin', 'doctor'], requiredPermission: 'length-of-stay-forecasting', releaseTier: 'tier3', featureFlag: 'ai_analytics', testOwner: 'integration' },
      { label: 'Resource Utilization', href: '/resource-utilization-optimization', icon: Target, allowedRoles: ['admin', 'doctor'], requiredPermission: 'resource-utilization-optimization', releaseTier: 'tier3', featureFlag: 'ai_analytics', testOwner: 'integration' },
    ],
  },
  {
    label: 'Administration',
    icon: Shield,
    allowedRoles: ['admin'],
    items: [
      { label: 'Staff Management', href: '/settings/staff', icon: Users, allowedRoles: ['admin'], requiredPermission: 'staff-management', releaseTier: 'tier1', testOwner: 'api-security' },
      { label: 'Staff Performance', href: '/settings/performance', icon: Activity, allowedRoles: ['admin'], requiredPermission: 'staff-performance', releaseTier: 'tier1', testOwner: 'integration' },
      { label: 'Activity Logs', href: '/settings/activity', icon: ClipboardList, allowedRoles: ['admin'], requiredPermission: 'activity-logs', releaseTier: 'tier1', testOwner: 'api-security' },
      { label: 'System Monitoring', href: '/settings/monitoring', icon: Activity, allowedRoles: ['admin'], requiredPermission: 'system-monitoring', releaseTier: 'tier1', testOwner: 'api-security' },
      { label: 'Hospital Settings', href: '/settings', icon: Settings, allowedRoles: ['admin'], requiredPermission: 'settings', releaseTier: 'tier1', testOwner: 'integration' },
    ],
  },
  {
    label: 'Business Operations',
    icon: BarChart3,
    allowedRoles: ['admin', 'receptionist'],
    items: [
      { label: 'Billing', href: '/billing', icon: CreditCard, allowedRoles: ['admin', 'receptionist'], requiredPermission: 'billing:read', releaseTier: 'tier1', testOwner: 'integration' },
      { label: 'Kiosk', href: '/kiosk', icon: Building, allowedRoles: ['admin', 'receptionist'], requiredPermission: 'patients', releaseTier: 'tier2', testOwner: 'e2e' },
      { label: 'Reports', href: '/reports', icon: BarChart3, allowedRoles: ['admin'], requiredPermission: 'reports', releaseTier: 'tier2', testOwner: 'integration' },
      { label: 'Workflow Dashboard', href: '/integration/workflow', icon: Zap, allowedRoles: ['admin'], requiredPermission: 'workflow-dashboard', releaseTier: 'tier1', testOwner: 'api-security' },
    ],
  },
  {
    label: 'Patient Portal',
    icon: Users,
    allowedRoles: ['patient'],
    defaultExpanded: true,
    items: [
      { label: 'My Health Portal', href: '/patient/portal', icon: Activity, allowedRoles: ['patient'], requiredPermission: 'portal', releaseTier: 'tier2', testOwner: 'e2e' },
      { label: 'My Appointments', href: '/patient/appointments', icon: Calendar, allowedRoles: ['patient'], requiredPermission: 'appointments:read', releaseTier: 'tier2', testOwner: 'e2e' },
      { label: 'My Prescriptions', href: '/patient/prescriptions', icon: Pill, allowedRoles: ['patient'], requiredPermission: 'prescriptions:read', releaseTier: 'tier2', testOwner: 'e2e' },
      { label: 'Lab Results', href: '/patient/lab-results', icon: TestTube2, allowedRoles: ['patient'], requiredPermission: 'lab:read', releaseTier: 'tier2', testOwner: 'e2e' },
      { label: 'Medical History', href: '/patient/medical-history', icon: FileText, allowedRoles: ['patient'], requiredPermission: 'portal', releaseTier: 'tier2', testOwner: 'integration' },
    ],
  },
];

export const flatRouteManifest = routeManifest.flatMap((group) =>
  group.items.map((item) => ({
    ...item,
    group: group.label,
  })),
);

