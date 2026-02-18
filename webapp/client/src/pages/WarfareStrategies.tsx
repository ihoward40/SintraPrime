import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Swords, AlertTriangle, Scale, FileText, Cpu, Megaphone, DollarSign, Landmark, Lightbulb } from "lucide-react";
import { useTierGate } from "@/hooks/useTierGate";
import UpgradePrompt from "@/components/UpgradePrompt";

const FRONTS = [
  { key: "legal", label: "Legal", icon: Scale, color: "bg-blue-500", description: "Court filings, motions, and legal proceedings" },
  { key: "regulatory", label: "Regulatory", icon: Landmark, color: "bg-purple-500", description: "Agency complaints, regulatory actions, and compliance" },
  { key: "technical", label: "Technical", icon: Cpu, color: "bg-green-500", description: "Technical evidence, forensic analysis, and data" },
  { key: "information", label: "Information", icon: Megaphone, color: "bg-orange-500", description: "Public records, FOIA requests, and transparency" },
  { key: "financial", label: "Financial", icon: DollarSign, color: "bg-yellow-500", description: "Financial analysis, damages calculation, and audits" },
  { key: "political", label: "Political", icon: FileText, color: "bg-red-500", description: "Legislative advocacy, policy reform, and petitions" },
  { key: "unconventional", label: "Unconventional", icon: Lightbulb, color: "bg-pink-500", description: "Creative legal strategies and novel approaches" },
] as const;

export default function WarfareStrategies() {
  const { data: cases } = trpc.cases.list.useQuery();
  const [selectedFront, setSelectedFront] = useState<string | null>(null);
  const { tier, canAccess, requiredTier } = useTierGate();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {!canAccess("warfareStrategies") && (
          <UpgradePrompt
            feature="Warfare Strategies"
            requiredTier={requiredTier("warfareStrategies") as "pro" | "coalition" | "enterprise"}
            currentTier={tier}
            description="The 7-Front Warfare Strategy planner requires a Pro plan or higher."
          />
        )}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Warfare Strategies</h1>
            <p className="text-muted-foreground">
              7-Front Legal Warfare Planner — Coordinate multi-front legal advocacy
            </p>
          </div>
        </div>

        {/* Disclaimer */}
        <Card className="border-yellow-500/30 bg-yellow-50/50 dark:bg-yellow-950/10">
          <CardContent className="py-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
            <p className="text-xs text-yellow-800 dark:text-yellow-200">
              "Warfare" refers to legal advocacy strategies within the bounds of law. All strategies must 
              comply with applicable rules of professional conduct and court rules. This is not a call to 
              illegal action. Consult a licensed attorney before implementing any legal strategy.
            </p>
          </CardContent>
        </Card>

        {/* 7 Fronts Overview */}
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {FRONTS.map((front) => {
            const Icon = front.icon;
            const isSelected = selectedFront === front.key;
            return (
              <Card
                key={front.key}
                className={`cursor-pointer transition-all hover:shadow-md ${isSelected ? "ring-2 ring-primary" : ""}`}
                onClick={() => setSelectedFront(isSelected ? null : front.key)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${front.color}/10`}>
                      <Icon className={`h-5 w-5`} />
                    </div>
                    <CardTitle className="text-sm">{front.label}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">{front.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Strategies by Case */}
        {cases && cases.length > 0 ? (
          <div className="space-y-6">
            {cases.map((caseItem) => (
              <StrategiesByCase
                key={caseItem.id}
                caseId={caseItem.id}
                caseTitle={caseItem.title}
                selectedFront={selectedFront}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
              <Swords className="h-16 w-16 text-muted-foreground" />
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold">No strategies yet</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Create a case first, then add warfare strategies from the case detail page. 
                  Strategies are organized across 7 fronts of legal advocacy.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

function StrategiesByCase({
  caseId,
  caseTitle,
  selectedFront,
}: {
  caseId: number;
  caseTitle: string;
  selectedFront: string | null;
}) {
  const { data: strategies } = trpc.warfareStrategies.list.useQuery({ caseId });

  const filtered = strategies?.filter((s: { front: string }) =>
    selectedFront ? s.front === selectedFront : true
  );

  if (!filtered || filtered.length === 0) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-500";
      case "planned": return "bg-blue-500";
      case "completed": return "bg-gray-500";
      case "abandoned": return "bg-red-500";
      default: return "bg-gray-400";
    }
  };

  const getFrontInfo = (frontKey: string) => {
    return FRONTS.find(f => f.key === frontKey);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{caseTitle}</CardTitle>
        <CardDescription>{filtered.length} strategies</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {filtered.map((strategy) => {
            const frontInfo = getFrontInfo(strategy.front);
            const FrontIcon = frontInfo?.icon || Swords;
            return (
              <div key={strategy.id} className="p-3 rounded-lg border">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`p-1.5 rounded ${frontInfo?.color || "bg-gray-500"}/10`}>
                      <FrontIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">{strategy.strategyName}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">{strategy.front}</Badge>
                        <Badge className={`${getStatusColor(strategy.status)} text-xs`}>
                          {strategy.status}
                        </Badge>
                        {strategy.priority && strategy.priority !== "medium" && (
                          <Badge variant="outline" className="text-xs">{strategy.priority}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                {strategy.description && (
                  <p className="text-xs text-muted-foreground mt-2 ml-10">{strategy.description}</p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
