import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, AlertCircle, CheckCircle2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import jsPDF from "jspdf";

interface Form1041GeneratorProps {
  trustAccountId?: number;
}

export function Form1041Generator({ trustAccountId: propTrustAccountId }: Form1041GeneratorProps) {
  const [selectedTrustId, setSelectedTrustId] = useState<number | undefined>(propTrustAccountId);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: trustAccounts } = trpc.trustAccounting.getTrustAccounts.useQuery({});
  const { data: dniCalculations } = trpc.trustAccounting.getDNICalculations.useQuery(
    {
      trustAccountId: selectedTrustId!,
      taxYear: selectedYear,
    },
    { enabled: !!selectedTrustId }
  );
  const { data: trialBalance } = trpc.trustAccounting.getTrialBalance.useQuery(
    {
      trustAccountId: selectedTrustId!,
      asOfDate: new Date(`${selectedYear}-12-31`),
      basis: "both",
    },
    { enabled: !!selectedTrustId }
  );

  const selectedTrust = trustAccounts?.find((t) => t.id === selectedTrustId);
  const latestDNI = dniCalculations?.[0];

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  const calculateForm1041Lines = () => {
    if (!latestDNI || !trialBalance) return null;

    // Income section
    const line1_interestIncome = latestDNI.interestIncome;
    const line2a_ordinaryDividends = latestDNI.dividendIncome;
    const line3_businessIncome = latestDNI.ordinaryIncome;
    const line4_capitalGain = latestDNI.capitalGains;
    const line8_otherIncome = latestDNI.otherIncome;
    const line9_totalIncome = latestDNI.totalIncome;

    // Deductions section
    const line10_fiduciaryFees = latestDNI.fiduciaryFees;
    const line11_accountingFees = latestDNI.accountingFees;
    const line13_legalFees = latestDNI.legalFees;
    const line15a_otherDeductions = latestDNI.otherDeductions;
    const line16_totalDeductions = latestDNI.totalDeductions;

    // Tax computation
    const line17_adjustedTotalIncome = line9_totalIncome - line16_totalDeductions;
    const line18_incomeDistributionDeduction = latestDNI.distributionDeduction;
    const line19_estateExemption = 600; // $6.00 for complex trust (in cents)
    const line20_taxableIncome = Math.max(0, line17_adjustedTotalIncome - line18_incomeDistributionDeduction - line19_estateExemption);

    return {
      line1_interestIncome,
      line2a_ordinaryDividends,
      line3_businessIncome,
      line4_capitalGain,
      line8_otherIncome,
      line9_totalIncome,
      line10_fiduciaryFees,
      line11_accountingFees,
      line13_legalFees,
      line15a_otherDeductions,
      line16_totalDeductions,
      line17_adjustedTotalIncome,
      line18_incomeDistributionDeduction,
      line19_estateExemption,
      line20_taxableIncome,
      distributableNetIncome: latestDNI.distributableNetIncome,
    };
  };

  const form1041Data = calculateForm1041Lines();

  const generatePDF = () => {
    if (!selectedTrust || !form1041Data) {
      toast.error("Missing required data for Form 1041");
      return;
    }

    setIsGenerating(true);

    try {
      const doc = new jsPDF();
      
      // Title
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("U.S. Income Tax Return for Estates and Trusts", 105, 20, { align: "center" });
      doc.setFontSize(12);
      doc.text("Form 1041", 105, 28, { align: "center" });
      
      // Trust information
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Name of estate or trust: ${selectedTrust.trustName}`, 20, 40);
      doc.text(`Employer identification number: ${selectedTrust.ein}`, 20, 46);
      doc.text(`Tax year: ${selectedYear}`, 20, 52);
      doc.text(`Type of entity: ${selectedTrust.trustType} trust`, 20, 58);
      
      // Income section
      doc.setFont("helvetica", "bold");
      doc.text("Income", 20, 70);
      doc.setFont("helvetica", "normal");
      
      let y = 76;
      doc.text(`1. Interest income`, 25, y);
      doc.text(formatCurrency(form1041Data.line1_interestIncome), 170, y, { align: "right" });
      y += 6;
      
      doc.text(`2a. Ordinary dividends`, 25, y);
      doc.text(formatCurrency(form1041Data.line2a_ordinaryDividends), 170, y, { align: "right" });
      y += 6;
      
      doc.text(`3. Business income or (loss)`, 25, y);
      doc.text(formatCurrency(form1041Data.line3_businessIncome), 170, y, { align: "right" });
      y += 6;
      
      doc.text(`4. Capital gain or (loss)`, 25, y);
      doc.text(formatCurrency(form1041Data.line4_capitalGain), 170, y, { align: "right" });
      y += 6;
      
      doc.text(`8. Other income`, 25, y);
      doc.text(formatCurrency(form1041Data.line8_otherIncome), 170, y, { align: "right" });
      y += 6;
      
      doc.setFont("helvetica", "bold");
      doc.text(`9. Total income`, 25, y);
      doc.text(formatCurrency(form1041Data.line9_totalIncome), 170, y, { align: "right" });
      y += 10;
      
      // Deductions section
      doc.setFont("helvetica", "bold");
      doc.text("Deductions", 20, y);
      doc.setFont("helvetica", "normal");
      y += 6;
      
      doc.text(`10. Fiduciary fees`, 25, y);
      doc.text(formatCurrency(form1041Data.line10_fiduciaryFees), 170, y, { align: "right" });
      y += 6;
      
      doc.text(`11. Accounting fees`, 25, y);
      doc.text(formatCurrency(form1041Data.line11_accountingFees), 170, y, { align: "right" });
      y += 6;
      
      doc.text(`13. Attorney fees`, 25, y);
      doc.text(formatCurrency(form1041Data.line13_legalFees), 170, y, { align: "right" });
      y += 6;
      
      doc.text(`15a. Other deductions`, 25, y);
      doc.text(formatCurrency(form1041Data.line15a_otherDeductions), 170, y, { align: "right" });
      y += 6;
      
      doc.setFont("helvetica", "bold");
      doc.text(`16. Total deductions`, 25, y);
      doc.text(formatCurrency(form1041Data.line16_totalDeductions), 170, y, { align: "right" });
      y += 10;
      
      // Tax computation
      doc.setFont("helvetica", "bold");
      doc.text("Tax and Payments", 20, y);
      doc.setFont("helvetica", "normal");
      y += 6;
      
      doc.text(`17. Adjusted total income`, 25, y);
      doc.text(formatCurrency(form1041Data.line17_adjustedTotalIncome), 170, y, { align: "right" });
      y += 6;
      
      doc.text(`18. Income distribution deduction`, 25, y);
      doc.text(formatCurrency(form1041Data.line18_incomeDistributionDeduction), 170, y, { align: "right" });
      y += 6;
      
      doc.text(`19. Estate tax deduction`, 25, y);
      doc.text(formatCurrency(form1041Data.line19_estateExemption), 170, y, { align: "right" });
      y += 6;
      
      doc.setFont("helvetica", "bold");
      doc.text(`20. Taxable income`, 25, y);
      doc.text(formatCurrency(form1041Data.line20_taxableIncome), 170, y, { align: "right" });
      y += 10;
      
      // DNI summary
      doc.setFont("helvetica", "bold");
      doc.text("Distributable Net Income (DNI)", 20, y);
      doc.setFont("helvetica", "normal");
      y += 6;
      
      doc.text(`Distributable Net Income:`, 25, y);
      doc.text(formatCurrency(form1041Data.distributableNetIncome), 170, y, { align: "right" });
      
      // Footer
      doc.setFontSize(8);
      doc.text("This is a computer-generated form. Please review all information for accuracy.", 105, 280, { align: "center" });
      doc.text(`Generated on ${new Date().toLocaleDateString()}`, 105, 285, { align: "center" });
      
      // Save PDF
      doc.save(`Form-1041-${selectedTrust.trustName}-${selectedYear}.pdf`);
      
      toast.success("Form 1041 PDF generated successfully");
    } catch (error: any) {
      toast.error(`Failed to generate PDF: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const validationIssues: string[] = [];
  if (!selectedTrust) validationIssues.push("No trust account selected");
  if (!latestDNI) validationIssues.push("No DNI calculation found for selected year");
  if (!trialBalance) validationIssues.push("No trial balance data available");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Form 1041 Generator</CardTitle>
          <CardDescription>
            Generate U.S. Income Tax Return for Estates and Trusts from ledger data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Selection Controls */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="trustAccount">Trust Account</Label>
              <Select
                value={selectedTrustId?.toString()}
                onValueChange={(v) => setSelectedTrustId(parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select trust account" />
                </SelectTrigger>
                <SelectContent>
                  {trustAccounts?.map((trust) => (
                    <SelectItem key={trust.id} value={trust.id.toString()}>
                      {trust.trustName} ({trust.ein})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="taxYear">Tax Year</Label>
              <Select
                value={selectedYear.toString()}
                onValueChange={(v) => setSelectedYear(parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2023">2023</SelectItem>
                  <SelectItem value="2022">2022</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Validation Status */}
          {validationIssues.length > 0 && (
            <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-900 dark:text-yellow-100 mb-2">
                      Cannot generate Form 1041
                    </p>
                    <ul className="text-sm text-yellow-800 dark:text-yellow-200 space-y-1">
                      {validationIssues.map((issue, i) => (
                        <li key={i}>• {issue}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Form Preview */}
          {form1041Data && selectedTrust && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Form 1041 Preview</CardTitle>
                <CardDescription>
                  {selectedTrust.trustName} - Tax Year {selectedYear}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Income Section */}
                <div>
                  <h3 className="font-semibold mb-3">Income</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>1. Interest income</span>
                      <span className="font-mono">{formatCurrency(form1041Data.line1_interestIncome)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>2a. Ordinary dividends</span>
                      <span className="font-mono">{formatCurrency(form1041Data.line2a_ordinaryDividends)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>3. Business income or (loss)</span>
                      <span className="font-mono">{formatCurrency(form1041Data.line3_businessIncome)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>4. Capital gain or (loss)</span>
                      <span className="font-mono">{formatCurrency(form1041Data.line4_capitalGain)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>8. Other income</span>
                      <span className="font-mono">{formatCurrency(form1041Data.line8_otherIncome)}</span>
                    </div>
                    <div className="flex justify-between font-bold pt-2 border-t">
                      <span>9. Total income</span>
                      <span className="font-mono">{formatCurrency(form1041Data.line9_totalIncome)}</span>
                    </div>
                  </div>
                </div>

                {/* Deductions Section */}
                <div>
                  <h3 className="font-semibold mb-3">Deductions</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>10. Fiduciary fees</span>
                      <span className="font-mono">{formatCurrency(form1041Data.line10_fiduciaryFees)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>11. Accounting fees</span>
                      <span className="font-mono">{formatCurrency(form1041Data.line11_accountingFees)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>13. Attorney fees</span>
                      <span className="font-mono">{formatCurrency(form1041Data.line13_legalFees)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>15a. Other deductions</span>
                      <span className="font-mono">{formatCurrency(form1041Data.line15a_otherDeductions)}</span>
                    </div>
                    <div className="flex justify-between font-bold pt-2 border-t">
                      <span>16. Total deductions</span>
                      <span className="font-mono">{formatCurrency(form1041Data.line16_totalDeductions)}</span>
                    </div>
                  </div>
                </div>

                {/* Tax Computation */}
                <div>
                  <h3 className="font-semibold mb-3">Tax and Payments</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>17. Adjusted total income</span>
                      <span className="font-mono">{formatCurrency(form1041Data.line17_adjustedTotalIncome)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>18. Income distribution deduction</span>
                      <span className="font-mono">{formatCurrency(form1041Data.line18_incomeDistributionDeduction)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>19. Estate tax deduction</span>
                      <span className="font-mono">{formatCurrency(form1041Data.line19_estateExemption)}</span>
                    </div>
                    <div className="flex justify-between font-bold pt-2 border-t">
                      <span>20. Taxable income</span>
                      <span className="font-mono">{formatCurrency(form1041Data.line20_taxableIncome)}</span>
                    </div>
                  </div>
                </div>

                {/* DNI Summary */}
                <Card className="bg-primary/5">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Distributable Net Income (DNI)</p>
                        <p className="text-2xl font-bold">{formatCurrency(form1041Data.distributableNetIncome)}</p>
                      </div>
                      <CheckCircle2 className="w-8 h-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              disabled={validationIssues.length > 0 || isGenerating}
            >
              <FileText className="w-4 h-4 mr-2" />
              Preview Full Form
            </Button>
            <Button
              onClick={generatePDF}
              disabled={validationIssues.length > 0 || isGenerating}
            >
              <Download className="w-4 h-4 mr-2" />
              {isGenerating ? "Generating..." : "Download PDF"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
