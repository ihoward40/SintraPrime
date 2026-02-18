import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTierGate } from "@/hooks/useTierGate";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  User,
  Bell,
  CreditCard,
  MapPin,
  Shield,
  Zap,
  ExternalLink,
  Check,
  Crown,
} from "lucide-react";
import SoundSettings from "@/components/SoundSettings";

const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
  "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
  "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan",
  "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
  "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
  "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia",
  "Wisconsin", "Wyoming", "District of Columbia",
];

const TIER_FEATURES: Record<string, string[]> = {
  free: ["2 cases", "10 AI messages/day", "50MB storage", "Basic templates"],
  pro: ["Unlimited cases", "Unlimited AI messages", "5GB storage", "Quantum Workspace", "PDF export", "All templates"],
  coalition: ["Everything in Pro", "10 team members", "Shared workspace", "25GB storage", "Priority support"],
  enterprise: ["Everything in Coalition", "Unlimited team members", "100GB storage", "Custom integrations", "Dedicated support"],
};

export default function Settings() {
  const { user } = useAuth();
  const tier = (user as any)?.subscriptionTier || "free";

  // Notification preferences (local state, persisted to localStorage)
  const [notifDeadlines, setNotifDeadlines] = useState(true);
  const [notifCaseUpdates, setNotifCaseUpdates] = useState(true);
  const [notifCoalition, setNotifCoalition] = useState(true);
  const [notifAiSuggestions, setNotifAiSuggestions] = useState(false);
  const [defaultJurisdiction, setDefaultJurisdiction] = useState("Federal");

  // Load preferences from localStorage
  useEffect(() => {
    const prefs = localStorage.getItem("sintraprime_prefs");
    if (prefs) {
      try {
        const parsed = JSON.parse(prefs);
        if (parsed.notifDeadlines !== undefined) setNotifDeadlines(parsed.notifDeadlines);
        if (parsed.notifCaseUpdates !== undefined) setNotifCaseUpdates(parsed.notifCaseUpdates);
        if (parsed.notifCoalition !== undefined) setNotifCoalition(parsed.notifCoalition);
        if (parsed.notifAiSuggestions !== undefined) setNotifAiSuggestions(parsed.notifAiSuggestions);
        if (parsed.defaultJurisdiction) setDefaultJurisdiction(parsed.defaultJurisdiction);
      } catch (e) { /* ignore */ }
    }
  }, []);

  const savePreferences = () => {
    const prefs = {
      notifDeadlines,
      notifCaseUpdates,
      notifCoalition,
      notifAiSuggestions,
      defaultJurisdiction,
    };
    localStorage.setItem("sintraprime_prefs", JSON.stringify(prefs));
    toast.success("Preferences saved successfully");
  };

  const { data: subStatus } = trpc.subscription.status.useQuery();
  const { tier: tierFromApi, limits, usage } = useTierGate();

  const manageSubscription = trpc.subscription.portal.useMutation({
    onSuccess: (data: { url: string }) => {
      if (data.url) {
        window.open(data.url, "_blank");
        toast.info("Opening Stripe Customer Portal...");
      }
    },
    onError: (error: { message: string }) => {
      toast.error(error.message);
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your profile, preferences, and subscription</p>
        </div>

        {/* Profile Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5" />
              <CardTitle>Profile</CardTitle>
            </div>
            <CardDescription>Your account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground text-xs">Name</Label>
                <p className="font-medium">{user?.name || "Not set"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">User ID</Label>
                <p className="font-medium text-sm font-mono">{user?.id || "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4" />
              <span>Authenticated via Manus OAuth</span>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                <CardTitle>Subscription</CardTitle>
              </div>
              <Badge variant={tier === "free" ? "secondary" : "default"} className="flex items-center gap-1">
                {tier !== "free" && <Crown className="h-3 w-3" />}
                {tier.charAt(0).toUpperCase() + tier.slice(1)} Plan
              </Badge>
            </div>
            <CardDescription>Manage your subscription and billing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current Plan Features */}
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium text-sm mb-2">Your Plan Includes:</h4>
              <div className="grid grid-cols-2 gap-2">
                {(TIER_FEATURES[tier] || TIER_FEATURES.free).map((feature) => (
                  <div key={feature} className="flex items-center gap-2 text-sm">
                    <Check className="h-3 w-3 text-green-500 shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Usage Stats */}
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium text-sm mb-2">Current Usage:</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cases:</span>
                  <span>{usage.cases} / {limits.maxCases === Infinity ? "∞" : limits.maxCases}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">AI Messages Today:</span>
                  <span>{usage.aiMessagesToday} / {limits.maxAiMessagesPerDay === Infinity ? "∞" : limits.maxAiMessagesPerDay}</span>
                </div>
              </div>
            </div>

            <Separator />

            <div className="flex items-center gap-3">
              {tier === "free" ? (
                <Link href="/pricing">
                  <Button>
                    <Zap className="mr-2 h-4 w-4" />
                    Upgrade Plan
                  </Button>
                </Link>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => manageSubscription.mutate({ origin: window.location.origin })}
                  disabled={manageSubscription.isPending}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  {manageSubscription.isPending ? "Opening..." : "Manage Subscription"}
                </Button>
              )}
              <Link href="/pricing">
                <Button variant="ghost" size="sm">
                  View All Plans
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              <CardTitle>Notification Preferences</CardTitle>
            </div>
            <CardDescription>Choose what notifications you receive</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Deadline Reminders</Label>
                <p className="text-sm text-muted-foreground">Get notified when case deadlines approach</p>
              </div>
              <Switch checked={notifDeadlines} onCheckedChange={setNotifDeadlines} />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Case Status Updates</Label>
                <p className="text-sm text-muted-foreground">Notifications when case status changes</p>
              </div>
              <Switch checked={notifCaseUpdates} onCheckedChange={setNotifCaseUpdates} />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Coalition Activity</Label>
                <p className="text-sm text-muted-foreground">Updates when coalition members take actions</p>
              </div>
              <Switch checked={notifCoalition} onCheckedChange={setNotifCoalition} />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>AI Strategy Suggestions</Label>
                <p className="text-sm text-muted-foreground">Receive AI-generated strategy recommendations</p>
              </div>
              <Switch checked={notifAiSuggestions} onCheckedChange={setNotifAiSuggestions} />
            </div>
          </CardContent>
        </Card>

        {/* Sound Settings */}
        <SoundSettings />

        {/* Default Jurisdiction */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              <CardTitle>Default Jurisdiction</CardTitle>
            </div>
            <CardDescription>Set your default jurisdiction for new cases and deadline calculations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-w-sm">
              <Select value={defaultJurisdiction} onValueChange={setDefaultJurisdiction}>
                <SelectTrigger>
                  <SelectValue placeholder="Select jurisdiction" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Federal">Federal</SelectItem>
                  {US_STATES.map((state) => (
                    <SelectItem key={state} value={state}>{state}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">
              This will be pre-selected when creating new cases or using the deadline calculator.
            </p>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end pb-8">
          <Button onClick={savePreferences} size="lg">
            Save All Preferences
          </Button>
        </div>

        {/* Legal Disclaimer */}
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">
              <strong>Disclaimer:</strong> SintraPrime is a legal research and organization tool, not a law firm. 
              It does not provide legal advice. The information provided is for educational and organizational purposes only. 
              Always consult with a licensed attorney for legal advice specific to your situation.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
