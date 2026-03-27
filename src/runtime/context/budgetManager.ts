import { ContextMode } from "./types";

// Conservative, env-driven budget manager. Exposes thresholds and helpers.
const DEFAULTS = {
  maxTokens: Number(process.env.SINTRA_CONTEXT_MAX_TOKENS || 64000),
  summaryTrigger: Number(process.env.SINTRA_CONTEXT_SUMMARY_TRIGGER || 24000),
  compressTrigger: Number(process.env.SINTRA_CONTEXT_COMPRESS_TRIGGER || 48000),
};

export function getBudgetConfig() {
  return DEFAULTS;
}

// Estimate a token count for a piece of text (very conservative: 1 token ~= 4 chars)
export function estimateTokens(text: string | null | undefined): number {
  if (!text) return 0;
  return Math.max(0, Math.ceil(String(text).length / 4));
}

export function decideModeByTokenCount(tokenCount: number): ContextMode {
  if (tokenCount <= DEFAULTS.summaryTrigger) return 'full';
  if (tokenCount <= DEFAULTS.compressTrigger) return 'summarized';
  if (tokenCount <= DEFAULTS.maxTokens) return 'retrieval_augmented';
  return 'compressed';
}

export default { getBudgetConfig, estimateTokens, decideModeByTokenCount };
