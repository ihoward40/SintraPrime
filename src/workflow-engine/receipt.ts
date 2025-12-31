import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

import type { StepRunLog } from "../executor/executePlan.js";

export type StepReceipt = {
  adapter: string | null;
  action: string;
  status: "success" | "failed" | "skipped";
  method: string;
  url: string;
  http_status: number | null;
  started_at: string;
  finished_at: string;
  duration_ms: number;
  error: string | null;
  response: unknown;
};

export function stepRunLogToReceipt(step: StepRunLog): StepReceipt {
  return {
    adapter: step.adapter ?? null,
    action: step.action,
    status: step.status,
    method: step.method,
    url: step.url,
    http_status: step.http_status,
    started_at: step.started_at,
    finished_at: step.finished_at,
    duration_ms: step.duration_ms,
    error: step.error ?? null,
    response: step.response,
  };
}

export type ReceiptWriteOptions = {
  execution_id?: string;
  outDir?: string;
};

function safeFileStem(input: string) {
  return String(input).replace(/[^a-zA-Z0-9._-]/g, "_");
}

function defaultExecutionId() {
  const fromEnv = String(process.env.EXECUTION_ID || "").trim();
  if (fromEnv) return fromEnv;
  return `adhoc:${crypto.randomBytes(10).toString("hex")}`;
}

/**
 * Best-effort receipt writer for adapter/multi-agent modules.
 *
 * Writes:
 * - runs/<execution_id>/run.log (jsonl)
 * - runs/<execution_id>/receipts/<event>/<ts>.json
 */
export async function writeReceipt(event: string, payload: unknown, opts?: ReceiptWriteOptions) {
  try {
    const rawExecutionId = String(opts?.execution_id ?? defaultExecutionId());
    const execDirStem = safeFileStem(rawExecutionId);
    const base = opts?.outDir
      ? path.resolve(opts.outDir)
      : path.resolve(process.cwd(), "runs", execDirStem);

    const receiptsDir = path.join(base, "receipts", safeFileStem(event));
    fs.mkdirSync(receiptsDir, { recursive: true });

    const ts = new Date().toISOString();
    const record = { ts, event, execution_id: rawExecutionId, payload };

    fs.appendFileSync(path.join(base, "run.log"), `${JSON.stringify(record)}\n`, "utf8");
    fs.writeFileSync(path.join(receiptsDir, `${safeFileStem(ts)}.json`), JSON.stringify(record, null, 2), "utf8");
  } catch {
    // Best-effort only; never break execution.
  }
}
