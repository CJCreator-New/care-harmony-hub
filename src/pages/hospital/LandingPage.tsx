import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Testimonial } from '@/components/ui/design-testimonial';
import { Hero } from '@/components/ui/hero';
import { NavigationHeader } from '@/components/landing/NavigationHeader';
import { LogoCarousel } from '@/components/landing/LogoCarousel';
import { WorkflowTabs } from '@/components/landing/WorkflowTabs';
import { MetricsSection } from '@/components/landing/MetricsSection';
import { PricingSection } from '@/components/landing/PricingSection';
import { FAQSection } from '@/components/landing/FAQSection';
import { EnhancedFooter } from '@/components/landing/EnhancedFooter';
import {
  Shield,
  Users,
  Calendar,
  Stethoscope,
  Pill,
  TestTube2,
  CheckCircle2,
  ArrowRight,
  Building2,
  Play,
  IdCard,
  Bed,
  BarChart3,
} from 'lucide-react';

const features = [
  {
    icon: IdCard,
    title: 'Unified Patient Records',
    description: 'Single electronic medical record accessible across all departments. Reduce redundant data entry by 70%.',
  },
  {
    icon: Bed,
    title: 'OP/IP and OT Management',
    description: 'Streamlined outpatient queues, inpatient admission, and OR scheduling. Reduce wait times and optimize bed utilization.',
  },
  {
    icon: BarChart3,
    title: 'Smart Revenue Cycle',
    description: 'Automated billing, insurance claims, and AR tracking. Improve cash flow and reduce revenue leakage.',
  },
  {
    icon: Pill,
    title: 'Pharmacy and Lab Integration',
    description: 'Connect with pharmacy systems and diagnostic equipment. Real-time inventory and test result management.',
  },
  {
    icon: Shield,
    title: 'Compliance and Security',
    description: 'Enterprise-grade encryption, role-based access, audit logs. Built for HIPAA and NABH compliance.',
  },
  {
    icon: TestTube2,
    title: 'Analytics and Reporting',
    description: 'Real-time dashboards for KPIs, revenue, and patient metrics. Make data-driven decisions instantly.',
  },
];

const trustBadges = [
  { label: 'ISO 27001', icon: Shield },
  { label: 'HIPAA Ready', icon: CheckCircle2 },
  { label: 'NABH Compliant', icon: CheckCircle2 },
  { label: '99.9% Uptime', icon: CheckCircle2 },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <NavigationHeader />

      {/* Hero Section */}
      <Hero
        gradient={true}
        blur={true}
        title={
          <>
            Modern Hospital Management
            <br />
            <span className="text-primary">Built for Safer Patient Care</span>
          </>
        }
        subtitle="Unified operations from outpatient to inpatient to billing. Enterprise-grade security. HIPAA-ready compliance."
        actions={[
          {
            label: "Schedule 30-min Demo",
            href: "/hospital/signup",
            variant: "hero",
            icon: <Building2 className="w-5 h-5 mr-2" />,
          },
          {
            label: "View Demo Video",
            href: "#",
            variant: "outline",
            icon: <Play className="w-5 h-5 mr-2" />,
          },
        ]}
        subtitleClassName="max-w-2xl"
      >
        {/* Trust Badges */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
          {trustBadges.map((badge) => (
            <Badge key={badge.label} variant="secondary" className="px-3 py-1">
              <badge.icon className="w-3 h-3 mr-1" />
              {badge.label}
            </Badge>
          ))}
        </div>
      </Hero>

      {/* Social Proof / Logo Carousel */}
      <LogoCarousel />

      {/* Features Section */}
      <section id="features" className="py-20 bg-background">
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
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group p-6 rounded-xl bg-card border border-border hover:shadow-lg hover:border-primary/20 transition-all duration-300"
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

      {/* Workflow Tabs */}
      <WorkflowTabs />

      {/* Metrics Section */}
      <MetricsSection />

      {/* Pricing Section */}
      <PricingSection />

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <Badge variant="secondary" className="mb-4">Trusted by Healthcare Leaders</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              What Our Clients Say
            </h2>
          </div>
          <Testimonial />
        </div>
      </section>

      {/* FAQ Section */}
      <FAQSection />

      {/* Security Section */}
      <section id="security" className="py-20 bg-background">
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
            </div>

            <div className="relative">
              <div className="aspect-square rounded-2xl bg-gradient-to-br from-primary/20 to-info/20 p-8 flex items-center justify-center">
                <Shield className="w-32 h-32 text-primary opacity-50" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-48 h-48 rounded-full border-4 border-primary/30 animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="contact" className="py-20 bg-sidebar text-sidebar-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-sidebar-primary-foreground">
            Ready to Modernize Your Hospital Operations?
          </h2>
          <p className="text-lg text-sidebar-foreground/80 mb-8 max-w-2xl mx-auto">
            Join 500+ healthcare providers managing better patient care with our platform
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="xl" variant="hero" asChild>
              <Link to="/hospital/signup">
                Schedule 30-min Demo
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
            <Button size="xl" variant="outline" className="border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent" asChild>
              <Link to="/hospital/signup">
                Start Free 14-day Trial
              </Link>
            </Button>
          </div>
          <p className="mt-6 text-sm text-sidebar-foreground/60">
            No credit card required • Setup in minutes • Full feature access
          </p>
        </div>
      </section>

      {/* Enhanced Footer */}
      <EnhancedFooter />
    </div>
  );
}
