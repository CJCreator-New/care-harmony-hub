import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useVoiceTranscription } from '@/hooks/useVoiceTranscription';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { supabase } from '@/integrations/supabase/client';
import { Mic, MicOff, Save, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface MobileConsultationProps {
  patientId: string;
  consultationId?: string;
}

export function MobileConsultation({ patientId, consultationId }: MobileConsultationProps) {
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { isSupported, isListening, transcript, startListening, stopListening, resetTranscript } = useVoiceTranscription();
  const { isOnline, pendingActionCount, queueAction } = useOfflineSync();

  const handleVoiceToggle = () => {
    if (isListening) {
      stopListening();
      setNotes(prev => prev + ' ' + transcript);
      resetTranscript();
    } else {
      startListening();
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const consultationData = {
        patient_id: patientId,
        consultation_id: consultationId,
        notes,
        timestamp: new Date().toISOString(),
      };

      if (isOnline) {
        const { error } = await supabase.from('consultations').insert(consultationData);
        if (error) throw error;
        toast.success('Consultation notes saved successfully');
      } else {
        queueAction('create', 'consultations', consultationData);
        toast.success('Consultation notes queued for sync');
      }
    } catch (error) {
      console.error('Error saving consultation:', error);
      toast.error('Failed to save consultation notes');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Status Bar */}
      <div className="flex items-center justify-between">
        <Badge variant={isOnline ? 'default' : 'secondary'}>
          {isOnline ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
          {isOnline ? 'Online' : 'Offline'}
        </Badge>
        {pendingActionCount > 0 && (
          <Badge variant="outline">
            {pendingActionCount} pending sync
          </Badge>
        )}
      </div>

      {/* Voice Input Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Consultation Notes</span>
            {isSupported && (
              <Button
                size="sm"
                variant={isListening ? 'destructive' : 'default'}
                onClick={handleVoiceToggle}
              >
                {isListening ? <MicOff className="h-4 w-4 mr-2" /> : <Mic className="h-4 w-4 mr-2" />}
                {isListening ? 'Stop' : 'Voice Input'}
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isListening && transcript && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Live transcription:</p>
              <p className="text-sm">{transcript}</p>
            </div>
          )}

          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Type or use voice input to add consultation notes..."
            rows={10}
            className="resize-none"
          />

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={isSaving || !notes.trim()} className="flex-1">
              {isSaving ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
              ) : (
                <><Save className="h-4 w-4 mr-2" /> Save Notes</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" onClick={() => setNotes(prev => prev + '\n\nChief Complaint: ')}>
              Chief Complaint
            </Button>
            <Button variant="outline" size="sm" onClick={() => setNotes(prev => prev + '\n\nHistory: ')}>
              History
            </Button>
            <Button variant="outline" size="sm" onClick={() => setNotes(prev => prev + '\n\nExamination: ')}>
              Examination
            </Button>
            <Button variant="outline" size="sm" onClick={() => setNotes(prev => prev + '\n\nDiagnosis: ')}>
              Diagnosis
            </Button>
            <Button variant="outline" size="sm" onClick={() => setNotes(prev => prev + '\n\nPlan: ')}>
              Plan
            </Button>
            <Button variant="outline" size="sm" onClick={() => setNotes(prev => prev + '\n\nFollow-up: ')}>
              Follow-up
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
