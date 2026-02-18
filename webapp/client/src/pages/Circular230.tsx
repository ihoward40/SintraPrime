import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, AlertTriangle, FileText, Scale } from "lucide-react";

export default function Circular230() {
  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950/30">
            <Shield className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">IRS Circular 230 Disclosure</h1>
            <p className="text-muted-foreground">Treasury Department Regulations Governing Practice Before the IRS</p>
          </div>
        </div>
      </div>

      <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <AlertDescription className="text-amber-900 dark:text-amber-100">
          <strong>Important Notice:</strong> SintraPrime is not a tax professional, enrolled agent, certified public accountant, or attorney authorized to practice before the Internal Revenue Service. This platform does not provide tax advice or tax return preparation services.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            What is IRS Circular 230?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            <strong>IRS Circular 230</strong> (31 C.F.R. Part 10) contains regulations governing practice before the Internal Revenue Service. These regulations establish standards for individuals and entities who represent taxpayers before the IRS, including attorneys, certified public accountants (CPAs), enrolled agents, enrolled actuaries, and enrolled retirement plan agents.
          </p>
          <p>
            The regulations cover who may practice before the IRS, duties and restrictions relating to practice before the IRS, sanctions for violation of the regulations, and rules applicable to disciplinary proceedings.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            SintraPrime's Position
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            <strong>SintraPrime is a legal technology platform</strong> designed to assist with legal research, case management, document analysis, and litigation strategy. Our platform focuses exclusively on legal matters and does not engage in any activities that would constitute practice before the IRS under Circular 230.
          </p>
          
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">What SintraPrime Does NOT Do:</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Prepare or file tax returns</li>
              <li>Provide tax planning or tax advice</li>
              <li>Represent clients before the IRS</li>
              <li>Offer opinions on tax consequences of transactions</li>
              <li>Assist with IRS audits, appeals, or collections</li>
              <li>Provide guidance on tax compliance matters</li>
              <li>Interpret tax laws or regulations for specific situations</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-lg">What SintraPrime DOES Do:</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Assist with legal research and case law analysis</li>
              <li>Help organize and manage legal cases</li>
              <li>Analyze legal documents and contracts</li>
              <li>Support litigation strategy development</li>
              <li>Provide AI-powered legal research tools</li>
              <li>Facilitate legal workflow automation</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Full Circular 230 Disclosure Statement</CardTitle>
          <CardDescription>Required by Treasury Department Regulations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-4 text-sm space-y-3">
            <p>
              <strong>CIRCULAR 230 DISCLOSURE:</strong> To ensure compliance with requirements imposed by the IRS, we inform you that any U.S. federal tax advice contained in this communication (including any attachments) is not intended or written to be used, and cannot be used, for the purpose of (i) avoiding penalties under the Internal Revenue Code or (ii) promoting, marketing or recommending to another party any transaction or matter addressed herein.
            </p>
            <p>
              The information provided through SintraPrime is for general informational and educational purposes only and does not constitute tax advice. SintraPrime does not provide services that would require authorization under Circular 230. Users should consult with qualified tax professionals, such as enrolled agents, CPAs, or tax attorneys, for specific tax advice and representation before the IRS.
            </p>
            <p>
              SintraPrime makes no representations or warranties regarding the accuracy, completeness, or timeliness of any tax-related information that may be referenced or discussed on this platform. Any such information should not be relied upon for tax planning, compliance, or decision-making purposes.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>When You Need Tax Advice</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            If you need assistance with tax matters, please consult with one of the following qualified professionals who are authorized to practice before the IRS under Circular 230:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Attorneys:</strong> Licensed to practice law and authorized to represent clients in tax matters</li>
            <li><strong>Certified Public Accountants (CPAs):</strong> Licensed by state boards of accountancy</li>
            <li><strong>Enrolled Agents (EAs):</strong> Federally-licensed tax practitioners who specialize in taxation</li>
            <li><strong>Enrolled Actuaries:</strong> Authorized to perform actuarial services for employee benefit plans</li>
            <li><strong>Enrolled Retirement Plan Agents (ERPAs):</strong> Authorized to represent clients for specific retirement plan matters</li>
          </ul>
          <p className="text-sm text-muted-foreground mt-4">
            You can find qualified tax professionals through the IRS Directory of Federal Tax Return Preparers with Credentials and Select Qualifications at <a href="https://irs.treasury.gov/rpo/rpo.jsf" target="_blank" rel="noopener noreferrer" className="text-primary underline">irs.treasury.gov/rpo/rpo.jsf</a>
          </p>
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle>Questions About This Disclosure?</CardTitle>
        </CardHeader>
        <CardContent>
          <p>
            If you have questions about this Circular 230 disclosure or SintraPrime's services, please contact our support team. For questions about your specific tax situation, please consult a qualified tax professional authorized to practice before the IRS.
          </p>
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground text-center pt-4 border-t">
        <p>Last Updated: February 2026</p>
        <p className="mt-2">This disclosure is provided in compliance with IRS Circular 230 (31 C.F.R. Part 10)</p>
      </div>
    </div>
  );
}
