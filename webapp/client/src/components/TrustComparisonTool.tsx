import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Download, BarChart3, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export function TrustComparisonTool() {
  const [selectedTrust1, setSelectedTrust1] = useState<number | null>(null);
  const [selectedTrust2, setSelectedTrust2] = useState<number | null>(null);

  const { data: trustAccounts } = trpc.trustAccounting.getTrustAccounts.useQuery({});

  const trust1 = trustAccounts?.find((t) => t.id === selectedTrust1);
  const trust2 = trustAccounts?.find((t) => t.id === selectedTrust2);

  const exportComparison = () => {
    if (!selectedTrust1 || !selectedTrust2) {
      toast.error("Please select two trusts to compare");
      return;
    }

    const csvContent = `Trust Comparison Report
Generated: ${new Date().toLocaleDateString()}

Trust 1: ${trust1?.trustName || "N/A"}
Trust 2: ${trust2?.trustName || "N/A"}`;

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trust-comparison-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Comparison exported successfully!");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Trust Comparison Tool
          </CardTitle>
          <CardDescription>
            Compare financial performance and tax efficiency across multiple trust accounts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Trust Account 1</label>
              <Select
                value={selectedTrust1?.toString()}
                onValueChange={(value) => setSelectedTrust1(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select first trust" />
                </SelectTrigger>
                <SelectContent>
                  {trustAccounts?.map((trust) => (
                    <SelectItem key={trust.id} value={trust.id.toString()}>
                      {trust.trustName} ({trust.taxYear})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Trust Account 2</label>
              <Select
                value={selectedTrust2?.toString()}
                onValueChange={(value) => setSelectedTrust2(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select second trust" />
                </SelectTrigger>
                <SelectContent>
                  {trustAccounts?.map((trust) => (
                    <SelectItem key={trust.id} value={trust.id.toString()}>
                      {trust.trustName} ({trust.taxYear})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button
              onClick={exportComparison}
              disabled={!selectedTrust1 || !selectedTrust2}
              variant="outline"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Comparison
            </Button>
          </div>
        </CardContent>
      </Card>

      {(!selectedTrust1 || !selectedTrust2) && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <DollarSign className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Select two trusts to compare</p>
              <p className="text-sm mt-2">
                Choose trust accounts from the dropdowns above to view side-by-side financial analysis
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
