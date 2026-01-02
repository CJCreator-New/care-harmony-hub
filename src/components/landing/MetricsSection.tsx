import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import {
  Clock,
  Shield,
  Zap,
  TrendingUp,
  Building2,
  Bot,
} from 'lucide-react';

const metrics = [
  {
    value: 40,
    suffix: '%',
    label: 'Faster Billing Turnaround',
    description: 'Reduce days in AR from 60 to 36 days',
    icon: Clock,
  },
  {
    value: 99.9,
    suffix: '%',
    label: 'Guaranteed Availability',
    description: 'Cloud-based redundancy and failover',
    icon: Shield,
  },
  {
    value: 2.5,
    suffix: 'x',
    label: 'Faster Patient Onboarding',
    description: 'From 20 mins to 8 mins per patient',
    icon: Zap,
  },
  {
    value: 2.3,
    prefix: '₹',
    suffix: ' Cr',
    label: 'Annual Revenue Recovered',
    description: 'Through reduced billing errors',
    icon: TrendingUp,
  },
  {
    value: 500,
    suffix: '+',
    label: 'Healthcare Providers',
    description: 'Including leading multi-specialty chains',
    icon: Building2,
  },
  {
    value: 85,
    suffix: '%',
    label: 'Manual Tasks Eliminated',
    description: 'Focus on patient care, not paperwork',
    icon: Bot,
  },
];

function AnimatedCounter({ 
  value, 
  prefix = '', 
  suffix = '', 
  inView 
}: { 
  value: number; 
  prefix?: string; 
  suffix?: string; 
  inView: boolean;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;

    const duration = 2000;
    const steps = 60;
    const stepValue = value / steps;
    const stepDuration = duration / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += stepValue;
      if (current >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(current);
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [value, inView]);

  const displayValue = value % 1 === 0 ? Math.round(count) : count.toFixed(1);

  return (
    <span>
      {prefix}{displayValue}{suffix}
    </span>
  );
}

export function MetricsSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section ref={ref} className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4">Results</Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Measurable Outcomes for Your Hospital
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Real results from healthcare facilities using our platform
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {metrics.map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className="group p-6 rounded-xl bg-card border border-border hover:border-primary/20 hover:shadow-lg transition-all duration-300"
            >
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                  <metric.icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="text-3xl md:text-4xl font-bold text-primary mb-1">
                    <AnimatedCounter
                      value={metric.value}
                      prefix={metric.prefix}
                      suffix={metric.suffix}
                      inView={isInView}
                    />
                  </div>
                  <h3 className="font-semibold mb-1">{metric.label}</h3>
                  <p className="text-sm text-muted-foreground">{metric.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
