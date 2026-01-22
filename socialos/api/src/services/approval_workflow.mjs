import { governanceModes } from "../../../shared/lib/governance_modes.mjs";

const allowedStatuses = new Set([
  "draft",
  "review",
  "approved",
  "scheduled",
  "published",
  "measured",
  "refused"
]);

export function validateTransition({ current_status, to_status, governance_mode }) {
  if (!allowedStatuses.has(current_status) || !allowedStatuses.has(to_status)) {
    const e = new Error("Invalid status");
    e.statusCode = 400;
    throw e;
  }

  const mode = governanceModes[governance_mode] ? governance_mode : "marketing_mode";

  if (to_status === current_status) return;

  if (to_status === "refused") return;

  if (mode === "court_safe" && to_status === "approved" && current_status !== "review") {
    const e = new Error("court_safe requires review before approved");
    e.statusCode = 409;
    throw e;
  }

  const transitions = {
    draft: new Set(["review", "approved", "refused"]),
    review: new Set(["approved", "refused"]),
    approved: new Set(["scheduled", "refused"]),
    scheduled: new Set(["published", "refused"]),
    published: new Set(["measured", "refused"]),
    measured: new Set([]),
    refused: new Set([])
  };

  const allowedNext = transitions[current_status] || new Set();
  if (!allowedNext.has(to_status)) {
    const e = new Error(`Invalid transition ${current_status} → ${to_status}`);
    e.statusCode = 409;
    throw e;
  }
}
