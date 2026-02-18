import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast as showToast } from "sonner";
import { Eye, EyeOff, Save, TestTube, Shield, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function PACERSettings() {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isTesting, setIsTesting] = useState(false);

  const saveCredentials = trpc.pacer.saveCredentials.useMutation({
    onSuccess: () => {
      showToast.success("Credentials Saved", {
        description: "Your PACER credentials have been securely stored.",
      });
      setPassword(""); // Clear password field after saving
    },
    onError: (error: any) => {
      showToast.error("Error", {
        description: error.message,
      });
    },
  });

  const testConnection = trpc.pacer.testConnection.useMutation({
    onSuccess: (result: any) => {
      if (result.success) {
        showToast.success("Connection Successful", {
          description: "Successfully connected to PACER with your credentials.",
        });
      } else {
        showToast.error("Connection Failed", {
          description: result.error || "Failed to connect to PACER. Please check your credentials.",
        });
      }
      setIsTesting(false);
    },
    onError: (error: any) => {
      showToast.error("Test Failed", {
        description: error.message,
      });
      setIsTesting(false);
    },
  });

  const handleSave = () => {
    if (!username || !password) {
      showToast.error("Missing Information", {
        description: "Please enter both username and password.",
      });
      return;
    }

    saveCredentials.mutate({ username, password });
  };

  const handleTest = () => {
    if (!username || !password) {
      showToast.error("Missing Information", {
        description: "Please enter both username and password to test the connection.",
      });
      return;
    }

    setIsTesting(true);
    testConnection.mutate({ username, password });
  };

  return (
    <div className="container mx-auto py-12 px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">PACER Integration</h1>
          <p className="text-lg text-muted-foreground">
            Configure your PACER credentials for automated court docket monitoring
          </p>
        </div>

        {/* Security Notice */}
        <Alert>
          <Shield className="h-5 w-5" />
          <AlertDescription className="ml-2">
            Your PACER credentials are encrypted and stored securely. They are never shared with third parties
            and are only used to access court dockets on your behalf.
          </AlertDescription>
        </Alert>

        {/* Credentials Form */}
        <Card className="p-8">
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">PACER Credentials</h2>
              <p className="text-sm text-muted-foreground">
                Enter your PACER username and password. These credentials will be used to automatically
                monitor court dockets and retrieve case information.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">PACER Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your PACER username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">PACER Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your PACER password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="font-mono pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleSave}
                disabled={saveCredentials.isPending}
                className="flex-1"
              >
                <Save className="h-4 w-4 mr-2" />
                {saveCredentials.isPending ? "Saving..." : "Save Credentials"}
              </Button>
              <Button
                onClick={handleTest}
                variant="outline"
                disabled={isTesting || !username || !password}
                className="flex-1"
              >
                <TestTube className="h-4 w-4 mr-2" />
                {isTesting ? "Testing..." : "Test Connection"}
              </Button>
            </div>
          </div>
        </Card>

        {/* Information Card */}
        <Card className="p-8 bg-muted/50">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 mt-0.5 text-primary" />
              <div className="space-y-2">
                <h3 className="font-semibold">About PACER Integration</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  PACER (Public Access to Court Electronic Records) is the official electronic public access
                  service for U.S. federal court documents. By connecting your PACER account, SintraPrime can:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                  <li>Automatically monitor case dockets for updates</li>
                  <li>Download court documents and filings</li>
                  <li>Track deadlines and important dates</li>
                  <li>Send real-time alerts for case activity</li>
                  <li>Generate comprehensive case reports</li>
                </ul>
                <p className="text-sm text-muted-foreground leading-relaxed pt-2">
                  <strong>Note:</strong> PACER charges $0.10 per page for document access (up to $3.00 per document).
                  These charges will appear on your PACER account statement. SintraPrime does not charge any additional
                  fees for PACER integration.
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Help Link */}
        <div className="text-center text-sm text-muted-foreground">
          Don't have a PACER account?{" "}
          <a
            href="https://pacer.uscourts.gov/register-account"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Register for PACER
          </a>
        </div>
      </div>
    </div>
  );
}
