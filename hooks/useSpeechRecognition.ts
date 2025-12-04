import { useState, useEffect, useCallback, useRef } from 'react';

interface SpeechRecognitionHook {
  isListening: boolean;
  isPaused: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  togglePause: () => void;
  resetTranscript: () => void;
  browserSupportsSpeechRecognition: boolean;
  permissionDenied: boolean;
}

export const useSpeechRecognition = (): SpeechRecognitionHook => {
  const [isListening, setIsListening] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  // We separate the "finalized" text from previous sessions/segments 
  // from the "interim" text of the current active session.
  const [finalTranscript, setFinalTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  
  const [browserSupportsSpeechRecognition, setBrowserSupportsSpeechRecognition] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  
  const recognitionRef = useRef<any>(null);

  // Computed full transcript
  const transcript = finalTranscript + interimTranscript;

  useEffect(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      setBrowserSupportsSpeechRecognition(true);
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let currentInterim = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcriptPart = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                // Determine if we need to append to final state
                // Note: In continuous mode, some browsers might re-send final results.
                // However, our logic below (resetting on end) usually handles this.
                // For safety in this specific hook structure, we usually trust the accumulated interim 
                // but since we are handling pause/resume, we rely on the loop.
                setFinalTranscript(prev => prev + transcriptPart + ' ');
            } else {
                currentInterim += transcriptPart;
            }
        }
        setInterimTranscript(currentInterim);
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'no-speech') return;

        console.error('Speech recognition error', event.error);
        
        if (event.error === 'not-allowed') {
            setIsListening(false);
            setPermissionDenied(true);
        }
      };
      
      recognition.onend = () => {
         // When recognition stops (either manually or error), 
         // we don't necessarily want to set isListening false if it was just a pause.
         // But "stop" usually means fully stop.
         // Logic is handled in the stop/pause functions.
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const startListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        setPermissionDenied(false);
        setIsPaused(false);
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e: any) {
        if (e.name === 'NotAllowedError' || e.message?.includes('not allowed')) {
             setPermissionDenied(true);
        }
      }
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        setIsListening(false);
        setIsPaused(false);
        // Commit any remaining interim text
        setFinalTranscript(prev => prev + interimTranscript);
        setInterimTranscript('');
      } catch (e) {
        console.error("Error stopping recognition:", e);
      }
    }
  }, [interimTranscript]);

  const togglePause = useCallback(() => {
      if (isPaused) {
          // RESUME
          startListening();
      } else {
          // PAUSE
          if (recognitionRef.current) {
              recognitionRef.current.stop();
              setIsListening(true); // Still "in a session", just inactive mic
              setIsPaused(true);
              setFinalTranscript(prev => prev + interimTranscript + (interimTranscript ? ' ' : ''));
              setInterimTranscript('');
          }
      }
  }, [isPaused, interimTranscript, startListening]);

  const resetTranscript = useCallback(() => {
    setFinalTranscript('');
    setInterimTranscript('');
  }, []);

  return {
    isListening,
    isPaused,
    transcript,
    startListening,
    stopListening,
    togglePause,
    resetTranscript,
    browserSupportsSpeechRecognition,
    permissionDenied
  };
};