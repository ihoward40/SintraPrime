import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, FileText, DollarSign, Calendar, Lock } from "lucide-react";
import { toast } from "sonner";

export default function BeneficiaryPortal() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState("");
  const [accessCode, setAccessCode] = useState("");

  const handleLogin = () => {
    // TODO: Implement actual authentication with backend
    if (email && accessCode) {
      setIsAuthenticated(true);
      toast.success("Login Successful", {
        description: "Welcome to your beneficiary portal",
      });
    } else {
      toast.error("Login Failed", {
        description: "Please enter both email and access code",
      });
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center mb-4">
              <div className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center">
                <Lock className="h-6 w-6 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl text-center">Beneficiary Portal</CardTitle>
            <CardDescription className="text-center">
              Access your Schedule K-1 forms and distribution history
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="beneficiary@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accessCode">Access Code</Label>
              <Input
                id="accessCode"
                type="password"
                placeholder="Enter your access code"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Access code was sent to your email by the trust administrator
              </p>
            </div>
            <Button onClick={handleLogin} className="w-full">
              Sign In
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              Need help? Contact your trust administrator
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Mock data for demonstration
  const beneficiaryInfo = {
    name: "John Doe",
    trustName: "Smith Family Trust",
    share: 33.33,
  };

  const k1Forms = [
    {
      id: 1,
      taxYear: 2024,
      issueDate: "2025-03-15",
      dniShare: 25000,
      status: "Available",
    },
    {
      id: 2,
      taxYear: 2023,
      issueDate: "2024-03-15",
      dniShare: 23500,
      status: "Available",
    },
    {
      id: 3,
      taxYear: 2022,
      issueDate: "2023-03-15",
      dniShare: 22000,
      status: "Available",
    },
  ];

  const distributions = [
    {
      id: 1,
      date: "2024-12-31",
      amount: 12500,
      type: "Quarterly Distribution",
      status: "Completed",
    },
    {
      id: 2,
      date: "2024-09-30",
      amount: 12500,
      type: "Quarterly Distribution",
      status: "Completed",
    },
    {
      id: 3,
      date: "2024-06-30",
      amount: 12500,
      type: "Quarterly Distribution",
      status: "Completed",
    },
    {
      id: 4,
      date: "2024-03-31",
      amount: 12500,
      type: "Quarterly Distribution",
      status: "Completed",
    },
  ];

  const handleDownloadK1 = (taxYear: number) => {
    toast.success("Download Started", {
      description: `Downloading Schedule K-1 for tax year ${taxYear}`,
    });
    // TODO: Implement actual PDF download
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto space-y-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Beneficiary Portal</h1>
            <p className="text-muted-foreground">Welcome, {beneficiaryInfo.name}</p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setIsAuthenticated(false);
              setEmail("");
              setAccessCode("");
            }}
          >
            Sign Out
          </Button>
        </div>

        {/* Trust Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Trust Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Trust Name</div>
                <div className="text-lg font-semibold">{beneficiaryInfo.trustName}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Your Beneficial Interest</div>
                <div className="text-lg font-semibold">{beneficiaryInfo.share}%</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Total K-1 Forms</div>
                <div className="text-lg font-semibold">{k1Forms.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs defaultValue="k1forms" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="k1forms">Schedule K-1 Forms</TabsTrigger>
            <TabsTrigger value="distributions">Distribution History</TabsTrigger>
            <TabsTrigger value="documents">Tax Documents</TabsTrigger>
          </TabsList>

          {/* K-1 Forms Tab */}
          <TabsContent value="k1forms" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Schedule K-1 (Form 1041)</CardTitle>
                <CardDescription>Your share of trust income, deductions, and credits</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {k1Forms.map((form) => (
                    <div key={form.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                          <FileText className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-semibold">Tax Year {form.taxYear}</div>
                          <div className="text-sm text-muted-foreground">
                            Issued: {new Date(form.issueDate).toLocaleDateString()}
                          </div>
                          <div className="text-sm">
                            DNI Share: <span className="font-semibold">${form.dniShare.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm">
                          {form.status}
                        </div>
                        <Button onClick={() => handleDownloadK1(form.taxYear)}>
                          <Download className="h-4 w-4 mr-2" />
                          Download PDF
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Distributions Tab */}
          <TabsContent value="distributions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Distribution History</CardTitle>
                <CardDescription>Record of all distributions received from the trust</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-blue-50 rounded-lg">
                    <div>
                      <div className="text-sm text-muted-foreground">Total Distributions (2024)</div>
                      <div className="text-2xl font-bold">
                        ${distributions.reduce((sum, d) => sum + d.amount, 0).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Number of Payments</div>
                      <div className="text-2xl font-bold">{distributions.length}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Average Payment</div>
                      <div className="text-2xl font-bold">
                        ${(distributions.reduce((sum, d) => sum + d.amount, 0) / distributions.length).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Distribution List */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Date</th>
                          <th className="text-left p-2">Type</th>
                          <th className="text-right p-2">Amount</th>
                          <th className="text-center p-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {distributions.map((dist) => (
                          <tr key={dist.id} className="border-b">
                            <td className="p-2 flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              {new Date(dist.date).toLocaleDateString()}
                            </td>
                            <td className="p-2">{dist.type}</td>
                            <td className="text-right p-2 font-semibold">${dist.amount.toLocaleString()}</td>
                            <td className="text-center p-2">
                              <span className="px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs">
                                {dist.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Tax Documents</CardTitle>
                <CardDescription>Additional tax-related documents and statements</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No additional documents available at this time</p>
                  <p className="text-sm mt-2">Check back later for trust statements and other documents</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
