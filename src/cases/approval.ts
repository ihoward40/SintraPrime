import { stableHash } from "../utils/stableJson.js";
import type { CaseStage } from "./types.js";
import { readArtifactIndex } from "./artifactIndex.js";

export type ApprovalSnapshot = {
  approvalStatus?: string;
  approvedBundleHash?: string;
  approvedByPersonIds?: string[];
  approvedAt?: string;
};

export function computeBundleHashFromIndex(params: {
  rootDir: string;
  caseId: string;
  stage: CaseStage;
  kind?: "packet" | "binder";
}): string {
  const idx = readArtifactIndex(params.rootDir, params.caseId);

  const entries = idx.entries
    .filter((e) => e.stage === params.stage)
    .filter((e) => (params.kind ? e.kind === params.kind : true))
    .map((e) => ({
      kind: e.kind,
      stage: e.stage,
      template_version: e.template_version,
      manifest_path: e.manifest_path,
      manifest_sha256: e.manifest_sha256,
      artifact_files: (e.artifact_files ?? [])
        .map((f) => ({ path: f.path, sha256: f.sha256 }))
        .sort((a, b) => {
          const ak = `${a.path}|${a.sha256}`;
          const bk = `${b.path}|${b.sha256}`;
          return ak.localeCompare(bk, "en");
        }),
      artifact_id: e.artifact_id,
    }))
    .sort((a, b) => {
      const ak = `${a.kind}|${a.stage}|${a.template_version}|${a.manifest_path}`;
      const bk = `${b.kind}|${b.stage}|${b.template_version}|${b.manifest_path}`;
      return ak.localeCompare(bk, "en");
    });

  return stableHash({
    schema_id: "https://sintraprime.local/schemas/case-bundle-hash.schema.json",
    case_id: params.caseId,
    stage: params.stage,
    kind: params.kind ?? "*",
    entries,
  });
}

export function computeBundleHashFromIndexStrict(params: {
  rootDir: string;
  caseId: string;
  stage: CaseStage;
  kind?: "packet" | "binder";
}): { bundleHash: string; entryCount: number } {
  const idx = readArtifactIndex(params.rootDir, params.caseId);
  const filtered = idx.entries
    .filter((e) => e.stage === params.stage)
    .filter((e) => (params.kind ? e.kind === params.kind : true));

  const entryCount = filtered.length;
  if (entryCount < 1) {
    throw new Error(`Refusing send: no local artifacts indexed for case=${params.caseId} stage=${params.stage} kind=${params.kind ?? "*"}`);
  }

  // Tight drift protection: require at least one manifest hash AND at least one artifact file hash.
  for (const e of filtered) {
    if (!String(e.manifest_sha256 ?? "").trim()) {
      throw new Error(
        `Refusing send: indexed entry missing manifest_sha256 (case=${params.caseId} stage=${params.stage} kind=${e.kind} artifact_id=${e.artifact_id})`
      );
    }
    const files = e.artifact_files ?? [];
    if (!Array.isArray(files) || files.length < 1) {
      throw new Error(
        `Refusing send: indexed entry missing artifact_files (case=${params.caseId} stage=${params.stage} kind=${e.kind} artifact_id=${e.artifact_id})`
      );
    }
    if (!files.some((f) => String((f as any)?.sha256 ?? "").trim())) {
      throw new Error(
        `Refusing send: indexed entry missing artifact file sha256 (case=${params.caseId} stage=${params.stage} kind=${e.kind} artifact_id=${e.artifact_id})`
      );
    }
  }
  return { bundleHash: computeBundleHashFromIndex(params), entryCount };
}

export function assertApprovedForSend(params: {
  approval: ApprovalSnapshot;
  currentBundleHash: string;
}) {
  const status = String(params.approval.approvalStatus ?? "").trim();
  if (status !== "Approved") {
    throw new Error(`Refusing send: Approval Status is '${status || "(unset)"}', expected 'Approved'`);
  }

  const approved = String(params.approval.approvedBundleHash ?? "").trim();
  if (!approved) {
    throw new Error("Refusing send: Approved Bundle Hash is missing");
  }

  if (approved !== params.currentBundleHash) {
    throw new Error(
      `Refusing send: Approved Bundle Hash mismatch (approved=${approved} current=${params.currentBundleHash})`
    );
  }
}
