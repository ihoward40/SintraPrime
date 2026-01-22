import fs from "node:fs";
import path from "node:path";

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function die(msg: string): never {
  process.stderr.write(msg + "\n");
  process.exit(2);
}

function readMostRecentReceipt(args: { receiptsPathAbs: string; executionId?: string | null }) {
  const p = args.receiptsPathAbs;
  if (!fs.existsSync(p)) {
    die(
      `egress snapshot: receipts file not found: ${p}\n` +
        `Tip: run a command that persists receipts, or set a different path with --file.`
    );
  }

  const text = fs.readFileSync(p, "utf8");
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (!lines.length) {
    die(`egress snapshot: receipts file is empty: ${p}`);
  }

  const wanted = args.executionId ? String(args.executionId).trim() : "";

  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i]!;
    let obj: any;
    try {
      obj = JSON.parse(line);
    } catch {
      continue;
    }

    if (!wanted) return obj;
    if (obj && typeof obj === "object" && String(obj.execution_id ?? "") === wanted) return obj;
  }

  if (wanted) {
    die(`egress snapshot: no receipt found for execution_id=${wanted}`);
  }

  die(`egress snapshot: could not parse a receipt from ${p}`);
}

function readLastEgressRefusedEvent(args: { rootDir: string; caseId: string }) {
  const caseId = String(args.caseId ?? "").trim();
  if (!caseId) return null;

  const eventsPath = path.resolve(args.rootDir, "cases", caseId, "case.events.jsonl");
  if (!fs.existsSync(eventsPath)) return { missing: true, expected: path.relative(args.rootDir, eventsPath).replaceAll("\\\\", "/") };

  const text = fs.readFileSync(eventsPath, "utf8");
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  for (let i = lines.length - 1; i >= 0; i -= 1) {
    try {
      const ev = JSON.parse(lines[i]!) as any;
      if (ev && typeof ev === "object" && ev.event_type === "EGRESS_REFUSED") {
        return { file: path.relative(args.rootDir, eventsPath).replaceAll("\\\\", "/"), event: ev };
      }
    } catch {
      // ignore parse failures
    }
  }

  return null;
}

function inferCaseIdFromReceipt(receipt: unknown): string | null {
  if (!isRecord(receipt)) return null;
  const direct = (receipt as any).case_id;
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  const meta = (receipt as any).meta;
  if (isRecord(meta)) {
    const m = (meta as any).case_id;
    if (typeof m === "string" && m.trim()) return m.trim();
  }
  return null;
}

export async function runEgressSnapshotCommand(params: {
  rootDir: string;
  executionId?: string | null;
  caseId?: string | null;
  receiptsPath?: string | null;
  runsDir?: string | null;
  includeRefusals?: boolean;
}) {
  const runsDirAbs = params.runsDir
    ? path.resolve(params.rootDir, String(params.runsDir))
    : path.resolve(params.rootDir, "runs");

  const receiptsPathAbs = params.receiptsPath
    ? path.resolve(params.rootDir, String(params.receiptsPath))
    : path.resolve(runsDirAbs, "receipts.jsonl");

  const receipt = readMostRecentReceipt({ receiptsPathAbs, executionId: params.executionId ?? null });
  const snap = isRecord(receipt) && isRecord((receipt as any).egress_policy_snapshot)
    ? (receipt as any).egress_policy_snapshot
    : null;

  const inferredCaseId = inferCaseIdFromReceipt(receipt);
  const caseIdForRefusals = params.caseId ? String(params.caseId) : inferredCaseId;

  const out = {
    kind: "EgressPolicySnapshot",
    runs_dir: path.relative(params.rootDir, runsDirAbs).replaceAll("\\\\", "/"),
    receipts_file: path.relative(params.rootDir, receiptsPathAbs).replaceAll("\\\\", "/"),
    execution_id: isRecord(receipt) ? (receipt as any).execution_id ?? null : null,
    status: isRecord(receipt) ? (receipt as any).status ?? null : null,
    egress_policy_snapshot: snap,
  };

  const includeRefusals = Boolean(params.includeRefusals);
  if (includeRefusals) {
    if (!caseIdForRefusals) {
      (out as any).last_egress_refused = null;
      (out as any).refusals_note = "--include-refusals requested, but no case_id was provided and none was found on the receipt.";
    } else {
      const r = readLastEgressRefusedEvent({ rootDir: params.rootDir, caseId: caseIdForRefusals });
      if (r && typeof r === "object" && (r as any).missing === true) {
        (out as any).last_egress_refused = null;
        (out as any).refusals_note = `No case events file found (expected ${(r as any).expected}).`;
      } else {
        (out as any).last_egress_refused = r;
      }
    }
  }

  if (!snap) {
    (out as any).note =
      "No egress_policy_snapshot found on this receipt. This usually means the run had no guarded external steps.";
  }

  process.stdout.write(JSON.stringify(out, null, 2) + "\n");
}
