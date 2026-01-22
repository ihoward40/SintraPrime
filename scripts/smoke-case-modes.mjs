import { eventBus } from "../ui/core/eventBus.js";

process.env.ADAPTIVE_ENFORCEMENT_ENABLED = "1";
process.env.ADAPTIVE_ENFORCEMENT_VOICE = "0";

await import("../ui/enforcement/adaptiveEnforcementAI.js");
await import("../ui/enforcement/enforcementChain.js");

eventBus.on("enforcement.chain.step", (p) => {
  console.log("step", { creditor: p.creditor, caseId: p.caseId, stage: p.stage, reason: p.adaptiveReason });
});

eventBus.emit("behavior.predicted", {
  creditor: "LVNV Funding",
  creditorKey: "lvnv",
  channel: "#junk-debt",
  caseId: "LVNV-CASE-001",
  classification: { type: "debt_buyer", risk: "high", context: { caseId: "LVNV-CASE-001" } },
  prediction: { likelyBehavior: "ignore", riskScore: 9 },
});

eventBus.emit("enforcement.chain.start", {
  creditor: "LVNV Funding",
  caseId: "LVNV-CASE-001",
  channel: "#junk-debt",
});

eventBus.emit("enforcement.overdue", {
  creditor: "LVNV Funding",
  caseId: "LVNV-CASE-001",
  accountRef: "x",
  channel: "#junk-debt",
});

setTimeout(() => process.exit(0), 200);
