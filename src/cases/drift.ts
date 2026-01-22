import type { CaseStage } from "./types.js";
import { appendCaseEvent } from "./mirror.js";
import { hasArtifactForStage } from "./artifactIndex.js";

export type DriftScanCase = {
  notionPageId: string;
  caseId: string;
  status: string;
  stage: CaseStage;
  priority?: string;
  nextAction?: string;
};

export interface DriftCaseStore {
  queryDueCases(beforeIso: string): Promise<DriftScanCase[]>;
  updateCase(input: {
    notionPageId: string;
    driftFlag?: boolean;
    driftReason?: string;
    nextAction?: string;
    priority?: string;
  }): Promise<void>;
}

function nowIso() {
  return new Date().toISOString();
}

function requiresPacket(stage: CaseStage): boolean {
  return stage === "Notice" || stage === "Cure" || stage === "Default";
}

function bumpPriority(stage: CaseStage, current: string | undefined): string {
  const cur = String(current ?? "");
  const order = ["Low", "Medium", "High", "Critical"] as const;
  const idx = order.indexOf(cur as any);
  const base = idx >= 0 ? idx : 0;

  const min = stage === "Default" ? 2 : 1; // Default => at least High, else at least Medium
  return order[Math.max(base, min)] as string;
}

export async function casesDriftScan(params: {
  rootDir: string;
  store: DriftCaseStore;
}): Promise<{ scanned: number; drifted: number }> {
  const scanAt = nowIso();

  // Use a far-future boundary to reuse the existing query (open cases with Due Date <= beforeIso).
  const open = await params.store.queryDueCases("9999-12-31");

  let drifted = 0;
  for (const c of open) {
    if (!requiresPacket(c.stage)) continue;

    const ok = hasArtifactForStage({ rootDir: params.rootDir, caseId: c.caseId, kind: "packet", stage: c.stage });
    if (ok) continue;

    drifted += 1;
    const reason = `Missing packet manifest in local index for stage=${c.stage}`;

    const nextAction = `Resolve drift: generate missing packet for current stage (${c.stage}).`;
    const priority = bumpPriority(c.stage, c.priority);

    await params.store.updateCase({
      notionPageId: c.notionPageId,
      driftFlag: true,
      driftReason: reason,
      nextAction,
      priority,
    });

    appendCaseEvent({
      rootDir: params.rootDir,
      caseId: c.caseId,
      event_type: "CASE_UPDATED",
      actor: "cases_drift_scan",
      timestamp: scanAt,
      details: { drift: true, reason, stage: c.stage, required_kind: "packet", next_action: nextAction, priority },
    });
  }

  return { scanned: open.length, drifted };
}
