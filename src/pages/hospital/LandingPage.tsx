import { useState, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Testimonial } from '@/components/ui/design-testimonial';
import { Hero } from '@/components/ui/hero';
import { NavigationHeader } from '@/components/landing/NavigationHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { useVideoModal } from '@/components/landing/VideoModal';
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

// Lazy loaded components for better performance
const LogoCarousel = lazy(() => import('@/components/landing/LogoCarousel').then(m => ({ default: m.LogoCarousel })));
const WorkflowTabs = lazy(() => import('@/components/landing/WorkflowTabs').then(m => ({ default: m.WorkflowTabs })));
const MetricsSection = lazy(() => import('@/components/landing/MetricsSection').then(m => ({ default: m.MetricsSection })));
const PricingSection = lazy(() => import('@/components/landing/PricingSection').then(m => ({ default: m.PricingSection })));
const FAQSection = lazy(() => import('@/components/landing/FAQSection').then(m => ({ default: m.FAQSection })));
const EnhancedFooter = lazy(() => import('@/components/landing/EnhancedFooter').then(m => ({ default: m.EnhancedFooter })));
const FloatingCTA = lazy(() => import('@/components/landing/FloatingCTA').then(m => ({ default: m.FloatingCTA })));
const UrgencyBanner = lazy(() => import('@/components/landing/UrgencyBanner').then(m => ({ default: m.UrgencyBanner })));
const SocialProofPopup = lazy(() => import('@/components/landing/SocialProofPopup').then(m => ({ default: m.SocialProofPopup })));
const HeroDashboardMockup = lazy(() => import('@/components/landing/HeroDashboardMockup').then(m => ({ default: m.HeroDashboardMockup })));
const VideoModal = lazy(() => import('@/components/landing/VideoModal').then(m => ({ default: m.VideoModal })));
const ScrollProgress = lazy(() => import('@/components/landing/ScrollProgress').then(m => ({ default: m.ScrollProgress })));
const CursorTrail = lazy(() => import('@/components/landing/CursorTrail').then(m => ({ default: m.CursorTrail })));

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
  const { isOpen: isVideoOpen, openModal: openVideoModal, closeModal: closeVideoModal } = useVideoModal();
  
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>CareSync HIMS | Modern Hospital Management System</title>
        <meta name="description" content="Streamline your hospital operations with CareSync. Unified EMR, OP/IP management, smart billing, and AI-powered healthcare workflows." />
        <meta name="keywords" content="hospital management system, HIMS, EMR, healthcare software, clinic management, medical records" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "CareSync HIMS",
            "applicationCategory": "HealthApplication",
            "operatingSystem": "Web",
            "offers": {
              "@type": "Offer",
              "price": "0.00",
              "priceCurrency": "USD"
            },
            "description": "Enterprise-grade Hospital Management System for modern healthcare facilities."
          })}
        </script>
      </Helmet>

      {/* Cursor Trail Effect */}
      <Suspense fallback={null}>
        <CursorTrail />
      </Suspense>
      
      {/* Scroll Progress Indicator */}
      <Suspense fallback={null}>
        <ScrollProgress />
      </Suspense>
      
      {/* Floating CTA */}
      <Suspense fallback={null}>
        <FloatingCTA />
      </Suspense>
      
      {/* Social Proof Popups */}
      <Suspense fallback={null}>
        <SocialProofPopup />
      </Suspense>
      
      {/* Navigation Header */}
      <NavigationHeader />
      
      {/* Urgency Banner */}
      <Suspense fallback={null}>
        <UrgencyBanner />
      </Suspense>

      {/* Hero Section with Dashboard Mockup */}
      <div className="pt-10">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Hero Content */}
            <Hero
              gradient={true}
              blur={true}
              className="pt-16 pb-10 lg:pt-24 lg:pb-16"
              title={
                <>
                  Modern Hospital Management
                  <br />
                  <span className="text-primary">Built for Safer Patient Care</span>
                </>
              }
              subtitle="Unified operations from outpatient to inpatient to billing. Enterprise-grade security. HIPAA-ready compliance."
              subtitleClassName="max-w-xl"
            >
              {/* Action Buttons */}
              <motion.div
                className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mt-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <Button variant="hero" size="xl" asChild>
                  <Link to="/hospital/signup">
                    <Building2 className="w-5 h-5 mr-2" />
                    Schedule 30-min Demo
                  </Link>
                </Button>
                <Button variant="outline" size="xl" onClick={openVideoModal}>
                  <Play className="w-5 h-5 mr-2" />
                  View Demo Video
                </Button>
              </motion.div>

              {/* Trust Badges */}
              <motion.div 
                className="flex flex-wrap items-center justify-center lg:justify-start gap-3 mt-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                {trustBadges.map((badge, index) => (
                  <motion.div
                    key={badge.label}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                  >
                    <Badge variant="secondary" className="px-3 py-1">
                      <badge.icon className="w-3 h-3 mr-1" />
                      {badge.label}
                    </Badge>
                  </motion.div>
                ))}
              </motion.div>
            </Hero>

            {/* Right: Dashboard Mockup */}
            <div className="hidden lg:block">
              <Suspense fallback={<Skeleton className="h-[400px] w-full rounded-xl" />}>
                <HeroDashboardMockup />
              </Suspense>
            </div>
          </div>
        </div>
      </div>

      {/* Video Modal */}
      <Suspense fallback={null}>
        <VideoModal isOpen={isVideoOpen} onClose={closeVideoModal} />
      </Suspense>

      {/* Social Proof / Logo Carousel */}
      <Suspense fallback={<div className="h-20" />}>
        <LogoCarousel />
      </Suspense>

      {/* Features Section */}
      <section id="features" className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Badge variant="secondary" className="mb-4">Features</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need to Manage Healthcare
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A complete suite of tools designed for healthcare professionals, 
              from front desk to clinical staff.
            </p>
          </motion.div>

          <motion.div 
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                variants={itemVariants}
                whileHover={{ 
                  y: -8,
                  rotateX: 2,
                  rotateY: 2,
                }}
                transition={{ type: 'spring', stiffness: 300 }}
                className="group p-6 rounded-xl bg-card border border-border hover:shadow-lg hover:border-primary/20 transition-all duration-300 cursor-pointer"
                style={{ transformStyle: 'preserve-3d' }}
              >
                <motion.div 
                  className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-4"
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.5 }}
                >
                  <feature.icon className="w-6 h-6" />
                </motion.div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Workflow Tabs */}
      <Suspense fallback={<SectionSkeleton />}>
        <WorkflowTabs />
      </Suspense>

      {/* Metrics Section */}
      <Suspense fallback={<SectionSkeleton />}>
        <MetricsSection />
      </Suspense>

      {/* Pricing Section */}
      <Suspense fallback={<SectionSkeleton />}>
        <PricingSection />
      </Suspense>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <motion.div 
            className="text-center mb-8"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Badge variant="secondary" className="mb-4">Trusted by Healthcare Leaders</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              What Our Clients Say
            </h2>
          </motion.div>
          <Testimonial />
        </div>
      </section>

      {/* FAQ Section */}
      <Suspense fallback={<SectionSkeleton />}>
        <FAQSection />
      </Suspense>

      {/* Security Section */}
      <section id="security" className="py-20 bg-background overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
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
                ].map((item, index) => (
                  <motion.li 
                    key={item} 
                    className="flex items-center gap-3"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      whileInView={{ scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 + 0.2, type: 'spring' }}
                    >
                      <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                    </motion.div>
                    <span>{item}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            <motion.div 
              className="relative"
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="aspect-square rounded-2xl bg-gradient-to-br from-primary/20 to-info/20 p-8 flex items-center justify-center relative overflow-hidden">
                {/* Orbiting badges */}
                <motion.div
                  className="absolute w-full h-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                >
                  {['ISO', 'HIPAA', 'SOC2', 'NABH'].map((badge, index) => (
                    <motion.div
                      key={badge}
                      className="absolute w-12 h-12 rounded-full bg-card border border-border flex items-center justify-center text-xs font-bold shadow-lg"
                      style={{
                        top: '50%',
                        left: '50%',
                        transform: `rotate(${index * 90}deg) translateX(140px) rotate(-${index * 90}deg)`,
                      }}
                    >
                      {badge}
                    </motion.div>
                  ))}
                </motion.div>
                
                {/* Central shield */}
                <motion.div
                  animate={{ 
                    scale: [1, 1.05, 1],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Shield className="w-32 h-32 text-primary" />
                </motion.div>
                
                {/* Pulsing aura rings */}
                {[1, 2, 3].map((ring) => (
                  <motion.div
                    key={ring}
                    className="absolute rounded-full border-2 border-primary/30"
                    style={{
                      width: 80 + ring * 60,
                      height: 80 + ring * 60,
                    }}
                    animate={{
                      scale: [1, 1.1, 1],
                      opacity: [0.3, 0.1, 0.3],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: ring * 0.3,
                    }}
                  />
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section with Particles */}
      <section id="contact" className="py-20 bg-sidebar text-sidebar-foreground relative overflow-hidden">
        {/* Floating particles */}
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-sidebar-primary/20"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -30, 0],
                x: [0, Math.random() * 20 - 10, 0],
                opacity: [0.2, 0.5, 0.2],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>
        
        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.h2 
            className="text-3xl md:text-4xl font-bold mb-4 text-sidebar-primary-foreground"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Ready to Modernize Your Hospital Operations?
          </motion.h2>
          <motion.p 
            className="text-lg text-sidebar-foreground/80 mb-8 max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            Join <motion.span
              className="font-bold text-sidebar-primary-foreground"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              500+
            </motion.span> healthcare providers managing better patient care with our platform
          </motion.p>
          <motion.div 
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button size="xl" variant="hero" asChild>
                <Link to="/hospital/signup">
                  Schedule 30-min Demo
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button size="xl" variant="outline" className="border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent" asChild>
                <Link to="/hospital/signup">
                  Start Free 14-day Trial
                </Link>
              </Button>
            </motion.div>
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
  );
}
