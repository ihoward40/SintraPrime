import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Shield, DollarSign, Bell, CheckCircle2, AlertTriangle } from 'lucide-react';
import { trpc } from '@/lib/trpc';

export default function GovernanceSettings() {
  // Fetch existing settings
  const { data: existingSettings, isLoading } = trpc.governanceSettings.get.useQuery();
  
  const [dailyLimit, setDailyLimit] = useState('1000');
  const [weeklyLimit, setWeeklyLimit] = useState('5000');
  const [monthlyLimit, setMonthlyLimit] = useState('20000');
  const [approvalThreshold, setApprovalThreshold] = useState('500');
  const [enableNotifications, setEnableNotifications] = useState(true);
  const [enableAutoBlock, setEnableAutoBlock] = useState(true);
  const [saved, setSaved] = useState(false);
  
  // Update local state when settings are loaded
  useEffect(() => {
    if (existingSettings) {
      setDailyLimit(existingSettings.dailyLimit);
      setWeeklyLimit(existingSettings.weeklyLimit);
      setMonthlyLimit(existingSettings.monthlyLimit);
      setApprovalThreshold(existingSettings.approvalThreshold);
      setEnableNotifications(existingSettings.enableNotifications);
      setEnableAutoBlock(existingSettings.enableAutoBlock);
    }
  }, [existingSettings]);
  
  const updateSettings = trpc.governanceSettings.update.useMutation({
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
    onError: (error) => {
      alert(`Error saving settings: ${error.message}`);
    },
  });

  const handleSave = () => {
    updateSettings.mutate({
      dailyLimit,
      weeklyLimit,
      monthlyLimit,
      approvalThreshold,
      enableNotifications,
      enableAutoBlock,
    });
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Governance Settings</h1>
          <p className="text-muted-foreground mt-2">
            Configure spending limits, approval thresholds, and policy gates
          </p>
        </div>
        <Button onClick={handleSave} className="gap-2">
          {saved ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Saved
            </>
          ) : (
            'Save Settings'
          )}
        </Button>
      </div>

      <Separator />

      {/* Spending Limits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Spending Limits
          </CardTitle>
          <CardDescription>
            Set maximum spending limits for different time periods
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="dailyLimit">Daily Limit ($)</Label>
              <Input
                id="dailyLimit"
                type="number"
                value={dailyLimit}
                onChange={(e) => setDailyLimit(e.target.value)}
                placeholder="1000"
              />
              <p className="text-sm text-muted-foreground">
                Maximum spending per day
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="weeklyLimit">Weekly Limit ($)</Label>
              <Input
                id="weeklyLimit"
                type="number"
                value={weeklyLimit}
                onChange={(e) => setWeeklyLimit(e.target.value)}
                placeholder="5000"
              />
              <p className="text-sm text-muted-foreground">
                Maximum spending per week
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthlyLimit">Monthly Limit ($)</Label>
              <Input
                id="monthlyLimit"
                type="number"
                value={monthlyLimit}
                onChange={(e) => setMonthlyLimit(e.target.value)}
                placeholder="20000"
              />
              <p className="text-sm text-muted-foreground">
                Maximum spending per month
              </p>
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-900 dark:text-amber-100">
                  Spending Limit Warnings
                </h4>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  You'll receive notifications when spending reaches 80% of any limit.
                  Operations exceeding limits will require approval.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Approval Thresholds */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Approval Thresholds
          </CardTitle>
          <CardDescription>
            Configure when operations require manual approval
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="approvalThreshold">High-Risk Operation Threshold ($)</Label>
            <Input
              id="approvalThreshold"
              type="number"
              value={approvalThreshold}
              onChange={(e) => setApprovalThreshold(e.target.value)}
              placeholder="500"
            />
            <p className="text-sm text-muted-foreground">
              Operations costing more than this amount will require approval
            </p>
          </div>

          <div className="flex items-center justify-between space-x-4 rounded-lg border p-4">
            <div className="flex-1 space-y-1">
              <Label htmlFor="autoBlock" className="text-base">
                Auto-block Violations
              </Label>
              <p className="text-sm text-muted-foreground">
                Automatically block operations that violate policy gates
              </p>
            </div>
            <Switch
              id="autoBlock"
              checked={enableAutoBlock}
              onCheckedChange={setEnableAutoBlock}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>
            Configure how you receive governance alerts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between space-x-4 rounded-lg border p-4">
            <div className="flex-1 space-y-1">
              <Label htmlFor="notifications" className="text-base">
                Enable Real-Time Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Show toast notifications for policy violations and approval requests
              </p>
            </div>
            <Switch
              id="notifications"
              checked={enableNotifications}
              onCheckedChange={setEnableNotifications}
            />
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              For email and Slack notifications, visit{' '}
              <a href="/settings/notifications" className="font-medium underline">
                Notification Settings
              </a>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Policy Gates Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Active Policy Gates</CardTitle>
          <CardDescription>
            Current policy rules enforced by the governance system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-green-900 dark:text-green-100">
                  Spending Limits Enforced
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Daily: ${dailyLimit} | Weekly: ${weeklyLimit} | Monthly: ${monthlyLimit}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-green-900 dark:text-green-100">
                  Approval Workflow Active
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Operations over ${approvalThreshold} require manual approval
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-green-900 dark:text-green-100">
                  Cryptographic Audit Trail
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  All operations logged with SHA-256 verification
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
