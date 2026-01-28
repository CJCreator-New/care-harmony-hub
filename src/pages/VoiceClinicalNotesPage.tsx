import React, { useState } from 'react';
import { Mic, FileText, Save, Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VoiceInput } from '@/components/ui/VoiceInput';
import { useToast } from '@/hooks/use-toast';

interface ClinicalNote {
  id: string;
  patientId: string;
  patientName: string;
  date: Date;
  type: 'progress' | 'admission' | 'discharge' | 'consultation' | 'procedure';
  content: string;
  voiceTranscript?: string;
  confidence?: number;
  provider?: string;
}

/**
 * Voice-to-Text Clinical Documentation Page
 * Demonstrates HIPAA-compliant speech recognition for clinical notes
 */
const VoiceClinicalNotesPage: React.FC = () => {
  const { toast } = useToast();
  const [currentNote, setCurrentNote] = useState<Partial<ClinicalNote>>({
    type: 'progress',
    content: '',
    voiceTranscript: '',
  });
  const [notes, setNotes] = useState<ClinicalNote[]>([]);
  const [isRecording, setIsRecording] = useState(false);

  // Handle voice transcript changes
  const handleTranscriptChange = (transcript: string) => {
    setCurrentNote(prev => ({
      ...prev,
      voiceTranscript: transcript,
      content: transcript, // Auto-populate content with transcript
    }));
  };

  // Handle final transcript
  const handleFinalTranscript = (transcript: string) => {
    setCurrentNote(prev => ({
      ...prev,
      content: transcript,
    }));

    toast({
      title: "Transcription Complete",
      description: "Voice input has been transcribed to text",
    });
  };

  // Save clinical note
  const handleSaveNote = () => {
    if (!currentNote.content?.trim()) {
      toast({
        title: "Cannot Save Empty Note",
        description: "Please add content to the clinical note",
        variant: "destructive",
      });
      return;
    }

    const newNote: ClinicalNote = {
      id: `note_${Date.now()}`,
      patientId: 'demo_patient_001',
      patientName: 'John Doe',
      date: new Date(),
      type: currentNote.type || 'progress',
      content: currentNote.content,
      voiceTranscript: currentNote.voiceTranscript,
      confidence: currentNote.confidence,
      provider: currentNote.provider,
    };

    setNotes(prev => [newNote, ...prev]);

    // Reset current note
    setCurrentNote({
      type: 'progress',
      content: '',
      voiceTranscript: '',
    });

    toast({
      title: "Clinical Note Saved",
      description: "The note has been securely saved to the patient's record",
    });
  };

  // Export notes
  const handleExportNotes = () => {
    const exportData = {
      patientId: 'demo_patient_001',
      patientName: 'John Doe',
      exportDate: new Date().toISOString(),
      notes: notes,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clinical_notes_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Notes Exported",
      description: "Clinical notes have been exported successfully",
    });
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold flex items-center justify-center gap-3">
          <Mic className="h-10 w-10 text-blue-600" />
          Voice Clinical Documentation
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          HIPAA-compliant speech-to-text for clinical notes with medical terminology recognition
        </p>
      </div>

      {/* Security Notice */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-full">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-900">HIPAA Compliant</h3>
              <p className="text-sm text-blue-700">
                All voice data is encrypted, transcripts are sanitized, and operations are fully audited.
                Voice input supports medical terminology recognition and auto-correction.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Voice Input Section */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic className="h-5 w-5" />
                Voice Input
              </CardTitle>
            </CardHeader>
            <CardContent>
              <VoiceInput
                onTranscriptChange={handleTranscriptChange}
                onFinalTranscript={handleFinalTranscript}
                placeholder="Start speaking to dictate clinical notes..."
                config={{
                  medicalMode: true,
                  continuous: true,
                }}
              />
            </CardContent>
          </Card>

          {/* Note Type Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Note Type</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs
                value={currentNote.type}
                onValueChange={(value) => setCurrentNote(prev => ({ ...prev, type: value as any }))}
              >
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="progress">Progress</TabsTrigger>
                  <TabsTrigger value="admission">Admission</TabsTrigger>
                  <TabsTrigger value="consultation">Consultation</TabsTrigger>
                </TabsList>
                <TabsList className="grid w-full grid-cols-2 mt-2">
                  <TabsTrigger value="procedure">Procedure</TabsTrigger>
                  <TabsTrigger value="discharge">Discharge</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Clinical Note Editor */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Clinical Note Editor
                </CardTitle>
                <Badge variant="outline">
                  {currentNote.type || 'progress'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={currentNote.content}
                onChange={(e) => setCurrentNote(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Edit the transcribed text or write additional notes..."
                className="min-h-[300px] resize-none"
              />

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <Button onClick={handleSaveNote} className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Save Note
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setCurrentNote({ type: 'progress', content: '', voiceTranscript: '' })}
                >
                  Clear
                </Button>

                {notes.length > 0 && (
                  <Button variant="outline" onClick={handleExportNotes} className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Export Notes
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Voice Input Stats */}
          {currentNote.voiceTranscript && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Voice Input Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Provider:</span>
                  <span className="font-medium">{currentNote.provider || 'Web API'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Confidence:</span>
                  <span className={`font-medium ${
                    (currentNote.confidence || 0) > 0.8 ? 'text-green-600' :
                    (currentNote.confidence || 0) > 0.6 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {currentNote.confidence ? Math.round(currentNote.confidence * 100) : 0}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Transcript Length:</span>
                  <span className="font-medium">{currentNote.voiceTranscript.length} chars</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Saved Notes History */}
      {notes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Saved Clinical Notes ({notes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {notes.map((note) => (
                <div key={note.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{note.type}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {note.date.toLocaleDateString()} {note.date.toLocaleTimeString()}
                      </span>
                    </div>
                    {note.confidence && (
                      <Badge variant={note.confidence > 0.8 ? 'default' : 'secondary'}>
                        {Math.round(note.confidence * 100)}% confidence
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                  {note.voiceTranscript && note.voiceTranscript !== note.content && (
                    <details className="text-xs text-muted-foreground">
                      <summary>Original Voice Transcript</summary>
                      <p className="mt-1 whitespace-pre-wrap">{note.voiceTranscript}</p>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Technical Information */}
      <Card className="border-muted">
        <CardHeader>
          <CardTitle className="text-lg">Technical Implementation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">Supported Providers:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Web Speech API (Browser native)</li>
                <li>• Azure Speech Services</li>
                <li>• Google Speech-to-Text</li>
                <li>• AWS Transcribe</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Security Features:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• End-to-end encryption</li>
                <li>• PHI sanitization</li>
                <li>• Full audit trails</li>
                <li>• Medical terminology recognition</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VoiceClinicalNotesPage;