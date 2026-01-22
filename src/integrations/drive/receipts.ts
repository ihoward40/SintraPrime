import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { stableStringify, sha256Hex } from "../../utils/stableJson.js";
import { withFileLockSync } from "../../utils/fsLock.js";

export type DriveReceipt = {
  schema_version: 1;
  timestamp_utc: string;
  tool: "drive.ensurePath" | "drive.applyTemplate" | "drive.authTest";
  target: string;
  auth_type: string;
  drive_type: string;
  drive_id?: string | null;
  root: string;
  path?: string;
  dry_run: boolean;
  created: Array<{ name: string; id: string }>;
  found: Array<{ name: string; id: string }>;
  chain?: Array<{ name: string; id: string; created: boolean }>;
  final_id: string;
  provider: string;
  details?: Record<string, unknown>;
};

function nowUtcIso(): string {
  return new Date().toISOString();
}

function ensureDir(abs: string) {
  fs.mkdirSync(abs, { recursive: true });
}

export function writeDriveReceipt(args: {
  runDir: string;
  receipt: Omit<DriveReceipt, "timestamp_utc" | "schema_version"> & { timestamp_utc?: string; schema_version?: 1 };
}): { receiptPath: string; receiptHash: string } {
  const runDirAbs = path.isAbsolute(args.runDir) ? args.runDir : path.join(process.cwd(), args.runDir);
  const envReceiptsDir = String(process.env.SINTRAPRIME_DRIVE_RECEIPTS_DIR ?? "").trim();
  const receiptsDir = envReceiptsDir
    ? (path.isAbsolute(envReceiptsDir) ? envReceiptsDir : path.join(process.cwd(), envReceiptsDir))
    : path.join(runDirAbs, "drive", "receipts");

  ensureDir(receiptsDir);

  const receipt: DriveReceipt = {
    schema_version: (args.receipt as any).schema_version ?? 1,
    timestamp_utc: args.receipt.timestamp_utc ?? nowUtcIso(),
    tool: args.receipt.tool,
    target: args.receipt.target,
    auth_type: args.receipt.auth_type,
    drive_type: args.receipt.drive_type,
    drive_id: args.receipt.drive_id ?? null,
    root: args.receipt.root,
    path: args.receipt.path,
    dry_run: Boolean(args.receipt.dry_run),
    created: Array.isArray(args.receipt.created) ? args.receipt.created : [],
    found: Array.isArray(args.receipt.found) ? args.receipt.found : [],
    chain: Array.isArray((args.receipt as any).chain) ? ((args.receipt as any).chain as any) : undefined,
    final_id: args.receipt.final_id,
    provider: args.receipt.provider,
    details:
      (args.receipt as any).details && typeof (args.receipt as any).details === "object" ? ((args.receipt as any).details as any) : undefined,
  };

  const canonical = stableStringify(receipt, { indent: 2, trailingNewline: true });
  const receiptHash = sha256Hex(canonical);
  const stamp = crypto.randomBytes(3).toString("hex");
  const base = receipt.timestamp_utc.replace(/[:.]/g, "-");
  const receiptFile = `${base}_${receiptHash.slice(0, 12)}_${stamp}.json`;
  const receiptPath = path.join(receiptsDir, receiptFile);
  fs.writeFileSync(receiptPath, canonical, "utf8");

  const eventsPath = path.join(receiptsDir, "events.jsonl");
  const lockPath = `${eventsPath}.lock`;
  const event = {
    kind: "drive.receipt",
    receipt_sha256: receiptHash,
    receipt_path: path.relative(process.cwd(), receiptPath).replace(/\\/g, "/"),
  };
  withFileLockSync({
    lockPath,
    fn: () => {
      fs.appendFileSync(eventsPath, JSON.stringify(event) + "\n", "utf8");
    },
  });

  return { receiptPath, receiptHash };
}
