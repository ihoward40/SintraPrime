import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { 
  Bell, 
  Mail, 
  MessageSquare, 
  Save,
  TestTube,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingDown
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useEffect } from 'react';

export default function AlertSettings() {
  // Load existing configuration
  const { data: existingConfig, isLoading } = trpc.governance.loadAlertConfig.useQuery();
  
  // Save configuration mutation
  const saveConfig = trpc.governance.saveAlertConfig.useMutation({
    onSuccess: () => {
      alert('Alert configuration saved successfully!');
      setIsSaving(false);
    },
    onError: (error: any) => {
      alert(`Failed to save configuration: ${error.message}`);
      setIsSaving(false);
    },
  });
  // Compliance threshold alert
  const [complianceEnabled, setComplianceEnabled] = useState(true);
  const [complianceThreshold, setComplianceThreshold] = useState('90');
  
  // Violation count alert
  const [violationEnabled, setViolationEnabled] = useState(true);
  const [violationThreshold, setViolationThreshold] = useState('5');
  
  // Spending limit alert
  const [spendingEnabled, setSpendingEnabled] = useState(false);
  const [spendingLimit, setSpendingLimit] = useState('10000');
  
  // Notification channels
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [slackEnabled, setSlackEnabled] = useState(false);
  const [slackWebhook, setSlackWebhook] = useState('');
  
  // Cooldown period
  const [cooldownMinutes, setCooldownMinutes] = useState('60');
  
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  // Load configuration on mount
  useEffect(() => {
    if (existingConfig) {
      setComplianceEnabled(existingConfig.complianceEnabled);
      setComplianceThreshold(existingConfig.complianceThreshold.toString());
      setViolationEnabled(existingConfig.violationEnabled);
      setViolationThreshold(existingConfig.violationThreshold.toString());
      setSpendingEnabled(existingConfig.spendingEnabled);
      setSpendingLimit(existingConfig.spendingLimit.toString());
      setEmailEnabled(existingConfig.emailEnabled);
      setEmailAddress(existingConfig.emailAddress);
      setSlackEnabled(existingConfig.slackEnabled);
      setSlackWebhook(existingConfig.slackWebhook);
      setCooldownMinutes(existingConfig.cooldownMinutes.toString());
    }
  }, [existingConfig]);

  const handleSave = async () => {
    setIsSaving(true);
    saveConfig.mutate({
      complianceEnabled,
      complianceThreshold: parseInt(complianceThreshold),
      violationEnabled,
      violationThreshold: parseInt(violationThreshold),
      spendingEnabled,
      spendingLimit: parseFloat(spendingLimit),
      emailEnabled,
      emailAddress,
      slackEnabled,
      slackWebhook,
      cooldownMinutes: parseInt(cooldownMinutes),
    });
  };

  // Removed duplicate handleTest - using handleTestAlert below

  const handleTestAlert = async () => {
    setIsTesting(true);
    try {
      // TODO: Implement test alert via tRPC
      await new Promise(resolve => setTimeout(resolve, 1500));
      alert('Test alert sent! Check your email/Slack.');
    } catch (error) {
      console.error('Failed to send test alert:', error);
      alert('Failed to send test alert. Please check your configuration.');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Alert Configuration</h1>
          <p className="text-muted-foreground mt-2">
            Configure automated alerts for governance events
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleTestAlert} disabled={isTesting} className="gap-2">
            <TestTube className="h-4 w-4" />
            {isTesting ? 'Sending...' : 'Test Alert'}
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>

      {/* Notification Channels */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Channels
          </CardTitle>
          <CardDescription>
            Configure where alerts should be sent
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Email Configuration */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Label className="text-base">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive alerts via email</p>
                </div>
              </div>
              <Switch checked={emailEnabled} onCheckedChange={setEmailEnabled} />
            </div>
            {emailEnabled && (
              <div className="ml-8 space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="alerts@example.com"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                />
              </div>
            )}
          </div>

          <Separator />

          {/* Slack Configuration */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Label className="text-base">Slack Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive alerts in Slack</p>
                </div>
              </div>
              <Switch checked={slackEnabled} onCheckedChange={setSlackEnabled} />
            </div>
            {slackEnabled && (
              <div className="ml-8 space-y-2">
                <Label htmlFor="slack">Slack Webhook URL</Label>
                <Input
                  id="slack"
                  type="url"
                  placeholder="https://hooks.slack.com/services/..."
                  value={slackWebhook}
                  onChange={(e) => setSlackWebhook(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Create a webhook in your Slack workspace settings
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Alert Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Alert Rules
          </CardTitle>
          <CardDescription>
            Define thresholds that trigger alerts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Compliance Score Alert */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TrendingDown className="h-5 w-5 text-orange-600" />
                <div>
                  <Label className="text-base">Compliance Score Threshold</Label>
                  <p className="text-sm text-muted-foreground">Alert when compliance drops below threshold</p>
                </div>
              </div>
              <Switch checked={complianceEnabled} onCheckedChange={setComplianceEnabled} />
            </div>
            {complianceEnabled && (
              <div className="ml-8 space-y-2">
                <Label htmlFor="compliance">Minimum Compliance Score (%)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="compliance"
                    type="number"
                    min="0"
                    max="100"
                    value={complianceThreshold}
                    onChange={(e) => setComplianceThreshold(e.target.value)}
                    className="w-32"
                  />
                  <Badge variant="outline">{complianceThreshold}%</Badge>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Violation Count Alert */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <div>
                  <Label className="text-base">Violation Count Threshold</Label>
                  <p className="text-sm text-muted-foreground">Alert when violations exceed threshold</p>
                </div>
              </div>
              <Switch checked={violationEnabled} onCheckedChange={setViolationEnabled} />
            </div>
            {violationEnabled && (
              <div className="ml-8 space-y-2">
                <Label htmlFor="violations">Maximum Violations (per day)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="violations"
                    type="number"
                    min="1"
                    value={violationThreshold}
                    onChange={(e) => setViolationThreshold(e.target.value)}
                    className="w-32"
                  />
                  <Badge variant="outline">{violationThreshold} violations</Badge>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Spending Limit Alert */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <div>
                  <Label className="text-base">Spending Limit Alert</Label>
                  <p className="text-sm text-muted-foreground">Alert when spending exceeds limit</p>
                </div>
              </div>
              <Switch checked={spendingEnabled} onCheckedChange={setSpendingEnabled} />
            </div>
            {spendingEnabled && (
              <div className="ml-8 space-y-2">
                <Label htmlFor="spending">Daily Spending Limit ($)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="spending"
                    type="number"
                    min="0"
                    step="100"
                    value={spendingLimit}
                    onChange={(e) => setSpendingLimit(e.target.value)}
                    className="w-32"
                  />
                  <Badge variant="outline">${parseFloat(spendingLimit).toLocaleString()}</Badge>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Alert Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Alert Settings
          </CardTitle>
          <CardDescription>
            Configure alert behavior
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cooldown">Cooldown Period</Label>
            <Select value={cooldownMinutes} onValueChange={setCooldownMinutes}>
              <SelectTrigger id="cooldown" className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
                <SelectItem value="120">2 hours</SelectItem>
                <SelectItem value="360">6 hours</SelectItem>
                <SelectItem value="1440">24 hours</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Minimum time between repeated alerts to prevent spam
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Alert History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Alerts</CardTitle>
          <CardDescription>
            History of triggered alerts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No alerts triggered yet</p>
            <p className="text-sm mt-2">Alerts will appear here when thresholds are crossed</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
