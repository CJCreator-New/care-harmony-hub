export const initVoiceRecognition = () => {
  const SpeechRecognition = (window as unknown as Record<string, unknown>).SpeechRecognition || (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    return null;
  }

  const recognition = new (SpeechRecognition as any)();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';

  return recognition;
};

export const startVoiceInput = (
  onResult: (text: string) => void,
  onError?: (error: Record<string, unknown>) => void
) => {
  const recognition = initVoiceRecognition();
  
  if (!recognition) {
    onError?.({ message: 'Speech recognition not supported' });
    return null;
  }

  recognition.onresult = (event: Record<string, unknown>) => {
    const results = event.results as any[];
    const transcript = results[0][0].transcript;
    onResult(transcript);
  };

  recognition.onerror = (event: Record<string, unknown>) => {
    onError?.(event);
  };

  recognition.start();
  return recognition;
};
