import { useState, useEffect, useCallback, useRef } from 'react';

interface UseWakeWordOptions {
  wakeWord?: string;
  enabled?: boolean;
  sensitivity?: number; // 0-1, how closely the word must match
  onWakeWordDetected?: () => void;
  onListeningChange?: (isListening: boolean) => void;
}

interface UseWakeWordReturn {
  isListening: boolean;
  isEnabled: boolean;
  lastDetection: Date | null;
  toggleEnabled: () => void;
  startListening: () => void;
  stopListening: () => void;
}

export function useWakeWord(options: UseWakeWordOptions = {}): UseWakeWordReturn {
  const {
    wakeWord = 'hey sintra prime',
    enabled = false,
    sensitivity = 0.7,
    onWakeWordDetected,
    onListeningChange,
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [isEnabled, setIsEnabled] = useState(enabled);
  const [lastDetection, setLastDetection] = useState<Date | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const normalizeText = useCallback((text: string): string => {
    return text.toLowerCase().trim().replace(/[^\w\s]/g, '');
  }, []);

  const calculateSimilarity = useCallback((str1: string, str2: string): number => {
    // Simple Levenshtein distance-based similarity
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }, []);

  const levenshteinDistance = (str1: string, str2: string): number => {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  };

  const checkForWakeWord = useCallback((transcript: string) => {
    const normalizedTranscript = normalizeText(transcript);
    const normalizedWakeWord = normalizeText(wakeWord);
    
    // Check if wake word is contained in transcript
    if (normalizedTranscript.includes(normalizedWakeWord)) {
      return true;
    }
    
    // Check similarity for partial matches
    const words = normalizedTranscript.split(' ');
    const wakeWordParts = normalizedWakeWord.split(' ');
    
    // Check for consecutive word matches
    for (let i = 0; i <= words.length - wakeWordParts.length; i++) {
      const phrase = words.slice(i, i + wakeWordParts.length).join(' ');
      const similarity = calculateSimilarity(phrase, normalizedWakeWord);
      
      if (similarity >= sensitivity) {
        return true;
      }
    }
    
    return false;
  }, [wakeWord, sensitivity, normalizeText, calculateSimilarity]);

  const startListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.error('Speech recognition not supported in this browser');
      return;
    }

    try {
      const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognitionAPI();
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        onListeningChange?.(true);
        console.log('[WakeWord] Listening started');
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join(' ');

        console.log('[WakeWord] Heard:', transcript);

        if (checkForWakeWord(transcript)) {
          console.log('[WakeWord] Wake word detected!');
          setLastDetection(new Date());
          onWakeWordDetected?.();
        }
      };

      recognition.onerror = (event: any) => {
        console.error('[WakeWord] Recognition error:', event.error);
        
        // Don't restart on certain errors
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setIsListening(false);
          setIsEnabled(false);
          onListeningChange?.(false);
          return;
        }
        
        // Auto-restart on other errors
        if (isEnabled) {
          restartTimeoutRef.current = setTimeout(() => {
            startListening();
          }, 1000);
        }
      };

      recognition.onend = () => {
        console.log('[WakeWord] Recognition ended');
        
        // Auto-restart if still enabled
        if (isEnabled) {
          restartTimeoutRef.current = setTimeout(() => {
            startListening();
          }, 100);
        } else {
          setIsListening(false);
          onListeningChange?.(false);
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (error) {
      console.error('[WakeWord] Failed to start recognition:', error);
      setIsListening(false);
      onListeningChange?.(false);
    }
  }, [isEnabled, checkForWakeWord, onWakeWordDetected, onListeningChange]);

  const stopListening = useCallback(() => {
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      } catch (error) {
        console.error('[WakeWord] Error stopping recognition:', error);
      }
    }

    setIsListening(false);
    onListeningChange?.(false);
  }, [onListeningChange]);

  const toggleEnabled = useCallback(() => {
    setIsEnabled(prev => !prev);
  }, []);

  // Start/stop listening based on enabled state
  useEffect(() => {
    if (isEnabled && !isListening) {
      startListening();
    } else if (!isEnabled && isListening) {
      stopListening();
    }
  }, [isEnabled, isListening, startListening, stopListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  return {
    isListening,
    isEnabled,
    lastDetection,
    toggleEnabled,
    startListening,
    stopListening,
  };
}
