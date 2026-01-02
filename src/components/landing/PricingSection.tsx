import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
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

export function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <section id="pricing" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
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
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={`relative flex flex-col p-6 rounded-2xl border ${
                plan.popular
                  ? 'border-primary bg-card shadow-lg shadow-primary/10'
                  : 'border-border bg-card'
              }`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                  MOST POPULAR
                </Badge>
              )}

              <div className="flex items-center gap-3 mb-4">
                <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${
                  plan.popular ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'
                }`}>
                  <plan.icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                </div>
              </div>

              <div className="mb-6">
                {plan.monthlyPrice ? (
                  <>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold">
                        ₹{isAnnual ? plan.annualPrice?.toLocaleString() : plan.monthlyPrice.toLocaleString()}
                      </span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                    {isAnnual && (
                      <p className="text-sm text-success mt-1">
                        Save ₹{((plan.monthlyPrice - plan.annualPrice!) * 12).toLocaleString()}/year
                      </p>
                    )}
                  </>
                ) : (
                  <div className="text-4xl font-bold">Custom</div>
                )}
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                variant={plan.popular ? 'hero' : 'outline'}
                className="w-full"
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
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                )}
              </Button>
            </motion.div>
          ))}
        </div>

        {/* Trust Indicators */}
        <div className="text-center mt-12 text-sm text-muted-foreground">
          <p>No credit card required • Setup in minutes • Full feature access during trial</p>
        </div>
      </div>
    </section>
  );
}
