export type BudgetTrim = { kind: string; detail: string };

export function approxTokens(s: string): number {
  // rough heuristic: ~4 chars/token for English-ish text
  return Math.ceil((s ?? "").length / 4);
}

export function applyTokenBudget(input: {
  system: string;
  user: string;
  maxTokens: number;
}): { system: string; user: string; trims: BudgetTrim[] } {
  const trims: BudgetTrim[] = [];
  let system = input.system ?? "";
  let user = input.user ?? "";

  let total = approxTokens(system) + approxTokens(user);
  if (total <= input.maxTokens) return { system, user, trims };

  // first trim: compress excessive whitespace in system prompt (safe + deterministic)
  const compact = system.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n");
  if (compact !== system) {
    system = compact;
    trims.push({ kind: "system_compact", detail: "Compressed whitespace in system prompt." });
  }

  total = approxTokens(system) + approxTokens(user);
  if (total <= input.maxTokens) return { system, user, trims };

  // second trim: hard cap user prompt length (last resort; deterministic)
  const maxUserChars = Math.max(500, input.maxTokens * 4 - system.length);
  if (user.length > maxUserChars) {
    user = user.slice(0, maxUserChars) + "\n\n[TRIMMED_FOR_BUDGET]";
    trims.push({
      kind: "user_trim",
      detail: `Trimmed user prompt to ${maxUserChars} chars for token budget.`,
    });
  }

  return { system, user, trims };
}
