import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Shield, Key, CheckCircle2, AlertTriangle, Info } from "lucide-react";

export default function IRSSettings() {
  const [tcc, setTcc] = useState("");
  const [efin, setEfin] = useState("");
  const [testMode, setTestMode] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  // Queries
  const { data: credentials, refetch } = trpc.irsConfig.getCredentials.useQuery();

  // Mutations
  const saveCredentials = trpc.irsConfig.saveCredentials.useMutation({
    onSuccess: () => {
      toast.success("IRS credentials saved successfully");
      refetch();
      setIsEditing(false);
      setTcc("");
      setEfin("");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteCredentials = trpc.irsConfig.deleteCredentials.useMutation({
    onSuccess: () => {
      toast.success("IRS credentials deleted");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const toggleTestMode = trpc.irsConfig.toggleTestMode.useMutation({
    onSuccess: (data) => {
      toast.success(`Switched to ${data.testMode ? "test" : "production"} mode`);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const validateCredentials = trpc.irsConfig.validateCredentials.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSave = () => {
    if (!tcc || !efin) {
      toast.error("Please enter both TCC and EFIN");
      return;
    }

    saveCredentials.mutate({
      transmitterControlCode: tcc,
      electronicFilingIdentificationNumber: efin,
      testMode,
    });
  };

  return (
    <div className="container mx-auto py-8 space-y-8 max-w-4xl">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">IRS E-File Settings</h1>
        <p className="text-muted-foreground">
          Configure your IRS Modernized e-File (MeF) credentials for Form 1041 electronic filing
        </p>
      </div>

      {/* IRS Circular 230 Notice */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>IRS Circular 230 Notice:</strong> This platform does not provide tax advice. Electronic filing
          requires official IRS credentials (TCC and EFIN) obtained through the IRS e-Services portal. Consult with
          a licensed tax professional before submitting returns.
        </AlertDescription>
      </Alert>

      {/* Credentials Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Credentials Status
              </CardTitle>
              <CardDescription>Current IRS MeF credentials configuration</CardDescription>
            </div>
            {credentials?.hasCredentials ? (
              <Badge variant="outline" className="bg-green-50 text-green-900 border-green-200">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Configured
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-yellow-50 text-yellow-900 border-yellow-200">
                <AlertTriangle className="w-4 h-4 mr-2" />
                Not Configured
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {credentials?.hasCredentials ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Mode</p>
                  <p className="text-sm text-muted-foreground">
                    {credentials.testMode ? "Test Environment" : "Production Environment"}
                  </p>
                </div>
                <Switch
                  checked={!credentials.testMode}
                  onCheckedChange={(checked) => toggleTestMode.mutate({ testMode: !checked })}
                />
              </div>

              {credentials.lastValidated && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="font-medium">Last Validated</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(credentials.lastValidated).toLocaleString()}
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => validateCredentials.mutate()}
                  disabled={validateCredentials.isPending}
                >
                  {validateCredentials.isPending ? "Validating..." : "Validate Credentials"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                >
                  Update Credentials
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (confirm("Are you sure you want to delete your IRS credentials?")) {
                      deleteCredentials.mutate();
                    }
                  }}
                  disabled={deleteCredentials.isPending}
                >
                  Delete Credentials
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Key className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                No IRS credentials configured. Add your TCC and EFIN to enable electronic filing.
              </p>
              <Button onClick={() => setIsEditing(true)}>
                Add Credentials
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Credentials Form */}
      {isEditing && (
        <Card>
          <CardHeader>
            <CardTitle>IRS MeF Credentials</CardTitle>
            <CardDescription>
              Enter your Transmitter Control Code (TCC) and Electronic Filing Identification Number (EFIN)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tcc">Transmitter Control Code (TCC)</Label>
              <Input
                id="tcc"
                type="text"
                placeholder="Enter your TCC"
                value={tcc}
                onChange={(e) => setTcc(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Your TCC is provided by the IRS when you register as an electronic return transmitter
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="efin">Electronic Filing Identification Number (EFIN)</Label>
              <Input
                id="efin"
                type="text"
                placeholder="Enter your EFIN"
                value={efin}
                onChange={(e) => setEfin(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Your EFIN identifies you as an authorized IRS e-file provider
              </p>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <Label htmlFor="testMode">Test Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Use IRS test environment for development
                </p>
              </div>
              <Switch
                id="testMode"
                checked={testMode}
                onCheckedChange={setTestMode}
              />
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Security Note:</strong> Your credentials are stored securely and encrypted. They are never
                exposed to the frontend and are only used for IRS API communication.
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={saveCredentials.isPending}
              >
                {saveCredentials.isPending ? "Saving..." : "Save Credentials"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  setTcc("");
                  setEfin("");
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* How to Obtain Credentials */}
      <Card>
        <CardHeader>
          <CardTitle>How to Obtain IRS Credentials</CardTitle>
          <CardDescription>Steps to register for IRS Modernized e-File</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Visit the IRS e-Services portal at <a href="https://www.irs.gov/e-file-providers" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">irs.gov/e-file-providers</a></li>
            <li>Complete the IRS e-file Application (Form 8633)</li>
            <li>Pass the required suitability check</li>
            <li>Complete the Acceptance Testing System (ATS) requirements</li>
            <li>Receive your TCC and EFIN from the IRS</li>
            <li>Enter your credentials here to enable electronic filing</li>
          </ol>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              The IRS registration process can take 45-60 days. Plan accordingly if you need to file returns electronically.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
