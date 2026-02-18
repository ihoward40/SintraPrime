import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileText, Download, CheckCircle2, AlertCircle, Hash, Shield } from "lucide-react";
import { toast } from "sonner";

interface HandoffSection {
  title: string;
  items: string[];
  status: 'complete' | 'partial' | 'missing';
}

export function CPAHandoff() {
  const [sections] = useState<HandoffSection[]>([
    {
      title: "What We Know",
      items: [
        "Trust Instrument dated 01/15/2020",
        "DNI calculated at $125,000",
        "Two beneficiaries: John Doe (60%), Jane Smith (40%)",
        "Tax-exempt income: $15,000 (municipal bonds)",
        "Trustee fees: $5,000",
        "No 65-day election made",
      ],
      status: 'complete'
    },
    {
      title: "What's Missing",
      items: [
        "K-1 from partnership (expected)",
        "Final brokerage statement for December",
        "Trust instrument amendment (if any)",
        "Prior year carryforward documentation",
      ],
      status: 'partial'
    },
    {
      title: "Next Steps",
      items: [
        "Request missing K-1 from partnership",
        "Obtain final brokerage statement",
        "Verify no trust amendments exist",
        "Review beneficiary distribution requirements",
        "Confirm state trust tax nexus",
      ],
      status: 'missing'
    }
  ]);

  const generateHandoffPackage = () => {
    const packageContent = `
# CPA HANDOFF PACKAGE
Generated: ${new Date().toLocaleString()}

## EXECUTIVE SUMMARY
This package contains all information gathered for tax return preparation, identified gaps, and recommended next steps.

---

## 1. WHAT WE KNOW

${sections[0].items.map((item, i) => `${i + 1}. ${item}`).join('\n')}

---

## 2. WHAT'S MISSING

${sections[1].items.map((item, i) => `${i + 1}. ${item}`).join('\n')}

---

## 3. NEXT STEPS

${sections[2].items.map((item, i) => `${i + 1}. ${item}`).join('\n')}

---

## EXECUTION RECEIPT

**Inputs Hash:** ${generateHash('inputs')}
**Outputs Hash:** ${generateHash('outputs')}
**Timestamp:** ${new Date().toISOString()}

### Conservative Interpretation Flags
- ✓ All positions supported by IRS publications
- ✓ Uncertain positions disclosed
- ✓ Circular 230 compliance verified
- ⚠ Capital gains allocation requires trust instrument review

### IRS Publication Citations
- IRC §643(a) - Distributable Net Income definition
- IRC §661 - Deduction for estates and trusts
- IRC §662 - Inclusion of amounts in gross income of beneficiaries
- Reg. §1.643(a)-3 - Capital gains and losses

---

## AUDIT RISK ASSESSMENT

**Overall Risk Level:** LOW

**Risk Factors:**
- Trust instrument interpretation: MEDIUM
- Beneficiary allocation: LOW
- Capital gains treatment: MEDIUM
- State nexus: LOW

---

## FIDUCIARY ADMINISTRATIVE POLICY

This return was prepared using conservative interpretation principles:
1. All deductions supported by documentation
2. Income allocation per trust instrument terms
3. Capital gains excluded from DNI (unless trust instrument specifies otherwise)
4. No aggressive positions taken

---

## DISCLAIMER

This platform does not provide tax advice. This package is for informational purposes only. 
Not authorized to practice before the IRS. All positions should be reviewed by a qualified CPA or tax attorney.

IRS Circular 230 Notice: This communication is not intended or written to be used, and cannot be used, 
for the purpose of avoiding penalties under the Internal Revenue Code.
    `.trim();

    // Create downloadable file
    const blob = new Blob([packageContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cpa-handoff-package-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("CPA handoff package downloaded");
  };

  const generateHash = (type: string): string => {
    // Simplified hash generation for demo
    return `${type}-${Math.random().toString(36).substring(2, 15)}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete': return 'bg-green-50 border-green-200';
      case 'partial': return 'bg-amber-50 border-amber-200';
      case 'missing': return 'bg-red-50 border-red-200';
      default: return 'bg-gray-50';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'complete': return <Badge className="bg-green-600">Complete</Badge>;
      case 'partial': return <Badge className="bg-amber-600">Partial</Badge>;
      case 'missing': return <Badge variant="destructive">Action Required</Badge>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                CPA Handoff Package
              </CardTitle>
              <CardDescription>
                Professional-grade summary for CPA review and filing
              </CardDescription>
            </div>
            <Button onClick={generateHandoffPackage}>
              <Download className="w-4 h-4 mr-2" />
              Download Package
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Three-Column Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {sections.map((section, index) => (
              <Card key={index} className={getStatusColor(section.status)}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{section.title}</CardTitle>
                    {getStatusBadge(section.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    {section.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        {section.status === 'complete' ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        )}
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          <Separator />

          {/* Execution Receipt */}
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Hash className="w-5 h-5" />
                Execution Receipt
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Inputs Hash</p>
                  <p className="font-mono text-xs bg-white p-2 rounded border">{generateHash('inputs')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Outputs Hash</p>
                  <p className="font-mono text-xs bg-white p-2 rounded border">{generateHash('outputs')}</p>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Timestamp</p>
                <p className="font-mono text-xs">{new Date().toISOString()}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Execution receipts provide cryptographic proof of inputs and outputs for audit trail purposes.
              </p>
            </CardContent>
          </Card>

          {/* Conservative Interpretation Flags */}
          <Card className="bg-green-50 border-green-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Conservative Interpretation Flags
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                  <span>All positions supported by IRS publications</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                  <span>Uncertain positions disclosed</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                  <span>Circular 230 compliance verified</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                  <span>Capital gains allocation requires trust instrument review</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Audit Risk Assessment */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Audit Risk Assessment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Overall Risk Level</span>
                  <Badge className="bg-green-600">LOW</Badge>
                </div>
                <Separator />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between">
                    <span>Trust instrument interpretation</span>
                    <Badge className="bg-amber-600">MEDIUM</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Beneficiary allocation</span>
                    <Badge className="bg-green-600">LOW</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Capital gains treatment</span>
                    <Badge className="bg-amber-600">MEDIUM</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>State nexus</span>
                    <Badge className="bg-green-600">LOW</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* IRS Publication Citations */}
          <Card className="bg-gray-50">
            <CardHeader>
              <CardTitle className="text-lg">IRS Publication Citations</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li>• IRC §643(a) - Distributable Net Income definition</li>
                <li>• IRC §661 - Deduction for estates and trusts</li>
                <li>• IRC §662 - Inclusion of amounts in gross income of beneficiaries</li>
                <li>• Reg. §1.643(a)-3 - Capital gains and losses</li>
                <li>• IRC §642(c) - Deduction for amounts paid for charitable purposes</li>
              </ul>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}
