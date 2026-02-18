import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Play, Pause, Volume2, VolumeX, Loader2 } from "lucide-react";

interface AudioPlayerProps {
  text?: string;
  audioUrl?: string;
  onVoiceChange?: (voice: string) => void;
  onSpeedChange?: (speed: number) => void;
  defaultVoice?: string;
  defaultSpeed?: number;
}

const VOICES = [
  { value: "alloy", label: "Alloy (Neutral)" },
  { value: "echo", label: "Echo (Male)" },
  { value: "fable", label: "Fable (British)" },
  { value: "onyx", label: "Onyx (Deep)" },
  { value: "nova", label: "Nova (Female)" },
  { value: "shimmer", label: "Shimmer (Soft)" },
];

const SPEEDS = [
  { value: 0.5, label: "0.5x" },
  { value: 0.75, label: "0.75x" },
  { value: 1.0, label: "1.0x" },
  { value: 1.25, label: "1.25x" },
  { value: 1.5, label: "1.5x" },
  { value: 2.0, label: "2.0x" },
];

export function AudioPlayer({
  text,
  audioUrl,
  onVoiceChange,
  onSpeedChange,
  defaultVoice = "alloy",
  defaultSpeed = 1.0,
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(defaultVoice);
  const [selectedSpeed, setSelectedSpeed] = useState(defaultSpeed);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [shouldAutoPlay, setShouldAutoPlay] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const effectiveAudioUrl = audioUrl || generatedAudioUrl;

  // Auto-play after TTS generation
  useEffect(() => {
    if (effectiveAudioUrl && shouldAutoPlay && audioRef.current) {
      audioRef.current.play().catch(console.error);
      setIsPlaying(true);
      setShouldAutoPlay(false);
    }
  }, [effectiveAudioUrl, shouldAutoPlay]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = selectedSpeed;
    }
  }, [selectedSpeed]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const generateTTS = async () => {
    if (!text || isGenerating) return;

    setIsGenerating(true);
    try {
      const response = await fetch('/api/trpc/voice.textToSpeech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          json: { text, voice: selectedVoice, speed: selectedSpeed },
        }),
      });

      if (!response.ok) throw new Error('TTS generation failed');

      const data = await response.json();
      if (data.result?.data?.json?.url) {
        setGeneratedAudioUrl(data.result.data.json.url);
      }
    } catch (error) {
      console.error('TTS error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const togglePlayPause = async () => {
    if (!audioRef.current) return;

    // Generate TTS if we have text but no audio URL
    if (text && !effectiveAudioUrl && !isGenerating) {
      setShouldAutoPlay(true);
      await generateTTS();
      return;
    }

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (value: number[]) => {
    if (!audioRef.current) return;
    const newTime = value[0];
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (newVolume > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleVoiceChange = (voice: string) => {
    setSelectedVoice(voice);
    onVoiceChange?.(voice);
  };

  const handleSpeedChange = (speed: string) => {
    const speedValue = parseFloat(speed);
    setSelectedSpeed(speedValue);
    onSpeedChange?.(speedValue);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  if (!effectiveAudioUrl && !text) {
    return (
      <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
        <p className="text-sm text-muted-foreground">No audio or text available</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-4 bg-muted/50 rounded-lg">
      {effectiveAudioUrl && <audio ref={audioRef} src={effectiveAudioUrl} preload="metadata" />}

      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={togglePlayPause}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>

        <div className="flex-1 flex items-center gap-3">
          <span className="text-sm text-muted-foreground min-w-[45px]">
            {formatTime(currentTime)}
          </span>
          <Slider
            value={[currentTime]}
            max={duration || 100}
            step={0.1}
            onValueChange={handleSeek}
            className="flex-1"
            disabled={!effectiveAudioUrl}
          />
          <span className="text-sm text-muted-foreground min-w-[45px]">
            {formatTime(duration)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggleMute}>
            {isMuted || volume === 0 ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
          <Slider
            value={[isMuted ? 0 : volume]}
            max={1}
            step={0.01}
            onValueChange={handleVolumeChange}
            className="w-24"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Select value={selectedVoice} onValueChange={handleVoiceChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select voice" />
          </SelectTrigger>
          <SelectContent>
            {VOICES.map((voice) => (
              <SelectItem key={voice.value} value={voice.value}>
                {voice.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedSpeed.toString()} onValueChange={handleSpeedChange}>
          <SelectTrigger className="w-[100px]">
            <SelectValue placeholder="Speed" />
          </SelectTrigger>
          <SelectContent>
            {SPEEDS.map((speed) => (
              <SelectItem key={speed.value} value={speed.value.toString()}>
                {speed.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
