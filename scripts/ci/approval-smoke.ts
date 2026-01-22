import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { upsertArtifactIndexEntry } from "../../src/cases/artifactIndex.js";
import { computeBundleHashFromIndexStrict, assertApprovedForSend } from "../../src/cases/approval.js";

function die(msg: string): never {
  process.stderr.write(msg + "\n");
  process.exit(2);
}

function expectThrows(label: string, fn: () => void) {
  try {
    fn();
  } catch {
    return;
  }
  die(`Expected throw: ${label}`);
}

const root = fs.mkdtempSync(path.join(os.tmpdir(), "sintraprime-approval-"));
const caseId = "C-APPROVAL-1";
const stage: any = "Notice";

// Seed a deterministic artifact index entry for this stage.
upsertArtifactIndexEntry(root, caseId, {
  artifact_id: "demo_packet_1",
  kind: "packet",
  stage,
  generated_at: "2020-01-01T00:00:00.000Z",
  template_version: "packet_stub_v1",
  manifest_path: "artifacts/packets/demo.manifest.json",
  manifest_sha256: "sha256:deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
  artifact_files: [{ path: "artifacts/packets/demo.md", sha256: "sha256:" + "a".repeat(64) }],
});

const { bundleHash } = computeBundleHashFromIndexStrict({ rootDir: root, caseId, stage, kind: "packet" });

expectThrows("unapproved refused", () => {
  assertApprovedForSend({ approval: { approvalStatus: "Unapproved", approvedBundleHash: bundleHash }, currentBundleHash: bundleHash });
});

expectThrows("hash mismatch refused", () => {
  assertApprovedForSend({
    approval: { approvalStatus: "Approved", approvedBundleHash: "sha256:" + "0".repeat(64) },
    currentBundleHash: bundleHash,
  });
});

// Should pass.
assertApprovedForSend({ approval: { approvalStatus: "Approved", approvedBundleHash: bundleHash }, currentBundleHash: bundleHash });

process.stdout.write("APPROVAL_SMOKE_OK\n");
