import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Shield,
  CheckCircle2,
  Award,
  Server,
  Globe,
  Lock,
  Clock,
} from 'lucide-react';

const faqCategories = [
  {
    category: 'Product & Features',
    questions: [
      {
        q: 'What modules are included in the platform?',
        a: 'Our platform includes comprehensive modules for OPD/IPD management, appointment scheduling, electronic medical records, pharmacy integration, laboratory management, billing and revenue cycle, telemedicine, and advanced analytics dashboards.',
      },
      {
        q: 'Can we customize workflows for our hospital\'s specific processes?',
        a: 'Yes, our platform is highly configurable. You can customize consultation workflows, approval processes, notification rules, and form templates to match your existing processes. Our implementation team will work with you to configure everything.',
      },
      {
        q: 'Does it work with our existing EMR or HIS system?',
        a: 'We offer integration capabilities with most major EMR/HIS systems through our API. We also support HL7 FHIR standards for healthcare data exchange. Contact our team for specific integration requirements.',
      },
    ],
  },
  {
    category: 'Security & Compliance',
    questions: [
      {
        q: 'Where is patient data stored? Is it compliant with Indian regulations?',
        a: 'All patient data is stored in secure, SOC 2 certified data centers located in India, ensuring compliance with Indian data localization requirements. We follow all DPDP Act guidelines and healthcare data protection standards.',
      },
      {
        q: 'How is patient data encrypted and protected?',
        a: 'We use AES-256 encryption for data at rest and TLS 1.3 for data in transit. All access is controlled through role-based permissions, and every action is logged in immutable audit trails.',
      },
      {
        q: 'What happens in case of system downtime or disaster?',
        a: 'We maintain a 99.9% uptime SLA with automatic failover to redundant systems. Daily encrypted backups are stored in geographically separate locations with point-in-time recovery capability.',
      },
    ],
  },
  {
    category: 'Implementation & Integration',
    questions: [
      {
        q: 'How long does implementation typically take?',
        a: 'For a standard hospital setup, implementation takes 4-8 weeks. This includes data migration, staff training, and go-live support. Enterprise implementations with custom integrations may take 8-12 weeks.',
      },
      {
        q: 'What if we need to migrate data from our old system?',
        a: 'We have an experienced data migration team that has handled migrations from all major legacy systems. We ensure data integrity through validation checks and parallel running before cutover.',
      },
    ],
  },
  {
    category: 'Support',
    questions: [
      {
        q: 'What training and support do you provide?',
        a: 'We provide comprehensive training including on-site sessions, video tutorials, and documentation. Post go-live, you get access to our support portal, knowledge base, and dedicated support based on your plan.',
      },
      {
        q: 'What if we encounter technical issues?',
        a: 'Hospital and Enterprise plans include priority support with response times under 4 hours for critical issues. We also provide 24/7 emergency support for system-down situations.',
      },
    ],
  },
];

const certifications = [
  { name: 'ISO 27001', icon: Shield },
  { name: 'SOC 2 Type II', icon: Server },
  { name: 'HIPAA Ready', icon: CheckCircle2 },
  { name: 'NABH Compatible', icon: Award },
  { name: 'GDPR Compliant', icon: Globe },
  { name: 'Data Residency India', icon: Lock },
  { name: '99.9% Uptime SLA', icon: Clock },
];

export function FAQSection() {
  return (
    <section id="faq" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4">FAQ</Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Have questions about our hospital management platform?
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          {faqCategories.map((category, categoryIndex) => (
            <div key={category.category} className="mb-8">
              <h3 className="text-lg font-semibold mb-4 text-primary">
                {category.category}
              </h3>
              <Accordion type="single" collapsible className="space-y-2">
                {category.questions.map((item, index) => (
                  <AccordionItem
                    key={index}
                    value={`${categoryIndex}-${index}`}
                    className="bg-card border border-border rounded-lg px-4"
                  >
                    <AccordionTrigger className="hover:no-underline text-left">
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}

          {/* Security Certifications Box */}
          <div className="mt-12 p-6 rounded-2xl bg-card border border-border">
            <h3 className="text-lg font-semibold mb-4 text-center">
              Security & Compliance Certifications
            </h3>
            <div className="flex flex-wrap items-center justify-center gap-4">
              {certifications.map((cert) => (
                <div
                  key={cert.name}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted"
                >
                  <cert.icon className="w-4 h-4 text-success" />
                  <span className="text-sm font-medium">{cert.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
