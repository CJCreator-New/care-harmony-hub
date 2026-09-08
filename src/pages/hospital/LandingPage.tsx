import { useState, lazy, Suspense } from 'react';
import { VideoModal } from '@/components/landing/VideoModal';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion, MotionConfig } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { NavigationHeader } from '@/components/landing/NavigationHeader';
import { SectionHeader } from '@/components/landing/SectionHeader';
import { Testimonial } from '@/components/ui/design-testimonial';
import { Skeleton } from '@/components/ui/skeleton';

import {
  Shield,
  Pill,
  TestTube2,
  CheckCircle2,
  ArrowRight,
  CalendarCheck,
  Play,
  IdCard,
  Bed,
  BarChart3,
} from 'lucide-react';

// Lazy loaded components for better performance
const LogoCarousel = lazy(() => import('@/components/landing/LogoCarousel').then(m => ({ default: m.LogoCarousel })));
const WorkflowTabs = lazy(() => import('@/components/landing/WorkflowTabs').then(m => ({ default: m.WorkflowTabs })));
const MetricsSection = lazy(() => import('@/components/landing/MetricsSection').then(m => ({ default: m.MetricsSection })));
const PricingSection = lazy(() => import('@/components/landing/PricingSection').then(m => ({ default: m.PricingSection })));
const FAQSection = lazy(() => import('@/components/landing/FAQSection').then(m => ({ default: m.FAQSection })));
const EnhancedFooter = lazy(() => import('@/components/landing/EnhancedFooter').then(m => ({ default: m.EnhancedFooter })));
const FloatingCTA = lazy(() => import('@/components/landing/FloatingCTA').then(m => ({ default: m.FloatingCTA })));
const HeroDashboardMockup = lazy(() => import('@/components/landing/HeroDashboardMockup').then(m => ({ default: m.HeroDashboardMockup })));
const ScrollProgress = lazy(() => import('@/components/landing/ScrollProgress').then(m => ({ default: m.ScrollProgress })));

// Skeletons for Suspense
const SectionSkeleton = () => (
  <div className="py-20 container mx-auto px-4">
    <Skeleton className="h-[400px] w-full rounded-xl" />
  </div>
);

const features = [
  {
    icon: IdCard,
    title: 'Unified Patient Records',
    description: 'A single electronic medical record accessible across every department. Reduce redundant data entry by 70%.',
  },
  {
    icon: Bed,
    title: 'OP/IP & OT Management',
    description: 'Streamlined outpatient queues, inpatient admission, and OR scheduling. Cut wait times and optimize bed utilization.',
  },
  {
    icon: BarChart3,
    title: 'Smart Revenue Cycle',
    description: 'Automated billing, insurance claims, and AR tracking. Improve cash flow and reduce revenue leakage.',
  },
  {
    icon: Pill,
    title: 'Pharmacy & Lab Integration',
    description: 'Connect pharmacy systems and diagnostic equipment with real-time inventory and test-result management.',
  },
  {
    icon: Shield,
    title: 'Compliance & Security',
    description: 'Enterprise-grade encryption, role-based access, and audit logs. Built for HIPAA and NABH compliance.',
  },
  {
    icon: TestTube2,
    title: 'Analytics & Reporting',
    description: 'Real-time dashboards for KPIs, revenue, and patient metrics. Make data-driven decisions instantly.',
  },
];

const trustBadges = ['ISO 27001', 'HIPAA Ready', 'NABH Compliant', '99.9% Uptime'];

const securityFeatures = [
  'End-to-end encryption for all data',
  'Role-based access control (RBAC)',
  'Complete, immutable audit logging',
  'HIPAA-compliant infrastructure',
  'Regular security audits & penetration testing',
  'Automated backup & disaster recovery',
];

const complianceBadges = ['ISO', 'HIPAA', 'SOC2', 'NABH'];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function LandingPage() {
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const openVideoModal = () => setIsVideoOpen(true);
  const closeVideoModal = () => setIsVideoOpen(false);

  return (
    <MotionConfig reducedMotion="user">
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>AROCORD-HIMS | Modern Hospital Management System</title>
        <meta name="description" content="Streamline your hospital operations with AROCORD-HIMS. Unified EMR, OP/IP management, smart billing, and AI-powered healthcare workflows." />
        <meta name="keywords" content="hospital management system, HIMS, EMR, healthcare software, clinic management, medical records" />
        <link rel="canonical" href="/hospital" />
        <meta property="og:url" content="/hospital" />
        <meta property="og:title" content="AROCORD-HIMS | Modern Hospital Management System" />
        <meta property="og:description" content="Unified EMR, OP/IP management, smart billing, and AI-powered healthcare workflows." />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "AROCORD-HIMS",
            "applicationCategory": "HealthApplication",
            "operatingSystem": "Web",
            "offers": { "@type": "Offer", "price": "0.00", "priceCurrency": "USD" },
            "description": "Enterprise-grade Hospital Management System for modern healthcare facilities."
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
              { "@type": "Question", "name": "What modules are included in the platform?", "acceptedAnswer": { "@type": "Answer", "text": "Our platform includes comprehensive modules for OPD/IPD management, appointment scheduling, electronic medical records, pharmacy integration, laboratory management, billing and revenue cycle, telemedicine, and advanced analytics dashboards." } },
              { "@type": "Question", "name": "Can we customize workflows for our hospital's specific processes?", "acceptedAnswer": { "@type": "Answer", "text": "Yes, our platform is highly configurable. You can customize consultation workflows, approval processes, notification rules, and form templates to match your existing processes." } },
              { "@type": "Question", "name": "Does it work with our existing EMR or HIS system?", "acceptedAnswer": { "@type": "Answer", "text": "We offer integration capabilities with most major EMR/HIS systems through our API. We also support HL7 FHIR standards for healthcare data exchange." } },
              { "@type": "Question", "name": "Where is patient data stored? Is it compliant with Indian regulations?", "acceptedAnswer": { "@type": "Answer", "text": "All patient data is stored in secure, SOC 2 certified data centers located in India, ensuring compliance with Indian data localization requirements and DPDP Act guidelines." } },
              { "@type": "Question", "name": "How is patient data encrypted and protected?", "acceptedAnswer": { "@type": "Answer", "text": "We use AES-256 encryption for data at rest and TLS 1.3 for data in transit. All access is controlled through role-based permissions, and every action is logged in immutable audit trails." } },
              { "@type": "Question", "name": "What happens in case of system downtime or disaster?", "acceptedAnswer": { "@type": "Answer", "text": "We maintain a 99.9% uptime SLA with automatic failover to redundant systems. Daily encrypted backups are stored in geographically separate locations with point-in-time recovery." } },
              { "@type": "Question", "name": "How long does implementation typically take?", "acceptedAnswer": { "@type": "Answer", "text": "For a standard hospital setup, implementation takes 4-8 weeks. Enterprise implementations with custom integrations may take 8-12 weeks." } },
              { "@type": "Question", "name": "What if we need to migrate data from our old system?", "acceptedAnswer": { "@type": "Answer", "text": "We have an experienced data migration team that has handled migrations from all major legacy systems with validation checks and parallel running before cutover." } },
              { "@type": "Question", "name": "What training and support do you provide?", "acceptedAnswer": { "@type": "Answer", "text": "We provide comprehensive training including on-site sessions, video tutorials, and documentation, plus a support portal and knowledge base." } },
              { "@type": "Question", "name": "What if we encounter technical issues?", "acceptedAnswer": { "@type": "Answer", "text": "Hospital and Enterprise plans include priority support with response times under 4 hours for critical issues, plus 24/7 emergency support for system-down situations." } }
            ]
          })}
        </script>
      </Helmet>

      {/* Scroll Progress Indicator */}
      <Suspense fallback={null}>
        <ScrollProgress />
      </Suspense>

      {/* Floating CTA */}
      <Suspense fallback={null}>
        <FloatingCTA />
      </Suspense>

      {/* Navigation Header */}
      <NavigationHeader />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-background pt-28 lg:pt-32 pb-16 lg:pb-24">
        {/* Single, theme-aware radial mesh — one cohesive background treatment */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background: [
              'radial-gradient(ellipse 90% 60% at 12% 0%, hsl(var(--primary) / 0.10) 0%, transparent 70%)',
              'radial-gradient(ellipse 60% 50% at 88% 95%, hsl(var(--info) / 0.08) 0%, transparent 60%)',
            ].join(', '),
          }}
        />

        <div className="container relative mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: copy */}
            <motion.div
              className="text-center lg:text-left"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <motion.span
                variants={itemVariants}
                className="eyebrow text-primary inline-flex items-center gap-2"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                Hospital Information Management System
              </motion.span>

              <motion.h1
                variants={itemVariants}
                className="font-display font-normal text-4xl md:text-5xl lg:text-6xl leading-[1.08] tracking-tight mt-5 mb-6 text-balance"
              >
                Modern hospital management,
                <span className="text-primary"> built for safer patient care</span>
              </motion.h1>

              <motion.p
                variants={itemVariants}
                className="lead mx-auto lg:mx-0 mb-8"
              >
                Unify outpatient, inpatient, OT, pharmacy, lab, and billing on one secure
                platform — with enterprise-grade security and HIPAA-ready compliance.
              </motion.p>

              {/* Primary + secondary CTA */}
              <motion.div
                variants={itemVariants}
                className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3"
              >
                <Button variant="hero" size="xl" asChild>
                  <Link to="/hospital/signup">
                    <CalendarCheck className="w-5 h-5 mr-2" />
                    Book a Demo
                  </Link>
                </Button>
                <Button variant="outline" size="xl" onClick={openVideoModal}>
                  <Play className="w-5 h-5 mr-2" />
                  Watch 2-min Overview
                </Button>
              </motion.div>

              {/* Slim trust strip */}
              <motion.div
                variants={itemVariants}
                className="mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-x-5 gap-y-2"
              >
                <span className="text-xs text-muted-foreground">Trusted &amp; compliant:</span>
                {trustBadges.map((badge) => (
                  <span
                    key={badge}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground/70"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                    {badge}
                  </span>
                ))}
              </motion.div>
            </motion.div>

            {/* Right: product visual (now visible on every breakpoint) */}
            <motion.div
              className="w-full max-w-lg mx-auto lg:max-w-none"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
            >
              <Suspense fallback={<Skeleton className="h-[360px] w-full rounded-xl" />}>
                <HeroDashboardMockup />
              </Suspense>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Video Modal */}
      <VideoModal isOpen={isVideoOpen} onClose={closeVideoModal} />

      {/* ── Social proof: logos (tinted) ─────────────────────── */}
      <Suspense fallback={<div className="h-20" />}>
        <LogoCarousel />
      </Suspense>

      {/* ── Outcome metrics (white) ──────────────────────────── */}
      <Suspense fallback={<SectionSkeleton />}>
        <MetricsSection />
      </Suspense>

      {/* ── Features (tinted) ────────────────────────────────── */}
      <section id="features" className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <SectionHeader
            eyebrow="Capabilities"
            title="Everything you need to run modern healthcare"
            description="A complete suite for every role — from front desk to clinical staff to finance."
          />

          <motion.div
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {features.map((feature) => (
              <motion.div
                key={feature.title}
                variants={itemVariants}
                className="group p-6 rounded-2xl bg-card border border-border shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-primary/30"
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-4 transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Workflows (white) ────────────────────────────────── */}
      <Suspense fallback={<SectionSkeleton />}>
        <WorkflowTabs />
      </Suspense>

      {/* ── Security & Compliance (tinted) ───────────────────── */}
      <section id="security" className="py-24 bg-muted/30 overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <span className="eyebrow text-primary block mb-3">Security &amp; Compliance</span>
              <h2 className="font-display font-normal text-3xl md:text-4xl mb-5 text-balance">
                Enterprise-grade security for healthcare
              </h2>
              <p className="lead mb-8">
                Your patients' data deserves the highest level of protection. Our platform is
                built with a security-first architecture and full HIPAA compliance.
              </p>

              <ul className="space-y-4">
                {securityFeatures.map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Calm, static compliance composition */}
            <motion.div
              className="relative"
              initial={{ opacity: 0, scale: 0.96 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="aspect-square max-w-md mx-auto rounded-3xl bg-gradient-to-br from-primary/15 to-info/15 p-8 flex items-center justify-center relative overflow-hidden border border-border/50">
                {/* static concentric rings */}
                {[1, 2, 3].map((ring) => (
                  <div
                    key={ring}
                    className="absolute rounded-full border border-primary/20"
                    style={{ width: 110 + ring * 70, height: 110 + ring * 70 }}
                  />
                ))}

                {/* static orbiting compliance badges */}
                {complianceBadges.map((badge, index) => (
                  <div
                    key={badge}
                    className="absolute w-14 h-14 rounded-full bg-card border border-border flex items-center justify-center text-xs font-bold shadow-md"
                    style={{
                      top: '50%',
                      left: '50%',
                      transform: `rotate(${index * 90}deg) translateX(130px) rotate(-${index * 90}deg) translate(-50%, -50%)`,
                    }}
                  >
                    {badge}
                  </div>
                ))}

                {/* central shield */}
                <div className="relative z-10 flex items-center justify-center w-28 h-28 rounded-2xl bg-card border border-border shadow-lg">
                  <Shield className="w-14 h-14 text-primary" />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Testimonials (white) ─────────────────────────────── */}
      <section id="testimonials" className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <SectionHeader
            eyebrow="Trusted by healthcare leaders"
            title="What our clients say"
          />
          <Testimonial />
        </div>
      </section>

      {/* ── Pricing (tinted) ─────────────────────────────────── */}
      <Suspense fallback={<SectionSkeleton />}>
        <PricingSection />
      </Suspense>

      {/* ── FAQ (white) ──────────────────────────────────────── */}
      <Suspense fallback={<SectionSkeleton />}>
        <FAQSection />
      </Suspense>

      {/* ── Final CTA band (dark) ────────────────────────────── */}
      <section id="contact" className="py-24 bg-sidebar text-sidebar-foreground relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 60% 60% at 50% 0%, hsl(var(--sidebar-primary) / 0.15) 0%, transparent 70%)',
          }}
        />

        <div className="container mx-auto px-4 text-center relative z-10 max-w-3xl">
          <motion.h2
            className="font-display font-normal text-3xl md:text-4xl mb-4 text-sidebar-primary-foreground text-balance"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Ready to modernize your hospital operations?
          </motion.h2>
          <motion.p
            className="text-lg text-sidebar-foreground/80 mb-8 mx-auto"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            Join <span className="font-bold text-sidebar-primary-foreground">500+</span> healthcare
            providers managing better patient care with AROCORD-HIMS.
          </motion.p>
          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-5"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <Button size="xl" variant="hero" asChild>
              <Link to="/hospital/signup">
                Book a Demo
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
            <Link
              to="/hospital/signup"
              className="text-sm text-sidebar-foreground/80 hover:text-sidebar-primary-foreground underline-offset-4 hover:underline"
            >
              Or start a free 14-day trial →
            </Link>
          </motion.div>
          <motion.p
            className="mt-6 text-sm text-sidebar-foreground/60"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
          >
            No credit card required • Setup in minutes • Full feature access
          </motion.p>
        </div>
      </section>

      {/* Enhanced Footer */}
      <Suspense fallback={<div className="h-60 bg-muted" />}>
        <EnhancedFooter />
      </Suspense>
    </div>
    </MotionConfig>
  );
}
