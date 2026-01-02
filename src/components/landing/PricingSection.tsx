import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  CheckCircle2,
  Building,
  Building2,
  Landmark,
  ArrowRight,
  Phone,
} from 'lucide-react';

const plans = [
  {
    id: 'clinic',
    name: 'Clinic',
    description: 'Perfect for small clinics',
    monthlyPrice: 5000,
    annualPrice: 4000,
    icon: Building,
    features: [
      'Up to 50 beds',
      'Basic OPD module',
      'Simple billing',
      'Email support',
      'Single location',
    ],
    cta: 'Start 14-day Free Trial',
    popular: false,
  },
  {
    id: 'hospital',
    name: 'Hospital',
    description: 'Best for multi-specialty hospitals',
    monthlyPrice: 18000,
    annualPrice: 14400,
    icon: Building2,
    features: [
      'Up to 200 beds',
      'Full OPD + IPD + OT',
      'Advanced billing with insurance',
      'Pharmacy and Lab integration',
      'Priority support',
      'Multiple departments',
    ],
    cta: 'Start 14-day Free Trial',
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For hospital chains and large systems',
    monthlyPrice: null,
    annualPrice: null,
    icon: Landmark,
    features: [
      'Unlimited beds and locations',
      'Multi-facility management',
      'Custom integrations (HIS, PACS)',
      'Dedicated account manager',
      '99.9% SLA',
      'On-premise or cloud',
      'Custom training',
    ],
    cta: 'Get Enterprise Quote',
    popular: false,
  },
];

interface PricingCardProps {
  plan: typeof plans[0];
  isAnnual: boolean;
  index: number;
}

function PricingCard({ plan, isAnnual, index }: PricingCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };

  const spotlightX = useSpring(mouseX, { stiffness: 500, damping: 50 });
  const spotlightY = useSpring(mouseY, { stiffness: 500, damping: 50 });

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ y: -8 }}
      onMouseMove={handleMouseMove}
      className={`relative flex flex-col p-6 rounded-2xl border overflow-hidden ${
        plan.popular
          ? 'border-primary bg-card shadow-lg shadow-primary/10'
          : 'border-border bg-card'
      }`}
    >
      {/* Spotlight effect */}
      <motion.div
        className="absolute inset-0 pointer-events-none opacity-0 hover:opacity-100 transition-opacity"
        style={{
          background: `radial-gradient(200px circle at ${spotlightX}px ${spotlightY}px, hsl(var(--primary) / 0.15), transparent 80%)`,
        }}
      />

      {plan.popular && (
        <motion.div
          className="absolute -top-3 left-1/2 -translate-x-1/2"
          animate={{
            backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'linear',
          }}
        >
          <Badge 
            className="bg-gradient-to-r from-primary via-info to-primary bg-[length:200%_100%] text-primary-foreground border-0"
          >
            MOST POPULAR
          </Badge>
        </motion.div>
      )}

      <div className="flex items-center gap-3 mb-4">
        <motion.div 
          className={`flex items-center justify-center w-10 h-10 rounded-lg ${
            plan.popular ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'
          }`}
          whileHover={{ rotate: 360 }}
          transition={{ duration: 0.5 }}
        >
          <plan.icon className="w-5 h-5" />
        </motion.div>
        <div>
          <h3 className="font-bold text-lg">{plan.name}</h3>
          <p className="text-sm text-muted-foreground">{plan.description}</p>
        </div>
      </div>

      <div className="mb-6">
        {plan.monthlyPrice ? (
          <>
            <div className="flex items-baseline gap-1">
              <motion.span 
                key={isAnnual ? 'annual' : 'monthly'}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl font-bold"
              >
                ₹{isAnnual ? plan.annualPrice?.toLocaleString() : plan.monthlyPrice.toLocaleString()}
              </motion.span>
              <span className="text-muted-foreground">/month</span>
            </div>
            {isAnnual && (
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-success mt-1"
              >
                Save ₹{((plan.monthlyPrice - plan.annualPrice!) * 12).toLocaleString()}/year
              </motion.p>
            )}
          </>
        ) : (
          <div className="text-4xl font-bold">Custom</div>
        )}
      </div>

      <ul className="space-y-3 mb-8 flex-1">
        {plan.features.map((feature, featureIndex) => (
          <motion.li 
            key={feature} 
            className="flex items-start gap-2"
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 + featureIndex * 0.05 }}
          >
            <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
            <span className="text-sm">{feature}</span>
          </motion.li>
        ))}
      </ul>

      <Button
        variant={plan.popular ? 'hero' : 'outline'}
        className="w-full group"
        asChild
      >
        {plan.id === 'enterprise' ? (
          <a href="#contact">
            <Phone className="w-4 h-4 mr-2" />
            {plan.cta}
          </a>
        ) : (
          <Link to="/hospital/signup">
            {plan.cta}
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Link>
        )}
      </Button>
    </motion.div>
  );
}

export function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <section id="pricing" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Badge variant="secondary" className="mb-4">Pricing</Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Simple, Transparent Pricing for Hospitals of All Sizes
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            No hidden fees. No long-term contracts. Scale as you grow.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4">
            <Label htmlFor="billing-toggle" className={!isAnnual ? 'font-semibold' : 'text-muted-foreground'}>
              Monthly
            </Label>
            <Switch
              id="billing-toggle"
              checked={isAnnual}
              onCheckedChange={setIsAnnual}
            />
            <Label htmlFor="billing-toggle" className={isAnnual ? 'font-semibold' : 'text-muted-foreground'}>
              Annual
              <Badge variant="secondary" className="ml-2 text-xs">Save 20%</Badge>
            </Label>
          </div>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <PricingCard key={plan.id} plan={plan} isAnnual={isAnnual} index={index} />
          ))}
        </div>

        {/* Trust Indicators */}
        <motion.div 
          className="text-center mt-12 text-sm text-muted-foreground"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
        >
          <p>No credit card required • Setup in minutes • Full feature access during trial</p>
        </motion.div>
      </div>
    </section>
  );
}
