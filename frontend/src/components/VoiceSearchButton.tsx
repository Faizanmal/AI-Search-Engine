/**
 * VoiceSearchButton — uses the Web Speech API (SpeechRecognition) to capture
 * spoken input and return the transcript to the parent.
 *
 * Features:
 *  - Visual pulse animation while recording
 *  - Auto-submit after silence (configurable)
 *  - Graceful fallback when the API is unavailable
 *  - Accessible ARIA labels
 */

'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

/* ---------- Augment global types for vendors that don't ship TS defs ------ */
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

/* ---------- Props --------------------------------------------------------- */
interface VoiceSearchButtonProps {
  /** Called with the final recognised transcript */
  onTranscript: (text: string) => void;
  /** Called continuously with interim results */
  onInterimTranscript?: (text: string) => void;
  /** BCP 47 language code (default "en-US") */
  lang?: string;
  /** Extra CSS classes */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
}

export function VoiceSearchButton({
  onTranscript,
  onInterimTranscript,
  lang = 'en-US',
  className = '',
  disabled = false,
}: VoiceSearchButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported] = useState(() => {
    if (typeof window === 'undefined') return false;
    return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
  });
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  /* Cleanup on unmount */
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  const startListening = useCallback(() => {
    if (!isSupported) {
      toast.error('Voice search is not supported in your browser.');
      return;
    }

    try {
      const SpeechRecognitionCtor =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognitionCtor();

      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = lang;

      recognition.onstart = () => setIsListening(true);

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        if (interimTranscript && onInterimTranscript) {
          onInterimTranscript(interimTranscript);
        }

        if (finalTranscript) {
          onTranscript(finalTranscript.trim());
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        setIsListening(false);
        if (event.error === 'no-speech') {
          toast.info('No speech detected. Please try again.');
        } else if (event.error === 'not-allowed') {
          toast.error('Microphone access denied. Please allow microphone access in your browser settings.');
        } else if (event.error !== 'aborted') {
          toast.error(`Voice recognition error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        recognitionRef.current = null;
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      toast.error('Failed to start voice recognition.');
      setIsListening(false);
    }
  }, [isSupported, lang, onTranscript, onInterimTranscript]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const toggle = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  if (!isSupported) return null;

  return (
    <div className={`relative ${className}`}>
      {/* Pulse ring while recording */}
      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1.6, opacity: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
            className="absolute inset-0 rounded-full bg-red-500/30 pointer-events-none"
          />
        )}
      </AnimatePresence>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={toggle}
        disabled={disabled}
        aria-label={isListening ? 'Stop voice recording' : 'Start voice search'}
        aria-pressed={isListening}
        className={`relative z-10 rounded-full transition-all ${
          isListening
            ? 'bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-400 dark:hover:bg-red-900/60'
            : 'hover:bg-purple-50 dark:hover:bg-purple-950/20'
        }`}
      >
        {isListening ? (
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          >
            <MicOff className="w-5 h-5" />
          </motion.div>
        ) : disabled ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Mic className="w-5 h-5" />
        )}
      </Button>
    </div>
  );
}
