import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Calculator, Info, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { Streamdown } from "streamdown";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DNIInputs {
  trustIncome: number;
  capitalGains: number;
  taxExemptIncome: number;
  deductibleExpenses: number;
  capitalGainsAllocated: boolean;
}

export function DNICalculator() {
  const [inputs, setInputs] = useState<DNIInputs>({
    trustIncome: 0,
    capitalGains: 0,
    taxExemptIncome: 0,
    deductibleExpenses: 0,
    capitalGainsAllocated: false,
  });

  const [result, setResult] = useState<number | null>(null);
  const [analysis, setAnalysis] = useState<string>("");
  const [showAnalysis, setShowAnalysis] = useState<boolean>(false);

  const analyzeDNI = trpc.taxAnalysis.analyzeDNI.useMutation({
    onSuccess: (data) => {
      // Handle both string and array content types from LLM
      const analysisText = typeof data.analysis === 'string' 
        ? data.analysis 
        : JSON.stringify(data.analysis);
      setAnalysis(analysisText);
      setShowAnalysis(true);
      toast.success("DNI analysis complete");
    },
    onError: (error) => {
      toast.error(`Analysis failed: ${error.message}`);
    },
  });

  const calculateDNI = () => {
    // DNI = Trust Accounting Income - Capital Gains (unless allocated) + Tax-Exempt Income - Deductible Expenses
    let dni = inputs.trustIncome - inputs.deductibleExpenses + inputs.taxExemptIncome;
    
    if (!inputs.capitalGainsAllocated) {
      dni -= inputs.capitalGains;
    }

    setResult(dni);
    toast.success(`DNI calculated: $${dni.toLocaleString()}`);
  };

  const handleInputChange = (field: keyof DNIInputs, value: string | boolean) => {
    setInputs(prev => ({
      ...prev,
      [field]: typeof value === 'boolean' ? value : parseFloat(value) || 0
    }));
  };

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            DNI Calculator
          </CardTitle>
          <CardDescription>
            Calculate Distributable Net Income for Form 1041
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Trust Accounting Income */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="trustIncome">Trust Accounting Income</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">Total income earned by the trust during the tax year, including interest, dividends, rents, and business income.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Input
              id="trustIncome"
              type="number"
              placeholder="0.00"
              value={inputs.trustIncome || ''}
              onChange={(e) => handleInputChange('trustIncome', e.target.value)}
            />
          </div>

          {/* Capital Gains */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="capitalGains">Capital Gains</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">Long-term and short-term capital gains realized by the trust. Generally excluded from DNI unless allocated to income in the trust instrument.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Input
              id="capitalGains"
              type="number"
              placeholder="0.00"
              value={inputs.capitalGains || ''}
              onChange={(e) => handleInputChange('capitalGains', e.target.value)}
            />
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="capitalGainsAllocated"
                checked={inputs.capitalGainsAllocated}
                onChange={(e) => handleInputChange('capitalGainsAllocated', e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="capitalGainsAllocated" className="text-sm font-normal cursor-pointer">
                Capital gains allocated to income per trust instrument
              </Label>
            </div>
          </div>

          {/* Tax-Exempt Income */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="taxExemptIncome">Tax-Exempt Income</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">Municipal bond interest and other tax-exempt income. Included in DNI but not taxable to beneficiaries.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Input
              id="taxExemptIncome"
              type="number"
              placeholder="0.00"
              value={inputs.taxExemptIncome || ''}
              onChange={(e) => handleInputChange('taxExemptIncome', e.target.value)}
            />
          </div>

          {/* Deductible Expenses */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="deductibleExpenses">Deductible Expenses</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">Trustee fees, accounting fees, legal fees, and other expenses deductible on Form 1041.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Input
              id="deductibleExpenses"
              type="number"
              placeholder="0.00"
              value={inputs.deductibleExpenses || ''}
              onChange={(e) => handleInputChange('deductibleExpenses', e.target.value)}
            />
          </div>

          <Separator />

          {/* Calculate Button */}
          <div className="flex gap-2">
            <Button onClick={calculateDNI} className="flex-1">
              <Calculator className="w-4 h-4 mr-2" />
              Calculate DNI
            </Button>
            <Button
              onClick={() => {
                analyzeDNI.mutate({
                  trustAccountingIncome: inputs.trustIncome,
                  capitalGains: inputs.capitalGains,
                  includeCapitalGains: inputs.capitalGainsAllocated,
                  taxExemptIncome: inputs.taxExemptIncome,
                  deductibleExpenses: inputs.deductibleExpenses,
                });
              }}
              disabled={analyzeDNI.isPending}
              variant="outline"
              className="flex-1"
            >
              {analyzeDNI.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                "Get AI Analysis"
              )}
            </Button>
          </div>

          {/* Result */}
          {result !== null && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">Distributable Net Income (DNI)</p>
                  <p className="text-3xl font-bold text-blue-900">
                    ${result.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* AI Analysis Result */}
          {showAnalysis && analysis && (
            <Card className="bg-purple-50 border-purple-200">
              <CardHeader>
                <CardTitle className="text-lg">Conservative Tax Analysis</CardTitle>
                <CardDescription>AI-powered IRC §643(a) interpretation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  <Streamdown>{analysis}</Streamdown>
                </div>
                <Button
                  onClick={() => setShowAnalysis(false)}
                  variant="ghost"
                  size="sm"
                  className="mt-4"
                >
                  Close Analysis
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Conservative Interpretation Notice */}
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="pt-4">
              <div className="flex items-start gap-2 text-sm text-amber-900">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="font-semibold">Conservative Interpretation</p>
                  <p className="text-xs">
                    This calculator uses IRC §643(a) definition of DNI. Consult trust instrument for specific allocation provisions. Capital gains treatment may vary based on state law and trust terms.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
