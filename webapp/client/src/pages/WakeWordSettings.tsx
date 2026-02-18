import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { Mic, Volume2, Zap, Settings2, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";

export default function WakeWordSettings() {
  const [enabled, setEnabled] = useState(true);
  const [wakePhrase, setWakePhrase] = useState("Hey SintraPrime");
  const [sensitivity, setSensitivity] = useState([70]);
  const [autoActivateVoice, setAutoActivateVoice] = useState(true);
  const [showVisualFeedback, setShowVisualFeedback] = useState(true);
  const [playSound, setPlaySound] = useState(false);
  const [continuousListening, setContinuousListening] = useState(true);

  const handleSave = () => {
    // In production, save to database or local storage
    toast.success("Wake-word settings saved successfully");
  };

  const handleReset = () => {
    setEnabled(true);
    setWakePhrase("Hey SintraPrime");
    setSensitivity([70]);
    setAutoActivateVoice(true);
    setShowVisualFeedback(true);
    setPlaySound(false);
    setContinuousListening(true);
    toast.info("Settings reset to defaults");
  };

  const getSensitivityLabel = (value: number) => {
    if (value < 40) return "Very Low";
    if (value < 60) return "Low";
    if (value < 80) return "Medium";
    if (value < 95) return "High";
    return "Very High";
  };

  const getSensitivityColor = (value: number) => {
    if (value < 40) return "text-gray-500";
    if (value < 60) return "text-blue-500";
    if (value < 80) return "text-green-500";
    if (value < 95) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Mic className="h-8 w-8" />
            Wake-Word Settings
          </h1>
          <p className="text-muted-foreground mt-2">
            Configure hands-free voice activation for AI Assistant
          </p>
        </div>

        {/* Status Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Wake-Word Detection</CardTitle>
                <CardDescription>
                  Enable hands-free voice control with custom wake phrases
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={enabled ? "default" : "secondary"}>
                  {enabled ? "Enabled" : "Disabled"}
                </Badge>
                <Switch checked={enabled} onCheckedChange={setEnabled} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-lg border bg-muted/50">
                <Mic className={`h-8 w-8 ${enabled ? "text-blue-500 animate-pulse" : "text-muted-foreground"}`} />
                <div>
                  <p className="font-medium">Current Wake Phrase</p>
                  <p className="text-2xl font-bold text-primary">{wakePhrase}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Wake Phrase Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Wake Phrase Configuration
            </CardTitle>
            <CardDescription>
              Customize your wake phrase and detection settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="wake-phrase">Custom Wake Phrase</Label>
              <Input
                id="wake-phrase"
                value={wakePhrase}
                onChange={(e) => setWakePhrase(e.target.value)}
                placeholder="Enter custom wake phrase"
                disabled={!enabled}
              />
              <p className="text-xs text-muted-foreground">
                Recommended: 2-4 words for best accuracy. Avoid common phrases.
              </p>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="sensitivity">Detection Sensitivity</Label>
                <Badge variant="outline" className={getSensitivityColor(sensitivity[0])}>
                  {getSensitivityLabel(sensitivity[0])}
                </Badge>
              </div>
              <Slider
                id="sensitivity"
                min={0}
                max={100}
                step={5}
                value={sensitivity}
                onValueChange={setSensitivity}
                disabled={!enabled}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Less sensitive (fewer false positives)</span>
                <span>More sensitive (may trigger accidentally)</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Current: {sensitivity[0]}% - {getSensitivityLabel(sensitivity[0])} sensitivity
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Behavior Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Behavior Settings
            </CardTitle>
            <CardDescription>
              Configure what happens when wake-word is detected
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-voice">Auto-activate Voice Input</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically start recording when wake-word is detected
                </p>
              </div>
              <Switch
                id="auto-voice"
                checked={autoActivateVoice}
                onCheckedChange={setAutoActivateVoice}
                disabled={!enabled}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="visual-feedback">Show Visual Feedback</Label>
                <p className="text-sm text-muted-foreground">
                  Display pulsing microphone icon when listening
                </p>
              </div>
              <Switch
                id="visual-feedback"
                checked={showVisualFeedback}
                onCheckedChange={setShowVisualFeedback}
                disabled={!enabled}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="play-sound">Play Activation Sound</Label>
                <p className="text-sm text-muted-foreground">
                  Play audio confirmation when wake-word is detected
                </p>
              </div>
              <Switch
                id="play-sound"
                checked={playSound}
                onCheckedChange={setPlaySound}
                disabled={!enabled}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="continuous">Continuous Listening</Label>
                <p className="text-sm text-muted-foreground">
                  Keep listening for wake-word after each activation
                </p>
              </div>
              <Switch
                id="continuous"
                checked={continuousListening}
                onCheckedChange={setContinuousListening}
                disabled={!enabled}
              />
            </div>
          </CardContent>
        </Card>

        {/* Alternative Wake Phrases */}
        <Card>
          <CardHeader>
            <CardTitle>Alternative Wake Phrases</CardTitle>
            <CardDescription>
              Add multiple wake phrases for flexibility
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Hey SintraPrime</Badge>
                <Badge variant="outline">Primary</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Legal Assistant</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Start Listening</Badge>
              </div>
              <Button variant="outline" size="sm" disabled={!enabled}>
                Add Alternative Phrase
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Privacy Notice */}
        <Card className="border-yellow-500/30 bg-yellow-50/50 dark:bg-yellow-950/10">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Volume2 className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Privacy Notice
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-300">
                  Wake-word detection runs locally in your browser. Audio is only processed when the wake phrase is detected. No audio is sent to servers unless you explicitly activate voice input.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={!enabled}>
            <Save className="h-4 w-4 mr-2" />
            Save Settings
          </Button>
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
