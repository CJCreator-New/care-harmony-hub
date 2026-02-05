import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Calendar, Activity, Clock, TrendingUp, Bell } from 'lucide-react';

export function HeroDashboardMockup() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: prefersReducedMotion ? 20 : 40, rotateX: prefersReducedMotion ? 0 : 10 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: prefersReducedMotion ? 0.3 : 0.8, delay: 0.3 }}
      className="relative perspective-1000"
    >
      {/* Browser Frame */}
      <div className="rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Browser Header */}
        <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 border-b border-border">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-destructive/60" />
            <div className="w-3 h-3 rounded-full bg-warning/60" />
            <div className="w-3 h-3 rounded-full bg-success/60" />
          </div>
          <div className="flex-1 mx-4">
            <div className="bg-background rounded-md px-3 py-1 text-xs text-muted-foreground text-center">
              app.caresync.health/dashboard
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="p-4 bg-background">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="h-3 w-32 bg-foreground/80 rounded mb-1" />
              <div className="h-2 w-24 bg-muted-foreground/40 rounded" />
            </div>
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"
              >
                <Bell className="w-4 h-4 text-primary" />
              </motion.div>
              <div className="w-8 h-8 rounded-full bg-primary/20" />
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            {[
              { icon: Users, value: '127', label: 'Patients', color: 'text-info' },
              { icon: Calendar, value: '34', label: 'Appointments', color: 'text-success' },
              { icon: Activity, value: '12', label: 'In Queue', color: 'text-warning' },
              { icon: Clock, value: '8m', label: 'Avg Wait', color: 'text-primary' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="p-3 rounded-lg bg-muted/30 border border-border/50"
              >
                <stat.icon className={`w-4 h-4 ${stat.color} mb-1`} />
                <div className="text-lg font-bold">{stat.value}</div>
                <div className="text-[10px] text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-3 gap-3">
            {/* Queue Panel */}
            <div className="col-span-2 p-3 rounded-lg bg-muted/30 border border-border/50">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-semibold">Patient Queue</div>
                <div className="text-[10px] text-success flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Live
                </div>
              </div>
              <div className="space-y-2">
                {[
                  { name: 'Amit Sharma', token: 'Q-001', status: 'In Progress', statusColor: 'bg-info' },
                  { name: 'Priya Patel', token: 'Q-002', status: 'Waiting', statusColor: 'bg-warning' },
                  { name: 'Rajesh Kumar', token: 'Q-003', status: 'Waiting', statusColor: 'bg-warning' },
                ].map((patient, i) => (
                  <motion.div
                    key={patient.token}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 + i * 0.1 }}
                    className="flex items-center justify-between p-2 rounded-md bg-background/50"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[8px] font-bold">
                        {patient.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <div className="text-[10px] font-medium">{patient.name}</div>
                        <div className="text-[8px] text-muted-foreground">{patient.token}</div>
                      </div>
                    </div>
                    <div className={`px-2 py-0.5 rounded text-[8px] text-white ${patient.statusColor}`}>
                      {patient.status}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Activity Panel */}
            <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
              <div className="text-xs font-semibold mb-3">Activity</div>
              <div className="space-y-2">
                {[
                  { text: 'Patient checked in', time: '2m ago' },
                  { text: 'Lab results ready', time: '5m ago' },
                  { text: 'Prescription sent', time: '12m ago' },
                ].map((activity, i) => (
                  <motion.div
                    key={`${activity.text}-${activity.time}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.9 + i * 0.1 }}
                    className="flex items-start gap-2"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
                    <div>
                      <div className="text-[10px]">{activity.text}</div>
                      <div className="text-[8px] text-muted-foreground">{activity.time}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating elements for depth */}
      {!prefersReducedMotion && (
        <>
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -top-4 -right-4 w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-info/20 border border-primary/20 backdrop-blur-sm"
            aria-hidden="true"
          />
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
            className="absolute -bottom-4 -left-4 w-12 h-12 rounded-lg bg-gradient-to-br from-success/20 to-primary/20 border border-success/20 backdrop-blur-sm"
            aria-hidden="true"
          />
        </>
      )}
      {prefersReducedMotion && (
        <>
          <div className="absolute -top-4 -right-4 w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-info/20 border border-primary/20 backdrop-blur-sm" aria-hidden="true" />
          <div className="absolute -bottom-4 -left-4 w-12 h-12 rounded-lg bg-gradient-to-br from-success/20 to-primary/20 border border-success/20 backdrop-blur-sm" aria-hidden="true" />
        </>
      )}
    </motion.div>
  );
}
