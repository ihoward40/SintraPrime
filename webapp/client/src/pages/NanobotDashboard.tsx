import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { RepairApprovalPanel } from "@/components/RepairApprovalPanel";
import { NanobotActivityFeed } from "@/components/NanobotActivityFeed";
import {
  Activity, AlertCircle, CheckCircle, Clock, Cpu, Database, 
  Zap, TrendingUp, TrendingDown, RefreshCw, Settings, Brain,
  Shield, Wrench, BarChart3, AlertTriangle, XCircle
} from "lucide-react";

export default function NanobotDashboard() {
  const [selectedTab, setSelectedTab] = useState<"overview" | "errors" | "repairs" | "learning">("overview");

  const { data: overview, refetch: refetchOverview } = trpc.nanobot.getDashboardOverview.useQuery();
  const { data: unresolvedErrors } = trpc.nanobot.getUnresolvedErrors.useQuery({ limit: 10 });
  const { data: repairHistory } = trpc.nanobot.getRepairHistory.useQuery({ limit: 10 });
  const { data: learningEntries } = trpc.nanobot.getLearningEntries.useQuery();

  const diagnoseErrorMutation = trpc.nanobot.diagnoseError.useMutation();
  const repairErrorMutation = trpc.nanobot.repairError.useMutation();

  const handleDiagnose = async (errorId: number) => {
    try {
      const diagnosis = await diagnoseErrorMutation.mutateAsync({ errorId });
      toast.success("Diagnosis complete");
      console.log("Diagnosis:", diagnosis);
    } catch (error) {
      toast.error("Failed to diagnose error");
    }
  };

  const handleRepair = async (errorId: number) => {
    try {
      const result = await repairErrorMutation.mutateAsync({ errorId });
      if (result.success) {
        toast.success(`Repair successful: ${result.description}`);
        await refetchOverview();
      } else {
        toast.error(`Repair failed: ${result.message}`);
      }
    } catch (error) {
      toast.error("Failed to execute repair");
    }
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "text-green-600 bg-green-100 border-green-300";
      case "degraded":
        return "text-yellow-600 bg-yellow-100 border-yellow-300";
      case "down":
        return "text-red-600 bg-red-100 border-red-300";
      default:
        return "text-gray-600 bg-gray-100 border-gray-300";
    }
  };

  const getHealthStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle className="h-5 w-5" />;
      case "degraded":
        return <AlertTriangle className="h-5 w-5" />;
      case "down":
        return <XCircle className="h-5 w-5" />;
      default:
        return <AlertCircle className="h-5 w-5" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="container py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Brain className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Nanobot Dashboard</h1>
                <p className="text-muted-foreground mt-1">
                  Self-Repair Engineering Agent Status
                </p>
              </div>
            </div>
          </div>
          <Button variant="outline" onClick={() => refetchOverview()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* System Health Overview */}
        {overview && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  System Health
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className={getHealthStatusColor(overview.health.overall)}>
                    {getHealthStatusIcon(overview.health.overall)}
                    <span className="ml-2 capitalize">{overview.health.overall}</span>
                  </Badge>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                  <div className="text-center">
                    <div className="text-green-600 font-semibold">{overview.health.healthy}</div>
                    <div className="text-muted-foreground">Healthy</div>
                  </div>
                  <div className="text-center">
                    <div className="text-yellow-600 font-semibold">{overview.health.degraded}</div>
                    <div className="text-muted-foreground">Degraded</div>
                  </div>
                  <div className="text-center">
                    <div className="text-red-600 font-semibold">{overview.health.down}</div>
                    <div className="text-muted-foreground">Down</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Errors (24h)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">{overview.errors.total}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {overview.errors.unresolved} unresolved
                    </div>
                  </div>
                  <div className={`p-3 rounded-lg ${overview.errors.critical > 0 ? 'bg-red-100' : 'bg-gray-100'}`}>
                    <AlertCircle className={`h-6 w-6 ${overview.errors.critical > 0 ? 'text-red-600' : 'text-gray-600'}`} />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Resolution Rate</span>
                    <span className="font-semibold">{overview.errors.resolutionRate}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${overview.errors.resolutionRate}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Repairs (24h)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">{overview.repairs.total}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {overview.repairs.successful} successful
                    </div>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Wrench className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Success Rate</span>
                    <span className="font-semibold">{overview.repairs.successRate}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${overview.repairs.successRate}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  System Uptime
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">
                      {Math.floor(overview.uptime / 3600)}h
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {Math.floor((overview.uptime % 3600) / 60)}m uptime
                    </div>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Activity className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <div className="mt-3 text-xs text-muted-foreground">
                  Last checked: {new Date(overview.lastChecked).toLocaleTimeString()}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b">
          <button
            className={`px-4 py-2 font-medium transition-colors ${
              selectedTab === "overview"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setSelectedTab("overview")}
          >
            <BarChart3 className="h-4 w-4 inline mr-2" />
            Overview
          </button>
          <button
            className={`px-4 py-2 font-medium transition-colors ${
              selectedTab === "errors"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setSelectedTab("errors")}
          >
            <AlertCircle className="h-4 w-4 inline mr-2" />
            Errors
          </button>
          <button
            className={`px-4 py-2 font-medium transition-colors ${
              selectedTab === "repairs"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setSelectedTab("repairs")}
          >
            <Wrench className="h-4 w-4 inline mr-2" />
            Repairs
          </button>
          <button
            className={`px-4 py-2 font-medium transition-colors ${
              selectedTab === "learning"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setSelectedTab("learning")}
          >
            <Brain className="h-4 w-4 inline mr-2" />
            Learning
          </button>
        </div>

        {/* Tab Content */}
        {selectedTab === "overview" && overview && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RepairApprovalPanel />
              <NanobotActivityFeed />
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Recent Health Checks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {overview.health.recentChecks.map((check: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className={getHealthStatusColor(check.status)}>
                          {getHealthStatusIcon(check.status)}
                        </Badge>
                        <div>
                          <div className="font-medium">{check.checkType}</div>
                          {check.endpoint && (
                            <div className="text-sm text-muted-foreground">{check.endpoint}</div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        {check.responseTime && (
                          <div className="text-sm font-medium">{check.responseTime}ms</div>
                        )}
                        <div className="text-xs text-muted-foreground">
                          {new Date(check.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {selectedTab === "errors" && (
          <div className="space-y-4">
            {unresolvedErrors && unresolvedErrors.length > 0 ? (
              unresolvedErrors.map((error: any) => (
                <Card key={error.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className={
                            error.severity === "critical" ? "bg-red-100 text-red-700 border-red-300" :
                            error.severity === "high" ? "bg-orange-100 text-orange-700 border-orange-300" :
                            error.severity === "medium" ? "bg-yellow-100 text-yellow-700 border-yellow-300" :
                            "bg-gray-100 text-gray-700 border-gray-300"
                          }>
                            {error.severity}
                          </Badge>
                          <Badge variant="outline">{error.errorType}</Badge>
                        </div>
                        <h3 className="font-semibold text-lg mb-2">{error.errorMessage}</h3>
                        {error.source && (
                          <p className="text-sm text-muted-foreground mb-2">
                            Source: {error.source}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {new Date(error.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDiagnose(error.id)}
                          disabled={diagnoseErrorMutation.isPending}
                        >
                          <Brain className="h-4 w-4 mr-2" />
                          Diagnose
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleRepair(error.id)}
                          disabled={repairErrorMutation.isPending}
                        >
                          <Wrench className="h-4 w-4 mr-2" />
                          Repair
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle className="h-12 w-12 mx-auto text-green-600 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Unresolved Errors</h3>
                  <p className="text-muted-foreground">
                    All systems operating normally
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {selectedTab === "repairs" && (
          <div className="space-y-4">
            {repairHistory && repairHistory.length > 0 ? (
              repairHistory.map((repair: any) => (
                <Card key={repair.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className={
                            repair.success
                              ? "bg-green-100 text-green-700 border-green-300"
                              : "bg-red-100 text-red-700 border-red-300"
                          }>
                            {repair.success ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                            {repair.success ? "Success" : "Failed"}
                          </Badge>
                          <Badge variant="outline">{repair.repairType}</Badge>
                        </div>
                        <h3 className="font-semibold mb-2">{repair.repairDescription}</h3>
                        {repair.repairActions && repair.repairActions.length > 0 && (
                          <div className="mb-2">
                            <div className="text-sm font-medium mb-1">Actions Taken:</div>
                            <ul className="text-sm text-muted-foreground list-disc list-inside">
                              {repair.repairActions.map((action: string, idx: number) => (
                                <li key={idx}>{action}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {repair.resultMessage && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {repair.resultMessage}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {new Date(repair.createdAt).toLocaleString()} • {repair.executionTime}ms
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Wrench className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Repairs Yet</h3>
                  <p className="text-muted-foreground">
                    The nanobot hasn't performed any repairs
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {selectedTab === "learning" && (
          <div className="space-y-4">
            {learningEntries && learningEntries.length > 0 ? (
              learningEntries.map((entry: any) => (
                <Card key={entry.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">
                            Confidence: {entry.confidence}%
                          </Badge>
                          <Badge variant="outline">
                            Success Rate: {entry.successRate}%
                          </Badge>
                          <Badge variant="outline">
                            Applied: {entry.timesApplied}x
                          </Badge>
                        </div>
                        <h3 className="font-semibold mb-2">Error Pattern</h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          {entry.errorPattern.substring(0, 200)}
                          {entry.errorPattern.length > 200 && "..."}
                        </p>
                        <h4 className="font-semibold text-sm mb-1">Repair Strategy</h4>
                        <p className="text-sm text-muted-foreground">
                          {entry.repairStrategy.substring(0, 200)}
                          {entry.repairStrategy.length > 200 && "..."}
                        </p>
                        {entry.lastApplied && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Last applied: {new Date(entry.lastApplied).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Brain className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Learning Entries</h3>
                  <p className="text-muted-foreground">
                    The nanobot is still learning from repairs
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
