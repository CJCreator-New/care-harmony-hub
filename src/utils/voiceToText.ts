export const initVoiceRecognition = () => {
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    return null;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';

  return recognition;
};

export const startVoiceInput = (
  onResult: (text: string) => void,
  onError?: (error: any) => void
) => {
  const recognition = initVoiceRecognition();
  
  if (!recognition) {
    onError?.({ message: 'Speech recognition not supported' });
    return null;
  }

  recognition.onresult = (event: any) => {
    const transcript = event.results[0][0].transcript;
    onResult(transcript);
  };

  recognition.onerror = (event: any) => {
    onError?.(event);
  };

  recognition.start();
  return recognition;
};
