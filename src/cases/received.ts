import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { buildLitigationPackage } from "../litigation/index.js";
import { ensureCaseMirror, appendCaseEvent, writeRunReceipt } from "./mirror.js";
import { writeManifest } from "./artifacts.js";
import type { NotionCaseRecord, NotionCaseStore } from "./notion/notionCaseStore.js";
import type { RunReceipt } from "./types.js";

function nowIso() {
  return new Date().toISOString();
}

function ymd(iso: string) {
  return String(iso).slice(0, 10);
}

function sha256Hex(buf: Buffer) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function stableJsonStringify(value: any) {
  const stable = (v: any): any => {
    if (v === null || v === undefined) return v;
    if (Array.isArray(v)) return v.map(stable);
    if (typeof v !== "object") return v;
    const keys = Object.keys(v).sort();
    const out: any = {};
    for (const k of keys) out[k] = stable(v[k]);
    return out;
  };
  return JSON.stringify(stable(value));
}

function deriveReceivedIdempotencyKey(c: NotionCaseRecord) {
  // Pragmatic guardrail: changes in these fields imply a materially different packet.
  const basis = {
    caseId: c.caseId,
    notionPageId: c.notionPageId,
    status: c.status,
    stage: c.stage,
    caseType: c.caseType ?? "",
    counterparty: c.counterparty ?? "",
    accountRef: c.accountRef ?? "",
    responseReceived: !!c.responseReceived,
  };
  return sha256Hex(Buffer.from(stableJsonStringify(basis), "utf8"));
}

function sha256File(absPath: string) {
  return sha256Hex(fs.readFileSync(absPath));
}

function listFilesRecursive(absDir: string): string[] {
  const out: string[] = [];
  if (!fs.existsSync(absDir)) return out;
  for (const ent of fs.readdirSync(absDir, { withFileTypes: true })) {
    const abs = path.join(absDir, ent.name);
    if (ent.isDirectory()) out.push(...listFilesRecursive(abs));
    else if (ent.isFile()) out.push(abs);
  }
  return out;
}

function toCasePayload(c: NotionCaseRecord) {
  // Minimal payload, safe defaults. Templates render stubs/placeholders when missing.
  return {
    case_id: c.caseId,
    case_title: c.title ?? "",
    matter_type: c.caseType ?? "",
    defendant_name: c.counterparty ?? "",
    account_ref: c.accountRef ?? "",
    venue: "",
    jurisdiction: "",
    vars: {
      plaintiff_name: "(plaintiff pending)",
      defendant_name: c.counterparty ?? "(defendant pending)",
      facts: "(facts pending — generated at response-received trigger)",
      relief_requested: "(relief pending)",
      notice_body: "(notice pending)",
      motion_relief_requested: "(motion relief pending)",
      motion_grounds: "(grounds pending)",
    },
  };
}

export async function casesReceived(params: {
  rootDir: string;
  store: NotionCaseStore;
  limit?: number;
}) {
  const q2 = (params.store as any).queryReceivedCases as undefined | ((opts?: any) => Promise<NotionCaseRecord[]>);
  const q1 = (params.store as any).queryResponseReceivedCases as undefined | ((opts?: any) => Promise<NotionCaseRecord[]>);
  const q = q2 ?? q1;
  if (!q) throw new Error("Store does not support queryReceivedCases() or queryResponseReceivedCases(); update LiveNotionCaseStore.");

  const received = await q.call(params.store, { limit: params.limit ?? 25 });
  const out: Array<{ caseId: string; ok: boolean; artifact_id?: string; error?: string }> = [];

  for (const c of received) {
    const started = nowIso();
    const runId = `run_received_${c.caseId}_${started.replace(/[:.]/g, "-")}`;

    try {
      const idempotencyKey = deriveReceivedIdempotencyKey(c);
      if (c.lastIdempotencyKey && c.lastIdempotencyKey === idempotencyKey) {
        // Idempotent no-op: re-mark packet ready (in case it was manually toggled) without regenerating.
        await params.store.updateCase({ notionPageId: c.notionPageId, packetReady: true, lastIdempotencyKey: idempotencyKey });
        out.push({ caseId: c.caseId, ok: true, artifact_id: "(idempotent-skip)" });
        continue;
      }

      appendCaseEvent({
        rootDir: params.rootDir,
        caseId: c.caseId,
        event_type: "RESPONSE_RECEIVED",
        actor: "cases_received",
        timestamp: started,
        details: { notion_page_id: c.notionPageId },
      });

      const root = ensureCaseMirror(params.rootDir, c.caseId);
      const artifactId = `${ymd(started)}__${c.caseId}__EXHIBIT_PACKET__RECEIVED__v1`;
      const outDir = path.join(root, "artifacts", "packets", artifactId);

      await buildLitigationPackage(toCasePayload(c), outDir);

      const filesAbs = listFilesRecursive(outDir).sort((a, b) => a.localeCompare(b));
      const files = filesAbs.map((abs) => {
        const rel = path.relative(root, abs).split(path.sep).join("/");
        return { path: rel, sha256: `sha256:${sha256File(abs)}` };
      });

      const manifestRes = writeManifest(params.rootDir, c.caseId, {
        artifact_id: artifactId,
        case_id: c.caseId,
        kind: "packet",
        stage: c.stage,
        generated_at: started,
        template_version: "litigation_binder_export_v1",
        files,
      });

      const receipt: RunReceipt = {
        run_id: runId,
        case_id: c.caseId,
        timestamp_start: started,
        timestamp_end: nowIso(),
        run_type: "binder",
        result: "success",
        inputs: {
          notion_page_id: c.notionPageId,
          stage: c.stage,
          trigger: "response_received",
        },
        outputs: {
          artifacts: [{ path: path.relative(root, manifestRes.path).split(path.sep).join("/"), sha256: manifestRes.sha256 }],
        },
        errors: [],
        retries: 0,
      };

      writeRunReceipt(params.rootDir, c.caseId, receipt);

      appendCaseEvent({
        rootDir: params.rootDir,
        caseId: c.caseId,
        event_type: "ARTIFACT_GENERATED",
        actor: "cases_received",
        timestamp: nowIso(),
        details: { artifact_id: artifactId, template_version: "litigation_binder_export_v1", run_id: runId },
        related_artifacts: files.map((f) => ({ path: f.path, sha256: f.sha256 })),
      });

      await params.store.updateCase({ notionPageId: c.notionPageId, packetReady: true, latestRunId: runId });

      // Record idempotency key last so repeat triggers won’t regenerate.
      await params.store.updateCase({ notionPageId: c.notionPageId, lastIdempotencyKey: idempotencyKey });

      appendCaseEvent({
        rootDir: params.rootDir,
        caseId: c.caseId,
        event_type: "CASE_UPDATED",
        actor: "cases_received",
        timestamp: nowIso(),
        details: { packetReady: true, latestRunId: runId },
      });

      out.push({ caseId: c.caseId, ok: true, artifact_id: artifactId });
    } catch (e) {
      out.push({ caseId: c.caseId, ok: false, error: String((e as any)?.message ?? e) });
      // continue processing other cases
    }
  }

  return { ok: true, processed: out.length, results: out };
}
