import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Mic, MicOff, Activity } from 'lucide-react';
import { useWakeWord } from '@/hooks/useWakeWord';
import { useState } from 'react';

interface WakeWordSettingsProps {
  onWakeWordDetected?: () => void;
}

export function WakeWordSettings({ onWakeWordDetected }: WakeWordSettingsProps) {
  const [sensitivity, setSensitivity] = useState(0.7);
  
  const { isListening, isEnabled, lastDetection, toggleEnabled } = useWakeWord({
    wakeWord: 'hey sintra prime',
    enabled: false,
    sensitivity,
    onWakeWordDetected,
    onListeningChange: (listening) => {
      console.log('[WakeWord] Listening state changed:', listening);
    },
  });

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">Wake Word Detection</h3>
          <p className="text-sm text-muted-foreground">
            Enable hands-free operation by saying "Hey SintraPrime"
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isListening ? (
              <Mic className="h-5 w-5 text-green-500 animate-pulse" />
            ) : (
              <MicOff className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <Label htmlFor="wake-word-toggle" className="text-base">
                Enable Wake Word
              </Label>
              <p className="text-sm text-muted-foreground">
                {isListening ? 'Listening for wake word...' : 'Wake word detection off'}
              </p>
            </div>
          </div>
          <Switch
            id="wake-word-toggle"
            checked={isEnabled}
            onCheckedChange={toggleEnabled}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="sensitivity-slider">
              Sensitivity
            </Label>
            <span className="text-sm text-muted-foreground">
              {Math.round(sensitivity * 100)}%
            </span>
          </div>
          <Slider
            id="sensitivity-slider"
            min={0.5}
            max={1}
            step={0.05}
            value={[sensitivity]}
            onValueChange={(value) => setSensitivity(value[0])}
            disabled={!isEnabled}
          />
          <p className="text-xs text-muted-foreground">
            Higher sensitivity may trigger more false positives
          </p>
        </div>

        {lastDetection && (
          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-md">
            <Activity className="h-4 w-4 text-green-600 dark:text-green-400" />
            <div className="text-sm">
              <span className="font-medium text-green-900 dark:text-green-100">
                Last detected:
              </span>
              <span className="text-green-700 dark:text-green-300 ml-2">
                {lastDetection.toLocaleTimeString()}
              </span>
            </div>
          </div>
        )}

        <div className="p-4 bg-muted rounded-md">
          <h4 className="text-sm font-medium mb-2">How it works</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Say "Hey SintraPrime" to activate voice input</li>
            <li>• Works continuously in the background</li>
            <li>• Adjust sensitivity if detection is too sensitive or not sensitive enough</li>
            <li>• Your browser will request microphone permission</li>
          </ul>
        </div>
      </div>
    </Card>
  );
}
