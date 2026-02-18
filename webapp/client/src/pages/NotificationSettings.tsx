import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

import { Bell, Mail, MessageSquare, TestTube } from 'lucide-react';

export default function NotificationSettings() {
  // Fetch current settings
  const { data: settings, isLoading } = trpc.notificationSettings.get.useQuery();
  const saveSettings = trpc.notificationSettings.save.useMutation();
  const sendTest = trpc.notificationSettings.sendTest.useMutation();
  
  // State for notification settings
  const [slackEnabled, setSlackEnabled] = useState(false);
  const [slackWebhookUrl, setSlackWebhookUrl] = useState('');
  const [slackChannel, setSlackChannel] = useState('');
  
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [emailRecipients, setEmailRecipients] = useState('');
  
  // Event type toggles
  const [notifyHighSeverity, setNotifyHighSeverity] = useState(true);
  const [notifyPolicyViolations, setNotifyPolicyViolations] = useState(true);
  const [notifySpendingThresholds, setNotifySpendingThresholds] = useState(true);
  const [notifyApprovalRequests, setNotifyApprovalRequests] = useState(true);
  const [notifyComplianceIssues, setNotifyComplianceIssues] = useState(true);
  
  // Threshold settings
  const [spendingThreshold, setSpendingThreshold] = useState('80');
  
  const handleSaveSettings = async () => {
    try {
      await saveSettings.mutateAsync({
        slackEnabled,
        slackWebhookUrl,
        slackChannel,
        emailEnabled,
        emailRecipients,
        notifyHighSeverity,
        notifyPolicyViolations,
        notifySpendingThresholds,
        notifyApprovalRequests,
        notifyComplianceIssues,
        spendingThresholdPercent: parseInt(spendingThreshold),
      });
      alert('Settings saved successfully!');
    } catch (error) {
      alert('Failed to save settings: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };
  
  const handleTestNotification = async () => {
    try {
      const results = await sendTest.mutateAsync();
      const messages = [];
      if (results.slack) messages.push('Slack');
      if (results.email) messages.push('Email');
      
      if (messages.length > 0) {
        alert(`Test notification sent to: ${messages.join(', ')}`);
      } else {
        alert('No notifications sent. Please enable and configure at least one channel.');
      }
    } catch (error) {
      alert('Failed to send test: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };
  
  // Load settings when they arrive
  useEffect(() => {
    if (settings) {
      setSlackEnabled(settings.slackEnabled);
      setSlackWebhookUrl(settings.slackWebhookUrl || '');
      setSlackChannel(settings.slackChannel || '');
      setEmailEnabled(settings.emailEnabled);
      setEmailRecipients(settings.emailRecipients || '');
      setNotifyHighSeverity(settings.notifyHighSeverity);
      setNotifyPolicyViolations(settings.notifyPolicyViolations);
      setNotifySpendingThresholds(settings.notifySpendingThresholds);
      setNotifyApprovalRequests(settings.notifyApprovalRequests);
      setNotifyComplianceIssues(settings.notifyComplianceIssues);
      setSpendingThreshold(settings.spendingThresholdPercent.toString());
    }
  }, [settings]);
  
  if (isLoading) {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <div className="text-center">Loading settings...</div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Notification Settings</h1>
        <p className="text-muted-foreground">
          Configure how you receive alerts for governance events
        </p>
      </div>
      
      <div className="space-y-6">
        {/* Slack Configuration */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-purple-500" />
              <div>
                <h2 className="text-xl font-semibold">Slack Notifications</h2>
                <p className="text-sm text-muted-foreground">
                  Receive alerts in your Slack workspace
                </p>
              </div>
            </div>
            <Switch
              checked={slackEnabled}
              onCheckedChange={setSlackEnabled}
            />
          </div>
          
          {slackEnabled && (
            <div className="space-y-4 mt-4 pt-4 border-t">
              <div>
                <Label htmlFor="slack-webhook">Webhook URL</Label>
                <Input
                  id="slack-webhook"
                  type="url"
                  placeholder="https://hooks.slack.com/services/..."
                  value={slackWebhookUrl}
                  onChange={(e) => setSlackWebhookUrl(e.target.value)}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Create a webhook URL in your Slack workspace settings
                </p>
              </div>
              
              <div>
                <Label htmlFor="slack-channel">Channel (optional)</Label>
                <Input
                  id="slack-channel"
                  placeholder="#governance-alerts"
                  value={slackChannel}
                  onChange={(e) => setSlackChannel(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          )}
        </Card>
        
        {/* Email Configuration */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-blue-500" />
              <div>
                <h2 className="text-xl font-semibold">Email Notifications</h2>
                <p className="text-sm text-muted-foreground">
                  Receive alerts via email
                </p>
              </div>
            </div>
            <Switch
              checked={emailEnabled}
              onCheckedChange={setEmailEnabled}
            />
          </div>
          
          {emailEnabled && (
            <div className="mt-4 pt-4 border-t">
              <Label htmlFor="email-recipients">Recipients</Label>
              <Input
                id="email-recipients"
                type="text"
                placeholder="admin@example.com, team@example.com"
                value={emailRecipients}
                onChange={(e) => setEmailRecipients(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Separate multiple email addresses with commas
              </p>
            </div>
          )}
        </Card>
        
        {/* Event Types */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Bell className="h-5 w-5 text-orange-500" />
            <div>
              <h2 className="text-xl font-semibold">Event Types</h2>
              <p className="text-sm text-muted-foreground">
                Choose which events trigger notifications
              </p>
            </div>
          </div>
          
          <div className="space-y-4 mt-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div>
                <Label>High-Severity Events</Label>
                <p className="text-sm text-muted-foreground">
                  Actions that require immediate review
                </p>
              </div>
              <Switch
                checked={notifyHighSeverity}
                onCheckedChange={setNotifyHighSeverity}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Policy Violations</Label>
                <p className="text-sm text-muted-foreground">
                  When governance policies are violated
                </p>
              </div>
              <Switch
                checked={notifyPolicyViolations}
                onCheckedChange={setNotifyPolicyViolations}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Spending Thresholds</Label>
                <p className="text-sm text-muted-foreground">
                  When spending reaches configured limits
                </p>
              </div>
              <Switch
                checked={notifySpendingThresholds}
                onCheckedChange={setNotifySpendingThresholds}
              />
            </div>
            
            {notifySpendingThresholds && (
              <div className="ml-6 pl-4 border-l-2">
                <Label htmlFor="spending-threshold">Alert Threshold (%)</Label>
                <Input
                  id="spending-threshold"
                  type="number"
                  min="1"
                  max="100"
                  value={spendingThreshold}
                  onChange={(e) => setSpendingThreshold(e.target.value)}
                  className="mt-1 max-w-xs"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Notify when spending reaches this percentage of the limit
                </p>
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Approval Requests</Label>
                <p className="text-sm text-muted-foreground">
                  When actions require manual approval
                </p>
              </div>
              <Switch
                checked={notifyApprovalRequests}
                onCheckedChange={setNotifyApprovalRequests}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Compliance Issues</Label>
                <p className="text-sm text-muted-foreground">
                  When compliance problems are detected
                </p>
              </div>
              <Switch
                checked={notifyComplianceIssues}
                onCheckedChange={setNotifyComplianceIssues}
              />
            </div>
          </div>
        </Card>
        
        {/* Actions */}
        <div className="flex gap-4">
          <Button onClick={handleSaveSettings} className="flex-1">
            Save Settings
          </Button>
          <Button
            onClick={handleTestNotification}
            variant="outline"
            className="flex items-center gap-2"
          >
            <TestTube className="h-4 w-4" />
            Send Test Notification
          </Button>
        </div>
      </div>
    </div>
  );
}
