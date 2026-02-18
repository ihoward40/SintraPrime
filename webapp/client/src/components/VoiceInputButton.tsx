import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff } from "lucide-react";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { cn } from "@/lib/utils";

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  onError?: (error: string) => void;
  className?: string;
  disabled?: boolean;
}

export function VoiceInputButton({
  onTranscript,
  onError,
  className,
  disabled = false,
}: VoiceInputButtonProps) {
  const {
    isListening,
    transcript,
    startListening,
    stopListening,
  } = useVoiceInput({
    onTranscript,
    onError,
  });

  const [audioLevel, setAudioLevel] = useState(0);

  // Transcript is already handled by the hook via onTranscript callback

  // Simulate audio level for visualization
  useEffect(() => {
    if (!isListening) {
      setAudioLevel(0);
      return;
    }

    const interval = setInterval(() => {
      setAudioLevel(Math.random() * 100);
    }, 100);

    return () => clearInterval(interval);
  }, [isListening]);

  const handleClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div className={cn("relative", className)}>
      <Button
        variant={isListening ? "destructive" : "outline"}
        size="icon"
        onClick={handleClick}
        disabled={disabled}
        className={cn(
          "relative transition-all",
          isListening && "animate-pulse"
        )}
      >
        {isListening ? (
          <MicOff className="h-4 w-4" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </Button>

      {/* Waveform visualization */}
      {isListening && (
        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex items-end gap-1 h-8">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="w-1 bg-primary rounded-full transition-all duration-100"
              style={{
                height: `${Math.max(
                  10,
                  (audioLevel + Math.sin((i + Date.now() / 100) * 0.5) * 20) / 3
                )}%`,
              }}
            />
          ))}
        </div>
      )}

      {/* Status indicator */}
      {isListening && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
      )}
    </div>
  );
}
