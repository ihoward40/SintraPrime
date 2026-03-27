import { ContextMode } from "./types";
import budgetManager from "./budgetManager";

// Conservative selector that looks at prompt + attachedContext estimates and returns a ContextMode
export async function selectContextMode(params: { prompt?: string; attachedContext?: string[]; estimatedAttachmentTokens?: number }): Promise<ContextMode> {
  const promptTokens = budgetManager.estimateTokens(params.prompt || "");
  let attachedTokens = 0;
  if (typeof params.estimatedAttachmentTokens === "number") attachedTokens = params.estimatedAttachmentTokens;
  else if (Array.isArray(params.attachedContext)) {
    attachedTokens = params.attachedContext.reduce((s, c) => s + budgetManager.estimateTokens(c), 0);
  }
  const total = promptTokens + attachedTokens;
  const mode = budgetManager.decideModeByTokenCount(total);
  // For conservative safety: if total exceeds max by a lot, fall back to 'minimal'
  const cfg = budgetManager.getBudgetConfig();
  if (total > cfg.maxTokens * 2) return "minimal";
  return mode;
}

export default { selectContextMode };
