import { EXPERTS, type ExpertId } from "./experts.js";

export type TurboSparseDecision = {
  enabled: boolean;
  experts: ExpertId[];
  reason: string[];
};

function norm(s: string) {
  return String(s ?? "").toLowerCase();
}

export function selectExperts(input: {
  text: string;
  modeId?: string;
  archId?: string;
  maxExperts?: number;
}): TurboSparseDecision {
  const text = norm(input.text);
  const reason: string[] = [];

  const scored = EXPERTS.map((e) => {
    let score = 0;
    for (const k of e.keywords) {
      if (text.includes(norm(k))) score += 3;
    }
    if (input.modeId && text.includes(norm(input.modeId))) score += 1;
    if (input.archId && text.includes(norm(input.archId))) score += 1;
    return { id: e.id, score };
  });

  const picks: ExpertId[] = ["core"];
  const sorted = scored
    .filter((x) => x.id !== "core")
    .sort((a, b) => b.score - a.score);

  const max = Math.max(2, input.maxExperts ?? 4);
  for (const s of sorted) {
    if (s.score <= 0) break;
    if (!picks.includes(s.id)) picks.push(s.id);
    if (picks.length >= max) break;
  }

  reason.push(`Selected experts: ${picks.join(", ")}`);
  return { enabled: true, experts: picks, reason };
}
