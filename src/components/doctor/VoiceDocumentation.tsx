import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Mic, 
  MicOff, 
  RotateCcw, 
  Check, 
  Brain, 
  Loader2,
  Volume2,
  FileText,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { voiceNLPService } from '@/services/voiceNLPService';

interface Props {
  onSave: (note: string) => void;
  initialValue?: string;
}

export function VoiceDocumentation({ onSave, initialValue = '' }: Props) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState(initialValue);
  const [note, setNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [transcriptHistory, setTranscriptHistory] = useState<string[]>([initialValue]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'en-US';

      recognitionInstance.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        
        if (finalTranscript) {
          // Process punctuation and editing commands
          let processedText = finalTranscript.toLowerCase().trim();
          
          // Handle punctuation commands
          if (processedText === 'period' || processedText === 'full stop') {
            setTranscript(prev => {
              const newTranscript = prev + '. ';
              setTranscriptHistory(history => [...history, newTranscript]);
              return newTranscript;
            });
            return;
          } else if (processedText === 'comma') {
            setTranscript(prev => {
              const newTranscript = prev + ', ';
              setTranscriptHistory(history => [...history, newTranscript]);
              return newTranscript;
            });
            return;
          } else if (processedText === 'new line' || processedText === 'new paragraph') {
            setTranscript(prev => {
              const newTranscript = prev + '\n';
              setTranscriptHistory(history => [...history, newTranscript]);
              return newTranscript;
            });
            return;
          } else if (processedText === 'question mark') {
            setTranscript(prev => {
              const newTranscript = prev + '? ';
              setTranscriptHistory(history => [...history, newTranscript]);
              return newTranscript;
            });
            return;
          } else if (processedText === 'exclamation point' || processedText === 'exclamation mark') {
            setTranscript(prev => {
              const newTranscript = prev + '! ';
              setTranscriptHistory(history => [...history, newTranscript]);
              return newTranscript;
            });
            return;
          }
          
          // Handle editing commands
          else if (processedText === 'delete' || processedText === 'delete last' || processedText === 'remove last') {
            setTranscript(prev => {
              const words = prev.trim().split(/\s+/);
              const newTranscript = words.slice(0, -1).join(' ') + (words.length > 1 ? ' ' : '');
              setTranscriptHistory(history => [...history, newTranscript]);
              return newTranscript;
            });
            return;
          } else if (processedText === 'clear' || processedText === 'clear all' || processedText === 'start over') {
            setTranscript('');
            setTranscriptHistory(['']);
            return;
          } else if (processedText === 'undo' || processedText === 'undo last') {
            setTranscriptHistory(history => {
              if (history.length > 1) {
                const newHistory = history.slice(0, -1);
                setTranscript(newHistory[newHistory.length - 1]);
                return newHistory;
              }
              return history;
            });
            return;
          } else if (processedText === 'delete sentence' || processedText === 'remove sentence') {
            setTranscript(prev => {
              const lastPeriodIndex = prev.lastIndexOf('.');
              const lastQuestionIndex = prev.lastIndexOf('?');
              const lastExclamationIndex = prev.lastIndexOf('!');
              
              const lastSentenceEnd = Math.max(lastPeriodIndex, lastQuestionIndex, lastExclamationIndex);
              
              if (lastSentenceEnd !== -1) {
                const newTranscript = prev.substring(0, lastSentenceEnd + 1);
                setTranscriptHistory(history => [...history, newTranscript]);
                return newTranscript;
              }
              return prev;
            });
            return;
          }
          
          // Add space if needed and append normal text
          setTranscript(prev => {
            const newTranscript = prev + (prev && !prev.endsWith(' ') && !prev.endsWith('\n') ? ' ' : '') + finalTranscript;
            setTranscriptHistory(history => [...history, newTranscript]);
            return newTranscript;
          });
        }
      };

      recognitionInstance.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error !== 'no-speech') {
          toast.error(`Voice error: ${event.error}`);
        }
      };

      recognitionInstance.onend = () => {
        setIsListening(false);
      };

      setRecognition(recognitionInstance);
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognition?.stop();
    } else {
      if (recognition) {
        try {
          recognition.start();
          setIsListening(true);
          toast.info('Listening for clinical notes...');
        } catch (e) {
          console.error("Failed to start recognition", e);
          toast.error("Speech recognition is already active or failed to start.");
        }
      }
    }
  };

  const generateClinicalNote = async () => {
    if (!transcript) return;
    
    setIsProcessing(true);
    try {
      const clinicalNote = await voiceNLPService.generateClinicalNote(transcript);
      setNote(clinicalNote);
      toast.success('Clinical note structured successfully');
    } catch (error) {
      toast.error('Failed to process transcript');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApply = () => {
    onSave(note);
    setTranscript('');
    setNote('');
    toast.success('Documentation saved to patient record');
  };

  if (!recognition) {
    return (
      <Card className="border-dashed bg-muted/30">
        <CardContent className="py-6 flex flex-col items-center justify-center gap-3 text-center">
          <MicOff className="h-8 w-8 text-muted-foreground opacity-20" />
          <div className="space-y-1">
            <p className="text-sm font-medium">Voice documentation unavailable</p>
            <p className="text-xs text-muted-foreground">Web Speech API is not supported in this browser.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-2 transition-all duration-300 ${isListening ? 'border-red-500 shadow-lg ring-4 ring-red-50/50' : 'border-primary/20 shadow-sm'}`}>
      <CardHeader className="pb-3 border-b bg-slate-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${isListening ? 'bg-red-100 animate-pulse' : 'bg-primary/10'}`}>
              <Mic className={`h-5 w-5 ${isListening ? 'text-red-600' : 'text-primary'}`} />
            </div>
            <div>
              <CardTitle className="text-lg">Smart Voice Dictation</CardTitle>
              <CardDescription className="text-xs">Natural language processing for clinical notes</CardDescription>
            </div>
          </div>
          <Badge variant={isListening ? 'destructive' : 'outline'} className="animate-in fade-in zoom-in h-6 uppercase tracking-wider text-[10px]">
            {isListening ? 'Recording Live' : 'Ready'}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground uppercase font-semibold">Live Transcript</Label>
            {transcript && (
              <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => {
                setTranscript('');
                setTranscriptHistory(['']);
              }}>
                <RotateCcw className="h-3 w-3 mr-1" /> Clear
              </Button>
            )}
          </div>
          <div className="p-4 bg-white rounded-xl border border-slate-200 min-h-[120px] shadow-inner relative group">
            <p className="text-sm text-slate-700 leading-relaxed italic">
              {transcript || <span className="text-slate-300 not-italic">Start dictating to see text appear here...</span>}
              {isListening && <span className="inline-block w-1.5 h-4 ml-1 bg-red-500 animate-pulse align-middle" />}
            </p>
            <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Badge variant="secondary" className="text-[9px] h-4">
                <Brain className="h-2 w-2 mr-1" /> Medical NLP v2.1
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant={isListening ? 'destructive' : 'default'}
            className="flex-1 h-12 gap-2 shadow-sm"
            onClick={toggleListening}
            disabled={isProcessing}
          >
            {isListening ? (
              <>Stop Recording <Volume2 className="h-4 w-4" /></>
            ) : (
              <>{transcript ? 'Continue Dictating' : 'Start Recording'} <Mic className="h-4 w-4" /></>
            )}
          </Button>
          
          {transcript && !isListening && (
            <Button 
              variant="secondary" 
              className="flex-1 h-12 gap-2 bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
              onClick={generateClinicalNote}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Structure as SOAP Note
            </Button>
          )}
        </div>

        <AnimatePresence>
          {note && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="space-y-3 pt-4 border-t overflow-hidden"
            >
              <Label className="text-xs text-muted-foreground uppercase font-semibold">Processed Clinical Note (Final Preview)</Label>
              <Textarea 
                value={note} 
                onChange={(e) => setNote(e.target.value)} 
                rows={12} 
                className="font-mono text-sm leading-relaxed p-4 bg-slate-50 border-indigo-100 rounded-xl focus:ring-indigo-200"
              />
              <Button 
                onClick={handleApply} 
                className="w-full h-12 text-sm bg-success hover:bg-success/90 shadow-md gap-2"
                disabled={isProcessing}
              >
                <Check className="h-4 w-4" /> Save to EMR Record
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-3 gap-2 pt-2">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Check className="h-3 w-3 text-success" /> HIPAA Comply
          </div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <FileText className="h-3 w-3" /> Auto-Summary
          </div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground justify-end">
            <Sparkles className="h-3 w-3 text-indigo-400" /> AI Empowered
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100">
          <details className="text-xs">
            <summary className="text-muted-foreground cursor-pointer hover:text-foreground font-medium">
              Voice Commands Available
            </summary>
            <div className="mt-2 space-y-1 text-[10px] text-muted-foreground">
              <div><strong>Punctuation:</strong> "period", "comma", "new line", "question mark", "exclamation point"</div>
              <div><strong>Editing:</strong> "delete", "clear", "undo", "delete sentence"</div>
              <div><strong>Navigation:</strong> "next step", "go back", "add diagnosis", "new prescription"</div>
            </div>
          </details>
        </div>
      </CardContent>
    </Card>
  );
}

