import type { Tool } from "../../types/index.js";
import { runSearchRouterV1 } from "../../research/searchrouter.js";

export function createSearchRouterTool(): Tool {
  return {
    name: "research.searchrouter.v1",
    description: "Policy-aware search router",
    async execute(args: unknown) {
      const a = args as any;
      return await runSearchRouterV1({
        execution_id: typeof a?.execution_id === "string" ? a.execution_id : "(unknown)",
        step_id: typeof a?.step_id === "string" ? a.step_id : "(unknown)",
        timeoutMs: typeof a?.timeoutMs === "number" ? a.timeoutMs : 30_000,
        input: a?.input ?? a,
      });
    },
  };
}
