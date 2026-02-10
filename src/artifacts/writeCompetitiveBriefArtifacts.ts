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

export async function writeCompetitiveBriefArtifacts(input: {
  execution_id: string;
  step_id: string;
  briefMd: string;
  briefJson: unknown;
  evidenceManifest: unknown;
  layoutFlagsJson: unknown | null;
}) {
  const baseRel = toPosix(
    path.join(
      "runs",
      "competitive-brief",
      safeFilePart(input.execution_id),
      safeFilePart(input.step_id)
    )
  );

  const evidence: ArtifactRef[] = [];

  evidence.push(
    writeArtifactRelative(
      toPosix(path.join(baseRel, "brief.md")),
      Buffer.from(String(input.briefMd ?? ""), "utf8"),
      "text/markdown; charset=utf-8"
    )
  );

  evidence.push(
    writeArtifactRelative(
      toPosix(path.join(baseRel, "brief.json")),
      Buffer.from(JSON.stringify(input.briefJson ?? null, null, 2) + "\n", "utf8"),
      "application/json"
    )
  );

  evidence.push(
    writeArtifactRelative(
      toPosix(path.join(baseRel, "evidence_manifest.json")),
      Buffer.from(JSON.stringify(input.evidenceManifest ?? null, null, 2) + "\n", "utf8"),
      "application/json"
    )
  );

  if (input.layoutFlagsJson) {
    evidence.push(
      writeArtifactRelative(
        toPosix(path.join(baseRel, "layout_flags.json")),
        Buffer.from(JSON.stringify(input.layoutFlagsJson, null, 2) + "\n", "utf8"),
        "application/json"
      )
    );
  }

  return {
    evidence,
    evidence_rollup_sha256: evidenceRollupSha256(evidence),
  };
}
