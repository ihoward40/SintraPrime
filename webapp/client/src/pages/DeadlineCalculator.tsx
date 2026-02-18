import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { Calculator, Clock, AlertTriangle, CheckCircle2, XCircle, Calendar, Scale } from "lucide-react";
import { toast } from "sonner";

export default function DeadlineCalculator() {
  const [triggerDate, setTriggerDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedRule, setSelectedRule] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [hasCalculated, setHasCalculated] = useState(false);

  const { data: rulesData } = trpc.deadlines.rules.useQuery();

  const isStateSOL = selectedRule === "state_sol";

  const queryInput = useMemo(() => ({
    triggerDate,
    ruleType: selectedRule,
    state: isStateSOL ? selectedState : undefined,
  }), [triggerDate, selectedRule, selectedState, isStateSOL]);

  const { data: results, isLoading, refetch } = trpc.deadlines.calculate.useQuery(
    queryInput,
    { enabled: hasCalculated && !!selectedRule && (!isStateSOL || !!selectedState) }
  );

  const handleCalculate = () => {
    if (!selectedRule) {
      toast.error("Please select a deadline rule");
      return;
    }
    if (isStateSOL && !selectedState) {
      toast.error("Please select a state for SOL calculation");
      return;
    }
    setHasCalculated(true);
    refetch();
  };

  // Group federal rules by category
  const groupedRules = useMemo(() => {
    if (!rulesData?.federal) return {};
    const groups: Record<string, typeof rulesData.federal> = {};
    for (const rule of rulesData.federal) {
      if (!groups[rule.category]) groups[rule.category] = [];
      groups[rule.category].push(rule);
    }
    return groups;
  }, [rulesData]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Calculator className="h-8 w-8 text-primary" />
            Deadline Calculator
          </h1>
          <p className="text-muted-foreground mt-1">
            Compute filing deadlines based on federal rules and state statutes of limitations
          </p>
        </div>

        {/* Disclaimer */}
        <Card className="border-yellow-500/30 bg-yellow-50/50 dark:bg-yellow-950/10">
          <CardContent className="py-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
            <p className="text-xs text-yellow-800 dark:text-yellow-200">
              Deadline calculations are for informational purposes only. Court rules, holidays, weekends, and specific 
              circumstances may affect actual deadlines. Always verify with applicable rules and consult a licensed attorney.
            </p>
          </CardContent>
        </Card>

        {/* Calculator Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Calculate Deadlines</CardTitle>
            <CardDescription>
              Enter the trigger date and select the applicable rule to compute deadlines
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Trigger Date *</Label>
                <Input
                  type="date"
                  value={triggerDate}
                  onChange={(e) => { setTriggerDate(e.target.value); setHasCalculated(false); }}
                />
                <p className="text-xs text-muted-foreground">Date the event occurred or debt was incurred</p>
              </div>

              <div className="space-y-2">
                <Label>Deadline Rule *</Label>
                <Select value={selectedRule} onValueChange={(v) => { setSelectedRule(v); setHasCalculated(false); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a rule..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(groupedRules).map(([category, rules]) => (
                      <div key={category}>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{category}</div>
                        {rules.map((rule) => (
                          <SelectItem key={rule.key} value={rule.key}>{rule.name}</SelectItem>
                        ))}
                      </div>
                    ))}
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">State</div>
                    <SelectItem value="state_sol">State Statute of Limitations</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isStateSOL && (
                <div className="space-y-2">
                  <Label>State *</Label>
                  <Select value={selectedState} onValueChange={(v) => { setSelectedState(v); setHasCalculated(false); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select state..." />
                    </SelectTrigger>
                    <SelectContent>
                      {rulesData?.states.map((state) => (
                        <SelectItem key={state} value={state}>{state}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label className="invisible">Action</Label>
                <Button onClick={handleCalculate} disabled={isLoading} className="w-full">
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Calculating...
                    </>
                  ) : (
                    <>
                      <Calculator className="mr-2 h-4 w-4" />
                      Calculate
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {results && results.results.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Deadline Results
            </h2>
            <div className="grid gap-3">
              {results.results.map((result, i) => {
                const isUrgent = !result.isPast && result.daysRemaining <= 7;
                const isWarning = !result.isPast && result.daysRemaining <= 30;
                
                return (
                  <Card
                    key={i}
                    className={`transition-shadow hover:shadow-md ${
                      result.isPast
                        ? "border-red-200 dark:border-red-900/50"
                        : isUrgent
                        ? "border-red-400 dark:border-red-800"
                        : isWarning
                        ? "border-yellow-400 dark:border-yellow-800"
                        : "border-green-200 dark:border-green-900/50"
                    }`}
                  >
                    <CardContent className="py-4">
                      <div className="flex items-start gap-4">
                        <div className="shrink-0 mt-1">
                          {result.isPast ? (
                            <XCircle className="h-6 w-6 text-red-500" />
                          ) : isUrgent ? (
                            <AlertTriangle className="h-6 w-6 text-red-500" />
                          ) : isWarning ? (
                            <Clock className="h-6 w-6 text-yellow-500" />
                          ) : (
                            <CheckCircle2 className="h-6 w-6 text-green-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold">{result.name}</h3>
                            {result.isPast ? (
                              <Badge variant="destructive">Expired</Badge>
                            ) : isUrgent ? (
                              <Badge variant="destructive">Urgent</Badge>
                            ) : isWarning ? (
                              <Badge className="bg-yellow-500">Approaching</Badge>
                            ) : (
                              <Badge className="bg-green-500">Active</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{result.description}</p>
                          <div className="flex items-center gap-4 mt-2 flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">
                                {new Date(result.deadline).toLocaleDateString("en-US", {
                                  weekday: "long",
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                })}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className={`text-sm font-medium ${
                                result.isPast ? "text-red-500" : isUrgent ? "text-red-500" : ""
                              }`}>
                                {result.isPast
                                  ? `${Math.abs(result.daysRemaining)} days ago`
                                  : `${result.daysRemaining} days remaining`}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Scale className="h-4 w-4 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground font-mono">{result.statute}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Disclaimer at bottom */}
            {results.disclaimer && (
              <p className="text-xs text-muted-foreground italic px-1">{results.disclaimer}</p>
            )}
          </div>
        )}

        {/* Quick Reference Cards */}
        {!hasCalculated && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Quick Reference</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Badge>FDCPA</Badge>
                    Fair Debt Collection Practices Act
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p><strong>Validation:</strong> 30 days from initial communication</p>
                  <p><strong>Lawsuit:</strong> 1 year from violation</p>
                  <p className="text-xs text-muted-foreground mt-2">15 U.S.C. § 1692</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Badge>FCRA</Badge>
                    Fair Credit Reporting Act
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p><strong>Investigation:</strong> 30 days (45 with additional info)</p>
                  <p><strong>Lawsuit:</strong> 2 years from discovery</p>
                  <p className="text-xs text-muted-foreground mt-2">15 U.S.C. § 1681</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Badge>TILA</Badge>
                    Truth in Lending Act
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p><strong>Rescission:</strong> 3 business days</p>
                  <p><strong>Lawsuit:</strong> 1 year from violation</p>
                  <p className="text-xs text-muted-foreground mt-2">15 U.S.C. § 1601</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Badge>RESPA</Badge>
                    Real Estate Settlement Procedures Act
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p><strong>Lawsuit:</strong> 3 years from violation</p>
                  <p className="text-xs text-muted-foreground mt-2">12 U.S.C. § 2601</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Badge variant="outline">Civil Procedure</Badge>
                    Federal Rules
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p><strong>Answer:</strong> 21 days from service</p>
                  <p><strong>Discovery:</strong> 30 days to respond</p>
                  <p><strong>Appeal:</strong> 30 days from judgment</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Badge variant="outline">State SOL</Badge>
                    Statute of Limitations
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p><strong>Varies by state:</strong> 2-15 years</p>
                  <p><strong>Debt types:</strong> Written, Oral, Promissory, Open Account</p>
                  <p className="text-xs text-muted-foreground mt-2">Select state above to calculate</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
