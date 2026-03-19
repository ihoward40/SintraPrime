import { useState } from "react";
import { Shield, ShieldCheck, ShieldOff, QrCode, Key, Copy, Check, AlertTriangle, RefreshCw } from "lucide-react";
import { trpc } from "../lib/trpc";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Alert, AlertDescription } from "../components/ui/alert";
import { useToast } from "../hooks/use-toast";

export default function TwoFactorAuth() {
  const { toast } = useToast();
  const [step, setStep] = useState<"idle" | "setup" | "verify" | "backup">("idle");
  const [token, setToken] = useState("");
  const [disableToken, setDisableToken] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [setupData, setSetupData] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: status, refetch } = trpc.twoFactor.getStatus.useQuery();
  const setupInit = trpc.twoFactor.setupInit.useMutation();
  const setupVerify = trpc.twoFactor.setupVerify.useMutation();
  const disable = trpc.twoFactor.disable.useMutation();
  const regenerateCodes = trpc.twoFactor.regenerateBackupCodes.useMutation();

  const handleStartSetup = async () => {
    const data = await setupInit.mutateAsync();
    setSetupData(data);
    setStep("setup");
  };

  const handleVerify = async () => {
    if (token.length !== 6) return;
    const result = await setupVerify.mutateAsync({ token });
    setBackupCodes(result.backupCodes);
    setStep("backup");
    refetch();
    toast({ title: "2FA Enabled!", description: "Two-factor authentication is now active on your account." });
  };

  const handleDisable = async () => {
    if (disableToken.length !== 6) return;
    await disable.mutateAsync({ token: disableToken });
    setStep("idle");
    setDisableToken("");
    refetch();
    toast({ title: "2FA Disabled", description: "Two-factor authentication has been removed from your account." });
  };

  const handleCopySecret = () => {
    if (setupData?.secret) {
      navigator.clipboard.writeText(setupData.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join("\n"));
    toast({ title: "Copied!", description: "Backup codes copied to clipboard." });
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-500/10 rounded-lg">
          <Shield className="h-6 w-6 text-blue-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Two-Factor Authentication</h1>
          <p className="text-gray-400 text-sm">Add an extra layer of security to your account</p>
        </div>
        {status?.enabled && (
          <Badge className="ml-auto bg-green-500/20 text-green-400 border-green-500/30">
            <ShieldCheck className="h-3 w-3 mr-1" /> Active
          </Badge>
        )}
      </div>

      {/* Status Card */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white text-lg flex items-center gap-2">
            {status?.enabled ? (
              <><ShieldCheck className="h-5 w-5 text-green-400" /> 2FA is Enabled</>
            ) : (
              <><ShieldOff className="h-5 w-5 text-yellow-400" /> 2FA is Not Enabled</>
            )}
          </CardTitle>
          <CardDescription className="text-gray-400">
            {status?.enabled
              ? "Your account is protected with time-based one-time passwords (TOTP)."
              : "Enable 2FA to protect your account with an authenticator app like Google Authenticator or Authy."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!status?.enabled && step === "idle" && (
            <Button onClick={handleStartSetup} className="bg-blue-600 hover:bg-blue-700" disabled={setupInit.isPending}>
              <Shield className="h-4 w-4 mr-2" />
              {setupInit.isPending ? "Setting up..." : "Enable Two-Factor Authentication"}
            </Button>
          )}
          {status?.enabled && step === "idle" && (
            <div className="space-y-4">
              <Alert className="border-yellow-500/30 bg-yellow-500/10">
                <AlertTriangle className="h-4 w-4 text-yellow-400" />
                <AlertDescription className="text-yellow-300">
                  Disabling 2FA will reduce your account security. You will need your current 6-digit code to confirm.
                </AlertDescription>
              </Alert>
              <div className="flex gap-3">
                <Input
                  placeholder="Enter 6-digit code to disable"
                  value={disableToken}
                  onChange={e => setDisableToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="bg-gray-700 border-gray-600 text-white w-48"
                  maxLength={6}
                />
                <Button
                  variant="destructive"
                  onClick={handleDisable}
                  disabled={disableToken.length !== 6 || disable.isPending}
                >
                  <ShieldOff className="h-4 w-4 mr-2" />
                  Disable 2FA
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Setup Step 1: QR Code */}
      {step === "setup" && setupData && (
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <QrCode className="h-5 w-5 text-blue-400" /> Step 1: Scan QR Code
            </CardTitle>
            <CardDescription className="text-gray-400">
              Open your authenticator app and scan the QR code below, or enter the secret key manually.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* QR Code display using otpauth URL */}
            <div className="flex justify-center">
              <div className="bg-white p-4 rounded-lg">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(setupData.otpauthUrl)}`}
                  alt="2FA QR Code"
                  className="w-48 h-48"
                />
              </div>
            </div>

            <div className="bg-gray-900 rounded-lg p-3 flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-xs mb-1">Manual Entry Key</p>
                <code className="text-green-400 font-mono text-sm tracking-widest">{setupData.secret}</code>
              </div>
              <Button size="sm" variant="ghost" onClick={handleCopySecret} className="text-gray-400 hover:text-white">
                {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>

            <Button onClick={() => setStep("verify")} className="w-full bg-blue-600 hover:bg-blue-700">
              I've Scanned the Code — Continue
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Setup Step 2: Verify */}
      {step === "verify" && (
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Key className="h-5 w-5 text-blue-400" /> Step 2: Verify Code
            </CardTitle>
            <CardDescription className="text-gray-400">
              Enter the 6-digit code from your authenticator app to confirm setup.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="000000"
              value={token}
              onChange={e => setToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="bg-gray-700 border-gray-600 text-white text-center text-2xl tracking-widest font-mono"
              maxLength={6}
            />
            {setupVerify.isError && (
              <Alert className="border-red-500/30 bg-red-500/10">
                <AlertDescription className="text-red-300">
                  Invalid code. Please check your authenticator app and try again.
                </AlertDescription>
              </Alert>
            )}
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("setup")} className="border-gray-600 text-gray-300">
                Back
              </Button>
              <Button
                onClick={handleVerify}
                className="flex-1 bg-green-600 hover:bg-green-700"
                disabled={token.length !== 6 || setupVerify.isPending}
              >
                {setupVerify.isPending ? "Verifying..." : "Verify & Enable 2FA"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Setup Step 3: Backup Codes */}
      {step === "backup" && backupCodes.length > 0 && (
        <Card className="bg-gray-800/50 border-green-500/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-green-400" /> 2FA Enabled — Save Your Backup Codes
            </CardTitle>
            <CardDescription className="text-yellow-300">
              Store these backup codes in a safe place. Each code can only be used once if you lose access to your authenticator app.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {backupCodes.map((code, i) => (
                <div key={i} className="bg-gray-900 rounded px-3 py-2 font-mono text-green-400 text-sm text-center">
                  {code}
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleCopyBackupCodes} className="border-gray-600 text-gray-300">
                <Copy className="h-4 w-4 mr-2" /> Copy All Codes
              </Button>
              <Button onClick={() => setStep("idle")} className="flex-1 bg-blue-600 hover:bg-blue-700">
                I've Saved My Codes — Done
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* How It Works */}
      <Card className="bg-gray-800/30 border-gray-700/50">
        <CardHeader>
          <CardTitle className="text-gray-300 text-base">How Two-Factor Authentication Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { step: "1", title: "Enter Password", desc: "Log in with your regular username and password as usual." },
              { step: "2", title: "Open Authenticator", desc: "Open Google Authenticator, Authy, or any TOTP app on your phone." },
              { step: "3", title: "Enter 6-Digit Code", desc: "Enter the rotating 6-digit code that refreshes every 30 seconds." },
            ].map(item => (
              <div key={item.step} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {item.step}
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{item.title}</p>
                  <p className="text-gray-400 text-xs mt-1">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
