import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  href: string;
  icon?: React.ElementType;
}

interface BreadcrumbProps {
  className?: string;
  customItems?: BreadcrumbItem[];
}

// Route to breadcrumb mapping
const routeLabels: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/patients': 'Patients',
  '/patients/new': 'New Patient',
  '/patients/profile': 'Patient Profile',
  '/appointments': 'Appointments',
  '/appointments/new': 'New Appointment',
  '/queue': 'Queue Management',
  '/consultations': 'Consultations',
  '/telemedicine': 'Telemedicine',
  '/pharmacy': 'Pharmacy',
  '/pharmacy/clinical': 'Clinical Pharmacy',
  '/inventory': 'Inventory',
  '/laboratory': 'Laboratory',
  '/laboratory/automation': 'Lab Automation',
  '/reports': 'Reports',
  '/billing': 'Billing',
  '/settings': 'Settings',
  '/settings/staff': 'Staff Management',
  '/settings/performance': 'Staff Performance',
  '/settings/activity': 'Activity Logs',
  '/settings/monitoring': 'System Monitoring',
  '/ai-demo': 'AI Demo',
  '/differential-diagnosis': 'Differential Diagnosis',
  '/treatment-recommendations': 'Treatment Recommendations',
  '/treatment-plan-optimization': 'Treatment Plan Optimization',
  '/predictive-analytics': 'Predictive Analytics',
  '/length-of-stay-forecasting': 'Length of Stay Forecasting',
  '/resource-utilization-optimization': 'Resource Utilization',
  '/voice-clinical-notes': 'Voice Clinical Notes',
  '/documents': 'Documents',
  '/integration/workflow': 'Workflow Dashboard',
  // Patient portal routes
  '/patient/portal': 'My Health Portal',
  '/patient/appointments': 'My Appointments',
  '/patient/prescriptions': 'My Prescriptions',
  '/patient/lab-results': 'Lab Results',
  '/patient/medical-history': 'Medical History',
};

export function Breadcrumb({ className, customItems }: BreadcrumbProps) {
  const location = useLocation();

  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    if (customItems) {
      return customItems;
    }

    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [
      { label: 'Home', href: '/dashboard', icon: Home }
    ];

    let currentPath = '';

    for (const segment of pathSegments) {
      currentPath += `/${segment}`;
      const label = routeLabels[currentPath];

      if (label) {
        // Handle dynamic segments (like patient IDs)
        if (segment.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          // UUID - likely a patient ID
          breadcrumbs.push({ label: 'Patient Details', href: currentPath });
        } else if (segment.match(/^\d+$/)) {
          // Numeric ID
          breadcrumbs.push({ label: 'Details', href: currentPath });
        } else {
          breadcrumbs.push({ label, href: currentPath });
        }
      }
    }

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  if (breadcrumbs.length <= 1) {
    return null; // Don't show breadcrumbs if we're only at home
  }

  return (
    <nav
      className={cn("flex items-center space-x-1 text-sm text-muted-foreground", className)}
      aria-label="Breadcrumb"
    >
      {breadcrumbs.map((item, index) => {
        const isLast = index === breadcrumbs.length - 1;
        const Icon = item.icon;

        return (
          <div key={`${item.href}-${index}`} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="h-4 w-4 mx-1 text-muted-foreground/50" />
            )}

            {isLast ? (
              <span className="font-medium text-foreground flex items-center gap-1">
                {Icon && <Icon className="h-4 w-4" />}
                {item.label}
              </span>
            ) : (
              <Link
                to={item.href}
                className="flex items-center gap-1 hover:text-foreground transition-colors"
              >
                {Icon && <Icon className="h-4 w-4" />}
                {item.label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}

// Hook for programmatic breadcrumb management
export function useBreadcrumbs() {
  const location = useLocation();

  const setBreadcrumbs = (items: BreadcrumbItem[]) => {
    // This would typically integrate with a global state management solution
    // For now, we'll just return the items for use in components
    return items;
  };

  const getCurrentBreadcrumbs = () => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [
      { label: 'Home', href: '/dashboard', icon: Home }
    ];

    let currentPath = '';

    for (const segment of pathSegments) {
      currentPath += `/${segment}`;
      const label = routeLabels[currentPath];

      if (label) {
        breadcrumbs.push({ label, href: currentPath });
      }
    }

    return breadcrumbs;
  };

  return {
    setBreadcrumbs,
    getCurrentBreadcrumbs,
  };
}