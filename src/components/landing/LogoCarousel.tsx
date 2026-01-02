import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Shield, Award, CheckCircle2, Server } from 'lucide-react';

const hospitals = [
  'Apollo Hospitals',
  'Max Healthcare',
  'Fortis',
  'Manipal Hospitals',
  'Medanta',
  'AIIMS',
  'Narayana Health',
  'Columbia Asia',
  'Aster DM',
  'Cloudnine',
];

const certifications = [
  { name: 'ISO 27001', icon: Shield },
  { name: 'HIPAA Ready', icon: CheckCircle2 },
  { name: 'NABH', icon: Award },
  { name: 'SOC 2 Type II', icon: Server },
];

export function LogoCarousel() {
  return (
    <section className="py-16 bg-muted/30 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <Badge variant="secondary" className="mb-4">Trusted Partners</Badge>
          <h2 className="text-2xl md:text-3xl font-bold mb-3">
            Trusted by Leading Hospitals and Diagnostic Centers
          </h2>
          <p className="text-muted-foreground">
            500+ healthcare facilities managing 100,000+ daily patient interactions
          </p>
        </div>

        {/* Scrolling Logos */}
        <div className="relative">
          {/* Fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-muted/30 to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-muted/30 to-transparent z-10 pointer-events-none" />

          <div className="overflow-hidden">
            <motion.div
              className="flex gap-12 items-center"
              animate={{ x: [0, -1200] }}
              transition={{
                x: {
                  repeat: Infinity,
                  repeatType: 'loop',
                  duration: 25,
                  ease: 'linear',
                },
              }}
            >
              {[...hospitals, ...hospitals].map((hospital, index) => (
                <div
                  key={`${hospital}-${index}`}
                  className="flex items-center justify-center min-w-[180px] h-16 px-6 py-3 rounded-lg bg-card border border-border grayscale hover:grayscale-0 transition-all duration-300"
                >
                  <span className="text-lg font-semibold text-muted-foreground whitespace-nowrap">
                    {hospital}
                  </span>
                </div>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Certification Badges */}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-12">
          {certifications.map((cert) => (
            <div
              key={cert.name}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border"
            >
              <cert.icon className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">{cert.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
