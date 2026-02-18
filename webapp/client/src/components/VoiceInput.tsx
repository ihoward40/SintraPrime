import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { playSound } from "@/lib/sounds";
import { cn } from "@/lib/utils";

type VoiceInputProps = {
  onTranscript: (text: string) => void;
  className?: string;
  size?: "sm" | "md" | "lg";
};

export default function VoiceInput({ onTranscript, className, size = "md" }: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        
        // Send to backend for transcription
        await transcribeAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      playSound("notification");
    } catch (error) {
      console.error("Failed to start recording:", error);
      playSound("error");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsProcessing(true);
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      // Create FormData to send audio file
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");

      const response = await fetch("/api/voice-transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Transcription failed");
      }

      const data = await response.json();
      
      if (data.text) {
        onTranscript(data.text);
        playSound("success");
      } else {
        throw new Error("No transcription returned");
      }
    } catch (error) {
      console.error("Transcription error:", error);
      playSound("error");
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  };

  return (
    <Button
      type="button"
      variant={isRecording ? "destructive" : "outline"}
      size="icon"
      className={cn(sizeClasses[size], className)}
      onClick={toggleRecording}
      disabled={isProcessing}
      title={isRecording ? "Stop recording" : "Start voice input"}
    >
      {isProcessing ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isRecording ? (
        <MicOff className="h-4 w-4 animate-pulse" />
      ) : (
        <Mic className="h-4 w-4" />
      )}
    </Button>
  );
}
