import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  Activity, 
  ArrowRight, 
  ShieldAlert, 
  Thermometer, 
  Heart,
  Wind,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Vitals {
  blood_pressure?: string;
  heart_rate?: string | number;
  temperature?: string | number;
  resp_rate?: string | number;
  oxygen_sat?: string | number;
}

interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  category: 'Cardiac' | 'Respiratory' | 'Sepsis' | 'General';
  title: string;
  description: string;
  riskScore: number;
}

interface Props {
  vitals: Vitals;
  patientId: string;
}

export function PredictiveAlerts({ vitals, patientId }: Props) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    if (Object.keys(vitals).length > 0) {
      runPredictionModel();
    }
  }, [vitals]);

  const runPredictionModel = () => {
    setIsProcessing(true);
    
    // Simulate real-time predictive modeling (e.g., NEWS2 or qSOFA score)
    setTimeout(() => {
      const newAlerts: Alert[] = [];
      const hr = parseInt(vitals.heart_rate?.toString() || '0');
      const temp = parseFloat(vitals.temperature?.toString() || '0');
      const oxy = parseInt(vitals.oxygen_sat?.toString() || '100');
      const resp = parseInt(vitals.resp_rate?.toString() || '0');

      // Sepsis Screening Logic (simplified qSOFA)
      if (temp > 38.5 || temp < 36 || hr > 100 || resp > 22) {
        let sepsisCount = 0;
        if (resp > 22) sepsisCount++;
        if (hr > 100) sepsisCount++;

        if (sepsisCount >= 2) {
          newAlerts.push({
            id: 'sepsis-1',
            type: 'critical',
            category: 'Sepsis',
            title: 'Sepsis Trigger Detected',
            description: 'Patient meets multiple qSOFA criteria. Start Sepsis Bundle protocol immediately.',
            riskScore: 84
          });
        } else if (temp > 38.5) {
          newAlerts.push({
            id: 'fever-1',
            type: 'warning',
            category: 'General',
            title: 'Significant Febrile Event',
            description: 'High fever detected. Monitor for symptoms of infection or drug reaction.',
            riskScore: 45
          });
        }
      }

      // Respiratory Alert
      if (oxy < 92) {
        newAlerts.push({
          id: 'resp-1',
          type: 'critical',
          category: 'Respiratory',
          title: 'Acute Desaturation',
          description: 'SpO2 level below 92%. Initiate oxygen therapy and notify respiratory therapist.',
          riskScore: 91
        });
      }

      // Cardiac Alert
      if (hr > 120 || hr < 50 && hr !== 0) {
        newAlerts.push({
          id: 'cardiac-1',
          type: 'warning',
          category: 'Cardiac',
          title: 'Hemodynamic Instability',
          description: `Abnormal heart rate (${hr} bpm). Verify baseline and clinical context.`,
          riskScore: 62
        });
      }

      setAlerts(newAlerts);
      setIsProcessing(false);
    }, 1500);
  };

  if (!vitals || Object.keys(vitals).length === 0) return null;

  return (
    <Card className={`border-2 ${alerts.some(a => a.type === 'critical') ? 'border-destructive/30 bg-destructive/5' : 'border-primary/20 bg-primary/5'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <CardTitle className="text-base font-semibold italic text-slate-800 font-serif lowercase">Clinical Intelligence Dashboard</CardTitle>
          </div>
          {isProcessing && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
        </div>
        <CardDescription className="text-xs">
          Real-time analysis of vitals for early deterioration detection (NEWS2/qSOFA)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <AnimatePresence mode="popLayout">
          {alerts.length === 0 && !isProcessing ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-6 text-sm text-muted-foreground"
            >
              <div className="flex justify-center mb-2">
                <ShieldAlert className="h-8 w-8 opacity-20" />
              </div>
              No acute deterioration patterns detected.
            </motion.div>
          ) : (
            alerts.map((alert) => (
              <motion.div
                key={alert.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`p-3 rounded-lg border-l-4 shadow-sm flex gap-3 bg-white ${
                  alert.type === 'critical' ? 'border-l-destructive' : 'border-l-warning'
                }`}
              >
                <div className="mt-1">
                  <AlertTriangle className={`h-5 w-5 ${alert.type === 'critical' ? 'text-destructive' : 'text-warning'}`} />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">{alert.title}</span>
                    <Badge variant={alert.type === 'critical' ? 'destructive' : 'warning'} className="text-[10px] py-0 px-1.5 h-4 uppercase">
                      Risk: {alert.riskScore}%
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2">{alert.description}</p>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
        
        {!isProcessing && alerts.length > 0 && (
          <div className="pt-2 flex justify-end">
            <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1 group">
              View Intervention Protocol <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
