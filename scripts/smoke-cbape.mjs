import { eventBus } from "../ui/core/eventBus.js";

process.env.BEHAVIOR_PREDICTION_ENABLED = process.env.BEHAVIOR_PREDICTION_ENABLED || "0";

await import("../ui/intelligence/behaviorPredictionEngine.js");
await import("../ui/intelligence/creditorClassifier.js");
await import("../ui/enforcement/enforcementChain.js");
const { registerPlaybooks } = await import("../ui/playbooks/playbookLoader.js");
registerPlaybooks(eventBus);

eventBus.on("behavior.predicted", (p) => {
  console.log("behavior.predicted", {
    creditor: p.creditor,
    channel: p.channel,
    riskScore: p.prediction?.riskScore,
    likelyBehavior: p.prediction?.likelyBehavior,
  });
});

eventBus.on("enforcement.chain.step", (p) => {
  console.log("chain.step", {
    creditor: p.creditor,
    stage: p.stage,
    urgencyBoost: p.state?.urgencyBoost,
  });
});

eventBus.emit("creditor.observed", {
  name: "Chase",
  source: "smoke",
  context: { channel: "#chase-watch" },
});

setTimeout(() => process.exit(0), 300);
