import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, ArrowRight, Sparkles } from "lucide-react";
import { Link } from "wouter";

interface UpgradePromptProps {
  feature: string;
  requiredTier: "pro" | "coalition" | "enterprise";
  currentTier?: string;
  description?: string;
  compact?: boolean;
}

const TIER_COLORS: Record<string, string> = {
  pro: "bg-blue-500",
  coalition: "bg-purple-500",
  enterprise: "bg-amber-500",
};

const TIER_PRICES: Record<string, string> = {
  pro: "$29/mo",
  coalition: "$79/mo",
  enterprise: "$199/mo",
};

export default function UpgradePrompt({ feature, requiredTier, currentTier = "free", description, compact = false }: UpgradePromptProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border border-yellow-500/30 bg-yellow-50/50 dark:bg-yellow-950/10">
        <Lock className="h-4 w-4 text-yellow-600 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
            {feature} requires {requiredTier.charAt(0).toUpperCase() + requiredTier.slice(1)} plan
          </p>
        </div>
        <Link href="/pricing">
          <Button size="sm" variant="outline" className="shrink-0 border-yellow-500/50 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-100 dark:hover:bg-yellow-900/30">
            Upgrade <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <Card className="border-dashed border-2 border-muted-foreground/20">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto mb-3 p-4 rounded-full bg-muted/50">
          <Lock className="h-8 w-8 text-muted-foreground" />
        </div>
        <CardTitle className="text-xl flex items-center justify-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Upgrade to Unlock {feature}
        </CardTitle>
        <CardDescription>
          {description || `This feature is available on the ${requiredTier.charAt(0).toUpperCase() + requiredTier.slice(1)} plan and above.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <Badge variant="secondary" className="text-xs">
            Current: {currentTier.charAt(0).toUpperCase() + currentTier.slice(1)}
          </Badge>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <Badge className={`${TIER_COLORS[requiredTier]} text-white text-xs`}>
            {requiredTier.charAt(0).toUpperCase() + requiredTier.slice(1)} — {TIER_PRICES[requiredTier]}
          </Badge>
        </div>
        <Link href="/pricing">
          <Button className="mt-2">
            View Plans & Upgrade
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
