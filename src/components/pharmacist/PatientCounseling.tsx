import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  ClipboardCheck, 
  MessageSquare, 
  AlertTriangle, 
  Pill, 
  Save, 
  History,
  CheckCircle2,
  ThumbsUp
} from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  patientId: string;
  patientName?: string;
  prescriptionId?: string;
  medicationName?: string;
}

interface CounselingPoint {
  id: string;
  label: string;
  description: string;
}

const STANDARD_COUNSELING_POINTS: CounselingPoint[] = [
  { id: 'dosage', label: 'Dosage & Administration', description: 'Explained how and when to take the medication' },
  { id: 'side_effects', label: 'Side Effects', description: 'Discussed common side effects and when to seek help' },
  { id: 'adherence', label: 'Adherence Importance', description: 'Emphasized importance of completing the full course' },
  { id: 'storage', label: 'Storage Instructions', description: 'Proper storage (e.g., fridge, room temp, away from light)' },
  { id: 'interactions', label: 'Food/Drug Interactions', description: 'Warned about alcohol, grapefruit, or other drugs' },
  { id: 'missed_dose', label: 'Missed Dose Protocol', description: 'What to do if a dose is missed' },
];

export function PatientCounseling({ patientId, patientName, prescriptionId, medicationName }: Props) {
  const [selectedPoints, setSelectedPoints] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [patientUnderstanding, setPatientUnderstanding] = useState<'poor' | 'fair' | 'good' | 'excellent'>('good');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const togglePoint = (id: string) => {
    setSelectedPoints(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (selectedPoints.length === 0 && !notes.trim()) {
      toast.error("Please record at least one counseling point or add notes.");
      return;
    }

    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      toast.success("Counseling session recorded successfully");
      // Reset form
      setSelectedPoints([]);
      setNotes('');
    }, 1500);
  };

  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Patient Counseling</CardTitle>
              <CardDescription>
                Document medication counseling for {patientName || 'Patient'}
                {medicationName && <span className="block font-medium text-foreground mt-1">Ref: {medicationName}</span>}
              </CardDescription>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowHistory(!showHistory)}
            className="gap-2"
          >
            <History className="h-4 w-4" />
            {showHistory ? 'New Session' : 'History'}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1">
        {showHistory ? (
           <ScrollArea className="h-[400px] pr-4">
             <div className="space-y-4">
               {[1, 2, 3].map((i) => (
                 <div key={i} className="border rounded-lg p-3 space-y-2">
                   <div className="flex justify-between items-center bg-secondary/20 -mx-3 -mt-3 p-3 rounded-t-lg mb-2">
                     <span className="font-medium text-sm">Oct {20 + i}, 2023</span>
                     <Badge variant="outline" className="bg-background">Amoxicillin 500mg</Badge>
                   </div>
                   <div className="space-y-1">
                     <div className="text-xs text-muted-foreground font-medium uppercase">Covered:</div>
                     <div className="flex flex-wrap gap-1">
                       {['Dosage', 'Side Effects'].map(tag => (
                         <Badge key={tag} variant="secondary" className="text-xs font-normal">{tag}</Badge>
                       ))}
                     </div>
                   </div>
                   <div className="space-y-1">
                     <div className="text-xs text-muted-foreground font-medium uppercase">Notes:</div>
                     <p className="text-sm">Patient understood instructions clearly. Concerned about nausea.</p>
                   </div>
                   <div className="flex items-center gap-2 text-xs text-green-600 mt-2">
                     <CheckCircle2 className="h-3 w-3" /> Understanding: Excellent
                   </div>
                 </div>
               ))}
             </div>
           </ScrollArea>
        ) : (
          <div className="space-y-6">
            <div className="space-y-3">
              <Label className="text-base font-semibold flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4" />
                Standard Counseling Points
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {STANDARD_COUNSELING_POINTS.map((point) => (
                  <div 
                    key={point.id}
                    className={`
                      flex items-start space-x-3 border rounded-md p-3 transition-colors cursor-pointer
                      ${selectedPoints.includes(point.id) ? 'bg-primary/5 border-primary/40' : 'hover:bg-muted/50'}
                    `}
                    onClick={() => togglePoint(point.id)}
                  >
                    <Checkbox 
                      id={point.id} 
                      checked={selectedPoints.includes(point.id)}
                      onCheckedChange={() => togglePoint(point.id)}
                    />
                    <div className="leading-none">
                      <label
                        htmlFor={point.id}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {point.label}
                      </label>
                      <p className="text-xs text-muted-foreground mt-1">
                        {point.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="notes" className="text-base font-semibold">Additional Notes</Label>
              <Textarea 
                id="notes" 
                placeholder="Specific questions asked, barriers to adherence, etc."
                className="min-h-[100px]"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="space-y-3">
              <Label className="text-base font-semibold">Patient Understanding</Label>
              <div className="flex gap-2">
                {['poor', 'fair', 'good', 'excellent'].map((rating) => (
                  <Button
                    key={rating}
                    variant={patientUnderstanding === rating ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPatientUnderstanding(rating as any)}
                    className="capitalize flex-1"
                  >
                    {rating === 'excellent' && <ThumbsUp className="h-3 w-3 mr-2" />}
                    {rating}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>

      {!showHistory && (
        <CardFooter className="border-t pt-4">
          <Button 
            className="w-full gap-2" 
            onClick={handleSave} 
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Save className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isSubmitting ? 'Recording Session...' : 'Save Counseling Session'}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
