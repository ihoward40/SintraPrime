import { useState, useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface UseVoiceInputOptions {
  onTranscript: (text: string) => void;
  onError?: (error: string) => void;
  continuous?: boolean;
  language?: string;
}

interface UseVoiceInputReturn {
  isListening: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  isSupported: boolean;
}

export function useVoiceInput({
  onTranscript,
  onError,
  continuous = false,
  language = "en-US",
}: UseVoiceInputOptions): UseVoiceInputReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<any | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const transcribeMutation = trpc.voice.transcribe.useMutation({
    onSuccess: (data: { text?: string }) => {
      if (data.text) {
        setTranscript(data.text);
        onTranscript(data.text);
      }
    },
    onError: (error: { message: string }) => {
      const errorMsg = `Transcription failed: ${error.message}`;
      onError?.(errorMsg);
      toast.error(errorMsg);
    },
  });

  // Check for Web Speech API support
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = continuous;
      recognition.interimResults = true;
      recognition.lang = language;

      recognition.onresult = (event: any) => {
        let finalTranscript = "";
        let interimTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptPiece = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcriptPiece + " ";
          } else {
            interimTranscript += transcriptPiece;
          }
        }

        if (finalTranscript) {
          setTranscript((prev) => prev + finalTranscript);
          onTranscript(finalTranscript.trim());
        } else if (interimTranscript) {
          setTranscript(interimTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error("[VoiceInput] Speech recognition error:", event.error);
        
        // Fallback to Whisper API if Web Speech API fails
        if (event.error === "no-speech" || event.error === "audio-capture") {
          startWhisperFallback();
        } else {
          const errorMsg = `Voice recognition error: ${event.error}`;
          onError?.(errorMsg);
          toast.error(errorMsg);
          setIsListening(false);
        }
      };

      recognition.onend = () => {
        if (isListening && continuous) {
          // Restart if continuous mode is enabled
          recognition.start();
        } else {
          setIsListening(false);
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    };
  }, [continuous, language, isListening, onTranscript, onError]);

  const startWhisperFallback = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        
        // Convert to base64 for API transmission
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          transcribeMutation.mutate({
            audioData: base64Audio,
            language,
          });
        };

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      toast.info("Using Whisper transcription fallback");
    } catch (error) {
      const errorMsg = "Failed to access microphone";
      onError?.(errorMsg);
      toast.error(errorMsg);
      setIsListening(false);
    }
  }, [language, transcribeMutation, onError]);

  const startListening = useCallback(() => {
    if (!isSupported) {
      // Use Whisper API directly if Web Speech API is not supported
      startWhisperFallback();
      setIsListening(true);
      return;
    }

    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        console.error("[VoiceInput] Failed to start recognition:", error);
        // Fallback to Whisper
        startWhisperFallback();
        setIsListening(true);
      }
    }
  }, [isSupported, isListening, startWhisperFallback]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsListening(false);
  }, [isListening]);

  const resetTranscript = useCallback(() => {
    setTranscript("");
  }, []);

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    resetTranscript,
    isSupported,
  };
}
