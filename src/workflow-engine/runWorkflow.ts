import type { WorkflowDefinition } from "../workflow/WorkflowDefinition.schema.js";
import { runWorkflow, type WorkflowRunOptions } from "../workflow/runWorkflow.js";
import { createMultiAgentRun } from "../agentMode/multiAgentRunner.js";

/**
 * Workflow-engine wrapper.
 *
 * This is the integration point to connect a multi-agent loop (planner/validator/executor)
 * to the deterministic workflow runner.
 */
export async function runWorkflowEngine(def: WorkflowDefinition, opts?: WorkflowRunOptions) {
  const ma = createMultiAgentRun({ execution_id: `workflow-engine:${def.workflow_id}` });
  ma.plan("accept_workflow", { workflow_id: def.workflow_id, threadId: def.threadId });
  ma.validate("scope.gate", "ok", { uses: (def as any).uses ?? [] });

  const receipt = await runWorkflow(def, opts);

  ma.exec("workflow.run", receipt.status === "success" ? "success" : "failed", {
    execution_id: receipt.execution_id,
    status: receipt.status,
  });

  ma.finalize(receipt.status === "success" ? "success" : receipt.status === "denied" ? "denied" : "failed");

  return receipt;
}
