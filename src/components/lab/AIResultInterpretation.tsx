import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  BrainCircuit, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp,
  TrendingDown,
  Info,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LabResult {
  test_name: string;
  value: string | number;
  unit?: string;
  reference_range?: string;
}

interface Interpretation {
  id: string;
  type: 'normal' | 'abnormal' | 'critical' | 'insight';
  title: string;
  description: string;
  confidence: number;
}

interface Props {
  results: LabResult[];
  patientAge?: number;
  patientGender?: string;
  isLoading?: boolean;
}

export function AIResultInterpretation({ results, patientAge, patientGender, isLoading: parentLoading }: Props) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [interpretations, setInterpretations] = useState<Interpretation[]>([]);

  useEffect(() => {
    if (results.length > 0) {
      analyzeResults();
    } else {
      setInterpretations([]);
    }
  }, [results]);

  const analyzeResults = () => {
    setIsAnalyzing(true);
    
    // Simulate AI analysis logic
    // In production, this would call a Supabase Edge Function using a model like Med-PaLM or GPT-4o
    setTimeout(() => {
      const insights: Interpretation[] = [];
      
      results.forEach((res, index) => {
        const val = parseFloat(res.value.toString());
        const name = res.test_name.toLowerCase();

        if (name.includes('potassium')) {
          if (val > 5.5) {
            insights.push({
              id: `k-${index}`,
              type: 'critical',
              title: 'Hyperkalemia Detected',
              description: `Potassium level of ${val} is critically high. Risk of cardiac arrhythmia. Immediate clinical review required.`,
              confidence: 0.99
            });
          } else if (val < 3.5) {
            insights.push({
              id: `k-${index}`,
              type: 'abnormal',
              title: 'Hypokalemia Detected',
              description: `Potassium level of ${val} is below reference range. Consider electrolyte replacement.`,
              confidence: 0.95
            });
          }
        }

        if (name.includes('glucose') || name.includes('hba1c')) {
          if (name.includes('hba1c') && val > 6.5) {
            insights.push({
              id: `db-${index}`,
              type: 'abnormal',
              title: 'Elevated Glycemic Marker',
              description: `HbA1c of ${val}% is consistent with a diagnosis of Diabetes Mellitus. Correlation with fasting glucose recommended.`,
              confidence: 0.92
            });
          }
        }

        if (name.includes('wbc') || name.includes('white blood cell')) {
          if (val > 11000) {
            insights.push({
              id: `wbc-${index}`,
              type: 'insight',
              title: 'Leukocytosis Observed',
              description: 'Elevated WBC count may indicate acute infection, inflammation, or physiological stress.',
              confidence: 0.88
            });
          }
        }
      });

      // General health insight if everything is normal
      if (insights.length === 0 && results.length > 0) {
        insights.push({
          id: 'gen-1',
          type: 'normal',
          title: 'WNL (Within Normal Limits)',
          description: 'All analyzed parameters appear to be within the standard physiological reference ranges for the provided demographic.',
          confidence: 0.94
        });
      }

      setInterpretations(insights);
      setIsAnalyzing(false);
    }, 1200);
  };

  const getTypeStyles = (type: Interpretation['type']) => {
    switch (type) {
      case 'critical': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'abnormal': return 'bg-warning/10 text-warning-foreground border-warning/20';
      case 'insight': return 'bg-primary/10 text-primary border-primary/20';
      case 'normal': return 'bg-success/10 text-success-foreground border-success/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getTypeIcon = (type: Interpretation['type']) => {
    switch (type) {
      case 'critical': return <AlertTriangle className="h-4 w-4" />;
      case 'abnormal': return <Info className="h-4 w-4" />;
      case 'insight': return <BrainCircuit className="h-4 w-4" />;
      case 'normal': return <CheckCircle2 className="h-4 w-4" />;
    }
  };

  if (results.length === 0 && !parentLoading) return null;

  return (
    <Card className="bg-slate-50/50 border-dashed border-2">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-500" />
            <CardTitle className="text-sm font-medium">AI Result Interpretation</CardTitle>
          </div>
          {(isAnalyzing || parentLoading) && <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <AnimatePresence mode="wait">
          {isAnalyzing || parentLoading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-8 text-center text-sm text-muted-foreground"
            >
              Analyzing biochemical data points...
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              {interpretations.map((insight) => (
                <div 
                  key={insight.id}
                  className={`p-3 rounded-lg border flex gap-3 ${getTypeStyles(insight.type)}`}
                >
                  <div className="mt-0.5">{getTypeIcon(insight.type)}</div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{insight.title}</span>
                      <Badge variant="outline" className="text-[10px] h-4 bg-white/50">
                        {Math.round(insight.confidence * 100)}% Match
                      </Badge>
                    </div>
                    <p className="text-xs leading-relaxed opacity-90">{insight.description}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        
        {!isAnalyzing && !parentLoading && interpretations.length > 0 && (
          <div className="pt-2 flex justify-end">
            <Button variant="ghost" size="sm" className="text-[11px] h-7 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">
              Generate Formal Report Summary
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
