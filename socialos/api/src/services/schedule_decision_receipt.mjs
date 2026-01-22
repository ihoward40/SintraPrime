import { hashCanonicalJson } from "../../../shared/lib/hash.mjs";
import { signReceiptHmac, receiptHash } from "../../../shared/lib/sign.mjs";
import { uuidFromSha256Hex } from "../../../shared/lib/deterministic_uuid.mjs";

export function generateScheduleDecisionReceipt({
  content_id,
  platform,
  chosen_when_utc,
  selected_rule,
  schedule_id,
  signingSecret
}) {
  const decisionPayload = {
    kind: "schedule_decision",
    content_id,
    platform,
    chosen_when_utc,
    selected_rule,
    schedule_id
  };

  const decision_hash = hashCanonicalJson(decisionPayload);
  const receipt_id = uuidFromSha256Hex(decision_hash);

  const timestamp = chosen_when_utc;

  const baseReceipt = {
    receipt_id,
    content_id,
    timestamp,
    platform,
    content_hash: decision_hash,
    status: "success",
    result: decisionPayload,
    verifier_link: null
  };

  const signature = signReceiptHmac(baseReceipt, signingSecret);
  const receipt_hash = receiptHash({ ...baseReceipt, signature });

  return { ...baseReceipt, signature, receipt_hash };
}
