import fs from "node:fs";
import path from "node:path";
import { sha256Hex, stableStringify } from "../utils/stableJson.js";
import { ensureCaseMirror } from "./mirror.js";
import type { CasePriority, CaseStage } from "./types.js";
import { upsertArtifactIndexEntry } from "./artifactIndex.js";

export function generatePacketStub(input: {
  rootDir: string;
  caseId: string;
  stage: CaseStage;
  version: number;
  dateIso: string; // YYYY-MM-DD or full ISO
  priority?: CasePriority;
  title?: string;
  nextAction?: string;
  notes?: string;
}): { artifacts: Array<{ path: string; sha256: string }> } {
  const root = ensureCaseMirror(input.rootDir, input.caseId);
  const ymd = String(input.dateIso).slice(0, 10);
  const safeStage = input.stage.replace(/\s+/g, "_");

  const baseName = `${ymd}__${input.caseId}__PACKET__${safeStage}__v${input.version}`;
  const mdRel = path.join("artifacts", "packets", `${baseName}.md`);
  const manifestRel = path.join("artifacts", "packets", `${baseName}.manifest.json`);

  const mdAbs = path.join(root, mdRel);
  const manifestAbs = path.join(root, manifestRel);

  fs.mkdirSync(path.dirname(mdAbs), { recursive: true });

  const lines = [
    `# Packet (${input.stage})`,
    ``,
    `- Case ID: ${input.caseId}`,
    input.title ? `- Title: ${input.title}` : null,
    input.priority ? `- Priority: ${input.priority}` : null,
    `- Date: ${ymd}`,
    ``,
    `## Next Action`,
    input.nextAction ? input.nextAction : "(unset)",
    ``,
    `## Notes`,
    input.notes ? input.notes : "(none)",
    ``,
    `## Evidence`,
    `This is a deterministic stub packet. Replace with binder/packet generator outputs.`,
    ``,
  ].filter((x): x is string => typeof x === "string");

  const mdText = lines.join("\n") + "\n";
  fs.writeFileSync(mdAbs, mdText, "utf8");
  const mdSha = sha256Hex(fs.readFileSync(mdAbs));

  const manifest = {
    schema_id: "https://sintraprime.local/schemas/run-receipt.schema.json",
    kind: "PacketManifest",
    case_id: input.caseId,
    stage: input.stage,
    version: input.version,
    date: ymd,
    artifacts: [{ path: mdRel.split(path.sep).join("/"), sha256: `sha256:${mdSha}` }],
  };

  fs.writeFileSync(manifestAbs, stableStringify(manifest), "utf8");
  const manifestSha = sha256Hex(fs.readFileSync(manifestAbs));

  upsertArtifactIndexEntry(input.rootDir, input.caseId, {
    artifact_id: baseName,
    kind: "packet",
    stage: input.stage,
    generated_at: new Date().toISOString(),
    template_version: "packet_stub_v1",
    manifest_path: manifestRel.split(path.sep).join("/"),
    manifest_sha256: `sha256:${manifestSha}`,
    artifact_files: [{ path: mdRel.split(path.sep).join("/"), sha256: `sha256:${mdSha}` }],
  });

  return {
    artifacts: [
      { path: mdRel.split(path.sep).join("/"), sha256: `sha256:${mdSha}` },
      { path: manifestRel.split(path.sep).join("/"), sha256: `sha256:${manifestSha}` },
    ],
  };
}
