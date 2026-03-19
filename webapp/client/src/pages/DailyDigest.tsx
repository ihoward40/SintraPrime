import { useState } from "react";
import { Mail, Bell, Clock, Calendar, Brain, BarChart2, CheckCircle, Play, Mic, Command } from "lucide-react";
import { trpc } from "../lib/trpc";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Switch } from "../components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Input } from "../components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { useToast } from "../hooks/use-toast";

const TIMEZONES = [
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "America/Phoenix", "Pacific/Honolulu", "America/Anchorage", "Europe/London",
  "Europe/Paris", "Asia/Tokyo", "Australia/Sydney",
];

export default function DailyDigest() {
  const { toast } = useToast();
  const [voiceCommand, setVoiceCommand] = useState("");
  const [voiceResult, setVoiceResult] = useState<any>(null);
  const [digestPreview, setDigestPreview] = useState<{ subject: string; body: string } | null>(null);

  const { data: settings, refetch } = trpc.digestVoice.getDigestSettings.useQuery();
  const { data: voiceCommands } = trpc.digestVoice.getVoiceCommands.useQuery();
  const updateSettings = trpc.digestVoice.updateDigestSettings.useMutation();
  const previewDigest = trpc.digestVoice.previewDigest.useMutation();
  const processCommand = trpc.digestVoice.processVoiceCommand.useMutation();

  const handleUpdate = async (updates: Record<string, any>) => {
    await updateSettings.mutateAsync(updates);
    refetch();
    toast({ title: "Settings saved!" });
  };

  const handlePreview = async () => {
    const result = await previewDigest.mutateAsync({ caseCount: 3 });
    setDigestPreview(result);
  };

  const handleProcessCommand = async () => {
    if (!voiceCommand.trim()) return;
    const result = await processCommand.mutateAsync({ command: voiceCommand });
    setVoiceResult(result);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-pink-500/10 rounded-lg">
          <Mail className="h-6 w-6 text-pink-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Daily Digest & Voice Commands</h1>
          <p className="text-gray-400 text-sm">Configure your daily AI briefing and voice command interface</p>
        </div>
      </div>

      <Tabs defaultValue="digest">
        <TabsList className="bg-gray-800 border-gray-700">
          <TabsTrigger value="digest">Daily Digest</TabsTrigger>
          <TabsTrigger value="voice">Voice Commands</TabsTrigger>
        </TabsList>

        {/* Daily Digest Tab */}
        <TabsContent value="digest" className="space-y-4">
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Bell className="h-4 w-4 text-pink-400" /> Digest Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-sm font-medium">Enable Daily Digest</p>
                  <p className="text-gray-400 text-xs">Receive a daily AI briefing of your case activity</p>
                </div>
                <Switch checked={settings?.enabled ?? true} onCheckedChange={v => handleUpdate({ enabled: v })} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Frequency</label>
                  <Select value={settings?.frequency ?? "daily"} onValueChange={v => handleUpdate({ frequency: v })}>
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="daily" className="text-white">Daily</SelectItem>
                      <SelectItem value="weekly" className="text-white">Weekly</SelectItem>
                      <SelectItem value="never" className="text-white">Never</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Send Time</label>
                  <Input
                    type="time"
                    value={settings?.sendTime ?? "08:00"}
                    onChange={e => handleUpdate({ sendTime: e.target.value })}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-gray-400 text-xs mb-1 block">Timezone</label>
                <Select value={settings?.timezone ?? "America/New_York"} onValueChange={v => handleUpdate({ timezone: v })}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {TIMEZONES.map(tz => (
                      <SelectItem key={tz} value={tz} className="text-white">{tz}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3 border-t border-gray-700 pt-4">
                <p className="text-gray-400 text-xs font-medium uppercase tracking-wide">Include in Digest</p>
                {[
                  { key: "includeDeadlines", label: "Upcoming Deadlines", icon: Calendar, desc: "Deadlines in the next 7 days" },
                  { key: "includeCaseUpdates", label: "Case Activity", icon: CheckCircle, desc: "Recent case updates and changes" },
                  { key: "includeAIInsights", label: "AI Insights", icon: Brain, desc: "Strategic tips and AI recommendations" },
                  { key: "includeTimeTracking", label: "Time Tracking Summary", icon: BarChart2, desc: "Hours logged and billing status" },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <item.icon className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-white text-sm">{item.label}</p>
                        <p className="text-gray-500 text-xs">{item.desc}</p>
                      </div>
                    </div>
                    <Switch
                      checked={(settings as any)?.[item.key] ?? true}
                      onCheckedChange={v => handleUpdate({ [item.key]: v })}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Play className="h-4 w-4 text-green-400" /> Preview Digest
              </CardTitle>
              <CardDescription className="text-gray-400">Generate a sample digest to see what you'll receive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={handlePreview} className="bg-green-600 hover:bg-green-700" disabled={previewDigest.isPending}>
                <Play className="h-4 w-4 mr-2" />
                {previewDigest.isPending ? "Generating..." : "Generate Preview"}
              </Button>
              {digestPreview && (
                <div className="bg-gray-900 rounded-lg p-4 border border-gray-700 space-y-3">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-pink-400" />
                    <p className="text-white text-sm font-medium">{digestPreview.subject}</p>
                  </div>
                  <p className="text-gray-300 text-sm whitespace-pre-wrap">{digestPreview.body}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Voice Commands Tab */}
        <TabsContent value="voice" className="space-y-4">
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Command className="h-4 w-4 text-blue-400" /> Command Tester
              </CardTitle>
              <CardDescription className="text-gray-400">Test how SintraPrime interprets voice commands</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Mic className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Type a voice command to test..."
                    value={voiceCommand}
                    onChange={e => setVoiceCommand(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleProcessCommand()}
                    className="pl-9 bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <Button onClick={handleProcessCommand} className="bg-blue-600 hover:bg-blue-700" disabled={!voiceCommand.trim() || processCommand.isPending}>
                  Parse
                </Button>
              </div>
              {voiceResult && (
                <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
                  <p className="text-gray-400 text-xs mb-2">Parsed Action:</p>
                  <pre className="text-green-400 text-xs font-mono">{JSON.stringify(voiceResult, null, 2)}</pre>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white text-base">Available Voice Commands</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {voiceCommands?.map((cmd, i) => (
                  <div key={i} className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/50">
                    <div className="flex items-start gap-3">
                      <Mic className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-white text-sm font-mono">{cmd.command}</p>
                        <p className="text-gray-400 text-xs mt-1">{cmd.description}</p>
                        <p className="text-gray-600 text-xs mt-1 italic">e.g. "{cmd.example}"</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
