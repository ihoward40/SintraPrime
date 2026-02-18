import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Users, Plus, Trash2, Calculator, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface Beneficiary {
  id: string;
  name: string;
  percentage: number;
}

interface AllocationResult {
  beneficiary: string;
  income: number;
  taxableIncome: number;
  taxExemptIncome: number;
  estimatedTax: number;
}

export function BeneficiarySimulator() {
  const [dni, setDni] = useState<number>(0);
  const [taxExemptPortion, setTaxExemptPortion] = useState<number>(0);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([
    { id: '1', name: 'Beneficiary 1', percentage: 100 }
  ]);
  const [results, setResults] = useState<AllocationResult[]>([]);

  const addBeneficiary = () => {
    const newId = (beneficiaries.length + 1).toString();
    setBeneficiaries([...beneficiaries, { id: newId, name: `Beneficiary ${newId}`, percentage: 0 }]);
  };

  const removeBeneficiary = (id: string) => {
    if (beneficiaries.length > 1) {
      setBeneficiaries(beneficiaries.filter(b => b.id !== id));
    } else {
      toast.error("Must have at least one beneficiary");
    }
  };

  const updateBeneficiary = (id: string, field: 'name' | 'percentage', value: string | number) => {
    setBeneficiaries(beneficiaries.map(b => 
      b.id === id ? { ...b, [field]: value } : b
    ));
  };

  const calculateAllocations = () => {
    const totalPercentage = beneficiaries.reduce((sum, b) => sum + b.percentage, 0);
    
    if (Math.abs(totalPercentage - 100) > 0.01) {
      toast.error("Beneficiary percentages must total 100%");
      return;
    }

    const taxableIncome = dni - taxExemptPortion;
    
    const allocations: AllocationResult[] = beneficiaries.map(b => {
      const income = (dni * b.percentage) / 100;
      const taxable = (taxableIncome * b.percentage) / 100;
      const taxExempt = (taxExemptPortion * b.percentage) / 100;
      
      // Simplified tax estimate (using 2024 rates - 24% bracket assumption)
      const estimatedTax = taxable * 0.24;

      return {
        beneficiary: b.name,
        income,
        taxableIncome: taxable,
        taxExemptIncome: taxExempt,
        estimatedTax
      };
    });

    setResults(allocations);
    toast.success("Allocations calculated successfully");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Beneficiary Allocation Simulator
          </CardTitle>
          <CardDescription>
            Model distribution scenarios and estimate tax impacts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* DNI Input */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dni">Distributable Net Income (DNI)</Label>
              <Input
                id="dni"
                type="number"
                placeholder="0.00"
                value={dni || ''}
                onChange={(e) => setDni(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxExempt">Tax-Exempt Portion</Label>
              <Input
                id="taxExempt"
                type="number"
                placeholder="0.00"
                value={taxExemptPortion || ''}
                onChange={(e) => setTaxExemptPortion(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <Separator />

          {/* Beneficiaries */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Beneficiaries</Label>
              <Button size="sm" variant="outline" onClick={addBeneficiary}>
                <Plus className="w-4 h-4 mr-2" />
                Add Beneficiary
              </Button>
            </div>

            {beneficiaries.map((beneficiary, index) => (
              <Card key={beneficiary.id} className="bg-gray-50">
                <CardContent className="pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-[1fr,120px,auto] gap-4 items-end">
                    <div className="space-y-2">
                      <Label htmlFor={`name-${beneficiary.id}`}>Name</Label>
                      <Input
                        id={`name-${beneficiary.id}`}
                        value={beneficiary.name}
                        onChange={(e) => updateBeneficiary(beneficiary.id, 'name', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`percentage-${beneficiary.id}`}>Percentage</Label>
                      <Input
                        id={`percentage-${beneficiary.id}`}
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={beneficiary.percentage || ''}
                        onChange={(e) => updateBeneficiary(beneficiary.id, 'percentage', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeBeneficiary(beneficiary.id)}
                      disabled={beneficiaries.length === 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            <div className="text-sm text-muted-foreground">
              Total: {beneficiaries.reduce((sum, b) => sum + b.percentage, 0).toFixed(2)}%
            </div>
          </div>

          <Button onClick={calculateAllocations} className="w-full">
            <Calculator className="w-4 h-4 mr-2" />
            Calculate Allocations
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Allocation Results</CardTitle>
            <CardDescription>Estimated distributions and tax impacts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {results.map((result, index) => (
                <Card key={index} className="bg-blue-50 border-blue-200">
                  <CardContent className="pt-4">
                    <h3 className="font-semibold mb-3">{result.beneficiary}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Total Income</p>
                        <p className="font-semibold">${result.income.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Taxable Income</p>
                        <p className="font-semibold">${result.taxableIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Tax-Exempt Income</p>
                        <p className="font-semibold">${result.taxExemptIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Est. Tax (24%)</p>
                        <p className="font-semibold text-red-600">${result.estimatedTax.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Disclaimer */}
            <Card className="mt-4 bg-amber-50 border-amber-200">
              <CardContent className="pt-4">
                <div className="flex items-start gap-2 text-sm text-amber-900">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="font-semibold">Tax Estimate Disclaimer</p>
                    <p className="text-xs">
                      Tax estimates use simplified 24% bracket assumption. Actual tax liability depends on beneficiary's total income, filing status, deductions, and applicable tax rates. Consult tax professional for accurate projections.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
