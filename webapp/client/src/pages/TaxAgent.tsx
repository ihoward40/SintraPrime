import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Calculator, FileText, Upload, AlertTriangle, CheckCircle2, TrendingUp, Users, Scale } from "lucide-react";
import { toast } from "sonner";
import { DNICalculator } from "@/components/DNICalculator";
import { BeneficiarySimulator } from "@/components/BeneficiarySimulator";
import { MissingDocsRadar } from "@/components/MissingDocsRadar";
import { CPAHandoff } from "@/components/CPAHandoff";
import { PriorYearComparison } from "@/components/PriorYearComparison";
import { TrustAccountManager } from "@/components/TrustAccountManager";
import { BatchDocumentUpload } from "@/components/BatchDocumentUpload";
import { Form1041Generator } from "@/components/Form1041Generator";
import { ScheduleK1Generator } from "@/components/ScheduleK1Generator";
import { AuditTrailDashboard } from "@/components/AuditTrailDashboard";
import { EFileManager } from "@/components/EFileManager";
import { K1EmailDistribution } from "@/components/K1EmailDistribution";
import { TrustComparisonTool } from "@/components/TrustComparisonTool";
import { TaxProjectionTool } from "@/components/TaxProjectionTool";
import { CPACollaborationHub } from "@/components/CPACollaborationHub";
import { BeneficiaryPaymentPortal } from "@/components/BeneficiaryPaymentPortal";

export default function TaxAgent() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">IKE Tax Return Agent</h1>
            <p className="text-muted-foreground mt-2">
              AI-powered trust & estate tax preparation with conservative interpretation
            </p>
          </div>
          <Badge variant="outline" className="h-8 px-4 bg-amber-50 text-amber-900 border-amber-200">
            <AlertTriangle className="w-4 h-4 mr-2" />
            IRS Circular 230 Compliant
          </Badge>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Returns Prepared</p>
                  <p className="text-2xl font-bold">0</p>
                </div>
                <FileText className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Documents Processed</p>
                  <p className="text-2xl font-bold">0</p>
                </div>
                <Upload className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">DNI Calculations</p>
                  <p className="text-2xl font-bold">0</p>
                </div>
                <Calculator className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Risk Score</p>
                  <p className="text-2xl font-bold text-green-600">Low</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-13">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trusts">Trust Accounts</TabsTrigger>
          <TabsTrigger value="form1041">Form 1041</TabsTrigger>
          <TabsTrigger value="k1">Schedule K-1</TabsTrigger>
          <TabsTrigger value="tools">Trust Tools</TabsTrigger>
          <TabsTrigger value="docs">Documents</TabsTrigger>
          <TabsTrigger value="comparison">Prior Year</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
          <TabsTrigger value="efile">E-File</TabsTrigger>
          <TabsTrigger value="projections">Tax Projections</TabsTrigger>
          <TabsTrigger value="handoff">CPA Handoff</TabsTrigger>
          <TabsTrigger value="cpa">CPA Collaboration</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scale className="w-5 h-5" />
                  Trust & Estate Tax (Form 1041)
                </CardTitle>
                <CardDescription>
                  Prepare fiduciary income tax returns with DNI calculations and beneficiary allocations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                    <span>Distributable Net Income (DNI) calculator</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                    <span>Dual-book accounting (book vs tax basis)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                    <span>Beneficiary allocation simulator</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                    <span>65-day rule election calculator</span>
                  </li>
                </ul>
                <Button className="w-full" onClick={() => setActiveTab("form1041")}>
                  Start Form 1041
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Individual Tax Returns (1040)
                </CardTitle>
                <CardDescription>
                  Prepare individual income tax returns with comprehensive deduction analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                    <span>W-2, 1099, K-1 automatic extraction</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                    <span>Standard vs itemized deduction optimizer</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                    <span>Tax credit eligibility checker</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                    <span>Prior-year carryforward tracker</span>
                  </li>
                </ul>
                <Button className="w-full" variant="outline" disabled>
                  Coming Soon
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Business Tax Returns
                </CardTitle>
                <CardDescription>
                  LLC, Schedule C, and partnership tax preparation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                    <span>Schedule C profit/loss calculator</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                    <span>Home office deduction wizard</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                    <span>Vehicle expense tracker</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                    <span>Quarterly estimated tax calculator</span>
                  </li>
                </ul>
                <Button className="w-full" variant="outline" disabled>
                  Coming Soon
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Missing Docs Radar
                </CardTitle>
                <CardDescription>
                  Auto-detect missing documents and generate request letters
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5" />
                    <span>Auto-detect missing W-2s, 1099s, K-1s</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5" />
                    <span>Generate standardized request letters</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5" />
                    <span>Document validation checklist</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5" />
                    <span>Prior-year comparison analyzer</span>
                  </li>
                </ul>
                <Button className="w-full" onClick={() => setActiveTab("docs")}>
                  View Documents
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Conservative Interpretation Notice */}
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-900">
                <AlertTriangle className="w-5 h-5" />
                Conservative Interpretation Engine
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-amber-900 space-y-2">
              <p>
                IKE Tax Agent uses a <strong>conservative interpretation approach</strong> to tax law, prioritizing:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>IRS publication citations for all positions</li>
                <li>Audit-risk indicators for aggressive positions</li>
                <li>Circular 230 compliance in all recommendations</li>
                <li>Clear disclosure of uncertain tax positions</li>
                <li>CPA-ready handoff documentation</li>
              </ul>
              <p className="mt-4 font-semibold">
                This platform does not provide tax advice. Not authorized to practice before the IRS.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trust Accounts Tab */}
        <TabsContent value="trusts" className="space-y-6">
          <TrustAccountManager />
        </TabsContent>

        {/* Form 1041 Tab */}
        <TabsContent value="form1041" className="space-y-6">
          <Form1041Generator />
        </TabsContent>

        {/* Trust Tools Tab */}
        <TabsContent value="tools" className="space-y-6">
          <div className="space-y-6">
            <DNICalculator />
            <BeneficiarySimulator />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            <Card>
              <CardHeader>
                <CardTitle>Trust Accounting Ledger</CardTitle>
                <CardDescription>Dual-book accounting (book vs tax basis)</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" onClick={() => toast.info("Accounting Ledger coming soon")}>
                  Open Ledger
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Fiduciary Risk Scoring</CardTitle>
                <CardDescription>Assess audit risk and compliance issues</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" onClick={() => toast.info("Risk Scoring coming soon")}>
                  Run Analysis
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="docs" className="space-y-6">
          <BatchDocumentUpload />
          <MissingDocsRadar />
        </TabsContent>

        {/* Prior Year Comparison Tab */}
        <TabsContent value="comparison" className="space-y-6">
          <PriorYearComparison currentYear={new Date().getFullYear()} />
        </TabsContent>

        {/* Schedule K-1 Tab */}
        <TabsContent value="k1" className="space-y-6">
          <ScheduleK1Generator />
        </TabsContent>

        {/* Audit Trail Tab */}
        <TabsContent value="audit" className="space-y-6">
          <AuditTrailDashboard />
        </TabsContent>

        {/* E-File Tab */}
        <TabsContent value="efile" className="space-y-6">
          <EFileManager />
        </TabsContent>

        {/* Tax Projections Tab */}
        <TabsContent value="projections" className="space-y-6">
          <TaxProjectionTool />
        </TabsContent>

        {/* CPA Handoff Tab */}
        <TabsContent value="handoff" className="space-y-6">
          <CPAHandoff />
        </TabsContent>

        {/* CPA Collaboration Tab */}
        <TabsContent value="cpa" className="space-y-6">
          <CPACollaborationHub />
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-6">
          <BeneficiaryPaymentPortal />
        </TabsContent>

      </Tabs>
    </div>
  );
}
