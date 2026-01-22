import { startTribunal } from "./tribunal.js";
import { startRiskAgent } from "./tribunalRiskAgent.js";
import { startStrategyAgent } from "./tribunalStrategyAgent.js";
import { startComplianceAgent } from "./tribunalComplianceAgent.js";
import { startGovernor } from "./governorEngine.js";

let started = false;

export function startGovernorSubsystem() {
  if (started) return;
  started = true;

  startTribunal();
  startRiskAgent();
  startStrategyAgent();
  startComplianceAgent();
  startGovernor();

  // eslint-disable-next-line no-console
  console.log("[UI] Governor + Tribunal online");
}

startGovernorSubsystem();
