import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Download, TrendingUp, DollarSign, Percent } from "lucide-react";

interface ProjectionScenario {
  name: string;
  growthRate: number;
  description: string;
}

const scenarios: ProjectionScenario[] = [
  { name: "Conservative", growthRate: 0.03, description: "3% annual growth, minimal risk" },
  { name: "Moderate", growthRate: 0.06, description: "6% annual growth, balanced approach" },
  { name: "Aggressive", growthRate: 0.10, description: "10% annual growth, higher risk" },
];

interface ProjectionData {
  year: number;
  income: number;
  deductions: number;
  dni: number;
  distributions: number;
  taxLiability: number;
}

export function TaxProjectionTool() {
  const currentYear = new Date().getFullYear();
  const [baseIncome, setBaseIncome] = useState<number>(100000);
  const [baseDeductions, setBaseDeductions] = useState<number>(20000);
  const [distributionRate, setDistributionRate] = useState<number>(0.5);
  const [taxRate, setTaxRate] = useState<number>(0.37);
  const [years, setYears] = useState<number>(5);
  const [selectedScenario, setSelectedScenario] = useState<string>("Moderate");
  const [projections, setProjections] = useState<Record<string, ProjectionData[]>>({});

  const calculateProjections = () => {
    const newProjections: Record<string, ProjectionData[]> = {};

    scenarios.forEach((scenario) => {
      const data: ProjectionData[] = [];
      let currentIncome = baseIncome;
      let currentDeductions = baseDeductions;

      for (let i = 0; i < years; i++) {
        const year = currentYear + i;
        const income = currentIncome;
        const deductions = currentDeductions;
        const dni = income - deductions;
        const distributions = dni * distributionRate;
        const taxableIncome = dni - distributions;
        const taxLiability = taxableIncome * taxRate;

        data.push({
          year,
          income: Math.round(income),
          deductions: Math.round(deductions),
          dni: Math.round(dni),
          distributions: Math.round(distributions),
          taxLiability: Math.round(taxLiability),
        });

        // Apply growth rate for next year
        currentIncome *= 1 + scenario.growthRate;
        currentDeductions *= 1 + scenario.growthRate * 0.5; // Deductions grow at half the rate
      }

      newProjections[scenario.name] = data;
    });

    setProjections(newProjections);
  };

  const exportToCSV = () => {
    const scenario = scenarios.find((s) => s.name === selectedScenario);
    if (!scenario || !projections[scenario.name]) return;

    const data = projections[scenario.name];
    const headers = ["Year", "Income", "Deductions", "DNI", "Distributions", "Tax Liability"];
    const rows = data.map((d) => [d.year, d.income, d.deductions, d.dni, d.distributions, d.taxLiability]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tax_projection_${scenario.name.toLowerCase()}_${currentYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectedProjection = projections[selectedScenario] || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Tax Projection Tool
          </CardTitle>
          <CardDescription>
            Project trust income, DNI, and tax liability over multiple years with different growth scenarios
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Input Parameters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="baseIncome">Base Income ($)</Label>
              <Input
                id="baseIncome"
                type="number"
                value={baseIncome}
                onChange={(e) => setBaseIncome(Number(e.target.value))}
                placeholder="100000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="baseDeductions">Base Deductions ($)</Label>
              <Input
                id="baseDeductions"
                type="number"
                value={baseDeductions}
                onChange={(e) => setBaseDeductions(Number(e.target.value))}
                placeholder="20000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="distributionRate">Distribution Rate (%)</Label>
              <Input
                id="distributionRate"
                type="number"
                value={distributionRate * 100}
                onChange={(e) => setDistributionRate(Number(e.target.value) / 100)}
                placeholder="50"
                min="0"
                max="100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxRate">Tax Rate (%)</Label>
              <Input
                id="taxRate"
                type="number"
                value={taxRate * 100}
                onChange={(e) => setTaxRate(Number(e.target.value) / 100)}
                placeholder="37"
                min="0"
                max="100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="years">Projection Years</Label>
              <Input
                id="years"
                type="number"
                value={years}
                onChange={(e) => setYears(Math.min(10, Math.max(1, Number(e.target.value))))}
                placeholder="5"
                min="1"
                max="10"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={calculateProjections} className="w-full">
                Calculate Projections
              </Button>
            </div>
          </div>

          {/* Scenario Tabs */}
          {Object.keys(projections).length > 0 && (
            <Tabs value={selectedScenario} onValueChange={setSelectedScenario} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                {scenarios.map((scenario) => (
                  <TabsTrigger key={scenario.name} value={scenario.name}>
                    {scenario.name}
                  </TabsTrigger>
                ))}
              </TabsList>

              {scenarios.map((scenario) => (
                <TabsContent key={scenario.name} value={scenario.name} className="space-y-4">
                  <div className="text-sm text-muted-foreground">{scenario.description}</div>

                  {/* Summary Cards */}
                  {projections[scenario.name] && projections[scenario.name].length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            Total DNI
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            ${projections[scenario.name].reduce((sum, d) => sum + d.dni, 0).toLocaleString()}
                          </div>
                          <p className="text-xs text-muted-foreground">Over {years} years</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            Total Distributions
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            $
                            {projections[scenario.name]
                              .reduce((sum, d) => sum + d.distributions, 0)
                              .toLocaleString()}
                          </div>
                          <p className="text-xs text-muted-foreground">To beneficiaries</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            Total Tax Liability
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            $
                            {projections[scenario.name]
                              .reduce((sum, d) => sum + d.taxLiability, 0)
                              .toLocaleString()}
                          </div>
                          <p className="text-xs text-muted-foreground">Trust-level taxes</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Percent className="h-4 w-4" />
                            Effective Tax Rate
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            {(
                              (projections[scenario.name].reduce((sum, d) => sum + d.taxLiability, 0) /
                                projections[scenario.name].reduce((sum, d) => sum + d.dni, 0)) *
                              100
                            ).toFixed(1)}
                            %
                          </div>
                          <p className="text-xs text-muted-foreground">Average over period</p>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Chart */}
                  {projections[scenario.name] && projections[scenario.name].length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Projection Chart</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={400}>
                          <LineChart data={projections[scenario.name]}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="year" />
                            <YAxis />
                            <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                            <Legend />
                            <Line type="monotone" dataKey="income" stroke="#3b82f6" name="Income" />
                            <Line type="monotone" dataKey="deductions" stroke="#ef4444" name="Deductions" />
                            <Line type="monotone" dataKey="dni" stroke="#10b981" name="DNI" />
                            <Line type="monotone" dataKey="distributions" stroke="#f59e0b" name="Distributions" />
                            <Line type="monotone" dataKey="taxLiability" stroke="#8b5cf6" name="Tax Liability" />
                          </LineChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  )}

                  {/* Data Table */}
                  {projections[scenario.name] && projections[scenario.name].length > 0 && (
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle>Detailed Projections</CardTitle>
                          <Button variant="outline" size="sm" onClick={exportToCSV}>
                            <Download className="h-4 w-4 mr-2" />
                            Export CSV
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left p-2">Year</th>
                                <th className="text-right p-2">Income</th>
                                <th className="text-right p-2">Deductions</th>
                                <th className="text-right p-2">DNI</th>
                                <th className="text-right p-2">Distributions</th>
                                <th className="text-right p-2">Tax Liability</th>
                              </tr>
                            </thead>
                            <tbody>
                              {projections[scenario.name].map((row) => (
                                <tr key={row.year} className="border-b">
                                  <td className="p-2">{row.year}</td>
                                  <td className="text-right p-2">${row.income.toLocaleString()}</td>
                                  <td className="text-right p-2">${row.deductions.toLocaleString()}</td>
                                  <td className="text-right p-2 font-semibold">${row.dni.toLocaleString()}</td>
                                  <td className="text-right p-2">${row.distributions.toLocaleString()}</td>
                                  <td className="text-right p-2">${row.taxLiability.toLocaleString()}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
