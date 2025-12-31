import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Activity,
  Shield,
  Users,
  Calendar,
  Stethoscope,
  Pill,
  TestTube2,
  BarChart3,
  Video,
  Clock,
  CheckCircle2,
  ArrowRight,
  Building2,
  UserPlus,
} from 'lucide-react';

const features = [
  {
    icon: Users,
    title: 'Patient Management',
    description: 'Comprehensive patient records with demographics, medical history, and insurance info.',
  },
  {
    icon: Calendar,
    title: 'Smart Scheduling',
    description: 'Online booking with calendar views, automated reminders, and queue management.',
  },
  {
    icon: Stethoscope,
    title: 'Clinical Workflows',
    description: 'Adaptive 5-step consultation process with real-time clinical decision support.',
  },
  {
    icon: Pill,
    title: 'Pharmacy Integration',
    description: 'Electronic prescriptions with drug interaction checking and inventory tracking.',
  },
  {
    icon: TestTube2,
    title: 'Laboratory Module',
    description: 'Lab order management with result entry, critical alerts, and trend analysis.',
  },
  {
    icon: Video,
    title: 'Telemedicine',
    description: 'Video consultations with virtual waiting rooms and digital prescriptions.',
  },
];

const stats = [
  { value: '500+', label: 'Healthcare Facilities' },
  { value: '99.9%', label: 'Uptime SLA' },
  { value: '50K+', label: 'Daily Transactions' },
  { value: '<2s', label: 'Page Load Time' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary">
              <Activity className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">AROCORD-HIMS</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#security" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Security
            </a>
            <a href="#contact" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Contact
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link to="/hospital/login">Sign In</Link>
            </Button>
            <Button variant="hero" asChild>
              <Link to="/hospital/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-info/5" />
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-info/10 rounded-full blur-3xl" />

        <div className="container relative mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="secondary" className="mb-6">
              <Shield className="w-3 h-3 mr-1" />
              HIPAA Compliant Healthcare Platform
            </Badge>

            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 animate-fade-in">
              Modern Healthcare
              <br />
              <span className="text-primary">Information Management</span>
            </h1>

            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '0.1s' }}>
              Streamline your healthcare facility with our comprehensive HIMS solution. 
              From patient registration to billing, manage everything in one place.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <Button size="xl" variant="hero" asChild className="w-full sm:w-auto">
                <Link to="/hospital/signup">
                  <Building2 className="w-5 h-5 mr-2" />
                  Register Your Hospital
                </Link>
              </Button>
              <Button size="xl" variant="outline" asChild className="w-full sm:w-auto">
                <Link to="/hospital/login">
                  <UserPlus className="w-5 h-5 mr-2" />
                  Existing Hospital Login
                </Link>
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20 max-w-4xl mx-auto">
            {stats.map((stat, index) => (
              <div
                key={stat.label}
                className="text-center p-6 rounded-xl bg-card border border-border animate-slide-up"
                style={{ animationDelay: `${0.3 + index * 0.1}s` }}
              >
                <div className="text-3xl md:text-4xl font-bold text-primary mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">Features</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need to Manage Healthcare
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A complete suite of tools designed for healthcare professionals, 
              from front desk to clinical staff.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="group p-6 rounded-xl bg-card border border-border hover:shadow-card-hover hover:border-primary/20 transition-all duration-300"
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section id="security" className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge variant="secondary" className="mb-4">Security & Compliance</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Enterprise-Grade Security for Healthcare
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Your patients' data deserves the highest level of protection. 
                Our platform is built with security-first architecture and full HIPAA compliance.
              </p>

              <ul className="space-y-4">
                {[
                  'End-to-end encryption for all data',
                  'Role-based access control (RBAC)',
                  'Complete audit logging',
                  'HIPAA compliant infrastructure',
                  'Regular security audits and penetration testing',
                  'Automated backup and disaster recovery',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <Button className="mt-8" variant="outline" asChild>
                <a href="#contact">
                  Learn More About Security
                  <ArrowRight className="w-4 h-4 ml-2" />
                </a>
              </Button>
            </div>

            <div className="relative">
              <div className="aspect-square rounded-2xl bg-gradient-to-br from-primary/20 to-info/20 p-8 flex items-center justify-center">
                <Shield className="w-32 h-32 text-primary opacity-50" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-48 h-48 rounded-full border-4 border-primary/30 animate-pulse-soft" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-sidebar text-sidebar-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-sidebar-primary-foreground">
            Ready to Transform Your Healthcare Facility?
          </h2>
          <p className="text-lg text-sidebar-foreground/80 mb-8 max-w-2xl mx-auto">
            Join hundreds of healthcare providers who trust AROCORD-HIMS 
            for their information management needs.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="xl" variant="hero" asChild>
              <Link to="/hospital/signup">
                Start Free Trial
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
            <Button size="xl" variant="outline" className="border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent" asChild>
              <Link to="/hospital/login">
                <Clock className="w-5 h-5 mr-2" />
                Schedule Demo
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
                <Activity className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold">AROCORD-HIMS</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} AROCORD Healthcare Solutions. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground">Privacy</a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground">Terms</a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
