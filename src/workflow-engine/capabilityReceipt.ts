import { writeReceipt } from "./receipt.js";
import { stableStringify } from "../law/stableJson.js";
import { sha256HexFromUtf8 } from "../law/sha256.js";

export type CapabilityReceiptSchemaVersion = "capability-receipt@v1";

export type CapabilityStatus = "SUCCESS" | "APPROVAL_REQUIRED" | "RETRYABLE" | "FATAL";

export type ExecutionContext = {
  execution_id: string;
  plan_hash: string;
  step_id: string;
  scopes_granted: string[];
  dry_run: boolean;
  artifacts_dir: string;
};

export type CapabilityReceiptV1 = {
  schema_version: CapabilityReceiptSchemaVersion;
  capability: string;
  step_id: string;
  execution_id: string;
  plan_hash: string;
  status: CapabilityStatus;
  timestamp: string;
  inputs_hash: string;
  outputs_hash: string;
  artifacts: string[];
  attempt: number;
};

function normalizeIso(ts: string) {
  const s = String(ts ?? "").trim();
  return s || new Date().toISOString();
}

function ensureSha256Like(value: string) {
  const v = String(value ?? "").trim();
  if (v.startsWith("sha256:")) return v;
  // Back-compat with older plan_hash conventions; keep it a sha256-typed string.
  if (/^[a-f0-9]{64}$/i.test(v)) return `sha256:${v.toLowerCase()}`;
  return `sha256:${sha256HexFromUtf8(v || "")}`;
}

function hashAny(value: unknown) {
  // Deterministic, stable hashing. Callers should pass redacted inputs.
  return `sha256:${sha256HexFromUtf8(stableStringify(value))}`;
}

function derivePlanHash(params: {
  capability: string;
  inputs_hash: string;
  scopes_granted: string[];
  dry_run: boolean;
}) {
  return hashAny({
    kind: "CapabilityInvocationPlan@v1",
    capability: params.capability,
    inputs_hash: params.inputs_hash,
    scopes_granted: params.scopes_granted,
    dry_run: params.dry_run,
  });
}

export async function writeCapabilityReceipt(params: {
  capability: string;
  status: CapabilityStatus;
  started_at: string;
  finished_at: string;
  execution_id?: string;
  plan_hash?: string;
  step_id?: string;
  scopes_granted?: string[];
  dry_run?: boolean;
  artifacts_dir?: string;
  attempt?: number;
  inputs_for_hash?: unknown;
  outputs_for_hash?: unknown;
  artifacts?: string[];
  outDir?: string;
  notes?: string[];
  error?: string | null;
}) {
  const capability = String(params.capability ?? "").trim() || "unknown";
  const step_id = String(params.step_id ?? "").trim() || capability;
  const execution_id = String(params.execution_id ?? "").trim() || "adhoc";
  const scopes_granted = Array.isArray(params.scopes_granted) ? params.scopes_granted.map((s) => String(s)) : [];
  const dry_run = Boolean(params.dry_run);
  const attempt = Number.isFinite(params.attempt) && (params.attempt as number) > 0 ? (params.attempt as number) : 1;

  const inputs_hash = hashAny(typeof params.inputs_for_hash === "undefined" ? null : params.inputs_for_hash);
  const outputs_hash = hashAny(typeof params.outputs_for_hash === "undefined" ? null : params.outputs_for_hash);

  const plan_hash = ensureSha256Like(
    String(params.plan_hash ?? "").trim() ||
      derivePlanHash({ capability, inputs_hash, scopes_granted, dry_run })
  );

  const receipt: CapabilityReceiptV1 = {
    schema_version: "capability-receipt@v1",
    capability,
    step_id,
    execution_id,
    plan_hash,
    status: params.status,
    timestamp: normalizeIso(params.finished_at ?? params.started_at),
    inputs_hash,
    outputs_hash,
    artifacts: Array.isArray(params.artifacts) ? params.artifacts.map((p) => String(p)) : [],
    attempt,
  };

  const payload = {
    ...receipt,
    ...(params.error ? { error: String(params.error) } : {}),
    ...(params.notes && params.notes.length ? { notes: params.notes } : {}),
    ...(params.artifacts_dir ? { artifacts_dir: String(params.artifacts_dir) } : {}),
  };

  await writeReceipt(`capability.${capability}`, payload, { execution_id, outDir: params.outDir });
  return payload;
}
