import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { stableHash, stableStringify, sha256Hex } from "../utils/stableJson.js";
import type { CaseEvent, CaseEventType, RunReceipt } from "./types.js";

function safeMkdir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

export function caseDirAbs(rootDir: string, caseId: string): string {
  return path.resolve(rootDir, "cases", caseId);
}

export function ensureCaseMirror(rootDir: string, caseId: string) {
  const root = caseDirAbs(rootDir, caseId);
  safeMkdir(root);
  safeMkdir(path.join(root, "runs"));
  safeMkdir(path.join(root, "artifacts"));
  safeMkdir(path.join(root, "artifacts", "binder"));
  safeMkdir(path.join(root, "artifacts", "packets"));
  safeMkdir(path.join(root, "artifacts", "receipts"));
  return root;
}

export function writeCaseSnapshot(rootDir: string, caseId: string, snapshot: unknown) {
  const root = ensureCaseMirror(rootDir, caseId);
  const p = path.join(root, "case.snapshot.json");
  fs.writeFileSync(p, stableStringify(snapshot, { indent: 2, trailingNewline: true }), "utf8");
  return { file: p, sha256: sha256Hex(fs.readFileSync(p)) };
}

function readLastEventLine(eventsPath: string): CaseEvent | null {
  if (!fs.existsSync(eventsPath)) return null;
  const buf = fs.readFileSync(eventsPath, "utf8");
  const lines = buf
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return null;
  try {
    return JSON.parse(lines[lines.length - 1]!) as CaseEvent;
  } catch {
    return null;
  }
}

export function appendCaseEvent(input: {
  rootDir: string;
  caseId: string;
  event_type: CaseEventType;
  actor: string;
  timestamp: string;
  details: Record<string, unknown>;
  related_artifacts?: Array<{ artifact_id?: string; path: string; sha256: string }>;
  event_id?: string;
}) {
  const root = ensureCaseMirror(input.rootDir, input.caseId);
  const eventsPath = path.join(root, "case.events.jsonl");

  const last = readLastEventLine(eventsPath);
  const prev_hash = typeof last?.hash === "string" ? last.hash : null;

  const event_id =
    typeof input.event_id === "string" && input.event_id.trim()
      ? input.event_id.trim()
      : crypto.randomBytes(12).toString("hex");

  const base: Omit<CaseEvent, "hash"> = {
    event_id,
    timestamp: input.timestamp,
    event_type: input.event_type,
    actor: input.actor,
    details: input.details,
    related_artifacts: input.related_artifacts ?? [],
    prev_hash,
  };

  const full: CaseEvent = { ...base, hash: stableHash(base) };

  fs.appendFileSync(eventsPath, JSON.stringify(full) + "\n", "utf8");
  return { file: eventsPath, event: full };
}

export function writeRunReceipt(rootDir: string, caseId: string, run: RunReceipt) {
  const root = ensureCaseMirror(rootDir, caseId);
  const p = path.join(root, "runs", `${run.run_id}.json`);
  fs.writeFileSync(p, stableStringify(run, { indent: 2, trailingNewline: true }), "utf8");
  return { file: p, sha256: sha256Hex(fs.readFileSync(p)) };
}

export function writeDeadLetter(input: { caseId?: string; timestamp: string; error: string; context?: any }) {
  const rootDir = process.cwd();
  const p = path.resolve(rootDir, "cases", "dead-letter.jsonl");
  safeMkdir(path.dirname(p));
  const line = {
    timestamp: input.timestamp,
    case_id: input.caseId ?? null,
    error: input.error,
    context: input.context ?? null,
  };
  fs.appendFileSync(p, JSON.stringify(line) + "\n", "utf8");
  return { file: p };
}
