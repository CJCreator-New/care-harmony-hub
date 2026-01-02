import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, 
  ArrowLeft, 
  Shield,
  Stethoscope,
  UserCog,
  Users,
  Pill,
  TestTube2,
  ClipboardList,
} from 'lucide-react';

const roles = [
  {
    id: 'admin',
    title: 'Administrator',
    icon: UserCog,
    description: 'Full system access, staff management, hospital settings, reports and analytics',
    color: 'bg-destructive/10 text-destructive',
    features: ['Staff Management', 'System Settings', 'Analytics', 'Reports'],
  },
  {
    id: 'doctor',
    title: 'Doctor / Physician',
    icon: Stethoscope,
    description: 'Patient consultations, prescriptions, lab orders, medical records',
    color: 'bg-primary/10 text-primary',
    features: ['Consultations', 'Prescriptions', 'Lab Orders', 'Schedule'],
  },
  {
    id: 'nurse',
    title: 'Nurse',
    icon: Users,
    description: 'Patient vitals, triage, medication administration, care coordination',
    color: 'bg-info/10 text-info',
    features: ['Vitals Recording', 'Triage', 'Medications', 'Patient Care'],
  },
  {
    id: 'receptionist',
    title: 'Receptionist',
    icon: ClipboardList,
    description: 'Patient registration, appointments, check-in/out, billing',
    color: 'bg-warning/10 text-warning',
    features: ['Registration', 'Appointments', 'Check-In', 'Billing'],
  },
  {
    id: 'pharmacist',
    title: 'Pharmacist',
    icon: Pill,
    description: 'Prescription dispensing, drug interactions, inventory management',
    color: 'bg-success/10 text-success',
    features: ['Dispensing', 'Drug Checks', 'Inventory', 'Refills'],
  },
  {
    id: 'lab_technician',
    title: 'Lab Technician',
    icon: TestTube2,
    description: 'Sample collection, test processing, result entry, quality control',
    color: 'bg-secondary/50 text-secondary-foreground',
    features: ['Sample Collection', 'Test Processing', 'Results', 'QC'],
  },
];

export default function QuickAccessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-info/5">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/hospital" className="flex items-center gap-2">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary">
              <Activity className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">AROCORD-HIMS</span>
          </Link>
          <Button variant="ghost" asChild>
            <Link to="/hospital">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Link>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-6xl">
          {/* Header Section */}
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4">
              <Shield className="w-3 h-3 mr-1" />
              Staff Access Portal
            </Badge>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Quick Role Access
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Select your role to access the staff login. Each role has specific 
              permissions and access to relevant modules.
            </p>
          </div>

          {/* Role Cards Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {roles.map((role) => (
              <Card 
                key={role.id} 
                className="group hover:shadow-lg transition-all duration-300 hover:border-primary/30"
              >
                <CardHeader>
                  <div className={`w-12 h-12 rounded-xl ${role.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                    <role.icon className="w-6 h-6" />
                  </div>
                  <CardTitle className="text-lg">{role.title}</CardTitle>
                  <CardDescription>{role.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {role.features.map((feature) => (
                      <Badge key={feature} variant="secondary" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                  <Button className="w-full" asChild>
                    <Link to={`/hospital/login?role=${role.id}`}>
                      Login as {role.title}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Additional Info */}
          <div className="mt-12 text-center">
            <div className="inline-flex items-center gap-4 p-4 rounded-lg bg-muted/50 border border-border">
              <div className="text-left">
                <p className="text-sm text-muted-foreground">
                  Not a staff member?
                </p>
                <p className="text-sm font-medium">
                  Patients can access their health portal separately.
                </p>
              </div>
              <Button variant="outline" asChild>
                <Link to="/patient-login">Patient Portal</Link>
              </Button>
            </div>
          </div>

          {/* Hospital Registration CTA */}
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground mb-2">
              Need to register your hospital?
            </p>
            <Button variant="link" asChild>
              <Link to="/hospital/signup">Register a New Hospital →</Link>
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-border">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} AROCORD Healthcare Solutions. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}