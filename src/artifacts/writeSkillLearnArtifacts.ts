import path from "node:path";

import type { ArtifactRef } from "./writeBrowserEvidence.js";
import { writeArtifactRelative } from "./writeBrowserEvidence.js";
import { evidenceRollupSha256 } from "../receipts/evidenceRollup.js";

function safeFilePart(value: string) {
  return String(value)
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 140);
}

function toPosix(p: string) {
  return p.replace(/\\/g, "/");
}

export type SkillLearnArtifactsInput = {
  execution_id: string;
  step_id: string;
  skill_manifest: unknown;
  patch_diff: string;
  smoke_results: unknown;
  generated_files: Array<{ repo_rel_path: string; content: string; mime: string }>;
};

export function writeSkillLearnArtifacts(input: SkillLearnArtifactsInput): {
  base_dir: string;
  evidence: ArtifactRef[];
  outputs: ArtifactRef[];
  evidence_rollup_sha256: string;
} {
  const base_dir = toPosix(
    path.join(
      "runs",
      "skills-learn",
      safeFilePart(input.execution_id),
      safeFilePart(input.step_id)
    )
  );

  const evidence: ArtifactRef[] = [];

  const manifestRef = writeArtifactRelative(
    toPosix(path.join(base_dir, "skill_manifest.json")),
    Buffer.from(JSON.stringify(input.skill_manifest, null, 2) + "\n", "utf8"),
    "application/json"
  );
  evidence.push(manifestRef);

  const patchRef = writeArtifactRelative(
    toPosix(path.join(base_dir, "patch.diff")),
    Buffer.from(input.patch_diff.endsWith("\n") ? input.patch_diff : input.patch_diff + "\n", "utf8"),
    "text/x-diff"
  );
  evidence.push(patchRef);

  const smokeRef = writeArtifactRelative(
    toPosix(path.join(base_dir, "smoke_results.json")),
    Buffer.from(JSON.stringify(input.smoke_results, null, 2) + "\n", "utf8"),
    "application/json"
  );
  evidence.push(smokeRef);

  const generatedRefs: ArtifactRef[] = [];
  const stableGenerated = [...input.generated_files].sort((a, b) => a.repo_rel_path.localeCompare(b.repo_rel_path));
  for (const gf of stableGenerated) {
    const rel = toPosix(path.join(base_dir, "generated_files", gf.repo_rel_path));
    const ref = writeArtifactRelative(rel, Buffer.from(gf.content, "utf8"), gf.mime);
    evidence.push(ref);
    generatedRefs.push(ref);
  }

  const evidence_rollup_sha256 = evidenceRollupSha256(evidence);

  const evidenceManifest = {
    kind: "skills.learn.v1",
    base_dir,
    evidence,
    evidence_rollup_sha256,
    outputs: {
      skill_manifest: manifestRef,
      patch_diff: patchRef,
      smoke_results: smokeRef,
      generated_files: generatedRefs.map((r) => r.path),
    },
  };

  const evidenceManifestRef = writeArtifactRelative(
    toPosix(path.join(base_dir, "evidence_manifest.json")),
    Buffer.from(JSON.stringify(evidenceManifest, null, 2) + "\n", "utf8"),
    "application/json"
  );

  const outputs: ArtifactRef[] = [manifestRef, patchRef, smokeRef, evidenceManifestRef];

  return { base_dir, evidence, outputs, evidence_rollup_sha256 };
}
