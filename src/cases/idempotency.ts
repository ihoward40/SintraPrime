import { sha256Hex } from "../utils/stableJson.js";

export function makeIdempotencyKey(params: {
  caseId: string;
  stage: string;
  intakeKey: string;
  templateVersion: string;
}): string {
  const raw = `${params.caseId}|${params.stage}|${params.intakeKey}|${params.templateVersion}`;
  return `sha256:${sha256Hex(raw)}`;
}
