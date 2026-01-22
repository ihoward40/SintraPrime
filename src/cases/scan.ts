import fs from "node:fs";
import path from "node:path";
import { ESCALATION_TABLE } from "./escalationTable.js";
import type { CaseStage, RunReceipt } from "./types.js";
import { appendCaseEvent, writeCaseSnapshot, writeRunReceipt } from "./mirror.js";
import { makeIdempotencyKey } from "./idempotency.js";
import { generatePacketStub } from "./packetStub.js";
import { stableStringify } from "../utils/stableJson.js";

export type DueCase = {
  notionPageId: string;
  caseId: string;
  status: string;
  stage: CaseStage;
  priority: string;
  dueDate: string;
  nextAction: string;
  intakeKey: string;
  escalationLockUntil?: string | null;
  title?: string;
  lastIdempotencyKey?: string;
};

export interface CaseStore {
  queryDueCases(beforeIso: string): Promise<DueCase[]>;
  claimEscalationLock(notionPageId: string, lockUntilIso: string): Promise<boolean>;
  releaseEscalationLock(notionPageId: string): Promise<void>;
  updateCase(input: {
    notionPageId: string;
    status?: string;
    stage?: CaseStage;
    nextAction?: string;
    dueDate?: string;
    latestRunId?: string;
    packetReady?: boolean;
    lastIdempotencyKey?: string;
    driftFlag?: boolean;
    driftReason?: string;
  }): Promise<void>;
}

function parseStageIdempotencyMap(text: string | undefined): Record<string, string> {
  const raw = String(text ?? "").trim();
  if (!raw) return {};
  if (raw.startsWith("{")) {
    try {
      const v = JSON.parse(raw);
      if (!v || typeof v !== "object" || Array.isArray(v)) return {};
      const out: Record<string, string> = {};
      for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
        if (typeof val === "string" && val.trim()) out[String(k)] = val.trim();
      }
      return out;
    } catch {
      return {};
    }
  }

  // Back-compat: allow storing "Stage:sha256:..." as a single string.
  const m = raw.match(/^([^:]+)\s*:\s*(sha256:[0-9a-f]{64})\s*$/i);
  if (m) return { [String(m[1]).trim()]: String(m[2]).trim() };
  return {};
}

function formatStageIdempotencyMap(map: Record<string, string>): string {
  return stableStringify(map, { indent: 0, trailingNewline: false });
}

function nowIso() {
  return new Date().toISOString();
}

function addDaysIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function sortableId(prefix: string): string {
  const t = Date.now().toString(36).padStart(10, "0");
  const r = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${t}-${r}`;
}

function listRunReceipts(rootDir: string, caseId: string): RunReceipt[] {
  const dir = path.join(rootDir, "cases", caseId, "runs");
  if (!fs.existsSync(dir)) return [];
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith(".json"))
    .map((f) => path.join(dir, f));

  const out: RunReceipt[] = [];
  for (const p of files) {
    try {
      const raw = fs.readFileSync(p, "utf8");
      out.push(JSON.parse(raw) as RunReceipt);
    } catch {
      // ignore
    }
  }
  return out;
}

function hasSuccessfulIdempotency(rootDir: string, caseId: string, idempotencyKey: string): boolean {
  return listRunReceipts(rootDir, caseId).some((r) => r.result === "success" && r.idempotency_key === idempotencyKey);
}

export async function casesScan(params: {
  rootDir: string;
  store: CaseStore;
  lockMinutes?: number;
}) {
  const rootDir = params.rootDir;
  const scanStarted = nowIso();

  const due = await params.store.queryDueCases(scanStarted);

  for (const c of due) {
    const lockUntil = new Date(Date.now() + (params.lockMinutes ?? 15) * 60_000).toISOString();

    const locked = await params.store.claimEscalationLock(c.notionPageId, lockUntil);
    if (!locked) continue;

    const runId = sortableId("R");

    appendCaseEvent({
      rootDir,
      caseId: c.caseId,
      event_type: "LOCK_CLAIMED",
      actor: "cases_scan",
      timestamp: scanStarted,
      details: { lock_until: lockUntil, notion_page_id: c.notionPageId },
    });

    try {
      // Snapshot the Notion-facing state deterministically for court/audit.
      writeCaseSnapshot(rootDir, c.caseId, {
        captured_at: scanStarted,
        notion: {
          page_id: c.notionPageId,
          status: c.status,
          stage: c.stage,
          priority: c.priority,
          due_date: c.dueDate,
          next_action: c.nextAction,
          intake_key: c.intakeKey,
          escalation_lock_until: c.escalationLockUntil ?? null,
        },
      });

      const overdue = c.dueDate ? new Date(c.dueDate).getTime() <= Date.now() : false;
      if (!overdue) {
        appendCaseEvent({
          rootDir,
          caseId: c.caseId,
          event_type: "DEADLINE_SCAN",
          actor: "cases_scan",
          timestamp: nowIso(),
          details: { result: "not_overdue" },
        });
        continue;
      }

      const stageCfg = ESCALATION_TABLE[c.stage];
      const templateVersion = "packet_stub_v1";
      const idempotencyKey = makeIdempotencyKey({
        caseId: c.caseId,
        stage: c.stage,
        intakeKey: c.intakeKey,
        templateVersion,
      });

      const lastMap = parseStageIdempotencyMap(c.lastIdempotencyKey);
      const lastForStage = lastMap[c.stage];

      const alreadySucceededLocally = hasSuccessfulIdempotency(rootDir, c.caseId, idempotencyKey);

      // ROI safety A: per-stage idempotency skip from Notion SoT (or local receipts as backstop).
      if (idempotencyKey && (lastForStage === idempotencyKey || alreadySucceededLocally)) {
        const nextDays = (stageCfg as any).defaultDaysByPriority?.[c.priority] ?? null;
        const nextDue = typeof nextDays === "number" ? addDaysIso(nextDays) : c.dueDate;

        const receipt: RunReceipt = {
          run_id: runId,
          case_id: c.caseId,
          timestamp_start: scanStarted,
          timestamp_end: nowIso(),
          run_type: (stageCfg.packetRunType ?? "deadline_scan") as any,
          result: "skipped",
          idempotency_key: idempotencyKey,
          inputs: {
            notion_page_id: c.notionPageId,
            stage: c.stage,
            intake_key: c.intakeKey,
            template_version: templateVersion,
          },
          outputs: { artifacts: [] },
          decision: {
            overdue: true,
            skipped_artifact_generation: true,
            skip_reason: lastForStage === idempotencyKey ? "idempotent_notion_last_key" : "idempotent_local_receipt",
            stage_before: c.stage,
            stage_after: stageCfg.nextStage,
            next_due_date: nextDue,
          },
          errors: [],
          retries: 0,
        };

        writeRunReceipt(rootDir, c.caseId, receipt);

        appendCaseEvent({
          rootDir,
          caseId: c.caseId,
          event_type: "DEADLINE_SCAN",
          actor: "cases_scan",
          timestamp: nowIso(),
          details: {
            result: "skipped_idempotent",
            idempotency_key: idempotencyKey,
            reason: lastForStage === idempotencyKey ? "notion_last_idem" : "local_receipt",
          },
        });

        // Still advance the case (loop closure) without regenerating artifacts.
        await params.store.updateCase({
          notionPageId: c.notionPageId,
          stage: stageCfg.nextStage,
          status: c.status === "Intake" ? "Active" : c.status,
          nextAction: stageCfg.nextActionTemplate,
          dueDate: nextDue,
          latestRunId: runId,
          packetReady: true,
          // If Notion didn't have it but local receipt indicates idempotency, persist it now.
          lastIdempotencyKey:
            lastForStage === idempotencyKey ? undefined : formatStageIdempotencyMap({ ...lastMap, [c.stage]: idempotencyKey }),
        });

        appendCaseEvent({
          rootDir,
          caseId: c.caseId,
          event_type: "CASE_UPDATED",
          actor: "cases_scan",
          timestamp: nowIso(),
          details: {
            stage_from: c.stage,
            stage_to: stageCfg.nextStage,
            due_date: nextDue,
            run_id: runId,
            idempotency_key: idempotencyKey,
            skipped_artifact_generation: true,
          },
        });
        continue;
      }

      const artifacts = generatePacketStub({
        rootDir,
        caseId: c.caseId,
        stage: c.stage,
        version: 1,
        dateIso: scanStarted,
        priority: c.priority as any,
        title: c.title,
        nextAction: c.nextAction,
        notes: `Generated by deadline scanner; will advance to ${stageCfg.nextStage}.`,
      }).artifacts;

      const nextDays = (stageCfg as any).defaultDaysByPriority?.[c.priority] ?? null;
      const nextDue = typeof nextDays === "number" ? addDaysIso(nextDays) : c.dueDate;

      const receipt: RunReceipt = {
        run_id: runId,
        case_id: c.caseId,
        timestamp_start: scanStarted,
        timestamp_end: nowIso(),
        run_type: (stageCfg.packetRunType ?? "deadline_scan") as any,
        result: "success",
        idempotency_key: idempotencyKey,
        inputs: {
          notion_page_id: c.notionPageId,
          stage: c.stage,
          intake_key: c.intakeKey,
          template_version: templateVersion,
        },
        outputs: { artifacts },
        decision: {
          overdue: true,
          stage_before: c.stage,
          stage_after: stageCfg.nextStage,
          next_due_date: nextDue,
        },
        errors: [],
        retries: 0,
      };

      writeRunReceipt(rootDir, c.caseId, receipt);

      appendCaseEvent({
        rootDir,
        caseId: c.caseId,
        event_type: "ARTIFACT_GENERATED",
        actor: "cases_scan",
        timestamp: nowIso(),
        details: { idempotency_key: idempotencyKey, run_id: runId, template_version: templateVersion },
        related_artifacts: artifacts,
      });

      await params.store.updateCase({
        notionPageId: c.notionPageId,
        stage: stageCfg.nextStage,
        status: c.status === "Intake" ? "Active" : c.status,
        nextAction: stageCfg.nextActionTemplate,
        dueDate: nextDue,
        latestRunId: runId,
        packetReady: true,
        lastIdempotencyKey: formatStageIdempotencyMap({ ...lastMap, [c.stage]: idempotencyKey }),
      });

      appendCaseEvent({
        rootDir,
        caseId: c.caseId,
        event_type: "ESCALATED",
        actor: "cases_scan",
        timestamp: nowIso(),
        details: {
          stage_from: c.stage,
          stage_to: stageCfg.nextStage,
          due_date: nextDue,
          run_id: runId,
          idempotency_key: idempotencyKey,
        },
        related_artifacts: artifacts,
      });
    } catch (err) {
      appendCaseEvent({
        rootDir,
        caseId: c.caseId,
        event_type: "ERROR",
        actor: "cases_scan",
        timestamp: nowIso(),
        details: { error: String((err as any)?.message ?? err) },
      });
      throw err;
    } finally {
      try {
        await params.store.releaseEscalationLock(c.notionPageId);
      } catch {
        // best-effort
      }

      appendCaseEvent({
        rootDir,
        caseId: c.caseId,
        event_type: "LOCK_RELEASED",
        actor: "cases_scan",
        timestamp: nowIso(),
        details: {},
      });
    }
  }
}
