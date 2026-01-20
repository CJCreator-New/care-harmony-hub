import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Mic, MicOff, FileText } from 'lucide-react';
import { voiceNLPService } from '@/services/voiceNLPService';

export const VoiceDocumentation = ({ onSave }: { onSave: (note: string) => void }) => {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [note, setNote] = useState('');

  const toggleRecording = async () => {
    if (!recording) {
      setRecording(true);
      setTimeout(() => {
        setTranscript('Patient presents with chest pain and shortness of breath');
        setRecording(false);
      }, 2000);
    } else {
      setRecording(false);
    }
  };

  const generateNote = async () => {
    const clinicalNote = await voiceNLPService.generateClinicalNote(transcript);
    setNote(clinicalNote);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="h-5 w-5" />
          Voice Documentation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={toggleRecording} 
          variant={recording ? 'destructive' : 'default'}
          className="w-full"
        >
          {recording ? <><MicOff className="h-4 w-4 mr-2" /> Stop Recording</> : <><Mic className="h-4 w-4 mr-2" /> Start Recording</>}
        </Button>

        {transcript && (
          <>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm">{transcript}</p>
            </div>
            <Button onClick={generateNote} variant="outline" className="w-full">
              <FileText className="h-4 w-4 mr-2" />
              Generate Clinical Note
            </Button>
          </>
        )}

        {note && (
          <>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={10} />
            <Button onClick={() => onSave(note)} className="w-full">
              Save Note
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};
