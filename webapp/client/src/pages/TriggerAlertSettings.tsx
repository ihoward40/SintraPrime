import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, Settings, Save, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';

export default function TriggerAlertSettings() {
  // Global settings
  const [globalEnabled, setGlobalEnabled] = useState(true);
  const [globalSuccessRateThreshold, setGlobalSuccessRateThreshold] = useState([80]);
  const [globalExecutionTimeThreshold, setGlobalExecutionTimeThreshold] = useState([5]);
  const [globalCheckInterval, setGlobalCheckInterval] = useState('daily');
  const [notifyOwner, setNotifyOwner] = useState(true);
  const [notifyInApp, setNotifyInApp] = useState(true);

  // Fetch triggers for per-trigger configuration
  const { data: triggers = [] } = trpc.workflowTriggers.list.useQuery();

  // Per-trigger settings
  const [perTriggerSettings, setPerTriggerSettings] = useState<Record<number, {
    enabled: boolean;
    successRateThreshold: number;
    executionTimeThreshold: number;
    checkInterval: string;
  }>>({});

  const handleSaveGlobal = () => {
    toast.success('Global alert settings saved');
    // In production, call trpc.triggerAlerts.updateAlertConfig.mutate()
  };

  const handleSavePerTrigger = (triggerId: number) => {
    toast.success(`Alert settings saved for trigger #${triggerId}`);
    // In production, call trpc.triggerAlerts.updateAlertConfig.mutate()
  };

  const getPreviewConditions = (successRate: number, execTime: number) => {
    return [
      `Success rate drops below ${successRate}%`,
      `Execution time exceeds ${execTime} seconds`,
      `No matches detected for 24+ hours`,
      `Failure rate exceeds 20%`,
    ];
  };

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Settings className="w-8 h-8" />
            Trigger Alert Settings
          </h1>
          <p className="text-muted-foreground mt-2">
            Configure trigger performance monitoring and alert thresholds
          </p>
        </div>
      </div>

      {/* Global Settings */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Global Alert Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="global-enabled" className="text-base font-semibold">
                Enable Alert Monitoring
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Monitor all triggers for performance issues and send alerts
              </p>
            </div>
            <Switch
              id="global-enabled"
              checked={globalEnabled}
              onCheckedChange={setGlobalEnabled}
            />
          </div>

          {globalEnabled && (
            <>
              {/* Success Rate Threshold */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">
                    Success Rate Threshold
                  </Label>
                  <Badge variant="outline">{globalSuccessRateThreshold[0]}%</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Alert when trigger success rate falls below this percentage
                </p>
                <Slider
                  value={globalSuccessRateThreshold}
                  onValueChange={setGlobalSuccessRateThreshold}
                  min={50}
                  max={100}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>50%</span>
                  <span>75%</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Execution Time Threshold */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">
                    Execution Time Threshold
                  </Label>
                  <Badge variant="outline">{globalExecutionTimeThreshold[0]}s</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Alert when workflow execution time exceeds this duration
                </p>
                <Slider
                  value={globalExecutionTimeThreshold}
                  onValueChange={setGlobalExecutionTimeThreshold}
                  min={1}
                  max={30}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1s</span>
                  <span>15s</span>
                  <span>30s</span>
                </div>
              </div>

              {/* Check Interval */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">
                  Check Interval
                </Label>
                <p className="text-sm text-muted-foreground">
                  How often to check trigger performance metrics
                </p>
                <Select value={globalCheckInterval} onValueChange={setGlobalCheckInterval}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Every Hour</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Notification Preferences */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">
                  Notification Channels
                </Label>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="notify-owner">Owner Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Send critical alerts to project owner via Manus notifications
                    </p>
                  </div>
                  <Switch
                    id="notify-owner"
                    checked={notifyOwner}
                    onCheckedChange={setNotifyOwner}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="notify-in-app">In-App Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Show alerts in the SintraPrime notification center
                    </p>
                  </div>
                  <Switch
                    id="notify-in-app"
                    checked={notifyInApp}
                    onCheckedChange={setNotifyInApp}
                  />
                </div>
              </div>

              {/* Preview */}
              <Card className="bg-muted/50">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Alert Conditions Preview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    Alerts will be triggered when:
                  </p>
                  <ul className="space-y-2">
                    {getPreviewConditions(
                      globalSuccessRateThreshold[0],
                      globalExecutionTimeThreshold[0]
                    ).map((condition, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                        <span>{condition}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Save Button */}
              <Button onClick={handleSaveGlobal} className="w-full">
                <Save className="w-4 h-4 mr-2" />
                Save Global Settings
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Per-Trigger Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Per-Trigger Alert Configuration</CardTitle>
          <p className="text-sm text-muted-foreground">
            Override global settings for specific triggers
          </p>
        </CardHeader>
        <CardContent>
          {triggers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No triggers configured yet</p>
              <p className="text-sm mt-2">Create triggers to configure per-trigger alerts</p>
            </div>
          ) : (
            <div className="space-y-6">
              {triggers.slice(0, 3).map((trigger) => {
                const settings = perTriggerSettings[trigger.id] || {
                  enabled: false,
                  successRateThreshold: 80,
                  executionTimeThreshold: 5,
                  checkInterval: 'daily',
                };

                return (
                  <Card key={trigger.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="pt-6 space-y-4">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold">{trigger.name}</h4>
                            <Badge variant={trigger.isActive ? "default" : "secondary"}>
                              {trigger.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Type: {trigger.triggerType} • Keywords: {trigger.keywords?.join(', ') || 'None'}
                          </p>
                        </div>
                        <Switch
                          checked={settings.enabled}
                          onCheckedChange={(checked) => {
                            setPerTriggerSettings({
                              ...perTriggerSettings,
                              [trigger.id]: { ...settings, enabled: checked },
                            });
                          }}
                        />
                      </div>

                      {settings.enabled && (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm">Success Rate Threshold</Label>
                              <div className="flex items-center gap-2 mt-2">
                                <Slider
                                  value={[settings.successRateThreshold]}
                                  onValueChange={([value]) => {
                                    setPerTriggerSettings({
                                      ...perTriggerSettings,
                                      [trigger.id]: { ...settings, successRateThreshold: value },
                                    });
                                  }}
                                  min={50}
                                  max={100}
                                  step={5}
                                  className="flex-1"
                                />
                                <Badge variant="outline" className="w-12 justify-center">
                                  {settings.successRateThreshold}%
                                </Badge>
                              </div>
                            </div>

                            <div>
                              <Label className="text-sm">Execution Time Threshold</Label>
                              <div className="flex items-center gap-2 mt-2">
                                <Slider
                                  value={[settings.executionTimeThreshold]}
                                  onValueChange={([value]) => {
                                    setPerTriggerSettings({
                                      ...perTriggerSettings,
                                      [trigger.id]: { ...settings, executionTimeThreshold: value },
                                    });
                                  }}
                                  min={1}
                                  max={30}
                                  step={1}
                                  className="flex-1"
                                />
                                <Badge variant="outline" className="w-12 justify-center">
                                  {settings.executionTimeThreshold}s
                                </Badge>
                              </div>
                            </div>
                          </div>

                          <div>
                            <Label className="text-sm">Check Interval</Label>
                            <Select
                              value={settings.checkInterval}
                              onValueChange={(value) => {
                                setPerTriggerSettings({
                                  ...perTriggerSettings,
                                  [trigger.id]: { ...settings, checkInterval: value },
                                });
                              }}
                            >
                              <SelectTrigger className="mt-2">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="hourly">Every Hour</SelectItem>
                                <SelectItem value="daily">Daily</SelectItem>
                                <SelectItem value="weekly">Weekly</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <Button
                            onClick={() => handleSavePerTrigger(trigger.id)}
                            size="sm"
                            className="w-full"
                          >
                            <Save className="w-4 h-4 mr-2" />
                            Save Settings for This Trigger
                          </Button>
                        </>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
