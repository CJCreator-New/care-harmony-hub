import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  Search, 
  BrainCircuit,
  Lightbulb,
  Stethoscope,
  Pill,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  formData: Record<string, any>;
  onApplyRecommendation: (type: string, value: any) => void;
}

export function AIConsultationAssistant({ formData, onApplyRecommendation }: Props) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recommendations, setRecommendations] = useState<any[]>([]);

  // Simulation: Trigger AI analysis when symptoms or chief complaint changes
  useEffect(() => {
    if (!formData.chief_complaint && (!formData.symptoms || formData.symptoms.length === 0)) {
      setRecommendations([]);
      return;
    }

    const timer = setTimeout(() => {
      analyzeConsultation();
    }, 1500);

    return () => clearTimeout(timer);
  }, [formData.chief_complaint, formData.symptoms]);

  const analyzeConsultation = () => {
    setIsAnalyzing(true);
    
    // Simulate API call to Edge Function for AI analysis
    setTimeout(() => {
      const mockRecs = [];
      
      const text = (formData.chief_complaint || '').toLowerCase();
      
      if (text.includes('fever') || text.includes('headache')) {
        mockRecs.push({
          id: '1',
          type: 'diagnosis',
          title: 'Potential Diagnosis',
          value: 'Common Cold (J00)',
          confidence: 0.85,
          description: 'Based on reported symptoms of fever and headache.',
          action: 'Add to Diagnosis'
        });
      }

      if (text.includes('cough') || text.includes('chest')) {
        mockRecs.push({
          id: '2',
          type: 'lab',
          title: 'Recommended Lab',
          value: 'Chest X-Ray',
          confidence: 0.92,
          description: 'To rule out pneumonia or bronchitis given the respiratory symptoms.',
          action: 'Order Lab'
        });
      }

      // Drug interaction mock
      if (formData.prescriptions?.some((p: any) => p.medication_name.toLowerCase().includes('aspirin'))) {
        mockRecs.push({
          id: '3',
          type: 'alert',
          title: 'Drug Interaction Alert',
          value: 'Aspirin + Anticoagulants',
          confidence: 1.0,
          description: 'Increased risk of bleeding. Verify if patient is on Warfarin/Heparin.',
          severity: 'high'
        });
      }

      setRecommendations(mockRecs);
      setIsAnalyzing(false);
    }, 1000);
  };

  return (
    <Card className="border-primary/20 bg-primary/5 shadow-sm overflow-hidden sticky top-24">
      <CardHeader className="pb-3 bg-primary/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            <CardTitle className="text-base">CareSync AI Assistant</CardTitle>
          </div>
          {isAnalyzing && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
        </div>
        <CardDescription className="text-xs">
          Real-time clinical decision support based on current assessment.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {recommendations.length === 0 && !isAnalyzing ? (
          <div className="text-center py-8">
            <BrainCircuit className="h-10 w-10 mx-auto text-muted-foreground opacity-20 mb-2" />
            <p className="text-xs text-muted-foreground">
              Waiting for clinical context... Mention symptoms or complaints to see AI suggestions.
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {recommendations.map((rec) => (
              <motion.div
                key={rec.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={`p-3 rounded-lg border text-xs ${
                  rec.type === 'alert' 
                    ? 'bg-red-50 border-red-200 text-red-800' 
                    : 'bg-white border-primary/20 shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {rec.type === 'diagnosis' && <Stethoscope className="h-3.5 w-3.5 text-blue-600" />}
                    {rec.type === 'lab' && <Search className="h-3.5 w-3.5 text-purple-600" />}
                    {rec.type === 'alert' && <AlertTriangle className="h-3.5 w-3.5 text-red-600" />}
                    <span className="font-bold uppercase tracking-wider text-[10px]">{rec.title}</span>
                  </div>
                  {rec.confidence && (
                    <Badge variant="outline" className="text-[9px] h-4 px-1">
                      {Math.round(rec.confidence * 100)}% Match
                    </Badge>
                  )}
                </div>
                
                <p className="font-semibold text-sm mb-1">{rec.value}</p>
                <p className="text-muted-foreground mb-3 leading-relaxed">{rec.description}</p>
                
                {rec.action && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full h-7 text-[10px] bg-primary/5 border-primary/20 hover:bg-primary/10"
                    onClick={() => onApplyRecommendation(rec.type, rec.value)}
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {rec.action}
                  </Button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        {recommendations.length > 0 && (
          <div className="pt-2 border-t border-primary/10">
            <div className="flex items-center gap-2 text-[10px] text-primary font-medium">
              <Lightbulb className="h-3 w-3" />
              <span>Pro Tip: AI suggestions are for guidance only. Verifying clinical judgment is required.</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
