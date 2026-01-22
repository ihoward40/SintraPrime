import { EXPERTS, type ExpertId } from "./experts.js";

export function buildTurboSparseSystemPrompt(experts: ExpertId[]): string {
  const map = new Map(EXPERTS.map((e) => [e.id, e] as const));

  const ordered = Array.from(new Set(experts)).sort((a, b) =>
    a === "core" ? -1 : b === "core" ? 1 : a.localeCompare(b)
  );

  const modules = ordered
    .map((id) => map.get(id))
    .filter(Boolean)
    .map((e) => `### Expert: ${e!.title}\n${e!.system.trim()}`);

  return modules.join("\n\n");
}
