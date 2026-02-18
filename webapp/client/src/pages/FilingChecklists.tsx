import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ClipboardList, FileText, AlertTriangle, DollarSign,
  CheckCircle2, Circle, ChevronDown, ChevronRight, Printer,
  Scale, Clock, Info,
} from "lucide-react";
import { toast } from "sonner";

const CASE_TYPES = [
  { value: "FDCPA", label: "Fair Debt Collection Practices Act (FDCPA)" },
  { value: "FCRA", label: "Fair Credit Reporting Act (FCRA)" },
  { value: "TILA", label: "Truth in Lending Act (TILA)" },
  { value: "RESPA", label: "Real Estate Settlement Procedures Act (RESPA)" },
  { value: "small_claims", label: "Small Claims Court" },
  { value: "civil_complaint", label: "Civil Complaint" },
  { value: "breach_of_contract", label: "Breach of Contract" },
  { value: "personal_injury", label: "Personal Injury" },
  { value: "employment", label: "Employment Law" },
  { value: "consumer_protection", label: "Consumer Protection" },
];

const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
  "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
  "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana",
  "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
  "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
  "New Hampshire", "New Jersey", "New Mexico", "New York",
  "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon",
  "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
  "West Virginia", "Wisconsin", "Wyoming", "District of Columbia",
];

const COURTS = [
  { value: "federal_district", label: "Federal District Court" },
  { value: "state_superior", label: "State Superior/Circuit Court" },
  { value: "small_claims", label: "Small Claims Court" },
  { value: "bankruptcy", label: "Bankruptcy Court" },
  { value: "appeals", label: "Court of Appeals" },
];

export default function FilingChecklists() {
  const [caseType, setCaseType] = useState("");
  const [jurisdiction, setJurisdiction] = useState("");
  const [court, setCourt] = useState("");
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["pre-filing", "documents", "procedures", "fees", "research"]));

  const generateChecklist = trpc.filingChecklists.generate.useMutation({
    onError: (err) => toast.error(err.message),
  });
  const checklistData = generateChecklist.data;
  const isFetching = generateChecklist.isPending;

  const handleGenerate = () => {
    if (caseType && jurisdiction) {
      setCheckedItems(new Set());
      generateChecklist.mutate({ caseType, jurisdiction, court: court || undefined });
    }
  };

  const toggleItem = (id: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const items = checklistData?.items || [];
  const totalItems = items.length;
  const completedItems = items.filter((item: any) => checkedItems.has(item.id)).length;
  const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  // Group items by category
  const groupedItems = useMemo(() => {
    const groups: Record<string, any[]> = {};
    items.forEach((item: any) => {
      const cat = item.category || "general";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return groups;
  }, [items]);

  const categoryLabels: Record<string, { label: string; icon: React.ReactNode }> = {
    "pre-filing": { label: "Pre-Filing Requirements", icon: <AlertTriangle className="w-4 h-4" /> },
    documents: { label: "Required Documents", icon: <FileText className="w-4 h-4" /> },
    procedures: { label: "Court Procedures", icon: <Scale className="w-4 h-4" /> },
    fees: { label: "Fees & Costs", icon: <DollarSign className="w-4 h-4" /> },
    research: { label: "Research & Preparation", icon: <ClipboardList className="w-4 h-4" /> },
    general: { label: "General Steps", icon: <Circle className="w-4 h-4" /> },
  };

  const handlePrint = () => {
    window.print();
    toast.success("Print dialog opened");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Filing Checklist Generator</h1>
          <p className="text-muted-foreground">
            Generate step-by-step court filing checklists based on case type and jurisdiction
          </p>
        </div>
        {items.length > 0 && (
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Print Checklist
          </Button>
        )}
      </div>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Scale className="w-5 h-5 text-primary" />
            Configure Checklist
          </CardTitle>
          <CardDescription>
            Select your case type and jurisdiction to generate a customized filing checklist
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="mb-2 block">Case Type</Label>
              <Select value={caseType} onValueChange={(v) => { setCaseType(v); setCheckedItems(new Set()); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select case type" />
                </SelectTrigger>
                <SelectContent>
                  {CASE_TYPES.map((ct) => (
                    <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-2 block">Jurisdiction</Label>
              <Select value={jurisdiction} onValueChange={(v) => { setJurisdiction(v); setCheckedItems(new Set()); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-2 block">Court</Label>
              <Select value={court} onValueChange={setCourt}>
                <SelectTrigger>
                  <SelectValue placeholder="Select court (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {COURTS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={handleGenerate} disabled={!caseType || !jurisdiction || isFetching}>
              <ClipboardList className="w-4 h-4 mr-2" />
              {isFetching ? "Generating..." : "Generate Checklist"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading */}
      {isFetching && (
        <Card>
          <CardContent className="py-8 text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Generating your filing checklist...</p>
          </CardContent>
        </Card>
      )}

      {/* Checklist */}
      {items.length > 0 && !isFetching && (
        <>
          {/* Progress bar */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  Checklist Progress: {completedItems} of {totalItems} items
                </span>
                <Badge variant={progress === 100 ? "default" : "secondary"}>
                  {progress}%
                </Badge>
              </div>
              <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              {progress === 100 && (
                <p className="text-sm text-green-600 dark:text-green-400 mt-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  All items completed! You are ready to file.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Grouped checklist items */}
          {Object.entries(groupedItems).map(([category, catItems]) => {
            const catInfo = categoryLabels[category] || categoryLabels.general;
            const isExpanded = expandedCategories.has(category);
            const catCompleted = catItems.filter((item: any) => checkedItems.has(item.id)).length;

            return (
              <Card key={category}>
                <CardHeader
                  className="cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => toggleCategory(category)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-primary">{catInfo.icon}</span>
                      <CardTitle className="text-base">{catInfo.label}</CardTitle>
                      <Badge variant="outline" className="text-xs">
                        {catCompleted}/{catItems.length}
                      </Badge>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                </CardHeader>
                {isExpanded && (
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {catItems.map((item: any) => {
                        const isChecked = checkedItems.has(item.id);
                        return (
                          <div
                            key={item.id}
                            className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                              isChecked
                                ? "bg-primary/5 border-primary/20"
                                : "hover:bg-muted/30"
                            }`}
                          >
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={() => toggleItem(item.id)}
                              className="mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium ${isChecked ? "line-through text-muted-foreground" : ""}`}>
                                {item.title}
                              </p>
                              {item.description && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {item.description}
                                </p>
                              )}
                              <div className="flex items-center gap-3 mt-2">
                                {item.isRequired && (
                                  <Badge variant="destructive" className="text-[10px]">Required</Badge>
                                )}
                                {item.estimatedFee && (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <DollarSign className="w-3 h-3" />
                                    {item.estimatedFee}
                                  </span>
                                )}
                                {item.deadline && (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {item.deadline}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}

          {/* Disclaimer */}
          <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Important Disclaimer</p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                    This checklist is generated as a general guide and may not cover all requirements for your
                    specific situation. Court rules and procedures vary by jurisdiction and can change. Always
                    verify current requirements with the clerk of court or a licensed attorney. SintraPrime is
                    a tool, not a lawyer, and does not provide legal advice or representation.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Empty state */}
      {!caseType && !jurisdiction && (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">Generate a Filing Checklist</p>
            <p className="text-sm mt-1">Select a case type and jurisdiction above to get started</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
