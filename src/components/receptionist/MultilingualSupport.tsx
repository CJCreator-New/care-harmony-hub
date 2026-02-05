import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Languages, 
  Mic, 
  Volume2, 
  MessageSquare, 
  RefreshCw,
  Globe
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Phrase {
  id: string;
  category: string;
  en: string;
  translation: string;
}

const COMMON_PHRASES: Record<string, Phrase[]> = {
  es: [
    { id: '1', category: 'Greeting', en: 'Good morning, how can I help you?', translation: 'Buenos días, ¿en qué puedo ayudarle?' },
    { id: '2', category: 'Check-in', en: 'Do you have your ID card?', translation: '¿Tiene su tarjeta de identificación?' },
    { id: '3', category: 'Insurance', en: 'We need to verify your insurance.', translation: 'Necesitamos verificar su seguro.' },
    { id: '4', category: 'Direction', en: 'Please take a seat in the waiting area.', translation: 'Por favor tome asiento en la sala de espera.' },
  ],
  fr: [
    { id: '1', category: 'Greeting', en: 'Good morning, how can I help you?', translation: 'Bonjour, comment puis-je vous aider ?' },
    { id: '2', category: 'Check-in', en: 'Do you have your ID card?', translation: 'Avez-vous votre carte d\'identité ?' },
    { id: '3', category: 'Insurance', en: 'We need to verify your insurance.', translation: 'Nous devons vérifier votre assurance.' },
    { id: '4', category: 'Direction', en: 'Please take a seat in the waiting area.', translation: 'Veuillez vous asseoir dans la salle d\'attente.' },
  ],
  zh: [
    { id: '1', category: 'Greeting', en: 'Good morning, how can I help you?', translation: '早上好，请问有什么可以帮您？' },
    { id: '2', category: 'Check-in', en: 'Do you have your ID card?', translation: '您有身份证吗？' },
    { id: '3', category: 'Insurance', en: 'We need to verify your insurance.', translation: '我们需要核实您的保险。' },
    { id: '4', category: 'Direction', en: 'Please take a seat in the waiting area.', translation: '请在候诊区就座。' },
  ],
};

const SUPPORTED_LANGUAGES = [
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'zh', name: 'Chinese (Mandarin)' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
];

export function MultilingualSupport() {
  const [selectedLang, setSelectedLang] = useState<string>('es');
  const [inputVis, setInputVis] = useState('');
  const [translation, setTranslation] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const handleTranslate = () => {
    if (!inputVis.trim()) return;
    
    setIsTranslating(true);
    // Simulate translation API
    setTimeout(() => {
      setTranslation(`[Translated to ${SUPPORTED_LANGUAGES.find(l => l.code === selectedLang)?.name}]: ${inputVis}`);
      setIsTranslating(false);
    }, 800);
  };

  const toggleListening = () => {
    setIsListening(!isListening);
    if (!isListening) {
      setTimeout(() => {
        setIsListening(false);
        setInputVis("I need to see a doctor for my headache.");
      }, 3000);
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
             <Languages className="h-5 w-5 text-primary" />
             <CardTitle>Multilingual Assistant</CardTitle>
          </div>
          <Select value={selectedLang} onValueChange={setSelectedLang}>
            <SelectTrigger className="w-[140px]">
              <Globe className="h-3 w-3 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_LANGUAGES.map(lang => (
                <SelectItem key={lang.code} value={lang.code}>{lang.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <CardDescription>Real-time translation and common phrases</CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1 space-y-6">
        {/* Translation Input */}
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input 
              placeholder="Type or speak to translate..." 
              value={inputVis}
              onChange={(e) => setInputVis(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleTranslate()}
            />
            <Button 
              variant={isListening ? "destructive" : "outline"} 
              size="icon"
              onClick={toggleListening}
              className={isListening ? "animate-pulse" : ""}
              aria-label={isListening ? "Stop listening" : "Start listening"}
            >
              <Mic className="h-4 w-4" />
            </Button>
            <Button onClick={handleTranslate} disabled={isTranslating}>
              {isTranslating ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Translate"}
            </Button>
          </div>
          
          {translation && (
            <div className="bg-muted p-4 rounded-lg relative group">
              <p className="text-lg font-medium">{translation}</p>
              <Button
                size="icon"
                variant="ghost"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Play translation"
              >
                <Volume2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Quick Phrases */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Common Phrases in English to {SUPPORTED_LANGUAGES.find(l => l.code === selectedLang)?.name}
          </h3>
          <ScrollArea className="h-[250px] pr-4">
            <div className="space-y-2">
              {COMMON_PHRASES[selectedLang]?.map((phrase) => (
                <div 
                  key={phrase.id} 
                  className="p-3 border rounded-md hover:bg-muted/50 cursor-pointer transition-colors group"
                  onClick={() => {
                    setInputVis(phrase.en);
                    setTranslation(phrase.translation);
                  }}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium text-sm">{phrase.en}</span>
                    <Badge variant="outline" className="text-[10px]">{phrase.category}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground group-hover:text-primary transition-colors">
                    {phrase.translation}
                  </p>
                </div>
              )) || (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Common phrases not loaded for this language.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
