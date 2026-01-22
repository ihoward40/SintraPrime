import fs from "node:fs";
import path from "node:path";
import { stableHash, stableStringify } from "../utils/stableJson.js";
import { ensureCaseMirror } from "./mirror.js";
import type { CaseStage } from "./types.js";
import { upsertArtifactIndexEntry } from "./artifactIndex.js";

export interface ArtifactManifest {
  artifact_id: string;
  case_id: string;
  kind: "binder" | "packet";
  stage: CaseStage;
  generated_at: string;
  template_version: string;
  files: Array<{ path: string; sha256: string }>;
  manifest_hash?: string;
}

export function writeManifest(rootDir: string, caseId: string, manifest: ArtifactManifest) {
  const root = ensureCaseMirror(rootDir, caseId);
  const sub = manifest.kind === "binder" ? "binder" : "packets";
  const dir = path.join(root, "artifacts", sub);
  fs.mkdirSync(dir, { recursive: true });

  const full: ArtifactManifest = { ...manifest, manifest_hash: stableHash(manifest) };
  const p = path.join(dir, `${manifest.artifact_id}.manifest.json`);
  fs.writeFileSync(p, stableStringify(full, { indent: 2, trailingNewline: true }), "utf8");

  upsertArtifactIndexEntry(rootDir, caseId, {
    artifact_id: full.artifact_id,
    kind: full.kind,
    stage: full.stage,
    generated_at: full.generated_at,
    template_version: full.template_version,
    manifest_path: path.relative(ensureCaseMirror(rootDir, caseId), p).split(path.sep).join("/"),
    manifest_sha256: full.manifest_hash!,
    artifact_files: Array.isArray(full.files)
      ? full.files.map((f) => ({ path: String(f.path), sha256: String(f.sha256) }))
      : [],
  });

  return { path: p, sha256: full.manifest_hash! };
}
