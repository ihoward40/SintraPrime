import fs from "node:fs";
import path from "node:path";
import { stableStringify } from "../utils/stableJson.js";
import { ensureCaseMirror } from "./mirror.js";
import type { CaseStage } from "./types.js";

export type ArtifactKind = "binder" | "packet";

export type ArtifactIndexEntry = {
  artifact_id: string;
  kind: ArtifactKind;
  stage: CaseStage;
  generated_at: string;
  template_version: string;
  manifest_path: string;
  manifest_sha256: string;
  // Artifact files that the manifest points to. Used for stage/kind-specific drift checks and bundle hash inputs.
  artifact_files?: Array<{ path: string; sha256: string }>;
};

export type ArtifactIndex = {
  schema_id: "https://sintraprime.local/schemas/case-artifact-index.schema.json";
  case_id: string;
  updated_at: string;
  entries: ArtifactIndexEntry[];
};

function indexPath(rootDir: string, caseId: string): string {
  const root = ensureCaseMirror(rootDir, caseId);
  return path.join(root, "artifacts", "index.json");
}

export function readArtifactIndex(rootDir: string, caseId: string): ArtifactIndex {
  const p = indexPath(rootDir, caseId);
  if (!fs.existsSync(p)) {
    return {
      schema_id: "https://sintraprime.local/schemas/case-artifact-index.schema.json",
      case_id: caseId,
      updated_at: new Date().toISOString(),
      entries: [],
    };
  }

  try {
    const raw = fs.readFileSync(p, "utf8");
    const json = JSON.parse(raw) as ArtifactIndex;
    if (!json || typeof json !== "object" || !Array.isArray((json as any).entries)) throw new Error("bad index");

    const updated_at =
      typeof (json as any).updated_at === "string" && (json as any).updated_at
        ? ((json as any).updated_at as string)
        : new Date().toISOString();

    const entries = ((json as any).entries as any[]).map((e) => ({
      ...(e as ArtifactIndexEntry),
      artifact_files: Array.isArray((e as any)?.artifact_files) ? ((e as any).artifact_files as any[]) : [],
    })) as ArtifactIndexEntry[];

    return {
      schema_id: "https://sintraprime.local/schemas/case-artifact-index.schema.json",
      case_id: caseId,
      updated_at,
      entries,
    };
  } catch {
    return {
      schema_id: "https://sintraprime.local/schemas/case-artifact-index.schema.json",
      case_id: caseId,
      updated_at: new Date().toISOString(),
      entries: [],
    };
  }
}

export function upsertArtifactIndexEntry(rootDir: string, caseId: string, entry: ArtifactIndexEntry) {
  const p = indexPath(rootDir, caseId);
  fs.mkdirSync(path.dirname(p), { recursive: true });

  const idx = readArtifactIndex(rootDir, caseId);

  // Keep at most one entry per (kind, stage, template_version). This makes drift checks deterministic.
  const entries = idx.entries.filter(
    (e) => !(e.kind === entry.kind && e.stage === entry.stage && e.template_version === entry.template_version)
  );
  entries.push(entry);

  const out: ArtifactIndex = {
    schema_id: "https://sintraprime.local/schemas/case-artifact-index.schema.json",
    case_id: caseId,
    updated_at: new Date().toISOString(),
    entries: entries.sort((a, b) => a.generated_at.localeCompare(b.generated_at, "en")),
  };

  fs.writeFileSync(p, stableStringify(out, { indent: 2, trailingNewline: true }), "utf8");
}

export function hasArtifactForStage(params: {
  rootDir: string;
  caseId: string;
  kind: ArtifactKind;
  stage: CaseStage;
}): boolean {
  const idx = readArtifactIndex(params.rootDir, params.caseId);
  return idx.entries.some((e) => e.kind === params.kind && e.stage === params.stage);
}
