import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users,
  Bed,
  Scissors,
  Pill,
  Settings,
  ArrowRight,
  Zap,
} from 'lucide-react';

const workflows = [
  {
    id: 'outpatient',
    label: 'Outpatient',
    icon: Users,
    title: 'Seamless Patient Consultation Flow',
    highlight: '60% faster patient processing',
    steps: [
      { number: 1, title: 'Registration', description: 'Quick patient check-in with smart queue management' },
      { number: 2, title: 'Consultation', description: 'Doctor reviews history and examines patient' },
      { number: 3, title: 'Prescription', description: 'Digital prescriptions with drug interaction checks' },
      { number: 4, title: 'Billing', description: 'Automated billing with insurance integration' },
    ],
  },
  {
    id: 'inpatient',
    label: 'Inpatient',
    icon: Bed,
    title: 'Unified Ward Management',
    highlight: '40% improvement in care coordination',
    steps: [
      { number: 1, title: 'Admission', description: 'Bed allocation and admission documentation' },
      { number: 2, title: 'Ward Notes', description: 'Daily rounds and progress documentation' },
      { number: 3, title: 'Medication', description: 'Medication tracking and administration logs' },
      { number: 4, title: 'Discharge', description: 'Discharge summary and follow-up scheduling' },
    ],
  },
  {
    id: 'ot',
    label: 'OT & Procedures',
    icon: Scissors,
    title: 'Surgical Theatre Management',
    highlight: 'Reduce scheduling conflicts by 90%',
    steps: [
      { number: 1, title: 'Consent', description: 'Digital consent forms and pre-op checklists' },
      { number: 2, title: 'Scheduling', description: 'OT calendar with resource allocation' },
      { number: 3, title: 'OR Notes', description: 'Operative notes and procedure documentation' },
      { number: 4, title: 'Post-Op', description: 'Post-operative care and recovery monitoring' },
    ],
  },
  {
    id: 'pharmacy',
    label: 'Pharmacy/Lab',
    icon: Pill,
    title: 'Integrated Lab and Pharmacy',
    highlight: 'Zero manual test order errors',
    steps: [
      { number: 1, title: 'Test Orders', description: 'Electronic lab orders from consultation' },
      { number: 2, title: 'Results', description: 'Automated result entry and alerts' },
      { number: 3, title: 'Inventory', description: 'Real-time stock tracking and reordering' },
      { number: 4, title: 'Drug Check', description: 'Automatic drug interaction verification' },
    ],
  },
  {
    id: 'admin',
    label: 'Admin',
    icon: Settings,
    title: 'Hospital-wide Administration',
    highlight: '100% HIPAA audit compliance',
    steps: [
      { number: 1, title: 'User Management', description: 'Role-based access control and permissions' },
      { number: 2, title: 'Dashboards', description: 'Financial and operational analytics' },
      { number: 3, title: 'Audit Logs', description: 'Complete activity tracking and reporting' },
      { number: 4, title: 'Configuration', description: 'System settings and customization' },
    ],
  },
];

export function WorkflowTabs() {
  const [activeTab, setActiveTab] = useState('outpatient');
  const activeWorkflow = workflows.find((w) => w.id === activeTab) || workflows[0];

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4">Workflows</Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            End-to-End Clinical Workflows
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Streamlined processes for every department, designed by healthcare professionals
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-3xl mx-auto grid-cols-5 mb-12 h-auto p-1">
            {workflows.map((workflow) => (
              <TabsTrigger
                key={workflow.id}
                value={workflow.id}
                className="flex flex-col gap-1 py-3 px-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <workflow.icon className="w-5 h-5" />
                <span className="text-xs font-medium hidden sm:block">{workflow.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="grid lg:grid-cols-2 gap-12 items-center"
            >
              {/* Left - Content */}
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary">
                    <activeWorkflow.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">{activeWorkflow.title}</h3>
                    <Badge variant="secondary" className="mt-1">
                      <Zap className="w-3 h-3 mr-1" />
                      {activeWorkflow.highlight}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-4">
                  {activeWorkflow.steps.map((step, index) => (
                    <motion.div
                      key={step.number}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-start gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary/20 transition-colors"
                    >
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">
                        {step.number}
                      </div>
                      <div>
                        <h4 className="font-semibold mb-1">{step.title}</h4>
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Right - Screenshot Placeholder */}
              <div className="relative">
                <div className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-primary/10 to-info/10 border border-border overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <activeWorkflow.icon className="w-16 h-16 text-primary/30 mx-auto mb-4" />
                      <p className="text-muted-foreground text-sm">
                        {activeWorkflow.label} Workflow Screenshot
                      </p>
                    </div>
                  </div>
                  {/* Decorative elements */}
                  <div className="absolute top-4 left-4 right-4 h-8 rounded bg-muted/50 flex items-center gap-2 px-3">
                    <div className="w-3 h-3 rounded-full bg-destructive/50" />
                    <div className="w-3 h-3 rounded-full bg-warning/50" />
                    <div className="w-3 h-3 rounded-full bg-success/50" />
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </Tabs>
      </div>
    </section>
  );
}
