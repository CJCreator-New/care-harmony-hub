import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { speechRecognitionManager, SpeechProviderConfig, SpeechResult } from '@/lib/speech/SpeechRecognitionService';
import { captureClinicalError } from '@/lib/monitoring/sentry';

/**
 * Speech Recognition Hook Configuration
 */
export interface UseSpeechRecognitionConfig {
  provider?: 'azure' | 'google' | 'aws' | 'web';
  language?: string;
  medicalMode?: boolean;
  autoStart?: boolean;
  continuous?: boolean;
}

/**
 * Speech Recognition Hook Result
 */
export interface UseSpeechRecognitionResult {
  // State
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  confidence: number;
  lastResult: SpeechResult | null;
  error: string | null;

  // Medical terminology
  medicalTerms: string[];
  corrections: string[];
  originalTranscript: string;

  // Actions
  startListening: (config?: Partial<SpeechProviderConfig>) => Promise<void>;
  stopListening: () => Promise<void>;
  pauseListening: () => Promise<void>;
  resumeListening: () => Promise<void>;
  clearTranscript: () => void;

  // Configuration
  supportedLanguages: string[];
  currentProvider: string | null;
}

/**
 * React hook for HIPAA-compliant speech recognition
 * Provides secure voice-to-text functionality with medical terminology support
 */
export function useSpeechRecognition(
  config: UseSpeechRecognitionConfig = {}
): UseSpeechRecognitionResult {
  const { hospital } = useAuth();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [lastResult, setLastResult] = useState<SpeechResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentProvider, setCurrentProvider] = useState<string | null>(null);
  const [medicalTerms, setMedicalTerms] = useState<string[]>([]);
  const [corrections, setCorrections] = useState<string[]>([]);
  const [originalTranscript, setOriginalTranscript] = useState('');

  const transcriptRef = useRef('');
  const confidenceRef = useRef(0);

  // Check if speech recognition is supported
  const isSupported = speechRecognitionManager.isSupported();

  // Get supported languages
  const supportedLanguages = speechRecognitionManager.getSupportedLanguages();

  // Handle speech recognition results
  const handleResult = useCallback((result: SpeechResult) => {
    setLastResult(result);
    setCurrentProvider(result.provider);

    // Update medical terminology information
    if (result.medicalTerms) {
      setMedicalTerms(prev => [...new Set([...prev, ...result.medicalTerms])]);
    }
    if (result.corrections) {
      setCorrections(prev => [...new Set([...prev, ...result.corrections])]);
    }
    if (result.originalTranscript) {
      setOriginalTranscript(result.originalTranscript);
    }

    if (result.isFinal) {
      // Append final results to transcript
      transcriptRef.current += result.transcript + ' ';
      setTranscript(transcriptRef.current);
      confidenceRef.current = Math.max(confidenceRef.current, result.confidence);
      setConfidence(confidenceRef.current);
    } else {
      // Update interim results
      setTranscript(transcriptRef.current + result.transcript);
      setConfidence(result.confidence);
    }
  }, []);

  // Handle speech recognition errors
  const handleError = useCallback((error: Error) => {
    setError(error.message);
    setIsListening(false);

    captureClinicalError(error, {
      context: 'speech_recognition_hook',
      hospitalId: hospital?.id,
      provider: currentProvider,
    });
  }, [hospital?.id, currentProvider]);

  // Set up event listeners
  useEffect(() => {
    speechRecognitionManager.onResult(handleResult);
    speechRecognitionManager.onError(handleError);

    return () => {
      // Clean up listeners on unmount
      speechRecognitionManager.stopRecognition().catch(console.error);
    };
  }, [handleResult, handleError]);

  // Auto-start if configured
  useEffect(() => {
    if (config.autoStart && isSupported && !isListening) {
      startListening();
    }
  }, [config.autoStart, isSupported]);

  // Start listening
  const startListening = useCallback(async (
    overrideConfig?: Partial<SpeechProviderConfig>
  ): Promise<void> => {
    if (!hospital?.id) {
      throw new Error('Hospital context required for speech recognition');
    }

    if (!isSupported) {
      throw new Error('Speech recognition is not supported in this browser');
    }

    setError(null);

    try {
      const speechConfig: SpeechProviderConfig = {
        provider: overrideConfig?.provider || config.provider || 'web',
        language: overrideConfig?.language || config.language || 'en-US',
        medicalMode: overrideConfig?.medicalMode ?? config.medicalMode ?? true,
        apiKey: overrideConfig?.apiKey,
        region: overrideConfig?.region,
      };

      await speechRecognitionManager.startRecognition(speechConfig);
      setIsListening(true);
      setCurrentProvider(speechConfig.provider);

    } catch (err) {
      const errorMessage = (err as Error).message;
      setError(errorMessage);

      captureClinicalError(err as Error, {
        context: 'speech_recognition_start',
        hospitalId: hospital.id,
        provider: config.provider,
      });

      throw err;
    }
  }, [hospital?.id, isSupported, config]);

  // Stop listening
  const stopListening = useCallback(async (): Promise<void> => {
    try {
      await speechRecognitionManager.stopRecognition();
      setIsListening(false);
    } catch (err) {
      const errorMessage = (err as Error).message;
      setError(errorMessage);

      captureClinicalError(err as Error, {
        context: 'speech_recognition_stop',
        hospitalId: hospital?.id,
        provider: currentProvider,
      });

      throw err;
    }
  }, [hospital?.id, currentProvider]);

  // Pause listening
  const pauseListening = useCallback(async (): Promise<void> => {
    try {
      await speechRecognitionManager.pauseRecognition();
      setIsListening(false);
    } catch (err) {
      const errorMessage = (err as Error).message;
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Resume listening
  const resumeListening = useCallback(async (): Promise<void> => {
    try {
      await speechRecognitionManager.resumeRecognition();
      setIsListening(true);
    } catch (err) {
      const errorMessage = (err as Error).message;
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Clear transcript
  const clearTranscript = useCallback(() => {
    setTranscript('');
    setConfidence(0);
    setMedicalTerms([]);
    setCorrections([]);
    setOriginalTranscript('');
    transcriptRef.current = '';
    confidenceRef.current = 0;
  }, []);

  return {
    // State
    isListening,
    isSupported,
    transcript,
    confidence,
    lastResult,
    error,

    // Medical terminology
    medicalTerms,
    corrections,
    originalTranscript,

    // Actions
    startListening,
    stopListening,
    pauseListening,
    resumeListening,
    clearTranscript,

    // Configuration
    supportedLanguages,
    currentProvider,
  };
}