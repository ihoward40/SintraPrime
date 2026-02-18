import DashboardLayout from "@/components/DashboardLayout";
import { GlobalSituationMap } from "@/components/GlobalSituationMap";
import { LiveIntelligenceFeed } from "@/components/LiveIntelligenceFeed";
import { AgentActivityMonitor } from "@/components/AgentActivityMonitor";
import { Satellite } from "lucide-react";

export default function IntelligenceCenter() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3">
            <Satellite className="h-10 w-10 text-primary" />
            Intelligence Center
          </h1>
          <p className="text-muted-foreground text-base">
            Real-time monitoring, geospatial analysis, and automation oversight
          </p>
        </div>

        {/* Main Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Global Situation Map */}
          <div className="lg:col-span-2">
            <GlobalSituationMap />
          </div>

          {/* Live Intelligence Feed */}
          <LiveIntelligenceFeed />

          {/* Agent Activity Monitor */}
          <AgentActivityMonitor />
        </div>
      </div>
    </DashboardLayout>
  );
}
