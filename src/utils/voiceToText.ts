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
    try {
      const results = event.results as any[];
      
      // Validate array bounds
      if (!Array.isArray(results) || results.length === 0) {
        onError?.({ message: 'No speech recognized' });
        return;
      }
      
      const firstResult = results[0];
      if (!Array.isArray(firstResult) || firstResult.length === 0) {
        onError?.({ message: 'Empty speech result' });
        return;
      }
      
      const transcript = firstResult[0]?.transcript;
      if (!transcript || typeof transcript !== 'string') {
        onError?.({ message: 'Invalid transcript format' });
        return;
      }
      
      onResult(transcript);
    } catch (err) {
      onError?.({ 
        message: 'Voice recognition error: ' + (err instanceof Error ? err.message : 'Unknown error') 
      });
    }
  };

  recognition.onerror = (event: Record<string, unknown>) => {
    onError?.(event);
  };

  recognition.start();
  return recognition;
};
