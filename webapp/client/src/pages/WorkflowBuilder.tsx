/**
 * Workflow Builder Page
 */

import { WorkflowBuilder as WorkflowBuilderComponent } from "@/components/WorkflowBuilder";
import DashboardLayout from "@/components/DashboardLayout";

export function WorkflowBuilderPage() {
  return (
    <DashboardLayout>
      <WorkflowBuilderComponent />
    </DashboardLayout>
  );
}
