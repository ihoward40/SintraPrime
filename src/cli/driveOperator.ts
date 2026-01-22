import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

type OkEnvelope<T> = { ok: true; cmd: string; atUtc: string; data: T };
type ErrEnvelope = { ok: false; cmd: string; atUtc: string; error: { code: string; message: string } };

function nowUtcIso() {
  return new Date().toISOString();
}

function err(cmd: string, code: string, message: string): ErrEnvelope {
  return { ok: false, cmd, atUtc: nowUtcIso(), error: { code, message } };
}

function ok<T>(cmd: string, data: T): OkEnvelope<T> {
  return { ok: true, cmd, atUtc: nowUtcIso(), data };
}

function findRepoRoot(startDir: string): string {
  let cur = startDir;
  for (let i = 0; i < 25; i++) {
    const pkg = path.join(cur, "package.json");
    if (fs.existsSync(pkg)) return cur;
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  // Fallback: best-effort. Still better than assuming caller CWD.
  return startDir;
}

export function resolveReceiptsDirAbsolute(): string {
  const env = String(process.env.SINTRAPRIME_DRIVE_RECEIPTS_DIR ?? "").trim();

  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = findRepoRoot(moduleDir);

  const relOrAbs = env || "runs/drive/receipts";
  return path.isAbsolute(relOrAbs) ? relOrAbs : path.join(repoRoot, relOrAbs);
}

function tailLines(text: string, n: number): string[] {
  const lines = text.split(/\r?\n/);
  if (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  if (n <= 0) return [];
  return lines.slice(Math.max(0, lines.length - n));
}

export async function driveReceiptsTail(payload: unknown): Promise<OkEnvelope<any> | ErrEnvelope> {
  const cmd = "drive.receipts.tail";
  const p: any = payload ?? {};
  const nRaw = p?.n;
  const n = typeof nRaw === "number" ? nRaw : Number(String(nRaw ?? "20"));
  const nClamped = Number.isFinite(n) ? Math.max(0, Math.min(10_000, Math.floor(n))) : 20;

  const receiptsDir = resolveReceiptsDirAbsolute();
  const eventsPath = path.join(receiptsDir, "events.jsonl");

  try {
    const text = fs.readFileSync(eventsPath, "utf8");
    return ok(cmd, {
      receiptsDir,
      file: "events.jsonl",
      n: nClamped,
      lines: tailLines(text, nClamped),
    });
  } catch (e: any) {
    if (e?.code === "ENOENT") return err(cmd, "ENOENT_EVENTS_JSONL", `Missing events.jsonl at ${eventsPath}`);
    return err(cmd, "READ_EVENTS_JSONL_FAILED", String(e?.message ?? e));
  }
}

type DriveReceiptAny = {
  schema_version?: number;
  timestamp_utc?: string;
  tool?: string;
  target?: string;
  auth_type?: string;
  final_id?: string;
  path?: string;
  created?: any[];
  chain?: Array<{ created?: boolean }>;
  details?: any;
};

function loadCapabilitiesAny(receiptsDir: string): {
  ok: boolean;
  atUtc?: string;
  lastResult?: "ok" | "fail";
  raw?: any;
} {
  const capPath = path.join(receiptsDir, "drive_capabilities.json");
  try {
    const raw = JSON.parse(fs.readFileSync(capPath, "utf8"));
    // We don’t assume per-target here; caller selects from raw.
    const atUtc = typeof raw?.updatedAtUtc === "string" ? raw.updatedAtUtc : undefined;
    return { ok: true, atUtc, raw };
  } catch (e: any) {
    if (e?.code === "ENOENT") return { ok: false };
    return { ok: false };
  }
}

function parseCapabilitiesForTarget(raw: any, target: string): any | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  // v1 wrapper
  if (raw.schemaVersion === 1 && raw.targets && typeof raw.targets === "object") {
    return (raw.targets as any)[target] ?? null;
  }
  // legacy flat map
  return (raw as any)[target] ?? null;
}

function createdAnyFromReceipt(r: DriveReceiptAny): boolean {
  if (Array.isArray(r.created) && r.created.length > 0) return true;
  if (Array.isArray(r.chain) && r.chain.some((x) => x && x.created === true)) return true;
  return false;
}

function minutesAgo(iso: unknown): number | null {
  if (typeof iso !== "string" || !iso.trim()) return null;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  return Math.max(0, Math.floor((Date.now() - ms) / 60_000));
}

export type DriveStatusHealthReason =
  | "OK"
  | "AUTH_FAIL"
  | "NO_SIGNALS"
  | "NO_ENSUREPATH_YET"
  | "STALE";

export type DriveStatusHealth = "green" | "yellow" | "red";

const HEALTH_BY_REASON: Record<DriveStatusHealthReason, DriveStatusHealth> = {
  OK: "green",
  AUTH_FAIL: "red",
  NO_SIGNALS: "red",
  NO_ENSUREPATH_YET: "yellow",
  STALE: "yellow",
};

function computeHealthReason(args: {
  authLastResult: "ok" | "fail" | null;
  authMinutesAgo: number | null;
  ensureMinutesAgo: number | null;
  staleThresholdMinutes: number;
}): DriveStatusHealthReason {
  const hasAuth = args.authLastResult !== null;
  const hasEnsure = args.ensureMinutesAgo !== null;

  if (args.authLastResult === "fail") return "AUTH_FAIL";
  if (!hasAuth && !hasEnsure) return "NO_SIGNALS";
  if (args.authLastResult === "ok" && !hasEnsure) return "NO_ENSUREPATH_YET";

  const authStale = args.authMinutesAgo !== null && args.authMinutesAgo > args.staleThresholdMinutes;
  const ensureStale = args.ensureMinutesAgo !== null && args.ensureMinutesAgo > args.staleThresholdMinutes;
  if (authStale || ensureStale) return "STALE";

  return "OK";
}

function parseMinutes(value: unknown): number | null {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    return Math.max(1, Math.min(365 * 24 * 60, Math.floor(value)));
  }
  const n = Number(String(value ?? "").trim());
  if (!Number.isFinite(n)) return null;
  return Math.max(1, Math.min(365 * 24 * 60, Math.floor(n)));
}

function parseStaleMinutesByAuthType(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw as any)) {
    const key = String(k).trim();
    if (!key) continue;
    const mins = parseMinutes(v);
    if (mins !== null) out[key] = mins;
  }
  return out;
}

function listReceiptFilesNewestFirst(receiptsDir: string): string[] {
  const names = fs.readdirSync(receiptsDir).filter((f) => f.toLowerCase().endsWith(".json"));
  const paths = names.map((n) => path.join(receiptsDir, n));
  paths.sort((a, b) => {
    const am = fs.statSync(a).mtimeMs;
    const bm = fs.statSync(b).mtimeMs;
    return bm - am;
  });
  return paths;
}

function safeReadReceiptJson(absPath: string): DriveReceiptAny | null {
  try {
    const raw = JSON.parse(fs.readFileSync(absPath, "utf8"));
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    return raw as any;
  } catch {
    return null;
  }
}

export async function driveStatus(payload: unknown): Promise<OkEnvelope<any> | ErrEnvelope> {
  const cmd = "drive.status";
  const p: any = payload ?? {};
  const targets: string[] = Array.isArray(p?.targets)
    ? p.targets.map((x: any) => String(x)).filter((s: string) => s.trim())
    : [];
  if (targets.length === 0) return err(cmd, "TARGETS_REQUIRED", "Expected payload.targets: string[]");

  const nRaw = p?.n;
  const n = typeof nRaw === "number" ? nRaw : Number(String(nRaw ?? "1"));
  const nPerTarget = Number.isFinite(n) ? Math.max(1, Math.min(25, Math.floor(n))) : 1;

  const receiptsDir = resolveReceiptsDirAbsolute();
  if (!fs.existsSync(receiptsDir)) {
    return err(cmd, "ENOENT_RECEIPTS_DIR", `Missing receipts dir at ${receiptsDir}`);
  }

  // Operator args: configurable staleness windows.
  // Defaults remain stable: 24h for all targets unless overridden by auth type.
  const staleMinutesDefault = parseMinutes(p?.staleMinutesDefault) ?? 24 * 60;
  const staleMinutesByAuthType = parseStaleMinutesByAuthType(p?.staleMinutesByAuthType);

  const capsLoaded = loadCapabilitiesAny(receiptsDir);
  const newest = listReceiptFilesNewestFirst(receiptsDir);

  const out: any = {
    receiptsDir,
    args: {
      staleMinutesDefault,
      staleMinutesByAuthType,
    },
    targets: {} as Record<string, any>,
  };

  for (const target of targets) {
    const cap = capsLoaded.ok ? parseCapabilitiesForTarget(capsLoaded.raw, target) : null;

    const capAtUtc = typeof capsLoaded.raw?.updatedAtUtc === "string" ? capsLoaded.raw.updatedAtUtc : undefined;
    const capLastAt = typeof cap?.lastAuthTestAt === "string" ? cap.lastAuthTestAt : undefined;
    const capLastResult = cap?.lastAuthTestResult === "ok" || cap?.lastAuthTestResult === "fail" ? cap.lastAuthTestResult : undefined;

    const statusRow: any = {
      capabilities: {
        ok: Boolean(cap),
        atUtc: capLastAt ?? capAtUtc ?? null,
        mode: null,
        lastResult: capLastResult ?? null,
      },
      lastEnsurePath: null,
      stalenessMinutes: {
        authTest: minutesAgo(capLastAt ?? capAtUtc ?? null),
        ensurePath: null,
      },
      staleThresholdMinutes: staleMinutesDefault,
      healthReason: "NO_SIGNALS" as DriveStatusHealthReason,
      health: "red" as DriveStatusHealth,
    };

    // Scan receipts newest-first for last ensurePath and last authTest (for mode).
    let foundEnsure = 0;
    for (const abs of newest) {
      const r = safeReadReceiptJson(abs);
      if (!r) continue;

      // AuthTest receipts are aggregated (target="authTestMany"); read per-target info from details.results.
      if (r.tool === "drive.authTest") {
        const per = r.details?.results?.find?.((x: any) => x?.target === target);
        if (per) {
          if (statusRow.capabilities.mode === null) {
            const mode = String(per?.auth?.mode ?? "").trim();
            if (mode) statusRow.capabilities.mode = mode;
          }
          // Backfill capability summary if registry missing.
          if (statusRow.capabilities.ok === false) {
            const okAuth = Boolean(per?.auth?.ok);
            const okList = Boolean(per?.list?.ok);
            const okWrite = Boolean(per?.write?.ok);
            statusRow.capabilities.ok = true;
            statusRow.capabilities.atUtc = r.timestamp_utc ?? statusRow.capabilities.atUtc;
            statusRow.capabilities.lastResult = okAuth && okList && okWrite ? "ok" : "fail";
            statusRow.stalenessMinutes.authTest = minutesAgo(r.timestamp_utc ?? null);
          }
        }
      }

      if (r.tool === "drive.ensurePath") {
        if (r.target !== target) continue;
        statusRow.lastEnsurePath = {
          atUtc: r.timestamp_utc ?? null,
          path: r.path ?? null,
          finalFolderId: r.final_id ?? null,
          createdAny: createdAnyFromReceipt(r),
        };
        statusRow.stalenessMinutes.ensurePath = minutesAgo(r.timestamp_utc ?? null);
        foundEnsure++;
        if (foundEnsure >= nPerTarget) break;
      }
    }

    const authType = typeof statusRow.capabilities.mode === "string" ? String(statusRow.capabilities.mode).trim() : "";
    const override = authType ? staleMinutesByAuthType[authType] : undefined;
    statusRow.staleThresholdMinutes = typeof override === "number" ? override : staleMinutesDefault;

    statusRow.healthReason = computeHealthReason({
      authLastResult: statusRow.capabilities.lastResult,
      authMinutesAgo: statusRow.stalenessMinutes.authTest,
      ensureMinutesAgo: statusRow.stalenessMinutes.ensurePath,
      staleThresholdMinutes: statusRow.staleThresholdMinutes,
    });
    statusRow.health = HEALTH_BY_REASON[statusRow.healthReason as DriveStatusHealthReason];

    out.targets[target] = statusRow;
  }

  return ok(cmd, out);
}
