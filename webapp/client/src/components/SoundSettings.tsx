import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX, Play } from "lucide-react";
import { soundManager, playSound, SoundType } from "@/lib/sounds";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SoundPreferences = {
  [key in SoundType]: {
    enabled: boolean;
    volume: number;
  };
};

const defaultPreferences: SoundPreferences = {
  notification: { enabled: true, volume: 100 },
  success: { enabled: true, volume: 100 },
  error: { enabled: true, volume: 100 },
  warning: { enabled: true, volume: 100 },
  message: { enabled: true, volume: 80 },
  command: { enabled: true, volume: 60 },
  click: { enabled: false, volume: 40 },
  whoosh: { enabled: true, volume: 70 },
};

export default function SoundSettings() {
  const [enabled, setEnabled] = useState(soundManager.isEnabled());
  const [masterVolume, setMasterVolume] = useState(soundManager.getVolume() * 100);
  const [theme, setTheme] = useState<"professional" | "playful" | "minimal">("professional");
  const [preferences, setPreferences] = useState<SoundPreferences>(defaultPreferences);

  useEffect(() => {
    soundManager.setEnabled(enabled);
  }, [enabled]);

  useEffect(() => {
    soundManager.setVolume(masterVolume / 100);
  }, [masterVolume]);

  const testSound = (type: SoundType) => {
    if (preferences[type].enabled) {
      playSound(type);
    }
  };

  const toggleSoundType = (type: SoundType, checked: boolean) => {
    setPreferences((prev) => ({
      ...prev,
      [type]: { ...prev[type], enabled: checked },
    }));
  };

  const setSoundVolume = (type: SoundType, volume: number) => {
    setPreferences((prev) => ({
      ...prev,
      [type]: { ...prev[type], volume },
    }));
  };

  const soundTypes: { type: SoundType; label: string; description: string }[] = [
    { type: "notification", label: "Notifications", description: "Case updates, deadlines, mentions" },
    { type: "success", label: "Success", description: "Actions completed successfully" },
    { type: "error", label: "Errors", description: "Failed operations or validation errors" },
    { type: "warning", label: "Warnings", description: "Important alerts requiring attention" },
    { type: "message", label: "Messages", description: "New chat messages received" },
    { type: "command", label: "Commands", description: "Terminal commands executed" },
    { type: "click", label: "Clicks", description: "Button and UI interaction feedback" },
    { type: "whoosh", label: "Transitions", description: "Page transitions and animations" },
  ];

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">Sound Settings</h3>
          <p className="text-sm text-muted-foreground">
            Configure audio feedback for notifications and interactions
          </p>
        </div>

        {/* Enable/Disable Sounds */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="sound-enabled">Enable Sounds</Label>
            <p className="text-sm text-muted-foreground">
              Turn on audio feedback for app interactions
            </p>
          </div>
          <Switch
            id="sound-enabled"
            checked={enabled}
            onCheckedChange={setEnabled}
          />
        </div>

        {/* Sound Theme */}
        <div className="space-y-3">
          <Label>Sound Theme</Label>
          <Select value={theme} onValueChange={(v) => setTheme(v as typeof theme)}>
            <SelectTrigger disabled={!enabled}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="professional">Professional</SelectItem>
              <SelectItem value="playful">Playful</SelectItem>
              <SelectItem value="minimal">Minimal</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {theme === "professional" && "Clean, subtle tones for focused work"}
            {theme === "playful" && "Friendly, upbeat sounds for casual use"}
            {theme === "minimal" && "Quiet, minimal feedback for distraction-free work"}
          </p>
        </div>

        {/* Master Volume Control */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Master Volume</Label>
            <span className="text-sm text-muted-foreground">{masterVolume}%</span>
          </div>
          <div className="flex items-center gap-3">
            {masterVolume === 0 ? (
              <VolumeX className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Volume2 className="h-4 w-4 text-muted-foreground" />
            )}
            <Slider
              value={[masterVolume]}
              onValueChange={([v]) => setMasterVolume(v)}
              max={100}
              step={1}
              disabled={!enabled}
              className="flex-1"
            />
          </div>
        </div>

        {/* Individual Sound Controls */}
        <div className="space-y-4">
          <Label>Individual Sound Controls</Label>
          <div className="space-y-4">
            {soundTypes.map(({ type, label, description }) => (
              <div key={type} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`sound-${type}`}>{label}</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => testSound(type)}
                        disabled={!enabled || !preferences[type].enabled}
                      >
                        <Play className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">{description}</p>
                  </div>
                  <Switch
                    id={`sound-${type}`}
                    checked={preferences[type].enabled}
                    onCheckedChange={(checked) => toggleSoundType(type, checked)}
                    disabled={!enabled}
                  />
                </div>
                {preferences[type].enabled && (
                  <div className="flex items-center gap-3 pl-4">
                    <Volume2 className="h-3 w-3 text-muted-foreground" />
                    <Slider
                      value={[preferences[type].volume]}
                      onValueChange={([v]) => setSoundVolume(type, v)}
                      max={100}
                      step={1}
                      disabled={!enabled}
                      className="flex-1"
                    />
                    <span className="text-xs text-muted-foreground w-10 text-right">
                      {preferences[type].volume}%
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
